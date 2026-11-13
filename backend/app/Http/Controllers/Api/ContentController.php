<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Faq;
use App\Models\Guide;
use App\Models\Module;
use App\Models\ModuleProgress;
use App\Models\Tip;
use App\Services\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContentController extends Controller
{
    public function __construct(private GamificationService $gamification) {}

    public function categories(): JsonResponse
    {
        return response()->json(Category::orderBy('position')->get());
    }

    public function modules(Request $request): JsonResponse
    {
        $user = $request->user();
        $modules = Module::visible()
            ->with('category:id,name,slug,icon')
            ->where('language', $request->input('language', $user->language))
            ->when($request->filled('category'), fn ($q) => $q->whereHas('category', fn ($c) => $c->where('slug', $request->category)))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w
                ->where('title', 'like', '%'.$request->q.'%')
                ->orWhere('summary', 'like', '%'.$request->q.'%')))
            ->orderByDesc('published_at')
            ->paginate(20);

        $progress = ModuleProgress::where('user_id', $user->id)
            ->whereIn('module_id', $modules->pluck('id'))
            ->get()->keyBy('module_id');

        $modules->getCollection()->transform(function (Module $m) use ($progress) {
            $m->setAttribute('progress', $progress->get($m->id)?->progress ?? 0);
            $m->setAttribute('completed', (bool) $progress->get($m->id)?->completed_at);

            return $m;
        });

        return response()->json($modules);
    }

    public function module(Request $request, string $slug): JsonResponse
    {
        $module = Module::visible()->where('slug', $slug)->with(['category:id,name,slug', 'sections'])->firstOrFail();
        $module->increment('views_count');
        $progress = ModuleProgress::where('user_id', $request->user()->id)->where('module_id', $module->id)->first();

        return response()->json([...$module->toArray(), 'progress' => $progress?->progress ?? 0, 'completed' => (bool) $progress?->completed_at]);
    }

    public function progress(Request $request, Module $module): JsonResponse
    {
        abort_unless($module->status === 'published', 404);
        $data = $request->validate(['progress' => ['required', 'integer', 'between:0,100']]);
        $user = $request->user();

        $progress = ModuleProgress::firstOrNew(['user_id' => $user->id, 'module_id' => $module->id]);
        $progress->progress = max((int) $progress->progress, $data['progress']);
        $newBadges = [];
        if ($progress->progress >= 100 && ! $progress->completed_at) {
            $progress->completed_at = now();
            $progress->save();
            $user->increment('points', 20);
            $newBadges = $this->gamification->awardBadges($user);
        }
        $progress->save();
        $this->gamification->touchActivity($user);

        return response()->json(['progress' => $progress, 'new_badges' => $newBadges]);
    }

    public function tips(Request $request): JsonResponse
    {
        $request->validate([
            'phase' => ['nullable', Rule::in(Tip::PHASES)],
            'topic' => ['nullable', Rule::in(Tip::TOPICS)],
        ]);

        return response()->json(
            Tip::where('is_active', true)
                ->where('language', $request->user()->language)
                ->when($request->phase, fn ($q) => $q->whereIn('phase', [$request->phase, 'any']))
                ->when($request->topic, fn ($q) => $q->where('topic', $request->topic))
                ->get()
        );
    }

    public function guides(Request $request): JsonResponse
    {
        return response()->json(
            Guide::where('is_active', true)
                ->where('language', $request->user()->language)
                ->when($request->kind, fn ($q) => $q->where('kind', $request->kind))
                ->get(['id', 'kind', 'title', 'slug', 'icon'])
        );
    }

    public function guide(string $slug): JsonResponse
    {
        return response()->json(Guide::where('is_active', true)->where('slug', $slug)->firstOrFail());
    }

    public function faqs(Request $request): JsonResponse
    {
        return response()->json(
            Faq::where('is_published', true)
                ->with('category:id,name,slug')
                ->where('language', $request->user()->language)
                ->when($request->filled('category'), fn ($q) => $q->whereHas('category', fn ($c) => $c->where('slug', $request->category)))
                ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w
                    ->where('question', 'like', '%'.$request->q.'%')
                    ->orWhere('answer', 'like', '%'.$request->q.'%')))
                ->latest()
                ->paginate(30)
        );
    }
}
