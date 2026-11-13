<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Report extends Model
{
    public const REASONS = ['inappropriate', 'wrong_info', 'abuse', 'spam', 'other'];

    protected $fillable = ['reporter_id', 'reportable_type', 'reportable_id', 'reason', 'details'];

    public function reportable(): MorphTo
    {
        return $this->morphTo();
    }
}
