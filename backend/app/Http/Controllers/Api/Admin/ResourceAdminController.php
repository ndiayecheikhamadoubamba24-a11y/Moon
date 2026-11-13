<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Resource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Catalogue des ressources partenaires (centres, ONG, lignes d'écoute). */
class ResourceAdminController extends CrudController
{
    protected string $model = Resource::class;

    protected array $searchable = ['name', 'neighborhood', 'city'];

    protected array $filters = ['type', 'city', 'region', 'is_active'];

    protected string $orderBy = 'name';

    protected function rules(Request $request, ?Model $item): array
    {
        $req = $item ? 'sometimes' : 'required';

        return [
            'name' => [$req, 'string', 'max:200'],
            'type' => [$req, Rule::in(Resource::TYPES)],
            'description' => ['nullable', 'string', 'max:2000'],
            'address' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'phone' => ['nullable', 'string', 'max:32'],
            'image' => ['nullable', 'string', 'max:500'],
            'opening_hours' => ['nullable', 'array:mon,tue,wed,thu,fri,sat,sun'],
            'opening_hours.*' => ['nullable', 'array', 'size:2'],
            'opening_hours.*.*' => ['date_format:H:i'],
            'services' => ['nullable', 'array'],
            'services.*' => [Rule::in(Resource::SERVICES)],
            'languages' => ['nullable', 'array'],
            'languages.*' => ['string', 'max:8'],
            'is_free' => ['sometimes', 'boolean'],
            'is_confidential' => ['sometimes', 'boolean'],
            'is_accessible' => ['sometimes', 'boolean'],
            'walk_in' => ['sometimes', 'boolean'],
            'audience' => ['nullable', Rule::in(['girls', 'all'])],
            'is_emergency' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'verified_at' => ['nullable', 'date'],
        ];
    }
}
