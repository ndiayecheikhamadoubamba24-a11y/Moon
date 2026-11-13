<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Category;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends CrudController
{
    protected string $model = Category::class;

    protected array $searchable = ['name'];

    protected string $orderBy = 'position';

    protected function rules(Request $request, ?Model $item): array
    {
        return [
            'name' => [$item ? 'sometimes' : 'required', 'string', 'max:100'],
            'slug' => ['nullable', 'string', 'max:100', Rule::unique('categories', 'slug')->ignore($item?->id)],
            'icon' => ['nullable', 'string', 'max:64'],
            'position' => ['nullable', 'integer'],
        ];
    }

    protected function beforeSave(Model $item, array $data, Request $request): void
    {
        $item->slug = $data['slug'] ?? $item->slug ?? Str::slug($data['name']);
    }
}
