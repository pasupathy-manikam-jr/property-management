<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Name, email, phone and photo live on the tenant's login account (users).
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('family_member')->default(1);
            $table->string('address');
            $table->string('city');
            $table->string('state');
            $table->string('zip_code', 20);
            $table->string('country');
            $table->timestamps();
        });

        // One row per tenancy: move-in, each renewal and the exit. The active row decides occupancy.
        Schema::create('leases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained()->restrictOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 10)->default('active')->index(); // active, renewed, exited
            $table->date('exit_date')->nullable();
            $table->decimal('exit_amount', 15, 2)->nullable();
            $table->decimal('extra_charge', 15, 2)->nullable();
            $table->string('exit_reason', 1000)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leases');
        Schema::dropIfExists('tenants');
    }
};
