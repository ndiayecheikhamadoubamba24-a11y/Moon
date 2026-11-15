<?php

namespace Tests\Feature;

use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicSiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_writes_and_publishes_a_publication(): void
    {
        $educator = User::factory()->staff('educator')->create();
        $id = $this->actingAs($educator)->postJson('/api/v1/admin/publications', [
            'title' => 'Journée de l\'hygiène menstruelle', 'body' => "Texte.\n\n## Programme\n- Atelier", 'category' => 'evenement',
        ])->assertCreated()->assertJsonPath('slug', 'journee-de-lhygiene-menstruelle')->assertJsonPath('status', 'draft')->json('id');

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/public/publications')->assertOk()->assertJsonCount(0, 'data');

        $this->actingAs($educator)->patchJson("/api/v1/admin/publications/{$id}", ['status' => 'published'])->assertOk();
        $this->assertNotNull(Publication::find($id)->published_at);

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/public/publications')->assertOk()->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.body');
        $this->getJson('/api/v1/public/publications/journee-de-lhygiene-menstruelle')->assertOk()->assertJsonPath('category', 'evenement');
        $this->assertSame(1, Publication::find($id)->views_count);
    }

    public function test_scheduled_and_draft_publications_stay_hidden(): void
    {
        Publication::create(['title' => 'Brouillon', 'slug' => 'brouillon', 'body' => 'x', 'status' => 'draft']);
        Publication::create(['title' => 'Plus tard', 'slug' => 'plus-tard', 'body' => 'x', 'status' => 'published', 'published_at' => now()->addDay()]);

        $this->getJson('/api/v1/public/publications')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/public/publications/brouillon')->assertNotFound();
        $this->getJson('/api/v1/public/publications/plus-tard')->assertNotFound();
    }

    public function test_only_content_roles_manage_publications(): void
    {
        $this->actingAs(User::factory()->staff('moderator')->create())->getJson('/api/v1/admin/publications')->assertForbidden();
        $this->actingAs(User::factory()->create())->postJson('/api/v1/admin/publications', ['title' => 'x', 'body' => 'x'])->assertForbidden();
    }

    public function test_public_summary_contains_no_personal_data(): void
    {
        User::factory()->count(3)->create();
        $this->getJson('/api/v1/public/summary')->assertOk()->assertJsonStructure(['modules', 'questions', 'games', 'centers'])->assertJsonMissingPath('users');
    }
}
