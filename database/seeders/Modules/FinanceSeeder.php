<?php

namespace Database\Seeders\Modules;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Lease;
use App\Models\Property;
use App\Models\Type;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        $data = File::json(database_path('demo/finance.json'));
        $this->invoices($data['invoices']);
        $this->expenses($data['expenses']);
    }

    /**
     * The last few months of invoices for every active lease: older months paid, last month
     * paid or part-paid (overdue), this month unpaid, part-paid or with a pending transfer.
     *
     * @param  array<string, mixed>  $config
     */
    private function invoices(array $config): void
    {
        $types = Type::query()->where('kind', 'invoice')->pluck('id', 'name');
        $leases = Lease::query()->where('status', 'active')->with('unit')->orderBy('id')->get();

        foreach ($leases as $index => $lease) {
            for ($ago = $config['months'] - 1; $ago >= 0; $ago--) {
                $month = now()->startOfMonth()->subMonthsNoOverflow($ago);

                if ($month->lt($lease->start_date->copy()->startOfMonth())) {
                    continue;
                }

                $invoice = Invoice::query()->firstOrCreate(
                    ['tenant_id' => $lease->tenant_id, 'unit_id' => $lease->unit_id, 'invoice_month' => $month->toDateString()],
                    [
                        'property_id' => $lease->unit->property_id,
                        'end_date' => $month->copy()->day($config['due_day']),
                        'is_recurring' => $ago === 0 && $index % 2 === 0,
                        'recurring_day' => $ago === 0 && $index % 2 === 0 ? 1 : null,
                    ],
                );

                if (! $invoice->wasRecentlyCreated) {
                    continue;
                }

                $items = [['type_id' => $types[$config['rent']['type']], 'amount' => $lease->unit->rent, 'description' => $config['rent']['description']]];

                if (($index + $ago) % 2 === 0) {
                    $amounts = $config['utility']['amounts'];
                    $items[] = ['type_id' => $types[$config['utility']['type']], 'amount' => $amounts[($index + $ago) % count($amounts)], 'description' => $config['utility']['description']];
                }

                if ($ago === 1 && $index % 3 === 0) {
                    $items[] = ['type_id' => $types[$config['late_fee']['type']], 'amount' => $config['late_fee']['amount'], 'description' => $config['late_fee']['description']];
                }

                $invoice->items()->createMany($items);
                $total = (float) collect($items)->sum('amount');
                $method = $config['methods'][($index + $ago) % count($config['methods'])];
                $paidOn = $month->copy()->day($config['due_day'] - 2);

                $payment = match (true) {
                    $ago >= 2, $ago === 1 && $index % 2 === 0 => ['amount' => $total, 'status' => 'approved'],
                    $ago === 1 => ['amount' => round($total / 2, 2), 'status' => 'approved'],
                    $index % 3 === 0 => ['amount' => $total, 'status' => 'pending', 'method' => 'bank_transfer', 'notes' => 'Transferred via DuitNow'],
                    $index % 3 === 1 => ['amount' => round($total * 0.4, 2), 'status' => 'approved'],
                    default => null,
                };

                if ($payment) {
                    $invoice->payments()->create([
                        'method' => $method,
                        'payment_date' => $ago === 0 ? now()->toDateString() : $paidOn,
                        'user_id' => null,
                        ...$payment,
                    ]);
                }

                $invoice->refreshTotals();
            }
        }
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function expenses(array $rows): void
    {
        $types = Type::query()->where('kind', 'expense')->pluck('id', 'name');
        $properties = Property::query()->with('units:id,property_id,name')->get()->keyBy('name');

        foreach ($rows as $row) {
            $property = $properties[$row['property']];

            Expense::query()->firstOrCreate(
                ['title' => $row['title'], 'property_id' => $property->id],
                [
                    'type_id' => $types[$row['type']],
                    'unit_id' => $row['unit'] ? $property->units->firstWhere('name', $row['unit'])?->id : null,
                    'date' => now()->subDays($row['days_ago'])->toDateString(),
                    'amount' => $row['amount'],
                    'notes' => $row['notes'],
                ],
            );
        }
    }
}
