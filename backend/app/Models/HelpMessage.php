<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HelpMessage extends Model
{
    protected $fillable = ['sender_id', 'from_staff', 'is_internal', 'body'];

    protected function casts(): array
    {
        return ['from_staff' => 'boolean', 'is_internal' => 'boolean'];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
