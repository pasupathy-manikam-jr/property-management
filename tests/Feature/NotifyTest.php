<?php

namespace Tests\Feature;

use App\Mail\NotificationMail;
use App\Models\Invoice;
use App\Models\MaintenanceRequest;
use App\Models\NotificationTemplate;
use App\Models\Tenant;
use App\Models\Unit;
use App\Support\Notify;
use Database\Seeders\Modules\FinanceSeeder;
use Database\Seeders\Modules\LookupSeeder;
use Database\Seeders\Modules\MaintenanceSeeder;
use Database\Seeders\Modules\PropertySeeder;
use Database\Seeders\Modules\SettingsSeeder;
use Database\Seeders\Modules\TenantSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotifyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs($this->userWithRole());
        $this->seed([LookupSeeder::class, PropertySeeder::class, TenantSeeder::class, MaintenanceSeeder::class, FinanceSeeder::class, SettingsSeeder::class]);
        Mail::fake();
    }

    private function sentTo(string $email, string $needle): void
    {
        Mail::assertSent(NotificationMail::class, fn (NotificationMail $mail) => $mail->hasTo($email)
            && str_contains($mail->mailSubject.' '.$mail->body, $needle));
    }

    public function test_new_tenant_gets_their_login_details(): void
    {
        $unit = Unit::query()->whereDoesntHave('activeLease')->firstOrFail();

        $this->post(route('tenants.store'), [
            'name' => 'Farah', 'email' => 'farah@example.com', 'phone' => '012-1', 'password' => 'Secret123!', 'password_confirmation' => 'Secret123!',
            'family_member' => 1, 'address' => 'Jalan 1', 'city' => 'KL', 'state' => 'WP', 'zip_code' => '50000', 'country' => 'Malaysia',
            'unit_id' => $unit->id, 'start_date' => '2026-01-01', 'end_date' => '2026-12-31',
        ])->assertSessionHasNoErrors();

        $this->sentTo('farah@example.com', 'Secret123!');
    }

    public function test_completing_a_request_tells_the_tenant_once(): void
    {
        $request = MaintenanceRequest::query()->whereNotNull('tenant_id')->where('status', '!=', 'completed')->firstOrFail();

        $request->setStatus('completed')->save();
        $request->update(['notes' => 'Done']);

        Mail::assertSent(NotificationMail::class, 1);
        $this->sentTo((string) $request->tenant?->user?->email, $request->unit->name);
    }

    public function test_approving_a_payment_sends_a_receipt_email(): void
    {
        $invoice = Invoice::query()->whereColumn('paid', '<', 'total')->firstOrFail();
        $payment = $invoice->payments()->create(['amount' => 1, 'payment_date' => today(), 'method' => 'bank_transfer', 'status' => 'pending']);

        $this->post(route('invoices.payments.approve', [$invoice, $payment]))->assertSessionHasNoErrors();

        $this->sentTo($invoice->tenant->user->email, (string) $invoice->number);
    }

    public function test_reminders_go_to_tenants_with_unpaid_invoices_due_soon(): void
    {
        $invoice = Invoice::query()->whereColumn('paid', '<', 'total')->firstOrFail();
        $invoice->update(['end_date' => today()->addDays(3)]);

        $this->artisan('invoices:send-reminders')->assertSuccessful();

        $this->sentTo($invoice->tenant->user->email, (string) $invoice->number);
    }

    public function test_disabled_templates_send_nothing(): void
    {
        NotificationTemplate::query()->update(['enabled' => false]);
        $tenant = Tenant::query()->firstOrFail();

        Notify::tenantCreated($tenant, 'x');

        Mail::assertNothingSent();
    }
}
