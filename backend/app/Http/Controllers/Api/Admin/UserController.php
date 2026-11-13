<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Gestion des comptes. Aucune donnée de santé (cycles, journal) n'est exposée ici.
 */
class UserController extends Controller
{
    private const PUBLIC_FIELDS = [
        'id', 'name', 'email', 'phone', 'age_range', 'language', 'mode', 'role', 'status', 'region',
        'points', 'streak_days', 'last_activity_date', 'consented_at', 'guardian_consent', 'created_at',
    ];

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'role' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
            'age_range' => ['nullable', Rule::in(User::AGE_RANGES)],
        ]);

        return response()->json(
            User::select(self::PUBLIC_FIELDS)
                ->when($request->role, fn ($q, $r) => $r === 'staff' ? $q->whereIn('role', User::STAFF_ROLES) : $q->where('role', $r))
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->age_range, fn ($q, $a) => $q->where('age_range', $a))
                ->when($request->q, fn ($q, $t) => $q->where(fn ($w) => $w
                    ->where('name', 'like', "%{$t}%")->orWhere('email', 'like', "%{$t}%")->orWhere('phone', 'like', "%{$t}%")))
                ->latest()
                ->paginate(25)
        );
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            ...$user->only(self::PUBLIC_FIELDS),
            'help_requests_count' => $user->helpRequests()->count(),
            'badges_count' => $user->badges()->count(),
        ]);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        $this->guardSelfAndAdmins($request, $user);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $user->forceFill(['status' => 'suspended'])->save();
        $user->tokens()->delete();
        AuditLog::record('user.suspended', $user, ['reason' => $data['reason'] ?? null]);

        return response()->json($user->only(self::PUBLIC_FIELDS));
    }

    public function activate(User $user): JsonResponse
    {
        $user->forceFill(['status' => 'active'])->save();
        AuditLog::record('user.activated', $user);

        return response()->json($user->only(self::PUBLIC_FIELDS));
    }

    /** Réinitialisation d'accès : déconnecte tous les appareils (et supprime le mot de passe). */
    public function resetAccess(User $user): JsonResponse
    {
        $user->tokens()->delete();
        $user->forceFill(['password' => null])->save();
        AuditLog::record('user.access_reset', $user);

        return response()->json(['message' => 'Accès réinitialisé. L\'utilisatrice se reconnectera avec un code OTP.']);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->guardSelfAndAdmins($request, $user);
        AuditLog::record('user.deleted', $user, ['role' => $user->role]);
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Compte supprimé.']);
    }

    /** Création d'un membre de l'équipe (super administrateur uniquement). */
    public function storeStaff(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['required', Rule::in(User::STAFF_ROLES)],
            'password' => ['nullable', 'string', 'min:10'],
        ]);
        $password = $data['password'] ?? Str::password(14);

        $user = new User(['name' => $data['name'], 'email' => $data['email'], 'password' => $password]);
        $user->forceFill(['role' => $data['role'], 'consented_at' => now(), 'email_verified_at' => now()])->save();
        AuditLog::record('staff.created', $user, ['role' => $data['role']]);

        return response()->json([
            'user' => $user->only(self::PUBLIC_FIELDS),
            'temporary_password' => isset($data['password']) ? null : $password,
        ], 201);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $this->guardSelfAndAdmins($request, $user);
        $data = $request->validate(['role' => ['required', Rule::in([User::ROLE_USER, ...User::STAFF_ROLES])]]);
        $from = $user->role;
        $user->forceFill(['role' => $data['role']])->save();
        AuditLog::record('user.role_changed', $user, ['from' => $from, 'to' => $data['role']]);

        return response()->json($user->only(self::PUBLIC_FIELDS));
    }

    private function guardSelfAndAdmins(Request $request, User $user): void
    {
        abort_if($user->is($request->user()), 422, 'Action impossible sur ton propre compte.');
        abort_if($user->role === User::ROLE_SUPER_ADMIN && ! $request->user()->hasRole(User::ROLE_SUPER_ADMIN), 403);
    }
}
