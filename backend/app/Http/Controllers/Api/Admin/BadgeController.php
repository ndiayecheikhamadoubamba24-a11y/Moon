<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Badge;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BadgeController extends CrudController
{
    protected string $model = Badge::class;

    protected array $searchable = ['name', 'code'];

    protected function rules(Request $request, ?Model $item): array
    {
        $req = $item ? 'sometimes' : 'required';

        return [
            'code' => [$req, 'string', 'max:64', Rule::unique('badges', 'code')->ignore($item?->id)],
            'name' => [$req, 'string', 'max:100'],
            'description' => [$req, 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:64'],
            'criteria' => [$req, 'array'],
            'criteria.type' => ['required_with:criteria', Rule::in(['games_played', 'correct_answers', 'perfect_score', 'streak', 'modules_completed', 'points'])],
            'criteria.value' => ['required_with:criteria', 'integer', 'min:1'],
        ];
    }
}
