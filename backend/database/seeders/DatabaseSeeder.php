<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Contenus de départ (à faire valider par un professionnel de santé)
        $this->call([ContentSeeder::class, GameSeeder::class]);

        // Hors production seulement : centres d'exemple, comptes et publications de démonstration.
        // En production, l'équipe ajoute les vrais centres depuis le back-office.
        if (! app()->environment('production')) {
            $this->call(ResourceSeeder::class);
            $this->call([DemoSeeder::class, PublicationSeeder::class]);
        }
    }
}
