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
            'age_range' => '18-21', 'consent' => true, 'avatar' => '🦋', 'mode' => 'comprendre',
        ])->assertCreated()->assertJsonStructure(['token', 'user' => ['id', 'name']]);

        $this->assertNotNull(User::first()->consented_at);
        $this->assertSame('🦋', User::first()->avatar);
        $this->assertSame('comprendre', User::first()->mode);
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

    public function test_phone_registration_with_password_logs_in_directly(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Khady', 'phone' => '+221770000001', 'age_range' => '22-25', 'consent' => true,
        ])->assertJsonValidationErrors('password');

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Khady', 'phone' => '+221770000001', 'password' => 'secret123', 'age_range' => '22-25', 'consent' => true,
        ])->assertCreated()->assertJsonStructure(['token', 'user' => ['id', 'name']])->assertJsonMissing(['otp_sent' => true]);

        // Connexion par téléphone (avec espaces) ou via le champ « identifier »
        $this->postJson('/api/v1/auth/login', ['phone' => '+221 77 000 00 01', 'password' => 'secret123'])->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/v1/auth/login', ['identifier' => '+221770000001', 'password' => 'secret123'])->assertOk();
        $this->postJson('/api/v1/auth/login', ['phone' => '+221770000001', 'password' => 'mauvais'])->assertJsonValidationErrors('phone');
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
