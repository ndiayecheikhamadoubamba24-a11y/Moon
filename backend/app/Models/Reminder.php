<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reminder extends Model
{
    public const TYPES = ['period_soon', 'change_protection', 'hydration', 'daily_log'];

    protected $fillable = ['type', 'enabled', 'time', 'interval_hours'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return ['enabled' => 'boolean'];
    }
}
