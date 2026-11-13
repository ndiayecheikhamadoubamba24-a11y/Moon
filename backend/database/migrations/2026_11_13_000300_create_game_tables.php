<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 16); // quiz, myth_fact, association
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(3);
            $table->unsignedSmallInteger('points_per_answer')->default(10);
            $table->string('language', 8)->default('fr');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Banque de questions.
        // quiz        : options = [{key:"A",label:"..."}], answer = "A"
        // myth_fact   : options = null, answer = "myth" | "fact"
        // association : options = {left:[...], right:[...]}, answer = {"0":2,"1":0,...}
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->string('topic')->nullable(); // ex. « Corps et cycle »
            $table->text('prompt');
            $table->json('options')->nullable();
            $table->json('answer');
            $table->text('explanation')->nullable(); // « À retenir »
            $table->text('hint')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('game_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('score');
            $table->unsignedSmallInteger('total');
            $table->unsignedInteger('points');
            $table->json('missed_question_ids')->nullable();
            $table->timestamp('played_at');
            $table->string('client_uuid')->nullable()->unique(); // idempotence de la synchro hors ligne
            $table->timestamps();
        });

        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('description');
            $table->string('icon')->nullable();
            // ex. {"type":"games_played","value":1} | {"type":"streak","value":7}
            $table->json('criteria');
            $table->timestamps();
        });

        Schema::create('user_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('badge_id')->constrained()->cascadeOnDelete();
            $table->timestamp('earned_at');
            $table->unique(['user_id', 'badge_id']);
        });

        Schema::create('challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('description');
            // ex. {"type":"correct_streak","value":5}
            $table->json('goal');
            $table->unsignedInteger('reward_points')->default(50);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('challenge_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('challenge_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('progress')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'challenge_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_progress');
        Schema::dropIfExists('challenges');
        Schema::dropIfExists('user_badges');
        Schema::dropIfExists('badges');
        Schema::dropIfExists('game_scores');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('games');
    }
};
