<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Support\Notify;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

#[Signature('invoices:generate-recurring')]
#[Description('Copy recurring invoices into the current month once their recurring day is reached')]
class GenerateRecurringInvoices extends Command
{
    /**
     * Idempotent: a source gets at most one copy per month, and a missed day is caught up later in the month.
     * Tenants who have left the unit are skipped.
     */
    public function handle(): int
    {
        $today = today();
        $month = $today->copy()->startOfMonth();
        $created = 0;

        Invoice::query()
            ->where('is_recurring', true)
            ->where('recurring_day', '<=', $today->day)
            ->where('invoice_month', '<', $month->toDateString())
            ->whereDoesntHave('copies', fn (Builder $q) => $q->whereDate('invoice_month', $month))
            ->whereHas('tenant.activeLease', fn (Builder $q) => $q->whereColumn('leases.unit_id', 'invoices.unit_id'))
            ->with('items')
            ->each(function (Invoice $source) use ($month, &$created) {
                $copy = DB::transaction(function () use ($source, $month) {
                    $months = (int) round($source->invoice_month->diffInMonths($month));
                    $copy = Invoice::create([
                        ...$source->only(['property_id', 'unit_id', 'tenant_id', 'notes']),
                        'parent_id' => $source->id,
                        'invoice_month' => $month,
                        'end_date' => $source->end_date->copy()->addMonthsNoOverflow($months),
                    ]);
                    $copy->items()->createMany($source->items->map->only(['type_id', 'amount', 'description'])->all());
                    $copy->refreshTotals();

                    return $copy;
                });
                Notify::invoiceCreated($copy);
                $created++;
            });

        $this->info("Generated {$created} recurring invoice(s).");

        return self::SUCCESS;
    }
}
