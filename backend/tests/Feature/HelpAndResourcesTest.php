<?php

namespace Tests\Feature;

use App\Models\Resource;
use App\Models\User;
use Database\Seeders\ResourceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class HelpAndResourcesTest extends TestCase
{
    use RefreshDatabase;

    public function test_help_request_flow_hides_internal_notes(): void
    {
        $this->seed(ResourceSeeder::class);
        $user = User::factory()->create();
        $support = User::factory()->staff('support')->create();

        $res = $this->actingAs($user)->postJson('/api/v1/help-requests', [
            'type' => 'support', 'message' => 'J\'ai très mal pendant mes règles', 'urgent' => true,
        ])->assertCreated();
        $id = $res->json('request.id');
        $this->assertSame('urgent', $res->json('request.priority'));
        $this->assertNotEmpty($res->json('emergency_contacts'));

        $this->actingAs($support)->postJson("/api/v1/admin/help-requests/{$id}/messages", ['body' => 'Note équipe', 'is_internal' => true])->assertCreated();
        $this->actingAs($support)->postJson("/api/v1/admin/help-requests/{$id}/messages", ['body' => 'Bonjour, on est là.'])->assertCreated();

        $show = $this->actingAs($user)->getJson("/api/v1/help-requests/{$id}")->assertOk();
        $this->assertSame('in_progress', $show->json('status'));
        $this->assertSame(['Bonjour, on est là.'], collect($show->json('public_messages'))->pluck('body')->all());

        $this->actingAs(User::factory()->create())->getJson("/api/v1/help-requests/{$id}")->assertNotFound();
    }

    public function test_anonymous_question_is_anonymous_for_staff_and_can_become_faq(): void
    {
        $user = User::factory()->create(['name' => 'Secret']);
        $support = User::factory()->staff('support')->create();
        $id = $this->actingAs($user)->postJson('/api/v1/help-requests', [
            'type' => 'question', 'message' => 'Est-ce normal ?', 'is_anonymous' => true, 'faq_consent' => true,
        ])->json('request.id');

        $this->actingAs($support)->getJson("/api/v1/admin/help-requests/{$id}")->assertOk()
            ->assertJsonPath('user.name', 'Anonyme')
            ->assertJsonPath('user_id', null);

        $this->actingAs($support)->postJson("/api/v1/admin/help-requests/{$id}/faq", [
            'question' => 'Est-ce normal ?', 'answer' => 'Oui.',
        ])->assertCreated();
        $this->actingAs($user)->getJson('/api/v1/faqs?q=normal')->assertJsonPath('data.0.answer', 'Oui.');
    }

    public function test_resources_nearby_filters_and_opening_status(): void
    {
        Carbon::setTestNow('2026-11-09 10:00:00'); // lundi 10h
        $this->seed(ResourceSeeder::class);
        $user = User::factory()->create();

        $res = $this->actingAs($user)->getJson('/api/v1/resources?lat=14.7548&lng=-17.3940&radius=5')->assertOk();
        $first = $res->json('data.0');
        $this->assertStringContainsString('Pikine', $first['name']);
        $this->assertEquals(0.0, $first['distance_km']);
        $this->assertTrue($first['opening']['open']);
        $this->assertSame('17:00', $first['opening']['closes_at']);
        $this->assertNotContains('hotline', collect($res->json('data'))->pluck('type'));
        $this->assertNotContains('Thiès', collect($res->json('data'))->pluck('city'));

        $free = $this->actingAs($user)->getJson('/api/v1/resources?free=1&types[]=health_center')->json('data');
        $this->assertCount(1, $free);

        $services = $this->actingAs($user)->getJson('/api/v1/resources?services[]=protections&services[]=ecoute')->json('count');
        $this->assertSame(3, $services);

        Carbon::setTestNow('2026-11-14 15:00:00'); // samedi 15h
        $this->assertSame(0, $this->actingAs($user)->getJson('/api/v1/resources?open_now=1&lat=14.75&lng=-17.39&radius=3')->json('count'));
    }

    public function test_save_search_and_suggest_resource(): void
    {
        $this->seed(ResourceSeeder::class);
        $user = User::factory()->create();
        $resource = Resource::where('type', 'youth_center')->first();

        $this->actingAs($user)->postJson("/api/v1/resources/{$resource->id}/save")->assertOk();
        $this->actingAs($user)->getJson('/api/v1/resources/saved')->assertJsonCount(1);
        $this->actingAs($user)->getJson('/api/v1/resources/places?q=Pik')->assertJsonPath('places.0', 'Pikine');
        $this->actingAs($user)->postJson('/api/v1/resource-suggestions', ['message' => 'Nouveau centre à Rufisque'])->assertCreated()->assertJsonPath('kind', 'new');
        $this->actingAs($user)->getJson('/api/v1/resources/offline?region=Dakar')->assertOk()->assertJsonPath('count', 7);
    }
}
