<?php

namespace Database\Seeders\Modules;

use App\Models\Maintainer;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Type;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class MaintenanceSeeder extends Seeder
{
    public function run(): void
    {
        // Hash once: every demo account shares the password.
        $password = Hash::make('Zx123456');

        foreach (File::json(database_path('demo/maintainers.json')) as $row) {
            $user = User::query()->firstOrCreate(['email' => $row['email']], [
                'name' => $row['name'],
                'phone' => $row['phone'],
                'password' => $password,
                'email_verified_at' => now(),
            ]);
            $user->syncRoles('maintainer');

            $maintainer = Maintainer::query()->firstOrCreate(['user_id' => $user->id], [
                'type_id' => Type::query()->where('kind', 'maintainer_type')->where('name', $row['type'])->value('id'),
            ]);
            $maintainer->properties()->syncWithoutDetaching(Property::query()->whereIn('name', $row['properties'])->pluck('id'));
        }

        foreach (File::json(database_path('demo/maintenance_requests.json')) as $row) {
            $unit = Unit::query()->with('activeLease')->where('name', $row['unit'])
                ->whereHas('property', fn ($q) => $q->where('name', $row['property']))
                ->firstOrFail();

            $request = MaintenanceRequest::query()->firstOrCreate(
                ['unit_id' => $unit->id, 'request_date' => $row['request_date'], 'notes' => $row['notes']],
                [
                    'property_id' => $unit->property_id,
                    'tenant_id' => $unit->activeLease?->tenant_id,
                    'maintainer_id' => isset($row['maintainer']) ? Maintainer::query()->whereRelation('user', 'email', $row['maintainer'])->value('id') : null,
                    'issue_type_id' => Type::query()->where('kind', 'maintenance_issue')->where('name', $row['issue'])->value('id'),
                    'status' => $row['status'],
                    'fixed_date' => $row['fixed_date'] ?? null,
                ],
            );

            foreach ($row['comments'] ?? [] as [$email, $comment]) {
                if ($userId = User::query()->where('email', $email)->value('id')) {
                    $request->comments()->firstOrCreate(['user_id' => $userId, 'comment' => $comment]);
                }
            }
        }
    }
}
