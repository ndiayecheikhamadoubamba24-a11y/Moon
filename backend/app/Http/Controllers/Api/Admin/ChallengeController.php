<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Challenge;
use App\Models\Game;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChallengeController extends CrudController
{
    protected string $model = Challenge::class;

    protected array $searchable = ['title'];

    protected array $filters = ['is_active'];

    protected string $orderBy = 'starts_on';

    protected function rules(Request $request, ?Model $item): array
    {
        $req = $item ? 'sometimes' : 'required';

        return [
            'game_id' => ['nullable', 'exists:games,id'],
            'title' => [$req, 'string', 'max:150'],
            'description' => [$req, 'string', 'max:255'],
            'goal' => [$req, 'array'],
            'goal.type' => ['required_with:goal', Rule::in(['correct_streak', 'correct_answers', 'games_played'])],
            'goal.value' => ['required_with:goal', 'integer', 'min:1'],
            'goal.game_type' => ['nullable', Rule::in(Game::TYPES)],
            'reward_points' => ['sometimes', 'integer', 'between:0,1000'],
            'starts_on' => [$req, 'date'],
            'ends_on' => [$req, 'date', 'after_or_equal:starts_on'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
