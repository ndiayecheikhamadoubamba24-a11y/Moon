<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private OtpService $otp) {}

    /**
     * Inscription par téléphone ou par e-mail, avec mot de passe (pas de code SMS).
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'email' => ['required_without:phone', 'nullable', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required_without:email', 'nullable', 'string', 'regex:/^\+?[0-9]{8,15}$/', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],
            'age_range' => ['required', Rule::in(User::AGE_RANGES)],
            'language' => ['nullable', Rule::in(['fr', 'wo'])],
            'mode' => ['nullable', Rule::in(['suivi', 'comprendre'])],
            'avatar' => ['nullable', 'string', 'max:16'],
            'consent' => ['accepted'],
            'guardian_consent' => [Rule::requiredIf(fn () => in_array($request->input('age_range'), ['12-14', '15-17'], true)), 'boolean'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        if (in_array($data['age_range'], ['12-14', '15-17'], true) && ! $request->boolean('guardian_consent')) {
            throw ValidationException::withMessages([
                'guardian_consent' => 'L\'accord d\'un parent ou tuteur est nécessaire pour les moins de 18 ans.',
            ]);
        }

        $user = User::create([
            ...collect($data)->only(['name', 'email', 'phone', 'password', 'age_range', 'language', 'mode', 'avatar'])->filter()->all(),
            'consented_at' => now(),
            'guardian_consent' => $request->boolean('guardian_consent'),
        ]);

        return response()->json($this->tokenResponse($user, $data['device_name'] ?? 'mobile'), 201);
    }

    public function login(Request $request): JsonResponse
    {
        // Connexion avec un numéro de téléphone OU un e-mail (+ mot de passe).
        $data = $request->validate([
            'email' => ['required_without_all:phone,identifier', 'nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'identifier' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $identifier = $this->normalize($data['identifier'] ?? $data['email'] ?? $data['phone'] ?? '');
        $user = $this->findByIdentifier($identifier);
        $field = isset($data['email']) ? 'email' : (isset($data['phone']) ? 'phone' : 'identifier');
        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([$field => 'Identifiant ou mot de passe incorrect.']);
        }
        $this->ensureActive($user);

        return response()->json($this->tokenResponse($user, $data['device_name'] ?? 'mobile'));
    }

    /** Demande un code OTP (connexion par téléphone ou e-mail sans mot de passe). */
    public function requestOtp(Request $request): JsonResponse
    {
        $data = $request->validate(['identifier' => ['required', 'string', 'max:255']]);
        $identifier = $this->normalize($data['identifier']);

        if ($this->findByIdentifier($identifier)) {
            $this->otp->send($identifier);
        }

        // Réponse identique que le compte existe ou non (pas d'énumération).
        return response()->json(['otp_sent' => true]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string'],
            'code' => ['required', 'digits:6'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);
        $identifier = $this->normalize($data['identifier']);
        $user = $this->findByIdentifier($identifier);

        if (! $user || ! $this->otp->verify($identifier, $data['code'])) {
            throw ValidationException::withMessages(['code' => 'Code invalide ou expiré.']);
        }
        $this->ensureActive($user);

        $field = str_contains($identifier, '@') ? 'email_verified_at' : 'phone_verified_at';
        if (! $user->{$field}) {
            $user->forceFill([$field => now()])->save();
        }

        return response()->json($this->tokenResponse($user, $data['device_name'] ?? 'mobile'));
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['identifier' => ['required', 'string']]);
        $identifier = $this->normalize($data['identifier']);
        if ($this->findByIdentifier($identifier)) {
            $this->otp->send($identifier, 'reset');
        }

        return response()->json(['otp_sent' => true]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        $identifier = $this->normalize($data['identifier']);
        $user = $this->findByIdentifier($identifier);

        if (! $user || ! $this->otp->verify($identifier, $data['code'], 'reset')) {
            throw ValidationException::withMessages(['code' => 'Code invalide ou expiré.']);
        }
        $user->update(['password' => $data['password']]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Mot de passe modifié.']);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Déconnectée.']);
    }

    private function tokenResponse(User $user, string $device): array
    {
        return [
            'token' => $user->createToken($device)->plainTextToken,
            'user' => $user->fresh(),
        ];
    }

    private function ensureActive(User $user): void
    {
        if ($user->isSuspended()) {
            abort(403, 'Ce compte est suspendu. Contacte l\'équipe Moon.');
        }
    }

    private function normalize(string $identifier): string
    {
        $identifier = trim($identifier);

        return str_contains($identifier, '@') ? strtolower($identifier) : preg_replace('/[\s.-]/', '', $identifier);
    }

    private function findByIdentifier(string $identifier): ?User
    {
        return str_contains($identifier, '@')
            ? User::where('email', $identifier)->first()
            : User::where('phone', $identifier)->first();
    }
}
