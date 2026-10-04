<?php

namespace Database\Seeders\Modules;

use App\Models\Advantage;
use App\Models\Amenity;
use App\Models\Type;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class LookupSeeder extends Seeder
{
    public function run(): void
    {
        foreach (File::json(database_path('demo/amenities.json')) as $row) {
            Amenity::query()->firstOrCreate(['name' => $row['name']], $row);
        }

        foreach (File::json(database_path('demo/advantages.json')) as $row) {
            Advantage::query()->firstOrCreate(['name' => $row['name']], $row);
        }

        foreach (File::json(database_path('demo/types.json')) as $row) {
            Type::query()->firstOrCreate($row);
        }
    }
}
