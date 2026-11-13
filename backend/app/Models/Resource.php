<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Resource extends Model
{
    use HasFactory;

    public const TYPES = ['youth_center', 'health_center', 'ngo', 'distribution', 'hotline'];

    public const SERVICES = ['ecoute', 'consultation', 'protections', 'planification', 'infos', 'orientation'];

    protected $fillable = [
        'name', 'type', 'description', 'address', 'neighborhood', 'city', 'region', 'latitude',
        'longitude', 'phone', 'image', 'opening_hours', 'services', 'languages', 'is_free',
        'is_confidential', 'is_accessible', 'walk_in', 'audience', 'is_emergency', 'is_active', 'verified_at', 'position_confirmed',
    ];

    protected function casts(): array
    {
        return [
            'opening_hours' => 'array',
            'services' => 'array',
            'languages' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'is_free' => 'boolean',
            'is_confidential' => 'boolean',
            'is_accessible' => 'boolean',
            'walk_in' => 'boolean',
            'is_emergency' => 'boolean',
            'is_active' => 'boolean',
            'verified_at' => 'date:Y-m-d',
            'position_confirmed' => 'boolean',
        ];
    }

    private const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    /** État d'ouverture : ouvert/fermé, heure de fermeture ou prochaine ouverture. */
    public function openingStatus(?CarbonInterface $at = null): array
    {
        $at ??= now();
        $hours = $this->opening_hours ?? [];
        $today = $hours[self::DAY_KEYS[$at->dayOfWeek]] ?? null;
        $time = $at->format('H:i');

        if ($today && $time >= $today[0] && $time < $today[1]) {
            return ['open' => true, 'closes_at' => $today[1]];
        }
        if ($today && $time < $today[0]) {
            return ['open' => false, 'opens_at' => $today[0], 'opens_day' => 'today'];
        }
        for ($i = 1; $i <= 7; $i++) {
            $day = $at->copy()->addDays($i);
            if ($slot = $hours[self::DAY_KEYS[$day->dayOfWeek]] ?? null) {
                return ['open' => false, 'opens_at' => $slot[0], 'opens_day' => $i === 1 ? 'tomorrow' : self::DAY_KEYS[$day->dayOfWeek]];
            }
        }

        return ['open' => false];
    }

    /** Distance en km (formule de Haversine). */
    public function distanceTo(float $lat, float $lng): ?float
    {
        if ($this->latitude === null || $this->longitude === null) {
            return null;
        }
        $r = 6371;
        $dLat = deg2rad($this->latitude - $lat);
        $dLng = deg2rad($this->longitude - $lng);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat)) * cos(deg2rad($this->latitude)) * sin($dLng / 2) ** 2;

        return round($r * 2 * atan2(sqrt($a), sqrt(1 - $a)), 1);
    }
}
