<?php

namespace App\Support;

use App\Models\Expense;
use App\Models\InvoicePayment;
use App\Models\Property;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Money and occupancy figures shared by the dashboard and the reports.
 * Rows are grouped by month in PHP so the same code runs on MySQL and SQLite.
 */
class Reports
{
    /**
     * Approved payments received, optionally for one property/unit.
     *
     * @return Builder<InvoicePayment>
     */
    public static function payments(?int $propertyId = null, ?int $unitId = null): Builder
    {
        return InvoicePayment::query()->where('status', 'approved')
            ->when($propertyId || $unitId, fn (Builder $q) => $q->whereHas('invoice', fn (Builder $i) => $i
                ->when($propertyId, fn (Builder $i) => $i->where('property_id', $propertyId))
                ->when($unitId, fn (Builder $i) => $i->where('unit_id', $unitId))));
    }

    /**
     * @return Builder<Expense>
     */
    public static function expenses(?int $propertyId = null, ?int $unitId = null): Builder
    {
        return Expense::query()
            ->when($propertyId, fn (Builder $q) => $q->where('property_id', $propertyId))
            ->when($unitId, fn (Builder $q) => $q->where('unit_id', $unitId));
    }

    /**
     * Twelve monthly totals (index 0 = January) of $column for rows dated in $year.
     *
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     * @return list<float>
     */
    public static function monthly(Builder $query, string $dateColumn, string $amountColumn, int $year): array
    {
        $totals = array_fill(0, 12, 0.0);

        $query->whereBetween($dateColumn, ["{$year}-01-01", "{$year}-12-31"])
            ->get([$dateColumn, $amountColumn])
            ->each(function ($row) use (&$totals, $dateColumn, $amountColumn) {
                $totals[(int) $row->{$dateColumn}->format('n') - 1] += (float) $row->{$amountColumn};
            });

        return array_values(array_map(fn (float $total) => round($total, 2), $totals));
    }

    /**
     * Units, occupied and vacant per property.
     *
     * @return Collection<int, array{id: int, name: string, units: int, occupied: int, vacant: int}>
     */
    public static function occupancy(): Collection
    {
        return Property::query()->orderBy('name')
            ->withCount(['units', 'units as occupied_count' => fn (Builder $q) => $q->whereHas('activeLease')])
            ->get(['id', 'name'])
            ->map(fn (Property $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'units' => (int) $p->getAttribute('units_count'),
                'occupied' => (int) $p->getAttribute('occupied_count'),
                'vacant' => (int) $p->getAttribute('units_count') - (int) $p->getAttribute('occupied_count'),
            ]);
    }

    /**
     * Years offered in report filters: from the oldest record to next year.
     *
     * @return list<int>
     */
    public static function years(): array
    {
        $oldest = min(
            (int) (InvoicePayment::query()->min('payment_date') ? substr((string) InvoicePayment::query()->min('payment_date'), 0, 4) : now()->year),
            (int) (Expense::query()->min('date') ? substr((string) Expense::query()->min('date'), 0, 4) : now()->year),
        );

        return range(now()->year + 1, min($oldest, now()->year));
    }
}
