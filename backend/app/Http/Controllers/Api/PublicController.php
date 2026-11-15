<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Models\Module;
use App\Models\Publication;
use App\Models\Question;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Données publiques du site vitrine (sans connexion, sans aucune donnée personnelle). */
class PublicController extends Controller
{
    private const FIELDS = ['id', 'title', 'slug', 'category', 'excerpt', 'cover_image', 'featured', 'published_at'];

    public function publications(Request $request): JsonResponse
    {
        $request->validate(['category' => ['nullable', Rule::in(Publication::CATEGORIES)], 'per_page' => ['nullable', 'integer', 'between:1,24']]);

        return response()->json(
            Publication::visible()
                ->when($request->category, fn ($q, $c) => $q->where('category', $c))
                ->orderByDesc('featured')
                ->orderByDesc('published_at')
                ->paginate((int) $request->input('per_page', 9), self::FIELDS)
        );
    }

    public function publication(string $slug): JsonResponse
    {
        $publication = Publication::visible()->where('slug', $slug)->firstOrFail();
        $publication->increment('views_count');

        return response()->json([
            ...$publication->only([...self::FIELDS, 'body']),
            'related' => Publication::visible()->whereKeyNot($publication->id)->where('category', $publication->category)
                ->orderByDesc('published_at')->limit(3)->get(self::FIELDS),
        ]);
    }

    /** Quelques chiffres sur les contenus (aucune donnée sur les utilisatrices). */
    public function summary(): JsonResponse
    {
        return response()->json([
            'modules' => Module::visible()->count(),
            'questions' => Question::where('is_active', true)->whereHas('game', fn ($q) => $q->where('is_active', true))->count(),
            'games' => Game::where('is_active', true)->count(),
            'centers' => Resource::where('is_active', true)->where('type', '!=', 'hotline')->count(),
        ]);
    }
}
