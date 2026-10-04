<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Module seeders in dependency order; each loads demo records from database/demo/*.json.
     * Modules not built yet are skipped.
     *
     * @var list<string>
     */
    private const MODULES = [
        'Database\\Seeders\\Modules\\LookupSeeder',
        'Database\\Seeders\\Modules\\PropertySeeder',
        'Database\\Seeders\\Modules\\TenantSeeder',
        'Database\\Seeders\\Modules\\MaintenanceSeeder',
        'Database\\Seeders\\Modules\\FinanceSeeder',
        'Database\\Seeders\\Modules\\AgreementSeeder',
        'Database\\Seeders\\Modules\\CommunicationSeeder',
        'Database\\Seeders\\Modules\\SettingsSeeder',
    ];

    public function run(): void
    {
        $this->call(RolesSeeder::class);

        // Demo accounts (password: Zx123456).
        foreach (['Admin' => 'admin', 'Manager' => 'manager'] as $name => $role) {
            User::query()->firstOrCreate(['email' => "{$role}@example.com"], [
                'name' => $name,
                'password' => 'Zx123456',
                'email_verified_at' => now(),
            ])->syncRoles($role);
        }

        $this->call(array_values(array_filter(self::MODULES, 'class_exists')));
    }
}
