<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('summary')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('level', 16)->default('debutant'); // debutant, intermediaire, avance
            $table->string('language', 8)->default('fr');
            $table->unsignedSmallInteger('duration_minutes')->default(3);
            // Workflow : draft -> review -> published -> archived
            $table->string('status', 16)->default('draft')->index();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('views_count')->default(0);
            $table->timestamps();
        });

        // Étapes d'un module : texte riche, image, vidéo, audio, infographie, quiz
        Schema::create('module_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->string('type', 16)->default('text');
            $table->string('title')->nullable();
            $table->longText('body')->nullable();
            $table->string('media_url')->nullable();
            $table->foreignId('game_id')->nullable(); // quiz intégré
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('module_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('progress')->default(0); // %
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'module_id']);
        });

        // Conseils « Quoi faire maintenant », par phase du cycle
        Schema::create('tips', function (Blueprint $table) {
            $table->id();
            $table->string('phase', 16)->index(); // menstrual, follicular, ovulation, luteal, any
            $table->string('topic', 32);          // alimentation, activite, hygiene, repos, douleur, hydratation
            $table->string('title');
            $table->text('body');
            $table->string('icon')->nullable();
            $table->string('language', 8)->default('fr');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Fiches pratiques (protections, hygiène intime, fuite imprévue) et alertes éducatives
        Schema::create('guides', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 16)->default('practical'); // practical | alert
            $table->string('title');
            $table->string('slug')->unique();
            $table->longText('body');
            $table->string('icon')->nullable();
            $table->string('language', 8)->default('fr');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->text('question');
            $table->text('answer');
            $table->string('language', 8)->default('fr');
            $table->boolean('is_published')->default(true);
            $table->foreignId('help_request_id')->nullable(); // question anonyme d'origine
            $table->foreignId('answered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faqs');
        Schema::dropIfExists('guides');
        Schema::dropIfExists('tips');
        Schema::dropIfExists('module_progress');
        Schema::dropIfExists('module_sections');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('categories');
    }
};
