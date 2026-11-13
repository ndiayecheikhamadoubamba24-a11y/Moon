<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends Model
{
    use HasFactory;

    public const STATUSES = ['draft', 'review', 'published', 'archived'];

    protected $fillable = [
        'category_id', 'title', 'slug', 'summary', 'cover_image', 'level', 'language',
        'duration_minutes', 'scheduled_at',
    ];

    protected function casts(): array
    {
        return ['scheduled_at' => 'datetime', 'published_at' => 'datetime'];
    }

    /** Modules visibles dans l'app : publiés, ou programmés dont la date est passée. */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->where(fn ($q) => $q->whereNull('scheduled_at')->orWhere('scheduled_at', '<=', now()));
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(ModuleSection::class)->orderBy('position');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(ModuleProgress::class);
    }
}
