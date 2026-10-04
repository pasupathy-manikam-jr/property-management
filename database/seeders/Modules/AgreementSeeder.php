<?php

namespace Database\Seeders\Modules;

use App\Models\Agreement;
use App\Models\Lease;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * One agreement per active lease, matching its dates.
 */
class AgreementSeeder extends Seeder
{
    public function run(): void
    {
        $data = File::json(database_path('demo/agreements.json'));

        Lease::query()->where('status', 'active')->with('tenant.user:id,email')->orderBy('start_date')->each(function (Lease $lease) use ($data) {
            Agreement::query()->firstOrCreate(
                ['tenant_id' => $lease->tenant_id, 'unit_id' => $lease->unit_id, 'start_date' => $lease->start_date],
                [
                    'end_date' => $lease->end_date,
                    'status' => $data['statuses'][$lease->tenant->user->email] ?? 'active',
                    'terms' => $data['terms'],
                    'description' => $data['description'],
                ],
            );
        });
    }
}
