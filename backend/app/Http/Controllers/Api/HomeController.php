<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Challenge;
use App\Models\ChallengeProgress;
use App\Models\Game;
use App\Models\Module;
use App\Models\ModuleProgress;
use App\Models\Question;
use App\Models\Tip;
use App\Services\CycleService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Écran d'accueil en un seul appel (économise le réseau sur les connexions faibles).
 */
class HomeController extends Controller
{
    public function __construct(private CycleService $cycles) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $service = $this->cycles->for($user);
        $summary = $service->summary();
        $today = CarbonImmutable::today();
        $phase = $summary['today']['phase'];

        $week = $service->calendar($today->startOfWeek(CarbonImmutable::MONDAY), $today->endOfWeek(CarbonImmutable::SUNDAY)->startOfDay());
        $todayLog = $user->dailyLogs()->whereDate('date', $today->toDateString())->first();

        // Trois conseils du jour, un par thème, adaptés à la phase
        $tips = Tip::where('is_active', true)->where('language', $user->language)
            ->whereIn('phase', array_filter([$phase, 'any']))
            ->get()
            ->sortBy(fn (Tip $t) => $t->phase === 'any' ? 1 : 0)
            ->unique('topic')
            ->take(3)
            ->values();

        // Continuer d'apprendre : modules commencés, puis suggestions
        $inProgress = ModuleProgress::where('user_id', $user->id)->whereNull('completed_at')
            ->with('module:id,title,slug,cover_image,duration_minutes,status')
            ->latest('updated_at')->limit(3)->get()
            ->filter(fn ($p) => $p->module?->status === 'published')
            ->map(fn ($p) => [...$p->module->only(['id', 'title', 'slug', 'cover_image', 'duration_minutes']), 'progress' => $p->progress]);
        $seen = ModuleProgress::where('user_id', $user->id)->pluck('module_id');
        $suggested = Module::visible()->where('language', $user->language)->whereNotIn('id', $seen)
            ->latest('published_at')->limit(3)->get(['id', 'title', 'slug', 'cover_image', 'duration_minutes'])
            ->map(fn ($m) => [...$m->toArray(), 'progress' => 0]);

        // Défi du jour : une question « Mythe ou réalité ? » qui change chaque jour
        $mythGame = Game::where('is_active', true)->where('type', 'myth_fact')->where('language', $user->language)->first();
        $mythQuestions = $mythGame?->questions()->where('is_active', true)->get(['id', 'prompt', 'game_id']);
        $dailyMyth = $mythQuestions?->isNotEmpty() ? $mythQuestions[$today->dayOfYear % $mythQuestions->count()] : null;

        $challenge = Challenge::current()->orderBy('ends_on')->first();
        $challengeProgress = $challenge ? ChallengeProgress::where('user_id', $user->id)->where('challenge_id', $challenge->id)->first() : null;

        return response()->json([
            'user' => $user->only(['id', 'name', 'avatar', 'points', 'streak_days', 'mode', 'language']),
            'date' => $today->toDateString(),
            'cycle' => $summary,
            'week' => $week,
            'today_log' => $todayLog,
            'tips' => $tips,
            'continue_learning' => $inProgress->concat($suggested)->take(3)->values(),
            'daily_challenge' => $dailyMyth?->only(['id', 'prompt', 'game_id']),
            'weekly_challenge' => $challenge ? [
                ...$challenge->only(['id', 'title', 'description', 'reward_points', 'ends_on']),
                'progress' => (int) ($challengeProgress?->progress ?? 0),
                'target' => (int) ($challenge->goal['value'] ?? 1),
            ] : null,
            'pain_alert' => $phase === 'menstrual',
        ]);
    }
}
