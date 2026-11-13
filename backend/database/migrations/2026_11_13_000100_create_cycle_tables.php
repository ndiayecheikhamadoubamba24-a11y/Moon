<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Une ligne = une période de règles (début / fin). La durée du cycle
        // se déduit de l'écart entre deux débuts successifs.
        Schema::create('cycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->unsignedTinyInteger('cycle_length')->nullable(); // calculé au cycle suivant
            $table->timestamps();
            $table->unique(['user_id', 'start_date']);
        });

        Schema::create('daily_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('mood', 16)->nullable();   // great, good, neutral, sad, crying, angry
            $table->string('flow', 16)->nullable();   // none, light, medium, heavy
            $table->unsignedTinyInteger('pain_level')->nullable(); // 0-10
            $table->json('symptoms')->nullable();
            $table->text('notes')->nullable();        // chiffré (cast encrypted)
            $table->timestamps();
            $table->unique(['user_id', 'date']);
        });

        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32); // period_soon, change_protection, hydration
            $table->boolean('enabled')->default(true);
            $table->time('time')->nullable();
            $table->unsignedSmallInteger('interval_hours')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
        Schema::dropIfExists('daily_logs');
        Schema::dropIfExists('cycles');
    }
};
