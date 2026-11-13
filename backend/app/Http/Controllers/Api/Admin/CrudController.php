<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD générique pour les contenus simples du back-office.
 * Chaque sous-classe déclare son modèle, ses règles de validation et ses filtres.
 */
abstract class CrudController extends Controller
{
    /** @var class-string<Model> */
    protected string $model;

    protected array $searchable = [];

    protected array $filters = [];

    protected array $with = [];

    protected string $orderBy = 'id';

    abstract protected function rules(Request $request, ?Model $item): array;

    protected function query(Request $request): Builder
    {
        return $this->model::query();
    }

    protected function beforeSave(Model $item, array $data, Request $request): void {}

    public function index(Request $request): JsonResponse
    {
        $query = $this->query($request)->with($this->with);
        foreach ($this->filters as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }
        if ($request->filled('q') && $this->searchable) {
            $query->where(function ($w) use ($request) {
                foreach ($this->searchable as $col) {
                    $w->orWhere($col, 'like', '%'.$request->q.'%');
                }
            });
        }

        return response()->json($query->orderBy($this->orderBy)->paginate(min((int) $request->input('per_page', 25), 100)));
    }

    public function show(string $id): JsonResponse
    {
        return response()->json($this->find($id)->load($this->with));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules($request, null));
        $item = new $this->model;
        $item->fill($data);
        $this->beforeSave($item, $data, $request);
        $item->save();
        AuditLog::record(strtolower(class_basename($this->model)).'.created', $item);

        return response()->json($item->fresh($this->with), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $item = $this->find($id);
        $data = $request->validate($this->rules($request, $item));
        $item->fill($data);
        $this->beforeSave($item, $data, $request);
        $item->save();
        AuditLog::record(strtolower(class_basename($this->model)).'.updated', $item);

        return response()->json($item->fresh($this->with));
    }

    public function destroy(string $id): JsonResponse
    {
        $item = $this->find($id);
        AuditLog::record(strtolower(class_basename($this->model)).'.deleted', $item);
        $item->delete();

        return response()->json(['message' => 'Supprimé.']);
    }

    protected function find(string $id): Model
    {
        return $this->model::findOrFail($id);
    }
}
