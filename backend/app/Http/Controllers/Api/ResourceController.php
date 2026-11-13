<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resource;
use App\Models\ResourceSuggestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Carte et liste des centres (santé, conseils ados, ONG, distribution). */
class ResourceController extends Controller
{
    private const WALK_KMH = 5;

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['nullable', 'numeric', 'between:-90,90', 'required_with:lng'],
            'lng' => ['nullable', 'numeric', 'between:-180,180', 'required_with:lat'],
            'radius' => ['nullable', 'numeric', 'between:0.5,200'],
            'types' => ['nullable', 'array'],
            'types.*' => [Rule::in(Resource::TYPES)],
            'services' => ['nullable', 'array'],
            'services.*' => [Rule::in(Resource::SERVICES)],
            'open_now' => ['nullable', 'boolean'],
            'free' => ['nullable', 'boolean'],
            'accessible' => ['nullable', 'boolean'],
            'language' => ['nullable', 'string', 'max:8'],
            'q' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(['distance', 'name'])],
            // Rectangle visible de la carte (« Rechercher dans cette zone »)
            'bounds' => ['nullable', 'array:north,south,east,west'],
            'bounds.*' => ['numeric'],
        ]);

        $query = Resource::where('is_active', true)->where('type', '!=', 'hotline')
            ->when($data['types'] ?? null, fn ($q, $types) => $q->whereIn('type', $types))
            ->when($request->boolean('free'), fn ($q) => $q->where('is_free', true))
            ->when($request->boolean('accessible'), fn ($q) => $q->where('is_accessible', true))
            ->when($data['q'] ?? null, fn ($q, $term) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$term}%")
                ->orWhere('neighborhood', 'like', "%{$term}%")
                ->orWhere('city', 'like', "%{$term}%")))
            ->when($data['bounds'] ?? null, fn ($q, $b) => $q
                ->whereBetween('latitude', [$b['south'], $b['north']])
                ->whereBetween('longitude', [$b['west'], $b['east']]));

        // Pré-filtre rectangulaire sur le rayon (portable SQLite / PostgreSQL), puis distance exacte en PHP.
        if (isset($data['lat'], $data['radius'])) {
            $dLat = $data['radius'] / 111;
            $dLng = $data['radius'] / (111 * max(cos(deg2rad($data['lat'])), 0.01));
            $query->whereBetween('latitude', [$data['lat'] - $dLat, $data['lat'] + $dLat])
                ->whereBetween('longitude', [$data['lng'] - $dLng, $data['lng'] + $dLng]);
        }

        $results = $query->get()
            ->filter(fn (Resource $r) => empty($data['services']) || array_intersect($data['services'], $r->services ?? []) === $data['services'])
            ->filter(fn (Resource $r) => empty($data['language']) || in_array($data['language'], $r->languages ?? [], true))
            ->map(fn (Resource $r) => $this->present($r, $data['lat'] ?? null, $data['lng'] ?? null))
            ->filter(fn (array $r) => ! $request->boolean('open_now') || $r['opening']['open'])
            ->filter(fn (array $r) => ! isset($data['radius'], $data['lat']) || $r['distance_km'] <= $data['radius']);

        $results = ($data['sort'] ?? (isset($data['lat']) ? 'distance' : 'name')) === 'distance'
            ? $results->sortBy('distance_km')
            : $results->sortBy('name');

        return response()->json(['count' => $results->count(), 'data' => $results->values()]);
    }

    public function show(Request $request, Resource $resource): JsonResponse
    {
        abort_unless($resource->is_active, 404);
        $request->validate(['lat' => ['nullable', 'numeric'], 'lng' => ['nullable', 'numeric']]);

        return response()->json([
            ...$this->present($resource, $request->float('lat') ?: null, $request->float('lng') ?: null),
            'saved' => $request->user()->savedResources()->whereKey($resource->id)->exists(),
        ]);
    }

    /** Suggestions de recherche : quartiers et villes connus + centres correspondants. */
    public function places(Request $request): JsonResponse
    {
        $term = (string) $request->validate(['q' => ['required', 'string', 'min:1', 'max:60']])['q'];
        $active = Resource::where('is_active', true);

        $places = (clone $active)->where('neighborhood', 'like', "%{$term}%")->distinct()->pluck('neighborhood')
            ->merge((clone $active)->where('city', 'like', "%{$term}%")->distinct()->pluck('city'))
            ->filter()->unique()->take(8)->values();

        $centers = (clone $active)->where('type', '!=', 'hotline')->where('name', 'like', "%{$term}%")->limit(8)
            ->get(['id', 'name', 'type', 'neighborhood', 'city', 'latitude', 'longitude']);

        return response()->json(['places' => $places, 'centers' => $centers]);
    }

    /** Paquet compact pour consultation hors ligne (« Télécharger les centres de ma région »). */
    public function offline(Request $request): JsonResponse
    {
        $request->validate(['region' => ['nullable', 'string', 'max:64'], 'city' => ['nullable', 'string', 'max:64']]);
        $resources = Resource::where('is_active', true)
            // Les numéros utiles (lignes d'écoute, urgences) sont toujours inclus.
            ->when($request->region || $request->city, fn ($q) => $q->where(fn ($w) => $w
                ->where('type', 'hotline')
                ->orWhere(fn ($z) => $z
                    ->when($request->region, fn ($x, $r) => $x->where('region', $r))
                    ->when($request->city, fn ($x, $c) => $x->where('city', $c)))))
            ->get()
            ->map(fn (Resource $r) => $r->makeHidden(['created_at', 'updated_at', 'image']));

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'count' => $resources->count(),
            'data' => $resources,
        ]);
    }

    public function saved(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->savedResources()->where('is_active', true)->get()
                ->map(fn (Resource $r) => $this->present($r))
        );
    }

    public function save(Request $request, Resource $resource): JsonResponse
    {
        $request->user()->savedResources()->syncWithoutDetaching([$resource->id]);

        return response()->json(['saved' => true]);
    }

    public function unsave(Request $request, Resource $resource): JsonResponse
    {
        $request->user()->savedResources()->detach($resource->id);

        return response()->json(['saved' => false]);
    }

    /** « Proposer un centre à ajouter » / « Signaler une erreur sur cette fiche ». */
    public function suggest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'resource_id' => ['nullable', 'exists:resources,id'],
            'message' => ['required', 'string', 'max:2000'],
        ]);
        $suggestion = ResourceSuggestion::create([
            ...$data,
            'user_id' => $request->user()->id,
            'kind' => empty($data['resource_id']) ? 'new' : 'correction',
        ]);

        return response()->json($suggestion, 201);
    }

    private function present(Resource $r, ?float $lat = null, ?float $lng = null): array
    {
        $distance = ($lat !== null && $lng !== null) ? $r->distanceTo($lat, $lng) : null;

        return [
            ...$r->toArray(),
            'opening' => $r->openingStatus(),
            'distance_km' => $distance,
            'walking_minutes' => $distance !== null ? (int) ceil($distance / self::WALK_KMH * 60) : null,
        ];
    }
}
