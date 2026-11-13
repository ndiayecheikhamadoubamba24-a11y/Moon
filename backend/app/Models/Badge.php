<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Badge extends Model
{
    protected $fillable = ['code', 'name', 'description', 'icon', 'criteria'];

    protected function casts(): array
    {
        return ['criteria' => 'array'];
    }
}
