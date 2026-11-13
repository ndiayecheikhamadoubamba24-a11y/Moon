<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Module;
use App\Models\ModuleSection;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Gestion des modules : brouillon → relecture → publication → archive. */
class ModuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Module::with(['category:id,name', 'author:id,name'])
                ->withCount('sections')
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->category_id, fn ($q, $c) => $q->where('category_id', $c))
                ->when($request->language, fn ($q, $l) => $q->where('language', $l))
                ->when($request->q, fn ($q, $t) => $q->where('title', 'like', "%{$t}%"))
                ->latest('updated_at')
                ->paginate(25)
        );
    }

    public function show(Module $module): JsonResponse
    {
        return response()->json($module->load(['category', 'sections', 'author:id,name']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $module = DB::transaction(function () use ($request, $data) {
            $module = new Module($data);
            $module->slug = $this->uniqueSlug($data['slug'] ?? $data['title']);
            $module->author_id = $request->user()->id;
            $module->status = 'draft';
            $module->save();
            $this->syncSections($module, $data['sections'] ?? []);

            return $module;
        });
        AuditLog::record('module.created', $module);

        return response()->json($module->load('sections'), 201);
    }

    public function update(Request $request, Module $module): JsonResponse
    {
        $data = $this->validated($request, $module);
        DB::transaction(function () use ($module, $data) {
            $module->fill($data);
            if (! empty($data['slug'])) {
                $module->slug = $this->uniqueSlug($data['slug'], $module->id);
            }
            $module->save();
            if (array_key_exists('sections', $data)) {
                $this->syncSections($module, $data['sections']);
            }
        });
        AuditLog::record('module.updated', $module);

        return response()->json($module->load('sections'));
    }

    /** Changement d'état du workflow. Publier/archiver : éducateur ou super admin. */
    public function transition(Request $request, Module $module): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Module::STATUSES)],
            'scheduled_at' => ['nullable', 'date', 'after:now'],
        ]);
        $allowed = [
            'draft' => ['review', 'archived'],
            'review' => ['draft', 'published', 'archived'],
            'published' => ['archived', 'draft'],
            'archived' => ['draft'],
        ];
        abort_unless(in_array($data['status'], $allowed[$module->status], true), 422, "Transition {$module->status} → {$data['status']} impossible.");
        abort_if($data['status'] === 'published' && $module->sections()->count() === 0, 422, 'Ajoute au moins une section avant de publier.');

        $from = $module->status;
        $module->status = $data['status'];
        if ($data['status'] === 'published') {
            $module->reviewer_id = $request->user()->id;
            $module->scheduled_at = $data['scheduled_at'] ?? null;
            $module->published_at = $data['scheduled_at'] ?? now();
        }
        $module->save();
        AuditLog::record('module.'.$data['status'], $module, ['from' => $from]);

        return response()->json($module);
    }

    public function destroy(Module $module): JsonResponse
    {
        abort_unless(request()->user()->hasRole(User::ROLE_SUPER_ADMIN) || $module->status === 'draft', 422, 'Archive le module plutôt que de le supprimer.');
        AuditLog::record('module.deleted', $module, ['title' => $module->title]);
        $module->delete();

        return response()->json(['message' => 'Supprimé.']);
    }

    private function validated(Request $request, ?Module $module = null): array
    {
        $sometimes = $module ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$sometimes, 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:200'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'level' => ['sometimes', Rule::in(['debutant', 'intermediaire', 'avance'])],
            'language' => ['sometimes', Rule::in(['fr', 'wo'])],
            'duration_minutes' => ['sometimes', 'integer', 'between:1,120'],
            'sections' => ['sometimes', 'array'],
            'sections.*.type' => ['required', Rule::in(ModuleSection::TYPES)],
            'sections.*.title' => ['nullable', 'string', 'max:200'],
            'sections.*.body' => ['nullable', 'string'],
            'sections.*.media_url' => ['nullable', 'string', 'max:500'],
            'sections.*.game_id' => ['nullable', 'exists:games,id'],
        ]);
    }

    private function syncSections(Module $module, array $sections): void
    {
        $module->sections()->delete();
        foreach (array_values($sections) as $i => $section) {
            $module->sections()->create([...$section, 'position' => $i]);
        }
    }

    private function uniqueSlug(string $source, ?int $ignoreId = null): string
    {
        $base = Str::slug($source) ?: 'module';
        $slug = $base;
        $i = 2;
        while (Module::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
