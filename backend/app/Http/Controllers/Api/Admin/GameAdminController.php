<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Game;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GameAdminController extends CrudController
{
    protected string $model = Game::class;

    protected array $searchable = ['title'];

    protected array $filters = ['type', 'language', 'is_active'];

    protected function query(Request $request): Builder
    {
        return Game::withCount('questions');
    }

    protected function rules(Request $request, ?Model $item): array
    {
        $req = $item ? 'sometimes' : 'required';

        return [
            'type' => [$req, Rule::in(Game::TYPES)],
            'title' => [$req, 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'duration_minutes' => ['sometimes', 'integer', 'between:1,60'],
            'points_per_answer' => ['sometimes', 'integer', 'between:1,100'],
            'language' => ['sometimes', Rule::in(['fr', 'wo'])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
