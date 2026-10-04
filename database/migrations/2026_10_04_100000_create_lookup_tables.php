<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['amenities', 'advantages', 'types'] as $name) {
            Schema::create($name, function (Blueprint $table) use ($name) {
                $table->id();
                if ($name === 'types') {
                    // invoice, expense, maintenance_issue, maintainer_type (see Type::KINDS).
                    $table->string('kind', 30)->index();
                }
                $table->string('name');
                $table->string('description')->nullable();
                $table->string('status', 20)->default('active');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('types');
        Schema::dropIfExists('advantages');
        Schema::dropIfExists('amenities');
    }
};
