<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Faq;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FaqController extends CrudController
{
    protected string $model = Faq::class;

    protected array $searchable = ['question', 'answer'];

    protected array $filters = ['category_id', 'language', 'is_published'];

    protected array $with = ['category:id,name'];

    protected function rules(Request $request, ?Model $item): array
    {
        $req = $item ? 'sometimes' : 'required';

        return [
            'category_id' => ['nullable', 'exists:categories,id'],
            'question' => [$req, 'string', 'max:2000'],
            'answer' => [$req, 'string', 'max:5000'],
            'language' => ['sometimes', Rule::in(['fr', 'wo'])],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    protected function beforeSave(Model $item, array $data, Request $request): void
    {
        $item->answered_by ??= $request->user()->id;
    }
}
