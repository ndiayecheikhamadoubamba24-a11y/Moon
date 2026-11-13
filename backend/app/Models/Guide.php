<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Guide extends Model
{
    protected $fillable = ['kind', 'title', 'slug', 'body', 'icon', 'language', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
