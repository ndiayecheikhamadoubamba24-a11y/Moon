<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cycle;
use App\Models\Tip;
use App\Services\CycleService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CycleController extends Controller
{
    public function __construct(private CycleService $cycles) {}

    public function summary(Request $request): JsonResponse
    {
        return response()->json($this->cycles->for($request->user())->summary());
    }

    /**
     * Calendrier : ?month=2026-11 (vue mois, semaines complètes), ?year=2026 (vue année),
     * ou ?from=…&to=… (366 jours max).
     */
    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'from' => ['nullable', 'date', 'required_with:to'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        if ($request->filled('year')) {
            $from = CarbonImmutable::create((int) $request->year, 1, 1);
            $to = $from->endOfYear()->startOfDay();
        } elseif ($request->filled('from')) {
            $from = CarbonImmutable::parse($request->from);
            $to = CarbonImmutable::parse($request->to);
            if ($from->diffInDays($to) > 366) {
                throw ValidationException::withMessages(['to' => 'Plage limitée à 366 jours.']);
            }
        } else {
            $month = CarbonImmutable::parse(($request->month ?? now()->format('Y-m')).'-01');
            $from = $month->startOfMonth()->startOfWeek(CarbonImmutable::MONDAY);
            $to = $month->endOfMonth()->endOfWeek(CarbonImmutable::SUNDAY)->startOfDay();
        }

        $service = $this->cycles->for($request->user());

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'days' => $service->calendar($from, $to),
            'summary' => $service->summary(),
        ]);
    }

    /** Fiche du jour : phase, conseil « quoi faire », journal. */
    public function day(Request $request, string $date): JsonResponse
    {
        $day = CarbonImmutable::parse($date);
        $user = $request->user();
        $info = $this->cycles->for($user)->dayInfo($day);
        $log = $user->dailyLogs()->whereDate('date', $day->toDateString())->first();

        return response()->json([
            ...$info,
            'tip' => $this->tipFor($info['phase'], $user->language, $day),
            'log' => $log,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->cycles()->orderByDesc('start_date')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start_date' => ['required', 'date', 'before_or_equal:today'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date', 'before_or_equal:today'],
        ]);
        $cycle = $this->saveCycle($request, new Cycle, $data);

        return response()->json($cycle, 201);
    }

    public function update(Request $request, Cycle $cycle): JsonResponse
    {
        $this->authorizeOwner($request, $cycle);
        $data = $request->validate([
            'start_date' => ['sometimes', 'date', 'before_or_equal:today'],
            'end_date' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        return response()->json($this->saveCycle($request, $cycle, $data));
    }

    public function destroy(Request $request, Cycle $cycle): JsonResponse
    {
        $this->authorizeOwner($request, $cycle);
        $cycle->delete();
        CycleService::recomputeLengths($request->user());

        return response()->json(['message' => 'Supprimé.']);
    }

    /** Bouton « Mes règles ont commencé ». */
    public function startPeriod(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => ['nullable', 'date', 'before_or_equal:today']]);
        $date = CarbonImmutable::parse($data['date'] ?? 'today');
        $user = $request->user();

        // Clôture un éventuel cycle resté ouvert.
        $open = $user->cycles()->whereNull('end_date')->whereDate('start_date', '<', $date->toDateString())->latest('start_date')->first();
        if ($open) {
            $estimatedEnd = CarbonImmutable::parse($open->start_date)->addDays($this->cycles->for($user)->averagePeriodLength() - 1);
            $open->update(['end_date' => $estimatedEnd->min($date->subDay())]);
        }

        $cycle = $this->saveCycle($request, new Cycle, ['start_date' => $date->toDateString()]);

        return response()->json([
            'cycle' => $cycle,
            'summary' => $this->cycles->for($user)->summary(),
        ], 201);
    }

    /** Bouton « Mes règles sont terminées ». */
    public function endPeriod(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => ['nullable', 'date', 'before_or_equal:today']]);
        $date = CarbonImmutable::parse($data['date'] ?? 'today');
        $user = $request->user();

        $cycle = $user->cycles()->whereDate('start_date', '<=', $date->toDateString())->latest('start_date')->first();
        if (! $cycle) {
            throw ValidationException::withMessages(['date' => 'Aucunes règles en cours.']);
        }
        $cycle->update(['end_date' => $date->toDateString()]);

        return response()->json([
            'cycle' => $cycle->fresh(),
            'summary' => $this->cycles->for($user)->summary(),
        ]);
    }

    private function saveCycle(Request $request, Cycle $cycle, array $data): Cycle
    {
        $user = $request->user();
        $start = $data['start_date'] ?? $cycle->start_date?->toDateString();

        $duplicate = $user->cycles()->whereDate('start_date', $start)->when($cycle->exists, fn ($q) => $q->whereKeyNot($cycle->id))->exists();
        if ($duplicate) {
            throw ValidationException::withMessages(['start_date' => 'Des règles sont déjà enregistrées à cette date.']);
        }
        if (array_key_exists('end_date', $data) && $data['end_date'] && $data['end_date'] < $start) {
            throw ValidationException::withMessages(['end_date' => 'La fin doit être après le début.']);
        }

        $cycle->fill($data);
        $cycle->user()->associate($user);
        $cycle->save();
        CycleService::recomputeLengths($user);

        return $cycle->fresh();
    }

    private function authorizeOwner(Request $request, Cycle $cycle): void
    {
        abort_unless($cycle->user_id === $request->user()->id, 404);
    }

    private function tipFor(?string $phase, string $language, CarbonImmutable $day): ?Tip
    {
        $tips = Tip::where('is_active', true)
            ->where('language', $language)
            ->whereIn('phase', array_filter([$phase, 'any']))
            ->orderBy('id')
            ->get();

        // Conseil stable pour une date donnée, qui change chaque jour.
        return $tips->isEmpty() ? null : $tips[$day->dayOfYear % $tips->count()];
    }
}
