<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GameScore;
use App\Models\HelpRequest;
use App\Models\Module;
use App\Models\ModuleProgress;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Tableau de bord : uniquement des statistiques agrégées et anonymisées.
 * Les groupes de moins de 5 personnes sont masqués pour éviter la ré-identification.
 */
class DashboardController extends Controller
{
    private const MIN_GROUP = 5;

    public function __invoke(): JsonResponse
    {
        $users = User::where('role', User::ROLE_USER);
        $since30 = now()->subDays(30);

        $moduleStats = Module::where('status', 'published')
            ->withCount([
                'progress as started_count',
                'progress as completed_count' => fn ($q) => $q->whereNotNull('completed_at'),
            ])
            ->orderByDesc('views_count')->limit(10)
            ->get(['id', 'title', 'views_count'])
            ->map(fn ($m) => [
                ...$m->toArray(),
                'completion_rate' => $m->started_count ? round($m->completed_count / $m->started_count * 100, 1) : 0,
            ]);

        $started = ModuleProgress::count();
        $completed = ModuleProgress::whereNotNull('completed_at')->count();

        $resolved = HelpRequest::whereNotNull('first_response_at')->get(['created_at', 'first_response_at']);
        $avgResponseHours = $resolved->isEmpty() ? null
            : round($resolved->avg(fn ($h) => $h->created_at->diffInMinutes($h->first_response_at)) / 60, 1);

        return response()->json([
            'users' => [
                'total' => (clone $users)->count(),
                'active_30d' => (clone $users)->where('last_activity_date', '>=', $since30->toDateString())->count(),
                'new_30d' => (clone $users)->where('created_at', '>=', $since30)->count(),
                'by_age_range' => $this->masked((clone $users)->select('age_range', DB::raw('count(*) as total'))->groupBy('age_range')->pluck('total', 'age_range')),
                'by_region' => $this->masked((clone $users)->whereNotNull('region')->select('region', DB::raw('count(*) as total'))->groupBy('region')->pluck('total', 'region')),
            ],
            'modules' => [
                'published' => Module::where('status', 'published')->count(),
                'in_review' => Module::where('status', 'review')->count(),
                'completion_rate' => $started ? round($completed / $started * 100, 1) : 0,
                'top' => $moduleStats,
            ],
            'games' => [
                'plays_30d' => GameScore::where('played_at', '>=', $since30)->count(),
                'players_30d' => GameScore::where('played_at', '>=', $since30)->distinct('user_id')->count('user_id'),
                'average_score_rate' => round((float) GameScore::where('total', '>', 0)->avg(DB::raw('score * 100.0 / total')), 1),
            ],
            'help_requests' => [
                'open' => HelpRequest::where('status', '!=', 'resolved')->count(),
                'urgent_open' => HelpRequest::where('status', '!=', 'resolved')->where('priority', 'urgent')->count(),
                'unassigned' => HelpRequest::where('status', '!=', 'resolved')->whereNull('assigned_to')->count(),
                'response_rate' => HelpRequest::count() ? round(HelpRequest::whereNotNull('first_response_at')->count() / HelpRequest::count() * 100, 1) : 0,
                'avg_first_response_hours' => $avgResponseHours,
            ],
            'reports_open' => Report::where('status', 'open')->count(),
        ]);
    }

    private function masked($counts): array
    {
        return collect($counts)->mapWithKeys(fn ($n, $k) => [$k ?: 'non renseigné' => $n < self::MIN_GROUP ? '<'.self::MIN_GROUP : $n])->all();
    }
}
