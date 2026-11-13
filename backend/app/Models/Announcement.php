<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = ['title', 'body', 'audience', 'push', 'scheduled_at'];

    protected function casts(): array
    {
        return ['audience' => 'array', 'push' => 'boolean', 'scheduled_at' => 'datetime', 'sent_at' => 'datetime'];
    }
}
