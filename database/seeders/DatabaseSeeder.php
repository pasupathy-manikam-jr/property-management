<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Shared password of every seeded demo account. */
    public const PASSWORD = 'Zx123456';

    /**
     * One demo account per built-in role. Admin and manager are created here;
     * tenant and maintainer come from database/demo/*.json. With DEMO_LOGINS=true
     * the login page offers these as one-click logins, so never enable that flag
     * on a live server.
     *
     * @var list<array{name: string, email: string, password: string}>
     */
    public const LOGINS = [
        ['name' => 'Admin', 'email' => 'admin@example.com', 'password' => self::PASSWORD],
        ['name' => 'Manager', 'email' => 'manager@example.com', 'password' => self::PASSWORD],
        ['name' => 'Tenant', 'email' => 'tenant@example.com', 'password' => self::PASSWORD],
        ['name' => 'Maintainer', 'email' => 'maintainer@example.com', 'password' => self::PASSWORD],
    ];

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

        foreach (['Admin' => 'admin', 'Manager' => 'manager'] as $name => $role) {
            User::query()->firstOrCreate(['email' => "{$role}@example.com"], [
                'name' => $name,
                'password' => self::PASSWORD,
                'email_verified_at' => now(),
            ])->syncRoles($role);
        }

        $this->call(array_values(array_filter(self::MODULES, 'class_exists')));
    }
}
