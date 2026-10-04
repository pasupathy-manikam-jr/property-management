<?php

namespace Tests\Feature\Finance;

use App\Models\Invoice;
use App\Models\Property;
use App\Models\Setting;
use App\Models\Tenant;
use App\Models\Type;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    private Unit $unit;

    private Tenant $tenant;

    private Type $rent;

    protected function setUp(): void
    {
        parent::setUp();

        $property = Property::query()->create([
            'type' => 'own', 'name' => 'Bayu', 'address' => 'Jalan 1', 'city' => 'PJ', 'state' => 'Selangor', 'zip_code' => '47800', 'country' => 'Malaysia',
        ]);
        $this->unit = $property->units()->create(['name' => 'A-1', 'rent' => 2000, 'rent_type' => 'monthly', 'deposit_type' => 'fixed', 'late_fee_type' => 'fixed']);
        $this->tenant = $this->makeTenant($this->unit);
        $this->rent = Type::query()->create(['kind' => 'invoice', 'name' => 'Rent']);
    }

    private function makeTenant(Unit $unit): Tenant
    {
        $tenant = User::factory()->create()->tenant()->create([
            'family_member' => 1, 'address' => 'Jalan 2', 'city' => 'KL', 'state' => 'WP', 'zip_code' => '50000', 'country' => 'Malaysia',
        ]);
        $tenant->leases()->create(['unit_id' => $unit->id, 'start_date' => '2026-01-01', 'end_date' => '2026-12-31']);

        return $tenant;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'property_id' => $this->unit->property_id, 'unit_id' => $this->unit->id, 'tenant_id' => $this->tenant->id,
            'invoice_month' => '2026-10-15', 'end_date' => '2026-10-07', 'notes' => null,
            'is_recurring' => false, 'recurring_day' => null,
            'items' => [
                ['type_id' => $this->rent->id, 'amount' => 2000, 'description' => 'October rent'],
                ['type_id' => $this->rent->id, 'amount' => 150.5, 'description' => 'Parking'],
            ],
            ...$overrides,
        ];
    }

    private function invoice(float $paid = 0, string $due = '2026-10-07', ?Tenant $tenant = null): Invoice
    {
        $tenant ??= $this->tenant;
        $invoice = Invoice::query()->create([
            'property_id' => $this->unit->property_id, 'unit_id' => $tenant->leases()->value('unit_id'), 'tenant_id' => $tenant->id,
            'invoice_month' => '2026-10-01', 'end_date' => $due,
        ]);
        $invoice->items()->create(['type_id' => $this->rent->id, 'amount' => 1000]);

        if ($paid > 0) {
            $invoice->payments()->create(['amount' => $paid, 'payment_date' => '2026-10-01', 'method' => 'cash']);
        }

        $invoice->refreshTotals();

        return $invoice;
    }

    public function test_creating_an_invoice_numbers_it_and_totals_its_items(): void
    {
        $this->actingAs($this->userWithRole());

        $this->post(route('invoices.store'), $this->payload())->assertRedirect(route('invoices.show', 1));

        $invoice = Invoice::query()->sole();
        $this->assertSame('INV-0001', $invoice->number);
        $this->assertSame('2026-10-01', $invoice->invoice_month->toDateString());
        $this->assertSame('2150.50', $invoice->total);
        $this->assertCount(2, $invoice->items);

        Setting::put(['invoicePrefix' => 'BIL-']);
        $this->post(route('invoices.store'), $this->payload());
        $this->assertSame('BIL-0002', Invoice::query()->latest('id')->value('number'));

        $this->get(route('invoices.show', $invoice))->assertInertia(fn ($page) => $page
            ->component('invoices/show')
            ->where('invoice.status', 'unpaid')
            ->has('invoice.items', 2));
    }

    public function test_invoice_validation(): void
    {
        $this->actingAs($this->userWithRole());
        $otherProperty = Property::query()->create(['type' => 'own', 'name' => 'Other', 'address' => 'x', 'city' => 'x', 'state' => 'x', 'zip_code' => '1', 'country' => 'x']);
        $expenseType = Type::query()->create(['kind' => 'expense', 'name' => 'Repairs']);

        $this->post(route('invoices.store'), [])->assertSessionHasErrors(['property_id', 'unit_id', 'tenant_id', 'invoice_month', 'end_date', 'items']);
        $this->post(route('invoices.store'), $this->payload(['items' => []]))->assertSessionHasErrors('items');
        $this->post(route('invoices.store'), $this->payload([
            'property_id' => $otherProperty->id,
            'is_recurring' => true,
            'items' => [['type_id' => $expenseType->id, 'amount' => 0]],
        ]))->assertSessionHasErrors(['unit_id', 'recurring_day', 'items.0.type_id', 'items.0.amount']);

        $this->assertSame(0, Invoice::query()->count());
    }

    public function test_updating_syncs_items_and_removing_them_needs_permission(): void
    {
        $this->actingAs($this->userWithRole());
        $this->post(route('invoices.store'), $this->payload());
        $invoice = Invoice::query()->sole();
        [$first] = $invoice->items;

        $payload = $this->payload([
            'is_recurring' => true, 'recurring_day' => 5,
            'items' => [
                ['id' => $first->id, 'type_id' => $this->rent->id, 'amount' => 2100, 'description' => 'Rent'],
                ['type_id' => $this->rent->id, 'amount' => 30, 'description' => 'Key'],
            ],
        ]);

        // A user who may edit but not delete items cannot drop the parking line.
        $editor = User::factory()->create()->givePermissionTo(['manage-invoices', 'edit-invoices']);
        $this->actingAs($editor)->put(route('invoices.update', $invoice), $payload)->assertSessionHasErrors('items');

        $this->actingAs($this->userWithRole())->put(route('invoices.update', $invoice), $payload)->assertRedirect(route('invoices.show', $invoice));

        $invoice->refresh();
        $this->assertSame('2130.00', $invoice->total);
        $this->assertSame(['2100.00', '30.00'], $invoice->items()->orderBy('id')->pluck('amount')->all());
        $this->assertSame(5, $invoice->recurring_day);
    }

    public function test_status_is_derived_from_payments_and_due_date(): void
    {
        $this->travelTo('2026-10-05');
        $this->actingAs($this->userWithRole());

        $unpaid = $this->invoice();
        $partial = $this->invoice(400);
        $paid = $this->invoice(1000);
        $overdue = $this->invoice(400, '2026-10-01');

        $this->assertSame(['unpaid', 'partially_paid', 'paid', 'overdue'], [$unpaid->status, $partial->status, $paid->status, $overdue->status]);

        $this->get(route('invoices.index'))->assertInertia(fn ($page) => $page
            ->component('invoices/index')
            ->where('counts', ['all' => 4, 'unpaid' => 1, 'partially_paid' => 1, 'paid' => 1, 'overdue' => 1]));

        $this->get(route('invoices.index', ['status' => 'overdue']))->assertInertia(fn ($page) => $page
            ->has('invoices.data', 1)
            ->where('invoices.data.0.id', $overdue->id));
    }

    public function test_deleting_an_invoice(): void
    {
        $this->actingAs($this->userWithRole());
        $invoice = $this->invoice(200);

        $this->delete(route('invoices.destroy', $invoice))->assertRedirect(route('invoices.index'));

        $this->assertModelMissing($invoice);
        $this->assertDatabaseCount('invoice_payments', 0);
    }

    public function test_tenants_see_only_their_own_invoices(): void
    {
        $user = $this->userWithRole('tenant');
        $this->tenant->update(['user_id' => $user->id]);
        $mine = $this->invoice();
        $theirs = $this->invoice(tenant: $this->makeTenant($this->unit->property->units()->create([
            'name' => 'A-2', 'rent' => 1500, 'rent_type' => 'monthly', 'deposit_type' => 'fixed', 'late_fee_type' => 'fixed',
        ])));

        $this->actingAs($user);
        $this->get(route('invoices.index', ['tenant_id' => $theirs->tenant_id]))->assertInertia(fn ($page) => $page
            ->has('invoices.data', 1)
            ->where('invoices.data.0.id', $mine->id)
            ->where('counts.all', 1)
            ->where('tenants', []));
        $this->get(route('invoices.show', $mine))->assertOk();
        $this->get(route('invoices.show', $theirs))->assertNotFound();
        $this->get(route('invoices.create'))->assertForbidden();
        $this->delete(route('invoices.destroy', $mine))->assertForbidden();
    }

    public function test_maintainers_cannot_manage_invoices(): void
    {
        $this->actingAs($this->userWithRole('maintainer'))->get(route('invoices.index'))->assertForbidden();
        $this->actingAs($this->userWithRole('manager'))->get(route('invoices.index'))->assertOk();
    }

    public function test_recurring_invoices_are_copied_once_per_month(): void
    {
        $this->travelTo('2026-09-01');
        $source = $this->invoice();
        $source->update(['invoice_month' => '2026-09-01', 'end_date' => '2026-09-07', 'is_recurring' => true, 'recurring_day' => 3]);
        $this->invoice()->update(['invoice_month' => '2026-09-01']); // not recurring

        // Before the recurring day nothing happens.
        $this->travelTo('2026-10-02');
        $this->artisan('invoices:generate-recurring')->assertSuccessful();
        $this->assertSame(2, Invoice::query()->count());

        $this->travelTo('2026-10-03');
        $this->artisan('invoices:generate-recurring')->assertSuccessful();
        $this->artisan('invoices:generate-recurring')->assertSuccessful();

        $copy = Invoice::query()->where('parent_id', $source->id)->sole();
        $this->assertSame('2026-10-01', $copy->invoice_month->toDateString());
        $this->assertSame('2026-10-07', $copy->end_date->toDateString());
        $this->assertSame('1000.00', $copy->total);
        $this->assertFalse($copy->is_recurring);

        // A tenant who has moved out is not billed again.
        $this->tenant->activeLease?->update(['status' => 'exited']);
        $this->travelTo('2026-11-05');
        $this->artisan('invoices:generate-recurring')->assertSuccessful();
        $this->assertSame(3, Invoice::query()->count());
    }
}
