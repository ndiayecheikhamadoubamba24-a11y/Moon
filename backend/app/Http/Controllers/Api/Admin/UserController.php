<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Report;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Gestion des comptes. Aucune donnée de santé (cycles, journal) n'est exposée ici.
 */
class UserController extends Controller
{
    /** Champs visibles dans la liste : jamais l'e-mail, le téléphone ni les données de santé. */
    private const LIST_FIELDS = [
        'id', 'name', 'age_range', 'language', 'mode', 'role', 'status', 'region', 'points', 'streak_days',
        'last_activity_date', 'created_at', 'suspended_until', 'suspension_reason',
    ];

    private const PUBLIC_FIELDS = self::LIST_FIELDS;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'array'],
            'status.*' => [Rule::in(['active', 'suspended', 'inactive'])],
            'age_range' => ['nullable', 'array'],
            'age_range.*' => [Rule::in(User::AGE_RANGES)],
            'language' => ['nullable', Rule::in(['fr', 'wo'])],
            'sort' => ['nullable', Rule::in(['recent', 'activity', 'reports'])],
        ]);
        $inactiveSince = now()->subMonths(6)->toDateString();

        $query = User::select(self::LIST_FIELDS)
            ->when($request->role === 'staff', fn ($q) => $q->whereIn('role', User::STAFF_ROLES), fn ($q) => $q->where('role', User::ROLE_USER))
            ->when($request->status, function ($q, $statuses) use ($inactiveSince) {
                $q->where(function ($w) use ($statuses, $inactiveSince) {
                    foreach ($statuses as $st) {
                        match ($st) {
                            'suspended' => $w->orWhere('status', 'suspended'),
                            'inactive' => $w->orWhere(fn ($x) => $x->where('status', 'active')->where(fn ($y) => $y->whereNull('last_activity_date')->orWhere('last_activity_date', '<', $inactiveSince))),
                            default => $w->orWhere(fn ($x) => $x->where('status', 'active')->where('last_activity_date', '>=', $inactiveSince)),
                        };
                    }
                });
            })
            ->when($request->age_range, fn ($q, $a) => $q->whereIn('age_range', $a))
            ->when($request->language, fn ($q, $l) => $q->where('language', $l))
            ->when($request->region, fn ($q, $r) => $q->where('region', $r))
            ->withCount(['reportsAgainst as reports_count'])
            ->when($request->sort === 'activity', fn ($q) => $q->orderByDesc('last_activity_date'), fn ($q) => $q->when($request->sort === 'reports', fn ($x) => $x->orderByDesc('reports_count'), fn ($x) => $x->latest()));

        $page = $query->paginate(25);
        $all = $page->getCollection();
        // Recherche par référence ou pseudo (la référence est calculée)
        if ($request->filled('q')) {
            $term = mb_strtolower($request->q);
            $matches = User::where('role', User::ROLE_USER)->get(['id', 'name'])
                ->filter(fn ($u) => str_contains(mb_strtolower($u->name), $term) || str_contains(mb_strtolower($u->reference()), $term))
                ->pluck('id');
            $page = $query->whereIn('id', $matches)->paginate(25);
            $all = $page->getCollection();
        }
        $page->setCollection($all->map(fn (User $u) => $this->present($u)));

        return response()->json($page);
    }

    /** Compteurs en tête de page. */
    public function overview(): JsonResponse
    {
        $users = User::where('role', User::ROLE_USER);
        $inactiveSince = now()->subMonths(6)->toDateString();

        return response()->json([
            'active' => (clone $users)->where('status', 'active')->count(),
            'new_this_week' => (clone $users)->where('created_at', '>=', now()->startOfWeek())->count(),
            'suspended' => (clone $users)->where('status', 'suspended')->count(),
            'inactive_6_months' => (clone $users)->where('status', 'active')->where(fn ($q) => $q->whereNull('last_activity_date')->orWhere('last_activity_date', '<', $inactiveSince))->count(),
            'regions' => (clone $users)->whereNotNull('region')->distinct()->pluck('region'),
        ]);
    }

    /** Statistiques d'inscription (30 derniers jours). */
    public function registrations(): JsonResponse
    {
        $users = User::where('role', User::ROLE_USER);
        $since = now()->subDays(29)->startOfDay();
        $byDay = (clone $users)->where('created_at', '>=', $since)->get(['created_at'])->groupBy(fn ($u) => $u->created_at->toDateString())->map->count();
        $cohort = (clone $users)->whereBetween('created_at', [now()->subDays(60), now()->subDays(30)]);
        $cohortSize = (clone $cohort)->count();
        $retained = (clone $cohort)->where('last_activity_date', '>=', now()->subDays(30)->toDateString())->count();

        return response()->json([
            'new_registrations' => (clone $users)->where('created_at', '>=', $since)->count(),
            'active_accounts' => (clone $users)->where('status', 'active')->count(),
            'retention_30d' => $cohortSize ? round($retained / $cohortSize * 100) : null,
            'by_day' => collect(range(29, 0))->map(fn ($d) => ['date' => $k = now()->subDays($d)->toDateString(), 'count' => $byDay[$k] ?? 0])->values(),
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $lastAction = AuditLog::where('subject_type', 'User')->where('subject_id', $user->id)->latest('id')->first();

        return response()->json([
            ...$this->present($user),
            'usage' => [
                'modules_completed' => $user->moduleProgress()->whereNotNull('completed_at')->count(),
                'badges' => $user->badges()->count(),
                'games_played' => $user->gameScores()->count(),
            ],
            'moderation' => [
                'reports' => Report::where('reportable_type', User::class)->where('reportable_id', $user->id)->count(),
                'last_action' => $lastAction ? ['action' => $lastAction->action, 'at' => $lastAction->created_at] : null,
            ],
            'consented_at' => $user->consented_at,
            'guardian_consent' => $user->guardian_consent,
        ]);
    }

    private function present(User $u): array
    {
        return [...$u->only(self::LIST_FIELDS), 'reference' => $u->reference(), 'reports_count' => $u->reports_count ?? 0];
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        $this->guardSelfAndAdmins($request, $user);
        $data = $request->validate([
            'days' => ['nullable', 'integer', Rule::in([7, 30])], // vide = jusqu'à nouvel ordre
            'reason' => ['required', 'string', 'max:255'],
            'report_id' => ['nullable', 'exists:reports,id'],
        ]);
        $user->forceFill([
            'status' => 'suspended',
            'suspended_until' => isset($data['days']) ? now()->addDays($data['days']) : null,
            'suspension_reason' => $data['reason'],
        ])->save();
        $user->tokens()->delete();
        AuditLog::record('user.suspended', $user, $data);

        return response()->json($this->present($user));
    }

    public function activate(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $user->forceFill(['status' => 'active', 'suspended_until' => null, 'suspension_reason' => null])->save();
        AuditLog::record('user.activated', $user, $data);

        return response()->json($this->present($user));
    }

    /**
     * Aider à retrouver l'accès : envoie un code de réinitialisation directement à la personne
     * (l'équipe ne voit jamais son adresse) et/ou déconnecte tous ses appareils.
     */
    public function resetAccess(Request $request, User $user, OtpService $otp): JsonResponse
    {
        $data = $request->validate(['send_reset' => ['boolean'], 'unlock' => ['boolean']]);
        if ($request->boolean('send_reset') && ($identifier = $user->email ?? $user->phone)) {
            $otp->send($identifier, 'reset');
        }
        if ($request->boolean('unlock')) {
            $user->tokens()->delete();
        }
        AuditLog::record('user.access_reset', $user, $data);

        return response()->json(['message' => 'Le message a été envoyé directement à la personne.']);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->guardSelfAndAdmins($request, $user);
        $data = $request->validate(['reason' => ['required', 'string', 'max:255'], 'confirm' => ['accepted']]);
        AuditLog::record('user.deleted', $user, ['role' => $user->role, 'reference' => $user->reference(), 'reason' => $data['reason']]);
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
            'user' => [...$this->present($user), 'email' => $user->email],
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

        return response()->json($this->present($user));
    }

    private function guardSelfAndAdmins(Request $request, User $user): void
    {
        abort_if($user->is($request->user()), 422, 'Action impossible sur ton propre compte.');
        abort_if($user->role === User::ROLE_SUPER_ADMIN && ! $request->user()->hasRole(User::ROLE_SUPER_ADMIN), 403);
    }
}
