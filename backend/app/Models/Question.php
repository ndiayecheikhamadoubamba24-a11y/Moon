<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    protected $fillable = ['topic', 'prompt', 'options', 'answer', 'explanation', 'hint', 'position', 'is_active', 'difficulty', 'module_id'];

    protected function casts(): array
    {
        return ['options' => 'array', 'answer' => 'array', 'is_active' => 'boolean', 'validated_at' => 'datetime'];
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /** Vérifie une réponse, quel que soit le type de jeu. */
    public function isCorrect(mixed $given): bool
    {
        $expected = $this->answer;
        if (is_array($expected) && is_array($given)) {
            ksort($expected);
            ksort($given);

            return array_map('strval', $expected) === array_map('strval', $given);
        }

        $expected = is_array($expected) ? ($expected['value'] ?? null) : $expected;

        return (string) $expected === (string) $given;
    }
}
