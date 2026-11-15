<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Publications du site vitrine : actualités, événements, campagnes, conseils.
        Schema::create('publications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('category', 32)->default('actualite')->index(); // actualite, evenement, campagne, conseil
            $table->string('excerpt', 300)->nullable();
            $table->longText('body');
            $table->string('cover_image')->nullable();
            $table->string('status', 16)->default('draft')->index(); // draft | published
            $table->boolean('featured')->default(false);
            $table->timestamp('published_at')->nullable()->index();
            $table->unsignedInteger('views_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publications');
    }
};
