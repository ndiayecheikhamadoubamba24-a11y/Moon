<?php

namespace App\Console\Commands;

use App\Models\Reminder;
use App\Services\CycleService;
use App\Services\PushService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Rappels push (à planifier toutes les 15 minutes) :
 *  - period_soon : 2 jours avant les règles prévues, à l'heure choisie ;
 *  - daily_log / hydration : chaque jour à l'heure choisie ;
 *  - change_protection : toutes les N heures pendant les règles (8h-21h).
 * Mode discret (par défaut) : aucun mot explicite dans la notification.
 */
class SendReminders extends Command
{
    protected $signature = 'moon:send-reminders {--at= : Heure simulée HH:MM (tests)}';

    protected $description = 'Envoie les rappels push dus';

    public function handle(CycleService $cycles, PushService $push): int
    {
        $now = $this->option('at') ? CarbonImmutable::parse('today '.$this->option('at')) : CarbonImmutable::now();
        $slot = $now->format('H:i');
        $sent = 0;

        $reminders = Reminder::with('user')->where('enabled', true)->get()
            ->filter(fn ($r) => $r->user && $r->user->push_token && $r->user->status === 'active');

        foreach ($reminders as $reminder) {
            $user = $reminder->user;
            $discreet = $user->notification_settings['discreet'] ?? true;
            $message = null;

            switch ($reminder->type) {
                case 'period_soon':
                    $next = $cycles->for($user)->nextPeriodStart();
                    if ($next && $this->isDue($reminder->time ?? '09:00', $slot) && (int) $now->startOfDay()->diffInDays($next) === 2) {
                        $message = $discreet ? 'Un petit rappel de Moon 🌙' : 'Tes règles devraient arriver dans 2 jours. Pense à prendre une protection.';
                    }
                    break;
                case 'daily_log':
                    if ($this->isDue($reminder->time ?? '20:00', $slot)) {
                        $message = $discreet ? 'Comment s\'est passée ta journée ? 🌙' : 'Pense à noter ta journée dans ton journal.';
                    }
                    break;
                case 'hydration':
                    if ($this->isDue($reminder->time ?? '11:00', $slot)) {
                        $message = 'Pense à boire de l\'eau 💧';
                    }
                    break;
                case 'change_protection':
                    $interval = $reminder->interval_hours ?: 4;
                    $inPeriod = $cycles->for($user)->dayInfo($now->startOfDay())['is_period'];
                    if ($inPeriod && $now->hour >= 8 && $now->hour <= 21 && ($now->hour - 8) % $interval === 0 && $now->minute < 15) {
                        $message = $discreet ? 'Un petit rappel de Moon 🌙' : 'Pense à changer ta protection.';
                    }
                    break;
            }

            if ($message) {
                $sent += $push->send([$user->push_token], 'Moon', $message, ['type' => 'reminder', 'reminder' => $reminder->type]);
            }
        }

        $this->info("{$sent} rappel(s) envoyé(s).");

        return self::SUCCESS;
    }

    /** Vrai si l'heure du rappel tombe dans le créneau de 15 minutes courant. */
    private function isDue(string $time, string $slot): bool
    {
        $t = CarbonImmutable::parse('today '.substr($time, 0, 5));
        $s = CarbonImmutable::parse('today '.$slot);

        return $t->greaterThanOrEqualTo($s) && $t->lessThan($s->addMinutes(15));
    }
}
