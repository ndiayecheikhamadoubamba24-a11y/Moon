<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Tip;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TipController extends CrudController
{
    protected string $model = Tip::class;

    protected array $searchable = ['title', 'body'];

    protected array $filters = ['phase', 'topic', 'language', 'is_active'];

    protected function rules(Request $request, ?Model $item): array
    {
        $req = $item ? 'sometimes' : 'required';

        return [
            'phase' => [$req, Rule::in(Tip::PHASES)],
            'topic' => [$req, Rule::in(Tip::TOPICS)],
            'title' => [$req, 'string', 'max:150'],
            'body' => [$req, 'string', 'max:1000'],
            'icon' => ['nullable', 'string', 'max:64'],
            'language' => ['sometimes', Rule::in(['fr', 'wo'])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
