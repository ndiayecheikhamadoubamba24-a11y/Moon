<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChallengeProgress extends Model
{
    protected $table = 'challenge_progress';

    protected $fillable = ['user_id', 'challenge_id', 'progress', 'completed_at'];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }
}
