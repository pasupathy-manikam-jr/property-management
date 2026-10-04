<?php

namespace App\Support;

use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Maintainer;
use App\Models\MaintenanceRequest;
use App\Models\Tenant;
use App\Models\User;

/**
 * The app's email notifications: picks the recipient and fills the template placeholders
 * (see NotificationTemplate::EVENTS). Sending never throws; see Notifier.
 */
class Notify
{
    public static function tenantCreated(Tenant $tenant, string $password): void
    {
        Notifier::send('tenant_created', $tenant->user, [
            'tenant_name' => $tenant->user->name,
            'email' => $tenant->user->email,
            'password' => $password,
            'login_url' => route('login'),
        ]);
    }

    public static function maintainerCreated(Maintainer $maintainer, string $password): void
    {
        Notifier::send('maintainer_created', $maintainer->user, [
            'maintainer_name' => $maintainer->user->name,
            'email' => $maintainer->user->email,
            'password' => $password,
            'login_url' => route('login'),
        ]);
    }

    /**
     * To the assigned maintainer, or to the admins when nobody is assigned yet.
     */
    public static function maintenanceCreated(MaintenanceRequest $request): void
    {
        $recipients = $request->maintainer?->user
            ? collect([$request->maintainer->user])
            : User::role('admin')->where('status', 'active')->get();

        foreach ($recipients as $user) {
            Notifier::send('maintenance_request_created', $user, self::maintenanceData($request));
        }
    }

    public static function maintenanceCompleted(MaintenanceRequest $request): void
    {
        if ($tenantUser = $request->tenant?->user) {
            Notifier::send('maintenance_completed', $tenantUser, self::maintenanceData($request));
        }
    }

    public static function invoiceCreated(Invoice $invoice): void
    {
        Notifier::send('invoice_created', $invoice->tenant->user, [
            ...self::invoiceData($invoice),
            'invoice_month' => $invoice->invoice_month->translatedFormat('F Y'),
            'amount' => Format::money($invoice->total),
        ]);
    }

    public static function paymentReminder(Invoice $invoice): void
    {
        Notifier::send('payment_reminder', $invoice->tenant->user, [
            ...self::invoiceData($invoice),
            'amount' => Format::money($invoice->due()),
        ]);
    }

    public static function paymentReceived(InvoicePayment $payment): void
    {
        $invoice = $payment->invoice;

        Notifier::send('payment_received', $invoice->tenant->user, [
            ...self::invoiceData($invoice),
            'amount' => Format::money($payment->amount),
            'payment_date' => Format::date($payment->payment_date),
        ]);
    }

    /**
     * @return array<string, string>
     */
    private static function invoiceData(Invoice $invoice): array
    {
        return [
            'tenant_name' => $invoice->tenant->user->name,
            'invoice_number' => (string) $invoice->number,
            'due_date' => Format::date($invoice->end_date),
            'property_name' => $invoice->property->name,
            'unit_name' => $invoice->unit->name,
        ];
    }

    /**
     * @return array<string, string>
     */
    private static function maintenanceData(MaintenanceRequest $request): array
    {
        return [
            'tenant_name' => (string) $request->tenant?->user?->name,
            'maintainer_name' => (string) $request->maintainer?->user?->name,
            'property_name' => $request->property->name,
            'unit_name' => $request->unit->name,
            'issue_type' => (string) $request->issueType?->name,
            'request_date' => Format::date($request->request_date),
        ];
    }
}
