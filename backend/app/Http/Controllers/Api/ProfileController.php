<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            ...$user->toArray(),
            'level' => self::level($user->points),
            'badges_count' => $user->badges()->count(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:50'],
            'age_range' => ['sometimes', Rule::in(User::AGE_RANGES)],
            'language' => ['sometimes', Rule::in(['fr', 'wo'])],
            'mode' => ['sometimes', Rule::in(['suivi', 'comprendre'])],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:64'],
            'region' => ['sometimes', 'nullable', 'string', 'max:64'],
            'cycle_length' => ['sometimes', 'integer', 'between:15,60'],
            'period_length' => ['sometimes', 'integer', 'between:1,12'],
            'leaderboard_opt_in' => ['sometimes', 'boolean'],
            'notification_settings' => ['sometimes', 'array'],
            'notification_settings.discreet' => ['sometimes', 'boolean'],
            'notification_settings.enabled' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
        ]);
        $user->update($data);

        return $this->show($request);
    }

    public function pushToken(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['nullable', 'string', 'max:255']]);
        $request->user()->forceFill(['push_token' => $data['token']])->save();

        return response()->json(['message' => 'ok']);
    }

    /** Export de toutes les données personnelles (droit d'accès / portabilité). */
    public function export(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'exported_at' => now()->toIso8601String(),
            'profile' => $user->makeHidden([])->toArray(),
            'cycles' => $user->cycles()->orderBy('start_date')->get(),
            'daily_logs' => $user->dailyLogs()->orderBy('date')->get(),
            'reminders' => $user->reminders()->get(),
            'module_progress' => $user->moduleProgress()->with('module:id,title')->get(),
            'game_scores' => $user->gameScores()->with('game:id,title')->get(),
            'badges' => $user->badges()->get(),
            'help_requests' => $user->helpRequests()->with('publicMessages')->get(),
        ]);
    }

    /** Suppression définitive du compte et des données (droit à l'effacement). */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->tokens()->delete();
        $user->delete(); // cascade : cycles, journal, scores, progression…

        return response()->json(['message' => 'Ton compte et tes données ont été supprimés.']);
    }

    public static function level(int $points): array
    {
        $thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000];
        $level = 1;
        foreach ($thresholds as $i => $t) {
            if ($points >= $t) {
                $level = $i + 1;
            }
        }
        $next = $thresholds[$level] ?? null;

        return ['level' => $level, 'points' => $points, 'next_level_at' => $next];
    }
}
