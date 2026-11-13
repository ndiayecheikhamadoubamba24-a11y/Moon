<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\Challenge;
use App\Models\ChallengeProgress;
use App\Models\Game;
use App\Models\GameScore;
use App\Models\ModuleProgress;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class GamificationService
{
    /** Met à jour la série de jours consécutifs d'activité. */
    public function touchActivity(User $user, ?CarbonImmutable $on = null): void
    {
        $on ??= CarbonImmutable::today();
        $last = $user->last_activity_date ? CarbonImmutable::parse($user->last_activity_date) : null;

        if ($last && $last->isSameDay($on)) {
            return;
        }
        if ($last && $on->lessThan($last)) {
            return; // synchro hors ligne d'une activité plus ancienne
        }

        $user->streak_days = ($last && $last->addDay()->isSameDay($on)) ? $user->streak_days + 1 : 1;
        $user->last_activity_date = $on;
        $user->save();
    }

    /**
     * Corrige une partie et enregistre le score.
     *
     * @param  array<int, array{question_id:int, answer:mixed}>  $answers
     */
    public function recordGame(User $user, Game $game, array $answers, ?string $clientUuid = null, ?CarbonImmutable $playedAt = null): array
    {
        if ($clientUuid && ($existing = GameScore::where('client_uuid', $clientUuid)->where('user_id', $user->id)->first())) {
            return ['score' => $existing, 'duplicate' => true, 'new_badges' => [], 'is_record' => false, 'results' => []];
        }

        $questions = $game->questions()->where('is_active', true)->get()->keyBy('id');
        $results = [];
        $correct = 0;
        $streak = 0;
        $bestStreak = 0;
        $missed = [];
        $given = [];

        foreach ($answers as $item) {
            $question = $questions->get($item['question_id'] ?? null);
            if (! $question) {
                continue;
            }
            $ok = $question->isCorrect($item['answer'] ?? null);
            $given[$question->id] = $item['answer'] ?? null;
            $results[] = [
                'question_id' => $question->id,
                'correct' => $ok,
                'expected' => $question->answer,
                'explanation' => $question->explanation,
            ];
            if ($ok) {
                $correct++;
                $bestStreak = max($bestStreak, ++$streak);
            } else {
                $streak = 0;
                $missed[] = $question->id;
            }
        }

        $total = count($results);
        $points = $correct * $game->points_per_answer;
        $playedAt ??= CarbonImmutable::now();

        return DB::transaction(function () use ($user, $game, $correct, $total, $points, $missed, $given, $playedAt, $clientUuid, $results, $bestStreak) {
            $previousBest = (int) GameScore::where('user_id', $user->id)->where('game_id', $game->id)->max('score');

            $score = GameScore::create([
                'user_id' => $user->id,
                'game_id' => $game->id,
                'score' => $correct,
                'total' => $total,
                'points' => $points,
                'missed_question_ids' => $missed,
                'answers' => $given,
                'played_at' => $playedAt,
                'client_uuid' => $clientUuid,
            ]);

            $user->increment('points', $points);
            $this->touchActivity($user->refresh(), $playedAt->startOfDay());
            $challengeRewards = $this->updateChallenges($user, $game, $correct, $bestStreak);
            $newBadges = $this->awardBadges($user);

            return [
                'score' => $score,
                'duplicate' => false,
                'results' => $results,
                'is_record' => $correct > $previousBest && $previousBest > 0,
                'challenges_completed' => $challengeRewards,
                'new_badges' => $newBadges,
            ];
        });
    }

    private function updateChallenges(User $user, Game $game, int $correct, int $bestStreak): array
    {
        $completed = [];
        foreach (Challenge::current()->get() as $challenge) {
            $goal = $challenge->goal;
            if (! empty($goal['game_type']) && $goal['game_type'] !== $game->type) {
                continue;
            }
            if ($challenge->game_id && $challenge->game_id !== $game->id) {
                continue;
            }
            $progress = ChallengeProgress::firstOrNew(['user_id' => $user->id, 'challenge_id' => $challenge->id]);
            if ($progress->completed_at) {
                continue;
            }
            $value = (int) ($goal['value'] ?? 1);
            $progress->progress = min($value, match ($goal['type'] ?? '') {
                'correct_streak' => max((int) $progress->progress, $bestStreak),
                'correct_answers' => (int) $progress->progress + $correct,
                'games_played' => (int) $progress->progress + 1,
                default => (int) $progress->progress,
            });
            if ($progress->progress >= $value) {
                $progress->completed_at = now();
                $user->increment('points', $challenge->reward_points);
                $completed[] = ['id' => $challenge->id, 'title' => $challenge->title, 'reward_points' => $challenge->reward_points];
            }
            $progress->save();
        }

        return $completed;
    }

    /** Attribue les badges dont les critères sont remplis. Renvoie les nouveaux. */
    public function awardBadges(User $user): array
    {
        $owned = $user->badges()->pluck('badges.id')->all();
        $new = [];

        foreach (Badge::whereNotIn('id', $owned)->get() as $badge) {
            $value = (int) ($badge->criteria['value'] ?? 1);
            $reached = match ($badge->criteria['type'] ?? null) {
                'games_played' => GameScore::where('user_id', $user->id)->count() >= $value,
                'correct_answers' => GameScore::where('user_id', $user->id)->sum('score') >= $value,
                'perfect_score' => GameScore::where('user_id', $user->id)->whereColumn('score', 'total')->where('total', '>', 0)->count() >= $value,
                'streak' => $user->streak_days >= $value,
                'modules_completed' => ModuleProgress::where('user_id', $user->id)->whereNotNull('completed_at')->count() >= $value,
                'points' => $user->points >= $value,
                default => false,
            };
            if ($reached) {
                $user->badges()->attach($badge->id, ['earned_at' => now()]);
                $new[] = $badge;
            }
        }

        return $new;
    }
}
