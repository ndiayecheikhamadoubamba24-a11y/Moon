<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyLog;
use App\Services\GamificationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DailyLogController extends Controller
{
    public function __construct(private GamificationService $gamification) {}

    public static function rules(): array
    {
        return [
            'mood' => ['nullable', Rule::in(DailyLog::MOODS)],
            'flow' => ['nullable', Rule::in(DailyLog::FLOWS)],
            'pain_level' => ['nullable', 'integer', 'between:0,10'],
            'symptoms' => ['nullable', 'array'],
            'symptoms.*' => [Rule::in(DailyLog::SYMPTOMS)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date']]);
        $from = $request->input('from', now()->subDays(90)->toDateString());
        $to = $request->input('to', now()->toDateString());

        return response()->json(
            $request->user()->dailyLogs()->whereDate('date', '>=', $from)->whereDate('date', '<=', $to)->orderBy('date')->get()
        );
    }

    public function show(Request $request, string $date): JsonResponse
    {
        $log = $request->user()->dailyLogs()->whereDate('date', CarbonImmutable::parse($date)->toDateString())->first();

        return response()->json($log);
    }

    /** Crée ou met à jour le journal d'un jour (PUT /logs/2026-11-09). */
    public function upsert(Request $request, string $date): JsonResponse
    {
        $day = CarbonImmutable::parse($date);
        abort_if($day->isFuture(), 422, 'Impossible de noter un jour futur.');
        $data = $request->validate(self::rules());

        $log = self::save($request->user(), $day, $data);
        $this->gamification->touchActivity($request->user(), CarbonImmutable::today());

        return response()->json($log);
    }

    public function destroy(Request $request, string $date): JsonResponse
    {
        $request->user()->dailyLogs()->whereDate('date', CarbonImmutable::parse($date)->toDateString())->delete();

        return response()->json(['message' => 'Supprimé.']);
    }

    public static function save($user, CarbonImmutable $day, array $data): DailyLog
    {
        $log = $user->dailyLogs()->whereDate('date', $day->toDateString())->first()
            ?? new DailyLog(['date' => $day->toDateString()]);
        $log->fill($data);
        $log->user()->associate($user);
        $log->save();

        return $log;
    }
}
