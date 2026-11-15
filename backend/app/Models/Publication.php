<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Publication extends Model
{
    public const CATEGORIES = ['actualite', 'evenement', 'campagne', 'conseil'];

    protected $fillable = ['title', 'slug', 'category', 'excerpt', 'body', 'cover_image', 'status', 'featured', 'published_at'];

    protected function casts(): array
    {
        return ['featured' => 'boolean', 'published_at' => 'datetime'];
    }

    /** Publications visibles sur le site : publiées et dont la date est passée. */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', 'published')->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
