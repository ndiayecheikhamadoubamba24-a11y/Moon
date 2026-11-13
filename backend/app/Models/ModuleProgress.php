<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModuleProgress extends Model
{
    protected $table = 'module_progress';

    protected $fillable = ['user_id', 'module_id', 'progress', 'completed_at'];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }
}
