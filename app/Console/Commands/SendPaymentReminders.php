<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Support\Notify;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('invoices:send-reminders {--days=3 : Remind this many days before the due date}')]
#[Description('Email tenants about invoices that fall due soon and are not fully paid')]
class SendPaymentReminders extends Command
{
    public function handle(): int
    {
        $sent = 0;

        Invoice::query()
            ->whereDate('end_date', today()->addDays((int) $this->option('days')))
            ->whereColumn('paid', '<', 'total')
            ->with('tenant.user', 'property:id,name', 'unit:id,name')
            ->each(function (Invoice $invoice) use (&$sent) {
                Notify::paymentReminder($invoice);
                $sent++;
            });

        $this->info("Sent {$sent} payment reminder(s).");

        return self::SUCCESS;
    }
}
