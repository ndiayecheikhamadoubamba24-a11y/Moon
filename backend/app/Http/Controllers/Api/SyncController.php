<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Services\CycleService;
use App\Services\GamificationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Synchronisation des données saisies hors ligne (journal, règles, parties jouées).
 * Idempotent : peut être renvoyé plusieurs fois sans créer de doublons.
 */
class SyncController extends Controller
{
    public function __construct(private GamificationService $gamification) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'logs' => ['nullable', 'array', 'max:400'],
            'logs.*.date' => ['required', 'date', 'before_or_equal:today'],
            'logs.*.deleted' => ['nullable', 'boolean'],
            ...collect(DailyLogController::rules())->mapWithKeys(fn ($r, $k) => ["logs.*.{$k}" => $r])->all(),
            'period_starts' => ['nullable', 'array', 'max:50'],
            'period_starts.*.start_date' => ['required', 'date', 'before_or_equal:today'],
            'period_starts.*.end_date' => ['nullable', 'date', 'before_or_equal:today'],
            'game_scores' => ['nullable', 'array', 'max:100'],
            'game_scores.*.game_id' => ['required', 'integer', 'exists:games,id'],
            'game_scores.*.client_uuid' => ['required', 'uuid'],
            'game_scores.*.played_at' => ['required', 'date'],
            'game_scores.*.answers' => ['required', 'array'],
        ]);
        $user = $request->user();
        $report = ['logs' => 0, 'cycles' => 0, 'game_scores' => 0];

        foreach ($data['logs'] ?? [] as $log) {
            $day = CarbonImmutable::parse($log['date']);
            if (! empty($log['deleted'])) {
                $user->dailyLogs()->whereDate('date', $day->toDateString())->delete();
            } else {
                DailyLogController::save($user, $day, collect($log)->only(array_keys(DailyLogController::rules()))->all());
            }
            $report['logs']++;
        }

        foreach ($data['period_starts'] ?? [] as $period) {
            $cycle = $user->cycles()->whereDate('start_date', CarbonImmutable::parse($period['start_date'])->toDateString())->first()
                ?? $user->cycles()->make(['start_date' => $period['start_date']]);
            if (array_key_exists('end_date', $period)) {
                $cycle->end_date = $period['end_date'];
            }
            $cycle->save();
            $report['cycles']++;
        }
        if ($report['cycles']) {
            CycleService::recomputeLengths($user);
        }

        foreach ($data['game_scores'] ?? [] as $score) {
            $this->gamification->recordGame(
                $user,
                Game::findOrFail($score['game_id']),
                $score['answers'],
                $score['client_uuid'],
                CarbonImmutable::parse($score['played_at'])->min(CarbonImmutable::now()),
            );
            $report['game_scores']++;
        }

        return response()->json(['synced' => $report, 'server_time' => now()->toIso8601String()]);
    }
}
