<?php

namespace Tests\Feature\Finance;

use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Type;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InvoicePaymentTest extends TestCase
{
    use RefreshDatabase;

    private Invoice $invoice;

    private User $tenantUser;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->tenantUser = $this->userWithRole('tenant');
        $this->invoice = $this->invoiceFor($this->tenantUser);
    }

    private function invoiceFor(User $user): Invoice
    {
        $property = Property::query()->create(['type' => 'own', 'name' => 'Bayu '.$user->id, 'address' => 'x', 'city' => 'x', 'state' => 'x', 'zip_code' => '1', 'country' => 'x']);
        $unit = $property->units()->create(['name' => 'A-1', 'rent' => 1000, 'rent_type' => 'monthly', 'deposit_type' => 'fixed', 'late_fee_type' => 'fixed']);
        $tenant = Tenant::query()->create(['user_id' => $user->id, 'family_member' => 1, 'address' => 'x', 'city' => 'x', 'state' => 'x', 'zip_code' => '1', 'country' => 'x']);

        $invoice = Invoice::query()->create([
            'property_id' => $property->id, 'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
            'invoice_month' => now()->startOfMonth(), 'end_date' => now()->addWeek(),
        ]);
        $invoice->items()->create(['type_id' => Type::query()->firstOrCreate(['kind' => 'invoice', 'name' => 'Rent'])->id, 'amount' => 1000]);
        $invoice->refreshTotals();

        return $invoice;
    }

    public function test_staff_record_payments_up_to_the_amount_due(): void
    {
        $this->actingAs($this->userWithRole('manager'));
        $route = route('invoices.payments.store', $this->invoice);

        $this->post($route, ['amount' => 1500, 'method' => 'cheque'])->assertSessionHasErrors(['amount', 'method', 'payment_date']);

        $this->post($route, ['amount' => 400, 'payment_date' => '2026-10-01', 'method' => 'cash'])->assertSessionHasNoErrors();
        $this->assertSame('partially_paid', $this->invoice->fresh()?->status);

        $this->post($route, [
            'amount' => 600, 'payment_date' => '2026-10-02', 'method' => 'bank_transfer',
            'receipt' => UploadedFile::fake()->create('slip.pdf', 20, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $invoice = $this->invoice->fresh();
        $this->assertSame('paid', $invoice->status);
        $this->assertSame('1000.00', $invoice->paid);
        $this->assertSame(['approved'], InvoicePayment::query()->distinct()->pluck('status')->all());

        // Nothing left to pay.
        $this->post($route, ['amount' => 1, 'payment_date' => '2026-10-02', 'method' => 'cash'])->assertSessionHas('inertia.flash_data.toast.type', 'error');
        $this->assertSame(2, InvoicePayment::query()->count());
    }

    public function test_a_tenant_submits_a_receipt_that_counts_only_once_approved(): void
    {
        $this->actingAs($this->tenantUser);
        $route = route('invoices.payments.store', $this->invoice);

        $this->post($route, ['amount' => 1000])->assertSessionHasErrors('receipt');
        $this->post($route, ['amount' => 1000, 'notes' => 'DuitNow', 'receipt' => UploadedFile::fake()->image('slip.jpg')])->assertSessionHasNoErrors();

        $payment = InvoicePayment::query()->sole();
        $this->assertSame(['pending', 'bank_transfer', $this->tenantUser->id], [$payment->status, $payment->method, $payment->user_id]);
        $this->assertSame('0.00', $this->invoice->fresh()?->paid);
        $this->get(route('invoices.payments.receipt', [$this->invoice, $payment]))->assertOk();

        // Tenants can't approve their own transfer.
        $this->post(route('invoices.payments.approve', [$this->invoice, $payment]))->assertForbidden();
        $this->delete(route('invoices.payments.destroy', [$this->invoice, $payment]))->assertForbidden();

        $this->actingAs($this->userWithRole());
        $this->post(route('invoices.payments.approve', [$this->invoice, $payment]))->assertSessionHasNoErrors();
        $this->assertSame('paid', $this->invoice->fresh()?->status);

        // Approving twice is refused.
        $this->post(route('invoices.payments.approve', [$this->invoice, $payment]))->assertSessionHas('inertia.flash_data.toast.type', 'error');
    }

    public function test_rejected_and_deleted_payments_do_not_count(): void
    {
        $pending = $this->invoice->payments()->create(['amount' => 300, 'payment_date' => '2026-10-01', 'method' => 'bank_transfer', 'status' => 'pending']);
        $approved = $this->invoice->payments()->create(['amount' => 500, 'payment_date' => '2026-10-01', 'method' => 'cash']);
        $this->invoice->refreshTotals();

        $this->actingAs($this->userWithRole());
        $this->post(route('invoices.payments.reject', [$this->invoice, $pending]));
        $this->assertSame('rejected', $pending->fresh()?->status);
        $this->assertSame('500.00', $this->invoice->fresh()?->paid);

        $this->delete(route('invoices.payments.destroy', [$this->invoice, $approved]));
        $this->assertModelMissing($approved);
        $this->assertSame('0.00', $this->invoice->fresh()?->paid);
    }

    public function test_a_tenant_cannot_pay_or_see_another_tenants_invoice(): void
    {
        $other = $this->invoiceFor($this->userWithRole('tenant'));
        $payment = $other->payments()->create(['amount' => 100, 'payment_date' => '2026-10-01', 'method' => 'cash']);

        $this->actingAs($this->tenantUser);
        $this->post(route('invoices.payments.store', $other), ['amount' => 100, 'receipt' => UploadedFile::fake()->image('slip.jpg')])->assertNotFound();
        $this->get(route('invoices.payments.receipt', [$other, $payment]))->assertNotFound();

        // Payments are scoped to their invoice.
        $this->actingAs($this->userWithRole())->post(route('invoices.payments.approve', [$this->invoice, $payment]))->assertNotFound();
    }
}
