<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->string('difficulty', 16)->default('facile'); // facile, moyen, difficile
            $table->foreignId('module_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable(); // validation médicale
        });

        Schema::table('game_scores', function (Blueprint $table) {
            $table->json('answers')->nullable(); // réponses données, pour les statistiques par question
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('suspended_until')->nullable();
            $table->string('suspension_reason')->nullable();
        });

        Schema::table('resources', function (Blueprint $table) {
            $table->boolean('position_confirmed')->default(false);
        });

        Schema::table('modules', function (Blueprint $table) {
            $table->json('tags')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('modules', fn (Blueprint $t) => $t->dropColumn('tags'));
        Schema::table('resources', fn (Blueprint $t) => $t->dropColumn('position_confirmed'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['suspended_until', 'suspension_reason']));
        Schema::table('game_scores', fn (Blueprint $t) => $t->dropColumn('answers'));
        Schema::table('questions', function (Blueprint $t) {
            $t->dropConstrainedForeignId('module_id');
            $t->dropConstrainedForeignId('validated_by');
            $t->dropColumn(['difficulty', 'validated_at']);
        });
    }
};
