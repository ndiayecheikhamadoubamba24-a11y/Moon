<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\AuditLog;
use App\Models\Resource;
use App\Models\ResourceSuggestion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Catalogue des ressources partenaires (centres, ONG, lignes d'écoute). */
class ResourceAdminController extends CrudController
{
    protected string $model = Resource::class;

    protected array $searchable = ['name', 'neighborhood', 'city'];

    protected array $filters = ['type', 'city', 'region', 'is_active'];

    protected string $orderBy = 'name';

    protected function query(Request $request): Builder
    {
        $stale = now()->subMonths(6)->toDateString();

        return Resource::query()
            ->when($request->to_verify === '1', fn ($q) => $q->where(fn ($w) => $w->whereNull('verified_at')->orWhere('verified_at', '<', $stale)))
            ->when($request->position === 'unconfirmed', fn ($q) => $q->where(fn ($w) => $w->where('position_confirmed', false)->orWhereNull('latitude')));
    }

    /** Compteurs « Centres et contacts ». */
    public function overview(): JsonResponse
    {
        $centers = Resource::where('type', '!=', 'hotline');
        $stale = now()->subMonths(6)->toDateString();
        $byRegion = (clone $centers)->where('is_active', true)->get(['region', 'verified_at', 'position_confirmed'])->groupBy(fn ($r) => $r->region ?: 'Autres');

        return response()->json([
            'published' => (clone $centers)->where('is_active', true)->count(),
            'youth_centers' => (clone $centers)->where('type', 'youth_center')->where('is_active', true)->count(),
            'health_centers' => (clone $centers)->where('type', 'health_center')->where('is_active', true)->count(),
            'to_verify' => (clone $centers)->where(fn ($w) => $w->whereNull('verified_at')->orWhere('verified_at', '<', $stale))->count(),
            'position_unconfirmed' => (clone $centers)->where(fn ($w) => $w->where('position_confirmed', false)->orWhereNull('latitude'))->count(),
            'suggestions_pending' => ResourceSuggestion::where('status', 'pending')->count(),
            'hotlines' => Resource::where('type', 'hotline')->count(),
            // Part des centres vérifiés et positionnés, par région
            'coverage' => $byRegion->map(fn ($g, $region) => [
                'region' => $region,
                'count' => $g->count(),
                'percent' => round($g->filter(fn ($r) => $r->position_confirmed && $r->verified_at && $r->verified_at >= $stale)->count() / max($g->count(), 1) * 100),
            ])->values(),
        ]);
    }

    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'action' => ['required', Rule::in(['verify', 'deactivate', 'activate', 'region'])],
            'region' => ['required_if:action,region', 'nullable', 'string', 'max:100'],
        ]);
        $q = Resource::whereIn('id', $data['ids']);
        $count = match ($data['action']) {
            'verify' => $q->update(['verified_at' => now()->toDateString()]),
            'deactivate' => $q->update(['is_active' => false]),
            'activate' => $q->update(['is_active' => true]),
            'region' => $q->update(['region' => $data['region']]),
        };
        AuditLog::record('resource.bulk_'.$data['action'], null, ['ids' => $data['ids']]);

        return response()->json(['updated' => $count]);
    }

    /** Import de centres (lignes lues du CSV dans le navigateur). ?dry_run=1 pour vérifier. */
    public function import(Request $request): JsonResponse
    {
        $request->validate(['rows' => ['required', 'array', 'max:2000']]);
        $types = ['conseils' => 'youth_center', 'youth_center' => 'youth_center', 'sante' => 'health_center', 'santé' => 'health_center', 'health_center' => 'health_center', 'ong' => 'ngo', 'ngo' => 'ngo', 'protections' => 'distribution', 'distribution' => 'distribution'];
        $rows = [];
        foreach ($request->rows as $i => $row) {
            $errors = [];
            $type = $types[mb_strtolower(trim($row['type'] ?? ''))] ?? null;
            if (blank($row['nom'] ?? null)) {
                $errors[] = 'Nom manquant.';
            }
            if (! $type) {
                $errors[] = 'Type inconnu.';
            }
            $lat = is_numeric($row['latitude'] ?? null) ? (float) $row['latitude'] : null;
            $lng = is_numeric($row['longitude'] ?? null) ? (float) $row['longitude'] : null;
            if (($lat !== null && abs($lat) > 90) || ($lng !== null && abs($lng) > 180)) {
                $errors[] = 'Coordonnées invalides.';
            }
            $rows[] = ['line' => $i + 1, 'name' => $row['nom'] ?? '', 'errors' => $errors];
            if (! $errors && ! $request->boolean('dry_run')) {
                Resource::create([
                    'name' => $row['nom'], 'type' => $type, 'address' => $row['adresse'] ?? null, 'neighborhood' => $row['quartier'] ?? null,
                    'city' => $row['ville'] ?? null, 'region' => $row['region'] ?? null, 'phone' => $row['telephone'] ?? null,
                    'latitude' => $lat, 'longitude' => $lng, 'is_free' => in_array(mb_strtolower($row['gratuit'] ?? ''), ['oui', '1', 'true'], true),
                    'is_active' => false, // publication après vérification
                ]);
            }
        }
        $invalid = collect($rows)->filter(fn ($r) => $r['errors'])->count();

        return response()->json(['rows' => $rows, 'valid' => count($rows) - $invalid, 'invalid' => $invalid]);
    }

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
            'position_confirmed' => ['sometimes', 'boolean'],
        ];
    }
}
