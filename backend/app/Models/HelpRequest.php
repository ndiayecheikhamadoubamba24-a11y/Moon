<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HelpRequest extends Model
{
    public const TYPES = ['information', 'support', 'protections', 'medical', 'question'];

    public const STATUSES = ['received', 'in_progress', 'resolved'];

    public const PRIORITIES = ['normal', 'urgent'];

    protected $fillable = ['type', 'subject', 'message', 'is_anonymous', 'faq_consent', 'priority'];

    protected function casts(): array
    {
        return [
            'is_anonymous' => 'boolean',
            'faq_consent' => 'boolean',
            'first_response_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(HelpMessage::class)->orderBy('created_at');
    }

    public function publicMessages(): HasMany
    {
        return $this->messages()->where('is_internal', false);
    }
}
