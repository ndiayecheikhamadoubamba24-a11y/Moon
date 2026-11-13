<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ModuleSection extends Model
{
    public const TYPES = ['text', 'image', 'video', 'audio', 'infographic', 'quiz'];

    protected $fillable = ['type', 'title', 'body', 'media_url', 'game_id', 'position'];
}
