<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Guide;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class GuideController extends CrudController
{
    protected string $model = Guide::class;

    protected array $searchable = ['title'];

    protected array $filters = ['kind', 'language', 'is_active'];

    protected function rules(Request $request, ?Model $item): array
    {
        $req = $item ? 'sometimes' : 'required';

        return [
            'kind' => ['sometimes', Rule::in(['practical', 'alert'])],
            'title' => [$req, 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:200', Rule::unique('guides', 'slug')->ignore($item?->id)],
            'body' => [$req, 'string'],
            'icon' => ['nullable', 'string', 'max:64'],
            'language' => ['sometimes', Rule::in(['fr', 'wo'])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function beforeSave(Model $item, array $data, Request $request): void
    {
        $item->slug = $data['slug'] ?? $item->slug ?? Str::slug($data['title']);
    }
}
