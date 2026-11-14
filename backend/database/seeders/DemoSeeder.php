<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\CycleService;
use Illuminate\Database\Seeder;

/** Comptes de démonstration (hors production). Mot de passe : « password ». */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'admin@moon.test' => ['Fatou Diallo', 'super_admin'],
            'educatrice@moon.test' => ['Awa (éducatrice)', 'educator'],
            'moderation@moon.test' => ['Mariama (modération)', 'moderator'],
            'accompagnement@moon.test' => ['Aminata (accompagnement)', 'support'],
        ] as $email => [$name, $role]) {
            $user = User::firstOrNew(['email' => $email]);
            $user->fill(['name' => $name, 'password' => 'password', 'consented_at' => now()]);
            $user->forceFill(['role' => $role, 'email_verified_at' => now()])->save();
        }

        $bamba = User::firstOrNew(['email' => 'bamba@moon.test']);
        $bamba->fill([
            'name' => 'Bamba', 'password' => 'password', 'age_range' => '18-21', 'language' => 'fr',
            'consented_at' => now(), 'region' => 'Dakar',
        ])->save();

        if ($bamba->cycles()->doesntExist()) {
            // Trois cycles passés, le dernier commencé il y a 6 jours (jour 7 du cycle aujourd'hui).
            foreach ([90, 62, 34, 6] as $daysAgo) {
                $start = now()->subDays($daysAgo)->startOfDay();
                $bamba->cycles()->create([
                    'start_date' => $start->toDateString(),
                    'end_date' => $daysAgo === 6 ? $start->copy()->addDays(5)->toDateString() : $start->copy()->addDays(4)->toDateString(),
                ]);
            }
            CycleService::recomputeLengths($bamba);
        }
    }
}
