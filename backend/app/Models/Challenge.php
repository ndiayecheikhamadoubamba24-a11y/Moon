<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Challenge extends Model
{
    protected $fillable = ['game_id', 'title', 'description', 'goal', 'reward_points', 'starts_on', 'ends_on', 'is_active'];

    protected function casts(): array
    {
        return ['goal' => 'array', 'starts_on' => 'date:Y-m-d', 'ends_on' => 'date:Y-m-d', 'is_active' => 'boolean'];
    }

    public function scopeCurrent(Builder $query): Builder
    {
        $today = now()->toDateString();

        return $query->where('is_active', true)->whereDate('starts_on', '<=', $today)->whereDate('ends_on', '>=', $today);
    }
}
