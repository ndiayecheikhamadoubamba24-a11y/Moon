<?php

namespace App\Services;

use App\Models\Cycle;
use App\Models\DailyLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

/**
 * Calculs du cycle menstruel : phase du jour, prévisions (règles, période
 * féconde, ovulation) et détection des irrégularités.
 *
 * Hypothèses (estimations éducatives, pas un avis médical) :
 *  - la longueur du cycle est la moyenne des 6 derniers cycles complets
 *    (bornés à 15-60 jours), sinon la valeur saisie par l'utilisatrice ;
 *  - l'ovulation a lieu ~14 jours avant les règles suivantes ;
 *  - la période féconde va de J-5 à J+1 autour de l'ovulation.
 */
class CycleService
{
    public const SHORT_CYCLE = 21;

    public const LONG_CYCLE = 35;

    public const LATE_AFTER_DAYS = 7;

    public const LUTEAL_LENGTH = 14;

    private User $user;

    /** @var Collection<int, Cycle> */
    private Collection $cycles;

    public function for(User $user): self
    {
        $clone = clone $this;
        $clone->user = $user;
        $clone->cycles = $user->cycles()->orderBy('start_date')->get();

        return $clone;
    }

    public function cycles(): Collection
    {
        return $this->cycles;
    }

    /** Recalcule la durée de chaque cycle à partir du début du suivant. */
    public static function recomputeLengths(User $user): void
    {
        $cycles = $user->cycles()->orderBy('start_date')->get()->values();
        foreach ($cycles as $i => $cycle) {
            $next = $cycles[$i + 1] ?? null;
            $length = $next ? (int) $cycle->start_date->diffInDays($next->start_date) : null;
            if ($cycle->cycle_length !== $length) {
                $cycle->cycle_length = $length;
                $cycle->save();
            }
        }
    }

    public function averageCycleLength(): int
    {
        $lengths = $this->cycles->pluck('cycle_length')->filter(fn ($l) => $l >= 15 && $l <= 60)->take(-6);

        return $lengths->isNotEmpty() ? (int) round($lengths->avg()) : (int) ($this->user->cycle_length ?: 28);
    }

    public function averagePeriodLength(): int
    {
        $lengths = $this->cycles
            ->filter(fn (Cycle $c) => $c->end_date !== null)
            ->map(fn (Cycle $c) => (int) $c->start_date->diffInDays($c->end_date) + 1)
            ->filter(fn ($l) => $l >= 1 && $l <= 12)
            ->take(-6);

        return $lengths->isNotEmpty() ? (int) round($lengths->avg()) : (int) ($this->user->period_length ?: 5);
    }

    public function lastCycle(): ?Cycle
    {
        return $this->cycles->last();
    }

    /** Cycle en cours de règles (commencé, non terminé, dans la durée plausible). */
    public function openCycle(?CarbonImmutable $today = null): ?Cycle
    {
        $today ??= CarbonImmutable::today();
        $last = $this->lastCycle();
        if (! $last || $last->end_date !== null) {
            return null;
        }

        return $last->start_date->diffInDays($today) < 12 ? $last : null;
    }

    /** Dernier jour de règles d'un cycle (réel ou estimé). */
    public function periodEnd(Cycle $cycle, ?CarbonImmutable $today = null): CarbonImmutable
    {
        $today ??= CarbonImmutable::today();
        if ($cycle->end_date) {
            return CarbonImmutable::parse($cycle->end_date);
        }
        $estimated = CarbonImmutable::parse($cycle->start_date)->addDays($this->averagePeriodLength() - 1);
        // Règles en cours non clôturées : on étend jusqu'à aujourd'hui (max 11 jours).
        if ($this->openCycle($today)?->is($cycle) && $today->greaterThan($estimated)) {
            return $today;
        }

        return $estimated;
    }

    /** Débuts de règles prévus jusqu'à $until (inclus). */
    public function predictedStarts(CarbonImmutable $until): array
    {
        $last = $this->lastCycle();
        if (! $last) {
            return [];
        }
        $length = $this->averageCycleLength();
        $starts = [];
        $next = CarbonImmutable::parse($last->start_date)->addDays($length);
        $today = CarbonImmutable::today();
        // Retard : la prochaine date prévue ne peut pas être dans le passé.
        if ($next->lessThan($today) && ! $this->openCycle($today)) {
            $next = $today;
        }
        while ($next->lessThanOrEqualTo($until) && count($starts) < 30) {
            $starts[] = $next;
            $next = $next->addDays($length);
        }

        return $starts;
    }

    public function nextPeriodStart(): ?CarbonImmutable
    {
        return $this->predictedStarts(CarbonImmutable::today()->addDays(120))[0] ?? null;
    }

