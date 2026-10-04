<?php

namespace Database\Seeders\Modules;

use App\Models\Advantage;
use App\Models\Amenity;
use App\Models\Property;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;

class PropertySeeder extends Seeder
{
    public function run(): void
    {
        $amenities = Amenity::query()->pluck('id', 'name');
        $advantages = Advantage::query()->pluck('id', 'name');

        foreach (File::json(database_path('demo/properties.json')) as $row) {
            $property = Property::query()->firstOrCreate(['name' => $row['name']], Arr::except($row, ['amenities', 'advantages', 'units', 'image']));

            // Demo photos from Wikimedia Commons (see database/demo/images/CREDITS.md).
            if (! $property->hasUpload()) {
                $property->attachUpload(new UploadedFile(database_path("demo/images/{$row['image']}"), $row['image'], 'image/jpeg', test: true))->save();
            }
            $property->amenities()->sync($amenities->only($row['amenities'])->values());
            $property->advantages()->sync($advantages->only($row['advantages'])->values());

            foreach ($row['units'] as $unit) {
                $property->units()->firstOrCreate(['name' => $unit['name']], $unit);
            }
        }
    }
}
