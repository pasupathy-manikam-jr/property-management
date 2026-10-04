<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Support\Notify;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoicePaymentController extends Controller
{
    /**
     * Staff record an approved payment; a tenant submits a bank-transfer receipt for approval.
     */
    public function store(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->ensureVisible($request, $invoice);

        if ($invoice->due() <= 0) {
            return $this->toast('error', __('This invoice is already paid.'));
        }

        $amount = ['required', 'numeric', 'min:0.01', 'max:'.$invoice->due()];

        if ($request->user()->hasRole('tenant')) {
            $data = [...$request->validate([
                'amount' => $amount,
                'receipt' => InvoicePayment::uploadRules(required: true),
                'notes' => ['nullable', 'string', 'max:1000'],
            ]), 'method' => 'bank_transfer', 'payment_date' => today(), 'status' => 'pending'];
        } else {
            $data = [...$request->validate([
                'amount' => $amount,
                'payment_date' => ['required', 'date'],
                'method' => ['required', Rule::in(InvoicePayment::METHODS)],
                'receipt' => InvoicePayment::uploadRules(),
                'notes' => ['nullable', 'string', 'max:1000'],
            ]), 'status' => 'approved'];
        }

        $payment = new InvoicePayment([...$data, 'user_id' => $request->user()->id]);
        $payment->invoice()->associate($invoice)->attachUploadFrom($request, 'receipt')->save();
        $invoice->refreshTotals();

        if ($payment->status === 'approved') {
            Notify::paymentReceived($payment);
        }

        return $this->done($payment->status === 'pending'
            ? __('Payment submitted. It will count once approved.')
            : __('Payment recorded successfully.'));
    }

    public function approve(Invoice $invoice, InvoicePayment $payment): RedirectResponse
    {
        if ($payment->status !== 'pending') {
            return $this->toast('error', __('Only pending payments can be approved.'));
        }

        if ((float) $payment->amount > $invoice->due()) {
            return $this->toast('error', __('This payment is more than the amount due.'));
        }

        $payment->update(['status' => 'approved']);
        $invoice->refreshTotals();
        Notify::paymentReceived($payment);

        return $this->done(__('Payment approved.'));
    }

    public function reject(Invoice $invoice, InvoicePayment $payment): RedirectResponse
    {
        if ($payment->status !== 'pending') {
            return $this->toast('error', __('Only pending payments can be rejected.'));
        }

        $payment->update(['status' => 'rejected']);

        return $this->done(__('Payment rejected.'));
    }

    public function destroy(Invoice $invoice, InvoicePayment $payment): RedirectResponse
    {
        $payment->delete();
        $invoice->refreshTotals();

        return $this->done(__('Payment deleted successfully.'));
    }

    public function receipt(Request $request, Invoice $invoice, InvoicePayment $payment): StreamedResponse
    {
        $this->ensureVisible($request, $invoice);

        return $payment->downloadUpload();
    }

    private function ensureVisible(Request $request, Invoice $invoice): void
    {
        abort_unless(Invoice::query()->visibleTo($request->user())->whereKey($invoice->id)->exists(), 404);
    }
}
