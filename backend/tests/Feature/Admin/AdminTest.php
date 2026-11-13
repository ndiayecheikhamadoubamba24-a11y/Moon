<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Faq;
use App\Models\Module;
use App\Models\User;
use Database\Seeders\ContentSeeder;
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

        $this->actingAs($moderator)->postJson("/api/v1/admin/users/{$user->id}/suspend")->assertOk();
        $this->assertSame('suspended', $user->fresh()->status);
        $this->actingAs($user->fresh())->getJson('/api/v1/me')->assertForbidden();

        $this->actingAs($moderator)->postJson("/api/v1/admin/users/{$moderator->id}/suspend")->assertUnprocessable();
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
}
