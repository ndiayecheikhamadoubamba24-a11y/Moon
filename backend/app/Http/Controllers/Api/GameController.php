<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Models\Challenge;
use App\Models\ChallengeProgress;
use App\Models\Game;
use App\Models\GameScore;
use App\Models\Question;
use App\Models\User;
use App\Services\GamificationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function __construct(private GamificationService $gamification) {}

    /** Écran « Jouer » : jeux, série, défi de la semaine, badges. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $best = GameScore::where('user_id', $user->id)
            ->selectRaw('game_id, max(score) as best, count(*) as plays')
            ->groupBy('game_id')->get()->keyBy('game_id');

        $games = Game::where('is_active', true)
            ->where('language', $user->language)
            ->withCount(['questions' => fn ($q) => $q->where('is_active', true)])
            ->get()
            ->map(fn (Game $g) => [
                ...$g->toArray(),
                'best_score' => (int) ($best->get($g->id)?->best ?? 0),
                'plays' => (int) ($best->get($g->id)?->plays ?? 0),
            ]);

        return response()->json([
            'points' => $user->points,
            'streak_days' => $user->streak_days,
            'played_today' => $user->last_activity_date?->isToday() ?? false,
            'week' => $this->weekActivity($user),
            'challenge' => $this->currentChallenge($user),
            'games' => $games,
            'badges' => $this->badgeList($user)->take(4)->values(),
        ]);
    }

    /** Questions d'un jeu, sans les réponses. ?offline=1 inclut les réponses pour jouer hors ligne. */
    public function show(Request $request, Game $game): JsonResponse
    {
        abort_unless($game->is_active, 404);
        $offline = $request->boolean('offline');

        $questions = $game->questions()->where('is_active', true)->get()->map(function (Question $q) use ($game, $offline) {
            $data = $q->only(['id', 'topic', 'prompt', 'options', 'hint']);
            if ($game->type === 'association' && ! $offline && is_array($q->options['right'] ?? null)) {
                // Mélange déterministe de la colonne de droite (les indices de réponse restent ceux d'origine)
                $data['options']['right_order'] = collect(array_keys($q->options['right']))->shuffle($q->id)->values();
            }
            if ($offline) {
                $data['answer'] = $q->answer;
                $data['explanation'] = $q->explanation;
            }

            return $data;
        });

        return response()->json([...$game->toArray(), 'questions' => $questions]);
    }

    /** Vérifie une réponse pendant la partie (écran « Bonne réponse ! » + « À retenir »). */
    public function check(Request $request, Question $question): JsonResponse
    {
        $request->validate(['answer' => ['present']]);

        return response()->json([
            'correct' => $question->isCorrect($request->input('answer')),
            'expected' => $question->answer,
            'explanation' => $question->explanation,
        ]);
    }

    /** Fin de partie : correction, points, record, badges, défi. */
    public function submit(Request $request, Game $game): JsonResponse
    {
        $data = $request->validate([
            'answers' => ['required', 'array', 'min:1', 'max:50'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.answer' => ['present'],
            'client_uuid' => ['nullable', 'uuid'],
            'played_at' => ['nullable', 'date', 'before_or_equal:now'],
        ]);

        $result = $this->gamification->recordGame(
            $request->user(),
            $game,
            $data['answers'],
            $data['client_uuid'] ?? null,
            isset($data['played_at']) ? CarbonImmutable::parse($data['played_at']) : null,
        );
        $user = $request->user()->fresh();

        return response()->json([
            ...$result,
            'total_points' => $user->points,
            'streak_days' => $user->streak_days,
            'level' => ProfileController::level($user->points),
        ], $result['duplicate'] ? 200 : 201);
    }

    public function badges(Request $request): JsonResponse
    {
        return response()->json($this->badgeList($request->user()));
    }

    /** Classement optionnel et anonyme : seules les participantes volontaires y figurent, sous un alias. */
    public function leaderboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $top = User::where('role', User::ROLE_USER)
            ->where('leaderboard_opt_in', true)
            ->where('status', 'active')
            ->orderByDesc('points')
            ->limit(50)
            ->get(['id', 'points', 'avatar']);

        return response()->json([
            'opted_in' => $user->leaderboard_opt_in,
            'entries' => $top->values()->map(fn (User $u, $i) => [
                'rank' => $i + 1,
                'alias' => 'Lune #'.str_pad((string) (crc32('moon'.$u->id) % 10000), 4, '0', STR_PAD_LEFT),
                'avatar' => $u->avatar,
                'points' => $u->points,
                'is_me' => $u->id === $user->id,
            ]),
        ]);
    }

    public function challenge(Request $request): JsonResponse
    {
        return response()->json($this->currentChallenge($request->user()));
    }

    private function currentChallenge(User $user): ?array
    {
        $challenge = Challenge::current()->orderBy('ends_on')->first();
        if (! $challenge) {
            return null;
        }
        $progress = ChallengeProgress::where('user_id', $user->id)->where('challenge_id', $challenge->id)->first();

        return [
            ...$challenge->toArray(),
            'progress' => (int) ($progress?->progress ?? 0),
            'target' => (int) ($challenge->goal['value'] ?? 1),
            'completed' => (bool) $progress?->completed_at,
            'days_left' => (int) now()->startOfDay()->diffInDays($challenge->ends_on),
        ];
    }

    private function badgeList(User $user)
    {
        $earned = $user->badges()->get()->keyBy('id');

        return Badge::orderBy('id')->get()->map(fn (Badge $b) => [
            ...$b->toArray(),
            'earned' => $earned->has($b->id),
            'earned_at' => $earned->get($b->id)?->pivot->earned_at,
        ])->sortByDesc('earned')->values();
    }

    private function weekActivity(User $user): array
    {
        // Jours joués sur les 7 derniers jours (pastilles de la série)
        $played = GameScore::where('user_id', $user->id)
            ->where('played_at', '>=', now()->subDays(6)->startOfDay())
            ->get(['played_at'])
            ->map(fn ($s) => $s->played_at->toDateString())
            ->unique();

        return collect(range(6, 0))->map(fn ($i) => [
            'date' => $d = now()->subDays($i)->toDateString(),
            'done' => $played->contains($d),
        ])->all();
    }
}
