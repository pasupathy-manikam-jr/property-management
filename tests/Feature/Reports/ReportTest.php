<?php

namespace Tests\Feature\Reports;

use App\Models\Expense;
use App\Models\InvoicePayment;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\User;
use Database\Seeders\Modules\FinanceSeeder;
use Database\Seeders\Modules\LookupSeeder;
use Database\Seeders\Modules\MaintenanceSeeder;
use Database\Seeders\Modules\PropertySeeder;
use Database\Seeders\Modules\TenantSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs($this->userWithRole());
        $this->seed([LookupSeeder::class, PropertySeeder::class, TenantSeeder::class, MaintenanceSeeder::class, FinanceSeeder::class]);
    }

    public function test_income_report_totals_approved_payments_by_month(): void
    {
        $year = (int) substr((string) InvoicePayment::query()->where('status', 'approved')->max('payment_date'), 0, 4);
        $expected = (float) InvoicePayment::query()->where('status', 'approved')->whereYear('payment_date', $year)->sum('amount');

        $this->get(route('reports.income', ['year' => $year]))
            ->assertInertia(fn ($page) => $page->component('reports/income')
                ->has('income', 12)->has('billed', 12)
                ->where('income', fn ($months) => abs(collect($months)->sum() - $expected) < 0.01));
    }

    public function test_expense_and_profit_loss_reports_respect_the_property_filter(): void
    {
        $expense = Expense::query()->firstOrFail();
        $year = (int) $expense->date->format('Y');
        $expected = (float) Expense::query()->where('property_id', $expense->property_id)->whereYear('date', $year)->sum('amount');

        $this->get(route('reports.expense', ['year' => $year, 'property_id' => $expense->property_id]))
            ->assertInertia(fn ($page) => $page->component('reports/expense')
                ->where('expense', fn ($months) => abs(collect($months)->sum() - $expected) < 0.01)
                ->where('byType', fn ($types) => abs(collect($types)->sum('total') - $expected) < 0.01));

        $this->get(route('reports.profit-loss', ['year' => $year, 'property_id' => $expense->property_id]))
            ->assertInertia(fn ($page) => $page->component('reports/profit-loss')->has('income', 12)->has('expense', 12));
    }

    public function test_property_unit_tenant_history_and_maintenance_reports(): void
    {
        $occupied = Lease::query()->where('status', 'active')->count();

        $this->get(route('reports.property-unit'))
            ->assertInertia(fn ($page) => $page->component('reports/property-unit')
                ->where('occupancy', fn ($rows) => collect($rows)->sum('occupied') === $occupied));

        $this->get(route('reports.tenant-history', ['status' => 'exited']))
            ->assertInertia(fn ($page) => $page->component('reports/tenant-history')
                ->has('leases.data', Lease::query()->where('status', 'exited')->count()));

        $this->get(route('reports.maintenance', ['status' => 'pending']))
            ->assertInertia(fn ($page) => $page->component('reports/maintenance')
                ->has('requests.data', min(10, MaintenanceRequest::query()->where('status', 'pending')->count()))
                ->where('counts.all', MaintenanceRequest::query()->count()));
    }

    public function test_tenants_and_maintainers_cannot_open_reports(): void
    {
        foreach (['tenant', 'maintainer'] as $role) {
            $user = User::factory()->create()->assignRole($role);

            foreach (['income', 'expense', 'profit-loss', 'property-unit', 'tenant-history', 'maintenance'] as $report) {
                $this->actingAs($user)->get(route("reports.{$report}"))->assertForbidden();
            }
        }
    }

    public function test_each_role_gets_its_own_dashboard(): void
    {
        $this->get(route('dashboard'))->assertInertia(fn ($page) => $page->component('dashboard')
            ->has('income', 12)->where('stats.properties', 5)->has('occupancy', 5));

        $tenant = User::query()->where('email', 'tenant@example.com')->firstOrFail();
        $this->actingAs($tenant)->get(route('dashboard'))->assertInertia(fn ($page) => $page->component('dashboards/tenant')->whereNot('lease', null));

        $maintainer = User::query()->where('email', 'maintainer@example.com')->firstOrFail();
        $this->actingAs($maintainer)->get(route('dashboard'))->assertInertia(fn ($page) => $page->component('dashboards/maintainer')->has('counts'));
    }
}
