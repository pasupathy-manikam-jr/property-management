<?php

namespace Database\Seeders\Modules;

use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class TenantSeeder extends Seeder
{
    public function run(): void
    {
        // Hash once: every demo account shares the password.
        $password = Hash::make('Zx123456');

        foreach (File::json(database_path('demo/tenants.json')) as $row) {
            $user = User::query()->firstOrCreate(['email' => $row['email']], [
                'name' => $row['name'],
                'phone' => $row['phone'],
                'password' => $password,
                'email_verified_at' => now(),
            ]);
            $user->syncRoles('tenant');

            $tenant = $user->tenant()->firstOrCreate([], Arr::only($row, ['family_member', 'address', 'city', 'state', 'zip_code', 'country']));

            $unit = Unit::query()->where('name', $row['unit'])
                ->whereHas('property', fn ($q) => $q->where('name', $row['property']))
                ->firstOrFail();

            $tenant->leases()->firstOrCreate(['unit_id' => $unit->id, 'start_date' => $row['start_date']], [
                'end_date' => $row['end_date'],
                ...(isset($row['exit']) ? ['status' => 'exited', ...$row['exit']] : ['status' => 'active']),
            ]);
        }
    }
}
