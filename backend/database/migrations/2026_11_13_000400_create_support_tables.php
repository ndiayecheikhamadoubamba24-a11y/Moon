<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('help_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // information, support, protections, medical, question (question anonyme)
            $table->string('type', 16)->index();
            $table->string('subject')->nullable();
            $table->text('message');
            $table->boolean('is_anonymous')->default(false);
            $table->boolean('faq_consent')->default(false); // accord pour publier la réponse en FAQ
            $table->string('priority', 16)->default('normal')->index(); // normal | urgent
            $table->string('status', 16)->default('received')->index(); // received, in_progress, resolved
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('help_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('help_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('from_staff')->default(false);
            $table->boolean('is_internal')->default(false); // note interne, jamais visible dans l'app
            $table->text('body');
            $table->timestamps();
        });

        // Centres de santé, centres conseils ados, ONG, distribution de protections, lignes d'écoute
        Schema::create('resources', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type', 32)->index(); // youth_center, health_center, ngo, distribution, hotline
            $table->text('description')->nullable();
            $table->string('address')->nullable();
            $table->string('neighborhood')->nullable()->index();
            $table->string('city')->nullable()->index();
            $table->string('region')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('image')->nullable();
            // {"mon":["08:00","17:00"], ...}
            $table->json('opening_hours')->nullable();
            // ecoute, consultation, protections, planification, infos
            $table->json('services')->nullable();
            $table->json('languages')->nullable();
            $table->boolean('is_free')->default(false);
            $table->boolean('is_confidential')->default(false);
            $table->boolean('is_accessible')->default(false);
            $table->boolean('walk_in')->default(false); // sans rendez-vous
            $table->string('audience', 16)->nullable(); // girls, all
            $table->boolean('is_emergency')->default(false);
            $table->boolean('is_active')->default(true);
            $table->date('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('resource_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('resource_id')->nullable()->constrained()->cascadeOnDelete(); // null = nouveau centre
            $table->string('kind', 16); // new | correction
            $table->text('message');
            $table->string('status', 16)->default('pending');
            $table->timestamps();
        });

        Schema::create('saved_resources', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resource_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['user_id', 'resource_id']);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reportable_type');
            $table->unsignedBigInteger('reportable_id');
            $table->string('reason', 32);
            $table->text('details')->nullable();
            $table->string('status', 16)->default('open')->index(); // open, resolved, dismissed
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution')->nullable();
            $table->timestamps();
            $table->index(['reportable_type', 'reportable_id']);
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('body');
            $table->json('audience')->nullable(); // {"age_range":["15-17"],"language":"fr"}
            $table->boolean('push')->default(true);
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->unsignedInteger('recipients_count')->default(0);
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 64)->index();
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('saved_resources');
        Schema::dropIfExists('resource_suggestions');
        Schema::dropIfExists('resources');
        Schema::dropIfExists('help_messages');
        Schema::dropIfExists('help_requests');
    }
};
