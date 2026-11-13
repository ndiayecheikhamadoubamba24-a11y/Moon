<?php

namespace Database\Seeders;

use App\Models\Resource;
use Illuminate\Database\Seeder;

/**
 * Centres d'EXEMPLE (noms et coordonnées fictifs, mentionnés « (exemple) »).
 * À remplacer par les centres partenaires réels, vérifiés par l'équipe.
 */
class ResourceSeeder extends Seeder
{
    public function run(): void
    {
        $week = ['mon' => ['08:00', '17:00'], 'tue' => ['08:00', '17:00'], 'wed' => ['08:00', '17:00'], 'thu' => ['08:00', '17:00'], 'fri' => ['08:00', '17:00']];
        $weekSat = $week + ['sat' => ['09:00', '13:00']];

        $centers = [
            ['Centre de conseils pour adolescents de Pikine (exemple)', 'youth_center', 'Pikine', 'Dakar', 14.7548, -17.3940, 'Quartier Pikine, près du marché (exemple)', $week, ['ecoute', 'infos', 'orientation', 'protections'], true, true, false, true, 'all'],
            ['Centre de santé de Guédiawaye (exemple)', 'health_center', 'Guédiawaye', 'Dakar', 14.7699, -17.4033, 'Guédiawaye centre (exemple)', $weekSat + ['mon' => ['08:00', '18:00']], ['consultation', 'planification', 'infos'], false, true, true, true, 'all'],
            ['Poste de santé des Parcelles Assainies (exemple)', 'health_center', 'Parcelles Assainies', 'Dakar', 14.7645, -17.4390, 'Unité 15 (exemple)', $week, ['consultation', 'infos'], true, true, false, false, 'all'],
            ['Centre de conseils pour adolescents de Médina (exemple)', 'youth_center', 'Médina', 'Dakar', 14.6828, -17.4466, 'Rue 11 x 22, Médina (exemple)', $weekSat, ['ecoute', 'infos', 'protections'], true, true, true, true, 'girls'],
            ['Association Lune Solidaire (exemple)', 'distribution', 'Thiaroye', 'Dakar', 14.7460, -17.3800, 'Thiaroye sur Mer (exemple)', ['wed' => ['14:00', '18:00'], 'sat' => ['09:00', '12:00']], ['protections', 'ecoute'], true, true, false, true, 'girls'],
            ['Centre de santé de Thiès (exemple)', 'health_center', 'Centre-ville', 'Thiès', 14.7910, -16.9359, 'Avenue principale (exemple)', $week, ['consultation', 'planification'], false, true, true, false, 'all'],
            ['Centre conseil ados de Kolda (exemple)', 'youth_center', 'Centre-ville', 'Kolda', 12.8939, -14.9410, 'Quartier Escale (exemple)', $week, ['ecoute', 'infos', 'orientation'], true, true, false, true, 'all'],
        ];

        foreach ($centers as [$name, $type, $hood, $city, $lat, $lng, $address, $hours, $services, $free, $confidential, $accessible, $walkIn, $audience]) {
            Resource::updateOrCreate(['name' => $name], [
                'type' => $type, 'neighborhood' => $hood, 'city' => $city, 'region' => $city === 'Kolda' ? 'Kolda' : ($city === 'Thiès' ? 'Thiès' : 'Dakar'),
                'latitude' => $lat, 'longitude' => $lng, 'address' => $address, 'opening_hours' => $hours, 'services' => $services,
                'languages' => ['fr', 'wo'], 'is_free' => $free, 'is_confidential' => $confidential, 'is_accessible' => $accessible,
                'walk_in' => $walkIn, 'audience' => $audience, 'phone' => '+221 77 000 00 00',
                'description' => 'Tu peux venir seule, on t\'écoute sans te juger. Tout est confidentiel.',
                'verified_at' => now()->toDateString(),
            ]);
        }

        // Numéros utiles : À VÉRIFIER avant mise en production.
        $hotlines = [
            ['Ligne d\'écoute (exemple)', '1000', 'Écoute et conseils, anonyme et gratuit (numéro d\'exemple).'],
            ['SAMU national (à vérifier)', '1515', 'Urgences médicales.'],
        ];
        foreach ($hotlines as [$name, $phone, $desc]) {
            Resource::updateOrCreate(['name' => $name], [
                'type' => 'hotline', 'phone' => $phone, 'description' => $desc, 'is_emergency' => true, 'is_free' => true, 'is_confidential' => true,
            ]);
        }
    }
}
