<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyLog extends Model
{
    public const MOODS = ['great', 'good', 'neutral', 'sad', 'crying', 'angry'];

    public const FLOWS = ['none', 'spotting', 'light', 'medium', 'heavy'];

    public const SYMPTOMS = [
        'cramps', 'headache', 'bloating', 'back_pain', 'fatigue', 'acne',
        'tender_breasts', 'nausea', 'cravings', 'insomnia', 'mood_swings',
    ];

    protected $fillable = ['date', 'mood', 'flow', 'pain_level', 'symptoms', 'notes'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'symptoms' => 'array',
            'notes' => 'encrypted', // données sensibles chiffrées au repos
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
