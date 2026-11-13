<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class GameTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(GameSeeder::class);
    }

    public function test_questions_are_served_without_answers(): void
    {
        $user = User::factory()->create();
        $game = Game::where('type', 'quiz')->first();

        $q = $this->actingAs($user)->getJson("/api/v1/games/{$game->id}")->assertOk()->json('questions.0');
        $this->assertArrayNotHasKey('answer', $q);
        $this->assertArrayNotHasKey('explanation', $q);

        $offline = $this->actingAs($user)->getJson("/api/v1/games/{$game->id}?offline=1")->json('questions.0');
        $this->assertArrayHasKey('answer', $offline);
    }

    public function test_check_answer_gives_explanation(): void
    {
        $user = User::factory()->create();
        $question = Game::where('type', 'quiz')->first()->questions()->first();

        $this->actingAs($user)->postJson("/api/v1/questions/{$question->id}/check", ['answer' => 'A'])
            ->assertOk()->assertJson(['correct' => true])->assertJsonPath('explanation', $question->explanation);
    }

    public function test_submitting_a_game_awards_points_badges_and_challenge(): void
    {
        $user = User::factory()->create();
        $game = Game::where('type', 'myth_fact')->first();
        $answers = $game->questions->map(fn ($q, $i) => [
            'question_id' => $q->id,
            'answer' => $i < 8 ? $q->answer : 'wrong',
        ])->all();

        $res = $this->actingAs($user)->postJson("/api/v1/games/{$game->id}/scores", ['answers' => $answers, 'client_uuid' => (string) Str::uuid()])
            ->assertCreated()
            ->assertJsonPath('score.score', 8)
            ->assertJsonPath('score.total', 10)
            ->assertJsonPath('streak_days', 1);

        // 8 × 10 points + 50 points du défi « 5 bonnes réponses d'affilée »
        $this->assertSame(130, $res->json('total_points'));
        $this->assertContains('first_step', collect($res->json('new_badges'))->pluck('code'));
        $this->assertCount(1, $res->json('challenges_completed'));
        $this->assertCount(2, $res->json('score.missed_question_ids'));
    }

    public function test_offline_replay_is_not_counted_twice(): void
    {
        $user = User::factory()->create();
        $game = Game::where('type', 'quiz')->first();
        $body = ['answers' => [['question_id' => $game->questions->first()->id, 'answer' => 'A']], 'client_uuid' => (string) Str::uuid()];

        $this->actingAs($user)->postJson("/api/v1/games/{$game->id}/scores", $body)->assertCreated();
        $this->actingAs($user)->postJson("/api/v1/games/{$game->id}/scores", $body)->assertOk()->assertJson(['duplicate' => true]);
        $this->assertSame(10, $user->fresh()->points);
    }

    public function test_association_answers(): void
    {
        $user = User::factory()->create();
        $game = Game::where('type', 'association')->first();
        $q = $game->questions->first();

        $this->actingAs($user)->postJson("/api/v1/questions/{$q->id}/check", ['answer' => ['0' => 0, '1' => 1, '2' => 2]])->assertJson(['correct' => true]);
        $this->actingAs($user)->postJson("/api/v1/questions/{$q->id}/check", ['answer' => ['0' => 1, '1' => 0, '2' => 2]])->assertJson(['correct' => false]);
    }

    public function test_leaderboard_is_opt_in_and_anonymous(): void
    {
        $visible = User::factory()->create(['leaderboard_opt_in' => true, 'name' => 'Visible']);
        $visible->forceFill(['points' => 100])->save();
        User::factory()->create(['leaderboard_opt_in' => false])->forceFill(['points' => 500])->save();

        $res = $this->actingAs($visible)->getJson('/api/v1/leaderboard')->assertOk();
        $this->assertCount(1, $res->json('entries'));
        $this->assertStringNotContainsString('Visible', $res->getContent());
    }
}
