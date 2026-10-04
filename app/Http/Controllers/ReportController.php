<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Tenant;
use App\Support\Reports;
use App\Support\TableQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function income(Request $request): Response
    {
        [$year, $propertyId, $unitId] = $this->filters($request);

        return Inertia::render('reports/income', [
            ...$this->common($request, $year),
            'income' => Reports::monthly(Reports::payments($propertyId, $unitId), 'payment_date', 'amount', $year),
            'billed' => Reports::monthly(
                Invoice::query()->when($propertyId, fn ($q) => $q->where('property_id', $propertyId))->when($unitId, fn ($q) => $q->where('unit_id', $unitId)),
                'invoice_month', 'total', $year,
            ),
        ]);
    }

    public function expense(Request $request): Response
    {
        [$year, $propertyId, $unitId] = $this->filters($request);

        $byType = Reports::expenses($propertyId, $unitId)->whereBetween('date', ["{$year}-01-01", "{$year}-12-31"])
            ->with('type:id,name')->get(['type_id', 'amount'])
            ->groupBy(fn (Expense $e) => $e->type->name ?? __('Other'))
            ->map(fn ($rows, $name) => ['name' => (string) $name, 'total' => round($rows->sum(fn (Expense $e) => (float) $e->amount), 2)])
            ->sortByDesc('total')->values();

        return Inertia::render('reports/expense', [
            ...$this->common($request, $year),
            'expense' => Reports::monthly(Reports::expenses($propertyId, $unitId), 'date', 'amount', $year),
            'byType' => $byType,
        ]);
    }

    public function profitLoss(Request $request): Response
    {
        [$year, $propertyId, $unitId] = $this->filters($request);

        return Inertia::render('reports/profit-loss', [
            ...$this->common($request, $year),
            'income' => Reports::monthly(Reports::payments($propertyId, $unitId), 'payment_date', 'amount', $year),
            'expense' => Reports::monthly(Reports::expenses($propertyId, $unitId), 'date', 'amount', $year),
        ]);
    }

    public function propertyUnit(Request $request): Response
    {
        $propertyId = $request->integer('property_id') ?: null;

        $units = Property::query()->when($propertyId, fn ($q) => $q->whereKey($propertyId))->orderBy('name')
            ->with(['units' => fn ($q) => $q->orderBy('name')->with('activeLease:id,unit_id,tenant_id,end_date', 'activeLease.tenant:id,user_id', 'activeLease.tenant.user:id,name')])
            ->get(['id', 'name']);

        return Inertia::render('reports/property-unit', [
            'properties' => Property::query()->orderBy('name')->get(['id', 'name']),
            'occupancy' => Reports::occupancy()->when($propertyId, fn ($rows) => $rows->where('id', $propertyId)->values()),
            'units' => $units,
            'filters' => $request->only('property_id'),
        ]);
    }

    public function tenantHistory(Request $request): Response
    {
        $query = Lease::query()
            ->with('tenant:id,user_id', 'tenant.user:id,name,email,avatar_path', 'unit:id,name,property_id', 'unit.property:id,name')
            ->when($request->integer('property_id'), fn (Builder $q, int $id) => $q->whereHas('unit', fn (Builder $u) => $u->where('property_id', $id)))
            ->when($request->integer('unit_id'), fn (Builder $q, int $id) => $q->where('unit_id', $id))
            ->when(in_array($request->input('status'), Lease::STATUSES, true), fn (Builder $q) => $q->where('status', $request->input('status')));

        return Inertia::render('reports/tenant-history', [
            'leases' => TableQuery::paginate($query, $request, [], ['start_date', 'end_date'], 'start_date'),
            'counts' => ['all' => Lease::query()->count(), ...TableQuery::countBy(Lease::query(), 'status')->all()],
            'properties' => $this->propertyOptions(),
            'filters' => TableQuery::filters($request, ['property_id', 'unit_id', 'status']),
        ]);
    }

    public function maintenance(Request $request): Response
    {
        $filtered = MaintenanceRequest::query()
            ->when($request->integer('tenant_id'), fn (Builder $q, int $id) => $q->where('tenant_id', $id))
            ->when($request->integer('property_id'), fn (Builder $q, int $id) => $q->where('property_id', $id))
            ->when($request->integer('unit_id'), fn (Builder $q, int $id) => $q->where('unit_id', $id));

        $byType = (clone $filtered)->with('issueType:id,name')->get(['issue_type_id', 'status'])
            ->groupBy(fn (MaintenanceRequest $r) => $r->issueType->name ?? __('Other'))
            ->map(fn ($rows, $name) => [
                'name' => (string) $name,
                'pending' => $rows->where('status', 'pending')->count(),
                'in_progress' => $rows->where('status', 'in_progress')->count(),
                'completed' => $rows->where('status', 'completed')->count(),
            ])->sortByDesc(fn ($row) => $row['pending'] + $row['in_progress'] + $row['completed'])->values();

        $list = (clone $filtered)
            ->with('property:id,name', 'unit:id,name', 'issueType:id,name', 'tenant:id,user_id', 'tenant.user:id,name', 'maintainer:id,user_id', 'maintainer.user:id,name')
            ->when(in_array($request->input('status'), MaintenanceRequest::STATUSES, true), fn (Builder $q) => $q->where('status', $request->input('status')));

        return Inertia::render('reports/maintenance', [
            'requests' => TableQuery::paginate($list, $request, [], ['request_date', 'fixed_date'], 'request_date'),
            'counts' => ['all' => (clone $filtered)->count(), ...TableQuery::countBy($filtered, 'status')->all()],
            'byType' => $byType,
            'properties' => $this->propertyOptions(),
            'tenants' => Tenant::query()->with('user:id,name')->get(['id', 'user_id'])->map(fn (Tenant $t) => ['id' => $t->id, 'name' => $t->user->name])->sortBy('name')->values(),
            'filters' => TableQuery::filters($request, ['tenant_id', 'property_id', 'unit_id', 'status']),
        ]);
    }

    /**
     * @return array{0: int, 1: int|null, 2: int|null}
     */
    private function filters(Request $request): array
    {
        $year = $request->integer('year') ?: now()->year;

        return [max(2000, min($year, now()->year + 1)), $request->integer('property_id') ?: null, $request->integer('unit_id') ?: null];
    }

    /**
     * @return array<string, mixed>
     */
    private function common(Request $request, int $year): array
    {
        return [
            'properties' => $this->propertyOptions(),
            'years' => Reports::years(),
            'filters' => [...$request->only('property_id', 'unit_id'), 'year' => $year],
        ];
    }

    /**
     * Properties with their units, for the property → unit filters.
     *
     * @return Collection<int, Property>
     */
    private function propertyOptions(): Collection
    {
        return Property::query()->orderBy('name')->with(['units' => fn ($q) => $q->orderBy('name')->select('id', 'property_id', 'name')])->get(['id', 'name']);
    }
}
