<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Game;
use App\Models\Question;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Banque de questions (filtrable par jeu : ?game_id=). */
class QuestionController extends CrudController
{
    protected string $model = Question::class;

    protected array $searchable = ['prompt', 'topic'];

    protected array $filters = ['game_id', 'is_active'];

    protected string $orderBy = 'position';

    protected function rules(Request $request, ?Model $item): array
    {
        $type = Game::find($request->input('game_id', $item?->game_id))?->type;
        $req = $item ? 'sometimes' : 'required';

        return [
            'game_id' => [$req, 'exists:games,id'],
            'topic' => ['nullable', 'string', 'max:100'],
            'prompt' => [$req, 'string', 'max:1000'],
            'options' => [$type === 'myth_fact' ? 'nullable' : $req, 'nullable', 'array'],
            'answer' => [$req, ...match ($type) {
                'myth_fact' => [Rule::in(['myth', 'fact'])],
                'association' => ['array'],
                default => ['string', 'max:10'],
            }],
            'explanation' => ['nullable', 'string', 'max:1000'],
            'hint' => ['nullable', 'string', 'max:500'],
            'position' => ['nullable', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function beforeSave(Model $item, array $data, Request $request): void
    {
        if (isset($data['game_id'])) {
            $item->game_id = $data['game_id'];
        }
    }
}
