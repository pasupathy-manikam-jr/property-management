import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    CreditCard,
    Printer,
    SquarePen,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DatePicker } from '@/components/date-picker';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { DocumentLink } from '@/components/table-cells';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCan } from '@/hooks/use-can';
import { formatPhpDate, useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import invoiceRoutes from '@/routes/invoices';

type Invoice = {
    id: number;
    number: string;
    invoice_month: string;
    end_date: string;
    notes: string | null;
    is_recurring: boolean;
    recurring_day: number | null;
    total: string;
    paid: string;
    status: string;
    property: {
        name: string;
        address: string;
        city: string;
        state: string;
        zip_code: string;
        country: string;
    };
    unit: { name: string };
    tenant: {
        address: string;
        city: string;
        state: string;
        zip_code: string;
        country: string;
        user: { name: string; email: string; phone: string | null };
    };
    items: {
        id: number;
        amount: string;
        description: string | null;
        type: { name: string } | null;
    }[];
};

type Payment = {
    id: number;
    amount: string;
    payment_date: string;
    method: 'bank_transfer' | 'cash' | 'online';
    status: 'pending' | 'approved' | 'rejected';
    notes: string | null;
    file_name: string | null;
    has_receipt: boolean;
    user: { name: string } | null;
};

type Company = {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    taxTitle: string;
    taxNumber: string;
};

const METHODS = {
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
    online: 'Online',
} as const;

const today = () => formatPhpDate(new Date(), 'Y-m-d');

// Print only the invoice sheet, without the app's sidebar and header.
const PRINT_CSS = `@media print {
    body * { visibility: hidden; }
    #invoice-sheet, #invoice-sheet * { visibility: visible; }
    #invoice-sheet { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0; box-shadow: none; }
}`;

export default function ShowInvoice({
    invoice,
    payments,
    company,
    payAsTenant,
}: {
    invoice: Invoice;
    payments: Payment[];
    company: Company;
    payAsTenant: boolean;
}) {
    const { t } = useTranslation();
    const { date, money } = useFormat();
    const can = useCan();
    const [paying, setPaying] = useState(false);
    const [deleting, setDeleting] = useState<Payment | null>(null);
    const due = Math.max(0, Number(invoice.total) - Number(invoice.paid));
    const month = formatPhpDate(
        new Date(`${invoice.invoice_month.slice(0, 7)}-01T00:00:00`),
        'F Y',
    );
    const address = (a: Omit<Invoice['property'], 'name'>) =>
        [a.address, a.city, `${a.zip_code} ${a.state}`, a.country]
            .filter(Boolean)
            .join(', ');
    const review = (payment: Payment, action: 'approve' | 'reject') =>
        router.post(
            invoiceRoutes.payments[action]({
                invoice: invoice.id,
                payment: payment.id,
            }),
            {},
            { preserveScroll: true },
        );

    return (
        <>
            <Head title={invoice.number} />
            <style>{PRINT_CSS}</style>
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={invoice.number}
                    description="Invoice details and payment history."
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild>
                                <Link href={invoiceRoutes.index()}>
                                    <ArrowLeft className="rtl:rotate-180" />{' '}
                                    {t('Back')}
                                </Link>
                            </Button>
                            {can('edit-invoices') && (
                                <Button variant="outline" asChild>
                                    <Link href={invoiceRoutes.edit(invoice.id)}>
                                        <SquarePen /> {t('Edit')}
                                    </Link>
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => window.print()}
                            >
                                <Printer /> {t('Print')}
                            </Button>
                            {due > 0 && can('create-invoice-payments') && (
                                <Button onClick={() => setPaying(true)}>
                                    <CreditCard />{' '}
                                    {t(
                                        payAsTenant
                                            ? 'Pay Invoice'
                                            : 'Record Payment',
                                    )}
                                </Button>
                            )}
                        </div>
                    }
                />

                <article
                    id="invoice-sheet"
                    className="grid gap-8 rounded-xl border bg-card p-6 shadow-sm md:p-10"
                >
                    <header className="flex flex-wrap justify-between gap-6">
                        <div className="grid content-start gap-1 text-sm">
                            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t('From')}
                            </span>
                            <span className="text-lg font-semibold">
                                {company.companyName}
                            </span>
                            {company.companyAddress && (
                                <span className="whitespace-pre-line text-muted-foreground">
                                    {company.companyAddress}
                                </span>
                            )}
                            {company.companyPhone && (
                                <span>{company.companyPhone}</span>
                            )}
                            {company.companyEmail && (
                                <span>{company.companyEmail}</span>
                            )}
                            {company.taxNumber && (
                                <span>
                                    {company.taxTitle}: {company.taxNumber}
                                </span>
                            )}
                        </div>
                        <div className="grid content-start gap-1 text-sm sm:text-end">
                            <span className="text-2xl font-bold tracking-wide text-primary">
                                {t('INVOICE')}
                            </span>
                            <span className="font-semibold">
                                {invoice.number}
                            </span>
                            <span>
                                <span className="text-muted-foreground">
                                    {t('Invoice Month')}:
                                </span>{' '}
                                {month}
                            </span>
                            <span>
                                <span className="text-muted-foreground">
                                    {t('Due Date')}:
                                </span>{' '}
                                {date(invoice.end_date)}
                            </span>
                            <div className="mt-1">
                                <StatusBadge status={invoice.status} />
                            </div>
                        </div>
                    </header>

                    <div className="grid gap-6 text-sm sm:grid-cols-2">
                        <div className="grid content-start gap-1">
                            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t('Bill To')}
                            </span>
                            <span className="font-semibold">
                                {invoice.tenant.user.name}
                            </span>
                            <span>{invoice.tenant.user.email}</span>
                            {invoice.tenant.user.phone && (
                                <span>{invoice.tenant.user.phone}</span>
                            )}
                            <span className="text-muted-foreground">
                                {address(invoice.tenant)}
                            </span>
                        </div>
                        <div className="grid content-start gap-1 sm:text-end">
                            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t('Property')}
                            </span>
                            <span className="font-semibold">
                                {invoice.property.name} · {invoice.unit.name}
                            </span>
                            <span className="text-muted-foreground">
                                {address(invoice.property)}
                            </span>
                            {invoice.is_recurring && (
                                <span className="text-muted-foreground">
                                    {t('Recurs monthly on day :day', {
                                        day: invoice.recurring_day ?? '',
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-start text-muted-foreground">
                                    <th className="py-2 pe-4 text-start font-medium">
                                        {t('Type')}
                                    </th>
                                    <th className="py-2 pe-4 text-start font-medium">
                                        {t('Description')}
                                    </th>
                                    <th className="py-2 text-end font-medium">
                                        {t('Amount')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="py-3 pe-4 font-medium">
                                            {item.type?.name ?? '—'}
                                        </td>
                                        <td className="py-3 pe-4 text-muted-foreground">
                                            {item.description || '—'}
                                        </td>
                                        <td className="py-3 text-end whitespace-nowrap">
                                            {money(Number(item.amount))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <dl className="ms-auto mt-4 grid max-w-xs grid-cols-2 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">
                                {t('Total')}
                            </dt>
                            <dd className="text-end font-medium">
                                {money(Number(invoice.total))}
                            </dd>
                            <dt className="text-muted-foreground">
                                {t('Paid')}
                            </dt>
                            <dd className="text-end font-medium">
                                {money(Number(invoice.paid))}
                            </dd>
                            <dt className="border-t pt-2 font-semibold">
                                {t('Amount Due')}
                            </dt>
                            <dd className="border-t pt-2 text-end text-base font-bold">
                                {money(due)}
                            </dd>
                        </dl>
                    </div>

                    {invoice.notes && (
                        <div className="text-sm">
                            <div className="text-muted-foreground">
                                {t('Notes')}
                            </div>
                            <p className="mt-1 whitespace-pre-line">
                                {invoice.notes}
                            </p>
                        </div>
                    )}
                </article>

                <section className="rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-4 font-semibold">
                        {t('Payment History')}
                    </h2>
                    {payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t('No payments yet')}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        {[
                                            'Payment Date',
                                            'Method',
                                            'Amount',
                                            'Status',
                                            'Notes',
                                            'Receipt',
                                            'Recorded By',
                                        ].map((label) => (
                                            <th
                                                key={label}
                                                className="py-2 pe-4 text-start font-medium whitespace-nowrap"
                                            >
                                                {t(label)}
                                            </th>
                                        ))}
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((payment) => (
                                        <tr
                                            key={payment.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="py-3 pe-4 whitespace-nowrap">
                                                {date(payment.payment_date)}
                                            </td>
                                            <td className="py-3 pe-4 whitespace-nowrap">
                                                {t(METHODS[payment.method])}
                                            </td>
                                            <td className="py-3 pe-4 font-medium whitespace-nowrap">
                                                {money(Number(payment.amount))}
                                            </td>
                                            <td className="py-3 pe-4">
                                                <StatusBadge
                                                    status={payment.status}
                                                />
                                            </td>
                                            <td className="py-3 pe-4 text-muted-foreground">
                                                {payment.notes || '—'}
                                            </td>
                                            <td className="py-3 pe-4">
                                                <DocumentLink
                                                    href={
                                                        invoiceRoutes.payments.receipt(
                                                            {
                                                                invoice:
                                                                    invoice.id,
                                                                payment:
                                                                    payment.id,
                                                            },
                                                        ).url
                                                    }
                                                    fileName={
                                                        payment.has_receipt
                                                            ? payment.file_name
                                                            : null
                                                    }
                                                />
                                            </td>
                                            <td className="py-3 pe-4 whitespace-nowrap">
                                                {payment.user?.name ?? '—'}
                                            </td>
                                            <td className="py-3 text-end whitespace-nowrap">
                                                {payment.status === 'pending' &&
                                                    can('edit-invoices') && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={t(
                                                                    'Approve',
                                                                )}
                                                                onClick={() =>
                                                                    review(
                                                                        payment,
                                                                        'approve',
                                                                    )
                                                                }
                                                            >
                                                                <Check className="text-emerald-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={t(
                                                                    'Reject',
                                                                )}
                                                                onClick={() =>
                                                                    review(
                                                                        payment,
                                                                        'reject',
                                                                    )
                                                                }
                                                            >
                                                                <X className="text-destructive" />
                                                            </Button>
                                                        </>
                                                    )}
                                                {can(
                                                    'delete-invoice-payments',
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={t('Delete')}
                                                        onClick={() =>
                                                            setDeleting(payment)
                                                        }
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            <PaymentDialog
                open={paying}
                onOpenChange={setPaying}
                invoiceId={invoice.id}
                due={due}
                asTenant={payAsTenant}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This payment will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(
                        invoiceRoutes.payments.destroy({
                            invoice: invoice.id,
                            payment: deleting.id,
                        }),
                        {
                            preserveScroll: true,
                            onFinish: () => setDeleting(null),
                        },
                    )
                }
            />
        </>
    );
}

/** Staff record a payment; a tenant uploads their bank-transfer receipt for approval. */
function PaymentDialog({
    open,
    onOpenChange,
    invoiceId,
    due,
    asTenant,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceId: number;
    due: number;
    asTenant: boolean;
}) {
    const { t } = useTranslation();
    const form = useForm({
        amount: '',
        payment_date: today(),
        method: 'bank_transfer',
        notes: '',
        receipt: null as File | null,
    });

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData({
                amount: due.toFixed(2),
                payment_date: today(),
                method: 'bank_transfer',
                notes: '',
                receipt: null,
            });
        }
        // Reset only when the dialog opens.
    }, [open]);

    return (
        <FormDialog
            open={open}
            onOpenChange={onOpenChange}
            title={asTenant ? 'Pay Invoice' : 'Record Payment'}
            description={
                asTenant
                    ? 'Pay by bank transfer and upload the receipt. Your payment counts once it is approved.'
                    : undefined
            }
            processing={form.processing}
            submitLabel={asTenant ? 'Submit Payment' : 'Save'}
            onSubmit={(e) => {
                e.preventDefault();
                form.post(invoiceRoutes.payments.store(invoiceId).url, {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => onOpenChange(false),
                });
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-2">
                    <Label htmlFor="payment-amount">
                        {t('Amount')}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="payment-amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.data.amount}
                        onChange={(e) => form.setData('amount', e.target.value)}
                    />
                    <InputError message={form.errors.amount} />
                </div>
                {!asTenant && (
                    <>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="payment-date">
                                {t('Payment Date')}
                                <span className="text-destructive">*</span>
                            </Label>
                            <DatePicker
                                id="payment-date"
                                value={form.data.payment_date}
                                onChange={(value) =>
                                    form.setData('payment_date', value)
                                }
                            />
                            <InputError message={form.errors.payment_date} />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="payment-method">
                                {t('Method')}
                                <span className="text-destructive">*</span>
                            </Label>
                            <SelectField
                                id="payment-method"
                                value={form.data.method}
                                onChange={(e) =>
                                    form.setData('method', e.target.value)
                                }
                            >
                                {Object.entries(METHODS).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {t(label)}
                                        </option>
                                    ),
                                )}
                            </SelectField>
                            <InputError message={form.errors.method} />
                        </div>
                    </>
                )}
                <div className="grid content-start gap-2">
                    <Label htmlFor="payment-receipt">
                        {t('Receipt')}
                        {asTenant && (
                            <span className="text-destructive">*</span>
                        )}
                    </Label>
                    <Input
                        id="payment-receipt"
                        type="file"
                        onChange={(e) =>
                            form.setData('receipt', e.target.files?.[0] ?? null)
                        }
                    />
                    <InputError message={form.errors.receipt} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="payment-notes">{t('Notes')}</Label>
                    <Input
                        id="payment-notes"
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                    />
                    <InputError message={form.errors.notes} />
                </div>
            </div>
        </FormDialog>
    );
}

ShowInvoice.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Invoices', href: invoiceRoutes.index() },
    ],
};
