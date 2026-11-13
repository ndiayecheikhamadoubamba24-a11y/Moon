<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Faq;
use App\Models\Game;
use App\Models\Module;
use App\Models\User;
use Database\Seeders\ContentSeeder;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_users_cannot_access_back_office(): void
    {
        $this->actingAs(User::factory()->create())->getJson('/api/v1/admin/dashboard')->assertForbidden();
    }

    public function test_roles_are_enforced(): void
    {
        $educator = User::factory()->staff('educator')->create();
        $moderator = User::factory()->staff('moderator')->create();

        $this->actingAs($educator)->getJson('/api/v1/admin/modules')->assertOk();
        $this->actingAs($educator)->getJson('/api/v1/admin/users')->assertForbidden();
        $this->actingAs($educator)->getJson('/api/v1/admin/help-requests')->assertForbidden();
        $this->actingAs($moderator)->getJson('/api/v1/admin/users')->assertOk();
        $this->actingAs($moderator)->getJson('/api/v1/admin/modules')->assertForbidden();
        $this->actingAs($moderator)->getJson('/api/v1/admin/audit-logs')->assertForbidden();
        $this->actingAs(User::factory()->staff('super_admin')->create())->getJson('/api/v1/admin/audit-logs')->assertOk();
    }

    public function test_module_workflow_and_visibility(): void
    {
        $educator = User::factory()->staff('educator')->create();
        $user = User::factory()->create();

        $id = $this->actingAs($educator)->postJson('/api/v1/admin/modules', [
            'title' => 'Mon cycle expliqué',
            'sections' => [['type' => 'text', 'title' => 'Intro', 'body' => 'Bonjour']],
        ])->assertCreated()->assertJsonPath('slug', 'mon-cycle-explique')->json('id');

        $this->actingAs($user)->getJson('/api/v1/modules')->assertJsonCount(0, 'data');
        $this->actingAs($educator)->postJson("/api/v1/admin/modules/{$id}/status", ['status' => 'published'])->assertUnprocessable();
        $this->actingAs($educator)->postJson("/api/v1/admin/modules/{$id}/status", ['status' => 'review'])->assertOk();
        $this->actingAs($educator)->postJson("/api/v1/admin/modules/{$id}/status", ['status' => 'published'])->assertOk();

        $this->actingAs($user)->getJson('/api/v1/modules')->assertJsonCount(1, 'data');
        $this->actingAs($user)->getJson('/api/v1/modules/mon-cycle-explique')->assertOk()->assertJsonCount(1, 'sections');
        $this->actingAs($user)->putJson("/api/v1/modules/{$id}/progress", ['progress' => 100])->assertOk();
        $this->assertSame(1, Module::find($id)->views_count);
        $this->assertTrue(AuditLog::where('action', 'module.published')->exists());
    }

    public function test_user_management_never_exposes_health_data(): void
    {
        $moderator = User::factory()->staff('moderator')->create();
        $user = User::factory()->create();
        $user->cycles()->create(['start_date' => now()->subDays(2)->toDateString()]);

        $json = $this->actingAs($moderator)->getJson("/api/v1/admin/users/{$user->id}")->assertOk()->json();
        $this->assertArrayNotHasKey('cycles', $json);
        $this->assertArrayNotHasKey('cycle_length', $json);

        $this->actingAs($moderator)->postJson("/api/v1/admin/users/{$user->id}/suspend", ['reason' => 'Contenu inapproprié', 'days' => 7])->assertOk();
        $this->assertSame('suspended', $user->fresh()->status);
        $this->actingAs($user->fresh())->getJson('/api/v1/me')->assertForbidden();

        $this->actingAs($moderator)->postJson("/api/v1/admin/users/{$moderator->id}/suspend", ['reason' => 'x'])->assertUnprocessable();

        // La liste n'expose ni e-mail ni téléphone, seulement une référence
        $row = $this->actingAs($moderator)->getJson('/api/v1/admin/users')->assertOk()->json('data.0');
        $this->assertArrayNotHasKey('email', $row);
        $this->assertArrayNotHasKey('phone', $row);
        $this->assertMatchesRegularExpression('/^USR-[0-9A-Z]{5}$/', $row['reference']);
        $this->actingAs($moderator)->getJson('/api/v1/admin/users?q='.$row['reference'])->assertJsonPath('data.0.id', $row['id']);

        // Suspension temporaire levée automatiquement à échéance
        $this->travel(8)->days();
        $this->assertFalse($user->fresh()->isSuspended());
    }

    public function test_staff_can_give_a_temporary_password(): void
    {
        $moderator = User::factory()->staff('moderator')->create();
        $user = User::factory()->create(['phone' => '+221770000009']);
        $res = $this->actingAs($moderator)->postJson("/api/v1/admin/users/{$user->id}/reset-access", ['temporary_password' => true])->assertOk();
        $temp = $res->json('temporary_password');
        $this->assertSame(8, strlen($temp));

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/v1/auth/login', ['phone' => '+221770000009', 'password' => $temp])->assertOk();
    }

    public function test_dashboard_masks_small_groups(): void
    {
        User::factory()->count(6)->create(['age_range' => '15-17']);
        User::factory()->count(2)->create(['age_range' => '22-25']);
        $admin = User::factory()->staff('super_admin')->create();

        $this->actingAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk()
            ->assertJsonPath('users.total', 8)
            ->assertJsonPath('users.by_age_range.15-17', 6)
            ->assertJsonPath('users.by_age_range.22-25', '<5');
    }

    public function test_super_admin_creates_staff(): void
    {
        $admin = User::factory()->staff('super_admin')->create();
        $res = $this->actingAs($admin)->postJson('/api/v1/admin/staff', [
            'name' => 'Nouvelle éducatrice', 'email' => 'edu@moon.test', 'role' => 'educator',
        ])->assertCreated();
        $this->assertNotEmpty($res->json('temporary_password'));
        $this->assertSame('educator', User::where('email', 'edu@moon.test')->value('role'));
    }

    public function test_report_moderation_unpublishes_content(): void
    {
        $this->seed(ContentSeeder::class);
        $user = User::factory()->create();
        $moderator = User::factory()->staff('moderator')->create();
        $faq = Faq::first();

        $id = $this->actingAs($user)->postJson('/api/v1/reports', ['type' => 'faq', 'id' => $faq->id, 'reason' => 'wrong_info'])->assertCreated()->json('id');
        $this->actingAs($moderator)->patchJson("/api/v1/admin/reports/{$id}", ['status' => 'resolved', 'action' => 'unpublish'])->assertOk();
        $this->assertFalse($faq->fresh()->is_published);
    }

    public function test_question_bank_stats_bulk_and_import(): void
    {
        $this->seed(GameSeeder::class);
        $educator = User::factory()->staff('educator')->create();
        $player = User::factory()->create();
        $game = Game::where('type', 'quiz')->first();
        $q = $game->questions()->first();
        $this->actingAs($player)->postJson("/api/v1/games/{$game->id}/scores", ['answers' => [['question_id' => $q->id, 'answer' => 'A']]]);
        $this->actingAs($player)->postJson("/api/v1/games/{$game->id}/scores", ['answers' => [['question_id' => $q->id, 'answer' => 'C']]]);

        $row = collect($this->actingAs($educator)->getJson('/api/v1/admin/questions?per_page=100')->assertOk()->json('data'))->firstWhere('id', $q->id);
        $this->assertSame(2, $row['plays']);
        $this->assertEquals(50, $row['success_rate']);

        $stats = $this->actingAs($educator)->getJson("/api/v1/admin/questions/{$q->id}/stats")->assertOk();
        $this->assertCount(2, $stats->json('distribution'));

        $this->actingAs($educator)->getJson('/api/v1/admin/games-overview')->assertOk()->assertJsonPath('active_questions', 22);
        $this->actingAs($educator)->postJson('/api/v1/admin/questions/bulk', ['ids' => [$q->id], 'action' => 'deactivate'])->assertOk();
        $this->assertFalse($q->fresh()->is_active);

        $import = $this->actingAs($educator)->postJson('/api/v1/admin/questions/import?dry_run=1', ['rows' => [
            ['type' => 'quiz', 'enonce' => 'Question ?', 'options' => 'Oui|Non', 'reponse' => 'A', 'theme' => 'Hygiène'],
            ['type' => 'quiz', 'enonce' => '', 'options' => 'Oui', 'reponse' => 'C'],
        ]])->assertOk();
        $this->assertSame(1, $import->json('valid'));
        $this->assertSame(1, $import->json('invalid'));
    }
}
