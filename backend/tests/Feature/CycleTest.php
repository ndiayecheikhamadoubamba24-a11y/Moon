<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-09 10:00:00'); // lundi
    }

    private function userWithHistory(): User
    {
        $user = User::factory()->create();
        foreach (['2026-08-10', '2026-09-07', '2026-10-05', '2026-11-03'] as $start) {
            $this->actingAs($user)->postJson('/api/v1/cycles', [
                'start_date' => $start,
                'end_date' => Carbon::parse($start)->addDays(4)->toDateString(),
            ])->assertCreated();
        }

        return $user;
    }

    public function test_summary_predicts_next_period_and_phase(): void
    {
        $user = $this->userWithHistory();

        $this->actingAs($user)->getJson('/api/v1/cycle/summary')->assertOk()->assertJson([
            'has_data' => true,
            'average_cycle_length' => 28,
            'average_period_length' => 5,
            'today' => ['cycle_day' => 7, 'phase' => 'follicular'],
            'next_period_date' => '2026-12-01',
            'days_until_next_period' => 22,
            'next_ovulation_date' => '2026-11-16',
        ]);
    }

    public function test_month_calendar_marks_days(): void
    {
        $user = $this->userWithHistory();
        $days = collect($this->actingAs($user)->getJson('/api/v1/cycle/calendar?month=2026-11')->assertOk()->json('days'))->keyBy('date');

        $this->assertSame('2026-10-26', $days->keys()->first()); // semaine complète, commence un lundi
        $this->assertTrue($days['2026-11-03']['is_period']);
        $this->assertTrue($days['2026-11-07']['is_period']);
        $this->assertFalse($days['2026-11-08']['is_period']);
        $this->assertTrue($days['2026-11-09']['is_today']);
        $this->assertTrue($days['2026-11-16']['is_ovulation']);
        $this->assertTrue($days['2026-11-11']['is_fertile']);
        $this->assertTrue($days['2026-12-01']['is_predicted_period']);
        $this->assertSame('luteal', $days['2026-11-25']['phase']);
    }

    public function test_year_view(): void
    {
        $user = $this->userWithHistory();
        $this->actingAs($user)->getJson('/api/v1/cycle/calendar?year=2026')->assertOk()->assertJsonCount(365, 'days');
    }

    public function test_period_start_and_end_buttons(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/cycle/period/start')->assertCreated()
            ->assertJsonPath('summary.today.phase', 'menstrual')
            ->assertJsonPath('summary.period_in_progress', true);

        Carbon::setTestNow('2026-11-13 10:00:00');
        $this->actingAs($user)->postJson('/api/v1/cycle/period/end')->assertOk()
            ->assertJsonPath('cycle.end_date', '2026-11-13');

        $this->actingAs($user)->postJson('/api/v1/cycle/period/start', ['date' => '2026-11-09'])
            ->assertJsonValidationErrors('start_date');
    }

    public function test_cycle_lengths_are_recomputed_and_irregularities_detected(): void
    {
        $user = User::factory()->create();
        foreach (['2026-07-01', '2026-07-19', '2026-08-30'] as $start) {
            $this->actingAs($user)->postJson('/api/v1/cycles', ['start_date' => $start])->assertCreated();
        }
        $types = collect($this->actingAs($user)->getJson('/api/v1/cycle/summary')->json('irregularities'))->pluck('type');

        $this->assertContains('long_cycle', $types); // 42 jours
        $this->assertContains('irregular', $types);  // 18 puis 42 jours
        $this->assertContains('late', $types);       // pas de règles depuis le 30/08
        $this->assertSame([18, 42, null], $user->cycles()->orderBy('start_date')->pluck('cycle_length')->all());
    }

    public function test_cannot_access_other_users_cycle(): void
    {
        $owner = $this->userWithHistory();
        $other = User::factory()->create();

        $this->actingAs($other)->deleteJson('/api/v1/cycles/'.$owner->cycles()->first()->id)->assertNotFound();
    }

    public function test_daily_log_is_encrypted_and_shown_on_day_sheet(): void
    {
        $user = $this->userWithHistory();
        $this->actingAs($user)->putJson('/api/v1/logs/2026-11-09', [
            'mood' => 'good', 'flow' => 'none', 'symptoms' => ['cramps'], 'notes' => 'Note privée',
        ])->assertOk();

        $raw = \DB::table('daily_logs')->value('notes');
        $this->assertNotSame('Note privée', $raw);

        $this->actingAs($user)->getJson('/api/v1/cycle/day/2026-11-09')->assertOk()
            ->assertJsonPath('phase', 'follicular')
            ->assertJsonPath('log.notes', 'Note privée');

        $this->actingAs($user)->putJson('/api/v1/logs/2026-11-20', ['mood' => 'good'])->assertStatus(422);
        $this->actingAs($user)->putJson('/api/v1/logs/2026-11-08', ['symptoms' => ['nope']])->assertJsonValidationErrors('symptoms.0');
    }

    public function test_offline_sync_is_idempotent(): void
    {
        $user = User::factory()->create();
        $payload = [
            'logs' => [['date' => '2026-11-01', 'mood' => 'sad'], ['date' => '2026-11-02', 'pain_level' => 6]],
            'period_starts' => [['start_date' => '2026-10-30', 'end_date' => '2026-11-03']],
        ];
        $this->actingAs($user)->postJson('/api/v1/sync', $payload)->assertOk();
        $this->actingAs($user)->postJson('/api/v1/sync', $payload)->assertOk();

        $this->assertSame(2, $user->dailyLogs()->count());
        $this->assertSame(1, $user->cycles()->count());
    }
}
