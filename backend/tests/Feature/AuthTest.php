<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_with_email_returns_token(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Awa', 'email' => 'awa@example.com', 'password' => 'secret123',
            'age_range' => '18-21', 'consent' => true,
        ])->assertCreated()->assertJsonStructure(['token', 'user' => ['id', 'name']]);

        $this->assertNotNull(User::first()->consented_at);
    }

    public function test_minor_requires_guardian_consent(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Mariama', 'email' => 'm@example.com', 'password' => 'secret123',
            'age_range' => '12-14', 'consent' => true, 'guardian_consent' => false,
        ])->assertUnprocessable()->assertJsonValidationErrors('guardian_consent');
    }

    public function test_consent_is_required(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Awa', 'email' => 'awa@example.com', 'password' => 'secret123', 'age_range' => '18-21',
        ])->assertJsonValidationErrors('consent');
    }

    public function test_phone_registration_and_otp_login(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Khady', 'phone' => '+221770000001', 'age_range' => '22-25', 'consent' => true,
        ])->assertCreated()->assertJson(['otp_sent' => true]);

        $code = cache()->get('otp_debug:+221770000001');
        $this->postJson('/api/v1/auth/otp/verify', ['identifier' => '+221 77 000 00 01', 'code' => '000000'])
            ->assertJsonValidationErrors('code');
        $this->postJson('/api/v1/auth/otp/verify', ['identifier' => '+221770000001', 'code' => $code])
            ->assertOk()->assertJsonStructure(['token']);

        $this->assertNotNull(User::first()->phone_verified_at);
    }

    public function test_login_and_suspended_account(): void
    {
        $user = User::factory()->create(['email' => 'a@b.c']);
        $this->postJson('/api/v1/auth/login', ['email' => 'a@b.c', 'password' => 'wrong'])->assertJsonValidationErrors('email');
        $this->postJson('/api/v1/auth/login', ['email' => 'a@b.c', 'password' => 'password'])->assertOk();

        $user->forceFill(['status' => 'suspended'])->save();
        $this->postJson('/api/v1/auth/login', ['email' => 'a@b.c', 'password' => 'password'])->assertForbidden();
    }

    public function test_password_reset_with_otp(): void
    {
        User::factory()->create(['email' => 'a@b.c']);
        $this->postJson('/api/v1/auth/password/forgot', ['identifier' => 'a@b.c'])->assertOk();
        $code = cache()->get('otp_debug:a@b.c');

        $this->postJson('/api/v1/auth/password/reset', [
            'identifier' => 'a@b.c', 'code' => $code, 'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertOk();
        $this->postJson('/api/v1/auth/login', ['email' => 'a@b.c', 'password' => 'newpass123'])->assertOk();
    }

    public function test_account_export_and_deletion(): void
    {
        $user = User::factory()->create();
        $user->cycles()->create(['start_date' => now()->subDays(3)->toDateString()]);

        $this->actingAs($user)->getJson('/api/v1/me/export')->assertOk()->assertJsonCount(1, 'cycles');
        $this->actingAs($user)->deleteJson('/api/v1/me')->assertOk();

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('cycles', 0);
    }
}
