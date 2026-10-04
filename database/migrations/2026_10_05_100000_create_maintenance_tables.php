<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Name, email, phone and photo live on the maintainer's login account (users).
        Schema::create('maintainers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('type_id')->nullable()->constrained('types')->nullOnDelete(); // kind = maintainer_type
            $table->timestamps();
        });

        Schema::create('maintainer_property', function (Blueprint $table) {
            $table->foreignId('maintainer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->primary(['maintainer_id', 'property_id']);
        });

        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('maintainer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('issue_type_id')->nullable()->constrained('types')->nullOnDelete(); // kind = maintenance_issue
            $table->date('request_date');
            $table->string('status', 12)->default('pending')->index(); // pending, in_progress, completed
            $table->date('fixed_date')->nullable();
            $table->text('notes')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_type')->nullable();
            $table->unsignedInteger('file_size')->nullable();
            $table->timestamps();
        });

        Schema::create('maintenance_request_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('comment');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_request_comments');
        Schema::dropIfExists('maintenance_requests');
        Schema::dropIfExists('maintainer_property');
        Schema::dropIfExists('maintainers');
    }
};
