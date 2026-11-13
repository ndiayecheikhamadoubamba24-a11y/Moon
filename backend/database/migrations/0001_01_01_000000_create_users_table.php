<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            // Profil minimal : prénom ou pseudo, tranche d'âge, langue
            $table->string('name');
            $table->string('email')->nullable()->unique();
            $table->string('phone', 32)->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->string('age_range', 16)->nullable(); // 12-14, 15-17, 18-21, 22-25, 25+
            $table->string('language', 8)->default('fr');
            $table->string('mode', 16)->default('suivi'); // suivi | comprendre
            $table->string('avatar')->nullable();
            // Rôles : user, super_admin, educator, moderator, support
            $table->string('role', 32)->default('user')->index();
            $table->string('status', 16)->default('active')->index(); // active | suspended
            // Consentement
            $table->timestamp('consented_at')->nullable();
            $table->boolean('guardian_consent')->default(false);
            // Réglages du cycle
            $table->unsignedTinyInteger('cycle_length')->default(28);
            $table->unsignedTinyInteger('period_length')->default(5);
            // Gamification
            $table->unsignedInteger('points')->default(0);
            $table->unsignedSmallInteger('streak_days')->default(0);
            $table->date('last_activity_date')->nullable();
            $table->boolean('leaderboard_opt_in')->default(false);
            // Notifications
            $table->string('push_token')->nullable();
            $table->json('notification_settings')->nullable();
            $table->string('region', 64)->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('identifier')->index(); // e-mail ou téléphone
            $table->string('purpose', 32)->default('login'); // login | reset
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('otp_codes');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
