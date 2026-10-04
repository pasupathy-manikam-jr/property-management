<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10); // own, lease
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('address');
            $table->string('city');
            $table->string('state');
            $table->string('zip_code', 20);
            $table->string('country');
            // Shown on the public website's property listing.
            $table->boolean('display_in_listing')->default(false);
            $table->string('listing_type', 10)->nullable(); // rent, sell
            $table->decimal('listing_price', 15, 2)->nullable();
            // Thumbnail (StoresUploads).
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamps();
        });

        Schema::create('amenity_property', function (Blueprint $table) {
            $table->foreignId('amenity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->primary(['amenity_id', 'property_id']);
        });

        Schema::create('advantage_property', function (Blueprint $table) {
            $table->foreignId('advantage_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->primary(['advantage_id', 'property_id']);
        });

        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('bedroom')->default(0);
            $table->unsignedTinyInteger('kitchen')->default(0);
            $table->unsignedTinyInteger('baths')->default(0);
            $table->decimal('rent', 15, 2);
            $table->string('rent_type', 10); // monthly, yearly, custom
            $table->unsignedSmallInteger('rent_duration')->nullable(); // days, for custom
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->date('payment_due_date')->nullable();
            $table->string('deposit_type', 10); // fixed, percentage
            $table->decimal('deposit_amount', 15, 2)->default(0);
            $table->string('late_fee_type', 10);
            $table->decimal('late_fee_amount', 15, 2)->default(0);
            $table->decimal('incident_receipt_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
        Schema::dropIfExists('advantage_property');
        Schema::dropIfExists('amenity_property');
        Schema::dropIfExists('properties');
    }
};