    /**
     * Informations sur un jour : jour du cycle, phase, statut (règles, prévues, féconde, ovulation).
     */
    public function dayInfo(CarbonImmutable $date): array
    {
        $info = [
            'date' => $date->toDateString(),
            'cycle_day' => null,
            'cycle_length' => $this->averageCycleLength(),
            'phase' => null,
            'is_period' => false,
            'is_predicted_period' => false,
            'is_fertile' => false,
            'is_ovulation' => false,
        ];

        if ($this->cycles->isEmpty()) {
            return $info;
        }

        $avgLength = $this->averageCycleLength();
        $avgPeriod = $this->averagePeriodLength();

        // Début de cycle de référence : dernier début réel <= date, sinon début prévu.
        $actual = $this->cycles->filter(fn (Cycle $c) => $c->start_date->lessThanOrEqualTo($date))->last();
        if (! $actual) {
            return $info; // avant le premier cycle enregistré
        }

        $start = CarbonImmutable::parse($actual->start_date);
        $isPredicted = false;
        $cycleLength = $actual->cycle_length ?: $avgLength;

        if ($actual->is($this->lastCycle())) {
            foreach (array_reverse($this->predictedStarts($date)) as $predicted) {
                if ($predicted->lessThanOrEqualTo($date)) {
                    $start = $predicted;
                    $isPredicted = true;
                    $cycleLength = $avgLength;
                    break;
                }
            }
        }

        $cycleDay = (int) $start->diffInDays($date) + 1;
        $periodEnd = $isPredicted ? $start->addDays($avgPeriod - 1) : $this->periodEnd($actual);
        $inPeriod = $date->lessThanOrEqualTo($periodEnd);

        $ovulationDay = max($cycleLength - self::LUTEAL_LENGTH, 8);
        $fertileStart = $ovulationDay - 5;
        $fertileEnd = $ovulationDay + 1;

        $info['cycle_day'] = $cycleDay;
        $info['cycle_length'] = $cycleLength;
        $info['is_period'] = $inPeriod && ! $isPredicted;
        $info['is_predicted_period'] = $inPeriod && $isPredicted;
        $info['is_ovulation'] = $cycleDay === $ovulationDay;
        $info['is_fertile'] = ! $inPeriod && $cycleDay >= $fertileStart && $cycleDay <= $fertileEnd;
        $info['phase'] = match (true) {
            $inPeriod => 'menstrual',
            abs($cycleDay - $ovulationDay) <= 1 => 'ovulation',
            $cycleDay < $ovulationDay => 'follicular',
            default => 'luteal',
        };

        return $info;
    }

    /** Calendrier sur une plage de dates, avec les jours ayant une note dans le journal. */
    public function calendar(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $logs = DailyLog::where('user_id', $this->user->id)
            ->whereDate('date', '>=', $from->toDateString())->whereDate('date', '<=', $to->toDateString())
            ->get()
            ->keyBy(fn (DailyLog $l) => $l->date->toDateString());

        $today = CarbonImmutable::today()->toDateString();
        $days = [];
        foreach (CarbonPeriod::create($from, $to) as $day) {
            $info = $this->dayInfo(CarbonImmutable::parse($day));
            $log = $logs->get($info['date']);
            $info['is_today'] = $info['date'] === $today;
            $info['has_log'] = $log !== null;
            $info['has_symptoms'] = $log !== null && ! empty($log->symptoms);
            $days[] = $info;
        }

        return $days;
    }

    /** Irrégularités détectées, avec un message éducatif. */
    public function irregularities(): array
    {
        $alerts = [];
        $lengths = $this->cycles->pluck('cycle_length')->filter()->values();

        $last = $lengths->last();
        if ($last !== null && $last < self::SHORT_CYCLE) {
            $alerts[] = [
                'type' => 'short_cycle',
                'message' => "Ton dernier cycle a duré {$last} jours, c'est plus court que d'habitude. "
                    .'Si cela se répète, parles-en à un professionnel de santé.',
            ];
        }
        if ($last !== null && $last > self::LONG_CYCLE) {
            $alerts[] = [
                'type' => 'long_cycle',
                'message' => "Ton dernier cycle a duré {$last} jours. Des cycles longs arrivent, surtout les "
                    .'premières années, mais si cela se répète, parles-en à un professionnel de santé.',
            ];
        }
        if ($lengths->count() >= 2 && ($lengths->take(-6)->max() - $lengths->take(-6)->min()) > 7) {
            $alerts[] = [
                'type' => 'irregular',
                'message' => "La durée de tes cycles varie beaucoup. C'est fréquent à l'adolescence ; "
                    .'continue de noter tes règles et consulte si cela t\'inquiète.',
            ];
        }

        $lastCycle = $this->lastCycle();
        if ($lastCycle) {
            $expected = CarbonImmutable::parse($lastCycle->start_date)->addDays($this->averageCycleLength());
            $late = (int) $expected->diffInDays(CarbonImmutable::today(), false);
            if ($late >= self::LATE_AFTER_DAYS) {
                $alerts[] = [
                    'type' => 'late',
                    'days' => $late,
                    'message' => "Tes règles ont {$late} jours de retard par rapport à l'estimation. "
                        .'Le stress, la fatigue ou un changement de rythme peuvent jouer. '
                        .'Si le retard continue, parles-en à un professionnel de santé.',
                ];
            }
        }

        return $alerts;
    }

    /** Résumé pour l'écran d'accueil. */
    public function summary(): array
    {
        $today = CarbonImmutable::today();
        $info = $this->dayInfo($today);
        $next = $this->nextPeriodStart();
        $open = $this->openCycle($today);

        return [
            'has_data' => $this->cycles->isNotEmpty(),
            'today' => $info,
            'average_cycle_length' => $this->averageCycleLength(),
            'average_period_length' => $this->averagePeriodLength(),
            'period_in_progress' => $open !== null || $info['is_period'],
            'current_cycle_id' => $this->lastCycle()?->id,
            'next_period_date' => $next?->toDateString(),
            'days_until_next_period' => $next ? (int) $today->diffInDays($next) : null,
            'next_ovulation_date' => $this->nextOvulation()?->toDateString(),
            'irregularities' => $this->irregularities(),
        ];
    }

    public function nextOvulation(): ?CarbonImmutable
    {
        $next = $this->nextPeriodStart();
        if (! $next) {
            return null;
        }
        // Jour d'ovulation = longueur du cycle - 14 (ex. J14 pour 28 jours), soit la veille de J-14.
        $ovulation = $next->subDays(self::LUTEAL_LENGTH + 1);
        if ($ovulation->lessThan(CarbonImmutable::today())) {
            $ovulation = $ovulation->addDays($this->averageCycleLength());
        }

        return $ovulation;
    }
}
