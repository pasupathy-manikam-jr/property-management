<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\MaintenanceRequest;
use App\Models\Note;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\Reports;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff see the portfolio; tenants and maintainers see their own work.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasRole('tenant')) {
            return $this->tenant($user);
        }

        if ($user->hasRole('maintainer')) {
            return $this->maintainer($user);
        }

        return $this->staff($request);
    }

    private function staff(Request $request): Response
    {
        $year = now()->year;
        $units = Unit::query()->count();
        $occupied = Unit::query()->whereHas('activeLease')->count();
        $unpaid = Invoice::query()->whereColumn('paid', '<', 'total');

        return Inertia::render('dashboard', [
            'stats' => [
                'properties' => Property::query()->count(),
                'units' => $units,
                'tenants' => Tenant::query()->whereHas('activeLease')->count(),
                'monthRevenue' => round((float) Reports::payments()->whereBetween('payment_date', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'), 2),
                'monthExpense' => round((float) Reports::expenses()->whereBetween('date', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'), 2),
                'pendingPayments' => round((float) (clone $unpaid)->sum('total') - (float) (clone $unpaid)->sum('paid'), 2),
                'pendingMaintenance' => MaintenanceRequest::query()->where('status', '!=', 'completed')->count(),
                'vacancyRate' => $units ? round(($units - $occupied) / $units * 100, 1) : 0,
            ],
            'year' => $year,
            'income' => Reports::monthly(Reports::payments(), 'payment_date', 'amount', $year),
            'expense' => Reports::monthly(Reports::expenses(), 'date', 'amount', $year),
            'occupancy' => Reports::occupancy(),
            'dueInvoices' => $request->user()?->can('manage-invoices')
                ? (clone $unpaid)->with('property:id,name', 'unit:id,name', 'tenant:id,user_id', 'tenant.user:id,name')
                    ->orderBy('end_date')->limit(8)->get(['id', 'number', 'property_id', 'unit_id', 'tenant_id', 'invoice_month', 'end_date', 'total', 'paid'])
                : [],
        ]);
    }

    private function tenant(User $user): Response
    {
        $tenant = $user->tenant;

        return Inertia::render('dashboards/tenant', [
            'lease' => $tenant?->activeLease()->with('unit:id,name,property_id,rent,rent_type', 'unit.property:id,name,address,city,state')->first(),
            'invoices' => Invoice::query()->visibleTo($user)->whereColumn('paid', '<', 'total')->orderBy('end_date')->limit(5)
                ->get(['id', 'number', 'invoice_month', 'end_date', 'total', 'paid']),
            'requests' => MaintenanceRequest::query()->visibleTo($user)->with('issueType:id,name')->latest('request_date')->latest('id')->limit(5)
                ->get(['id', 'issue_type_id', 'request_date', 'status']),
            'notices' => Note::query()->latest()->limit(3)->get(['id', 'title', 'description', 'created_at']),
        ]);
    }

    private function maintainer(User $user): Response
    {
        $assigned = MaintenanceRequest::query()->visibleTo($user);

        return Inertia::render('dashboards/maintainer', [
            'counts' => [
                'pending' => (clone $assigned)->where('status', 'pending')->count(),
                'in_progress' => (clone $assigned)->where('status', 'in_progress')->count(),
                'completed' => (clone $assigned)->where('status', 'completed')->count(),
            ],
            'requests' => (clone $assigned)->where('status', '!=', 'completed')
                ->with('property:id,name', 'unit:id,name', 'issueType:id,name', 'tenant:id,user_id', 'tenant.user:id,name')
                ->orderBy('request_date')->limit(10)
                ->get(['id', 'property_id', 'unit_id', 'issue_type_id', 'tenant_id', 'request_date', 'status']),
            'notices' => Note::query()->latest()->limit(3)->get(['id', 'title', 'description', 'created_at']),
        ]);
    }
}
