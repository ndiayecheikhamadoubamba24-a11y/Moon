<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameScore extends Model
{
    protected $fillable = ['user_id', 'game_id', 'score', 'total', 'points', 'missed_question_ids', 'played_at', 'client_uuid', 'answers'];

    protected function casts(): array
    {
        return ['missed_question_ids' => 'array', 'answers' => 'array', 'played_at' => 'datetime'];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
