<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Publication;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Publications du site vitrine (actualités, événements, campagnes, conseils). */
class PublicationController extends CrudController
{
    protected string $model = Publication::class;

    protected array $searchable = ['title', 'excerpt'];

    protected array $filters = ['category', 'status'];

    protected array $with = ['author:id,name'];

    protected string $orderBy = 'updated_at';

    protected function query(Request $request): Builder
    {
        return Publication::query()->orderByDesc('updated_at');
    }

    protected function rules(Request $request, ?Model $item): array
    {
        $req = $item ? 'sometimes' : 'required';

        return [
            'title' => [$req, 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:200', Rule::unique('publications', 'slug')->ignore($item?->id)],
            'category' => ['sometimes', Rule::in(Publication::CATEGORIES)],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'body' => [$req, 'string', 'max:50000'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', Rule::in(['draft', 'published'])],
            'featured' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ];
    }

    protected function beforeSave(Model $item, array $data, Request $request): void
    {
        if (! $item->slug || ! empty($data['slug'])) {
            $base = Str::slug($data['slug'] ?? $item->title) ?: 'publication';
            $slug = $base;
            $i = 2;
            while (Publication::where('slug', $slug)->when($item->exists, fn ($q) => $q->whereKeyNot($item->id))->exists()) {
                $slug = $base.'-'.$i++;
            }
            $item->slug = $slug;
        }
        $item->author_id ??= $request->user()->id;
        // Publier sans date = publier maintenant
        if ($item->status === 'published' && ! $item->published_at) {
            $item->published_at = now();
        }
    }
}
