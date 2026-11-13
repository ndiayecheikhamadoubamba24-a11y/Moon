<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tip extends Model
{
    public const PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal', 'any'];

    public const TOPICS = ['alimentation', 'activite', 'hygiene', 'repos', 'douleur', 'hydratation', 'bien_etre'];

    protected $fillable = ['phase', 'topic', 'title', 'body', 'icon', 'language', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
