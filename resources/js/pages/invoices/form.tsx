import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import invoiceRoutes from '@/routes/invoices';

type Option = { id: number; name: string };

type PropertyOption = Option & {
    units: (Option & { active_lease: { tenant_id: number } | null })[];
};

type Item = {
    id: number | null;
    type_id: string;
    amount: string;
    description: string;
};

type EditableInvoice = {
    id: number;
    number: string;
    property_id: number;
    unit_id: number;
    tenant_id: number;
    invoice_month: string;
    end_date: string;
    notes: string | null;
    is_recurring: boolean;
    recurring_day: number | null;
    items: {
        id: number;
        type_id: number | null;
        amount: string;
        description: string | null;
    }[];
};

const blankItem: Item = { id: null, type_id: '', amount: '', description: '' };

const textareaClass =
    'rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

function Field({
    id,
    label,
    required = false,
    error,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <div className="grid content-start gap-2">
            <Label htmlFor={id}>
                {t(label)}
                {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

export default function InvoiceForm({
    invoice,
    properties,
    tenants,
    types,
}: {
    invoice: EditableInvoice | null;
    properties: PropertyOption[];
    tenants: Option[];
    types: Option[];
}) {
    const { t } = useTranslation();
    const { money } = useFormat();
    const can = useCan();
    const form = useForm({
        property_id: String(invoice?.property_id ?? ''),
        unit_id: String(invoice?.unit_id ?? ''),
        tenant_id: String(invoice?.tenant_id ?? ''),
        invoice_month: invoice?.invoice_month ?? '',
        end_date: invoice?.end_date ?? '',
        notes: invoice?.notes ?? '',
        is_recurring: invoice?.is_recurring ?? false,
        recurring_day: String(invoice?.recurring_day ?? ''),
        items: invoice
            ? invoice.items.map<Item>((item) => ({
                  id: item.id,
                  type_id: String(item.type_id ?? ''),
                  amount: item.amount,
                  description: item.description ?? '',
              }))
            : [blankItem],
    });
    const errors = form.errors as Record<string, string | undefined>;
    const units =
        properties.find((p) => String(p.id) === form.data.property_id)?.units ??
        [];
    const total = form.data.items.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
    );
    const title = invoice ? 'Edit Invoice' : 'Create Invoice';
    const back = invoice
        ? invoiceRoutes.show(invoice.id)
        : invoiceRoutes.index();

    const setItem = (index: number, changes: Partial<Item>) =>
        form.setData(
            'items',
            form.data.items.map((item, i) =>
                i === index ? { ...item, ...changes } : item,
            ),
        );

    return (
        <>
            <Head title={t(title)} />
            <form
                noValidate
                className="flex flex-1 flex-col gap-6 p-4 md:p-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.submit(
                        invoice
                            ? invoiceRoutes.update(invoice.id)
                            : invoiceRoutes.store(),
                    );
                }}
            >
                <PageHeader
                    title={title}
                    description={
                        invoice
                            ? invoice.number
                            : 'The number is assigned when the invoice is saved.'
                    }
                    action={
                        <Button variant="outline" asChild>
                            <Link href={back}>
                                <ArrowLeft className="rtl:rotate-180" />{' '}
                                {t('Back')}
                            </Link>
                        </Button>
                    }
                />

                <section className="grid gap-4 rounded-xl border bg-card p-6 shadow-sm sm:grid-cols-3">
                    <Field
                        id="property_id"
                        label="Property"
                        required
                        error={errors.property_id}
                    >
                        <SelectField
                            id="property_id"
                            value={form.data.property_id}
                            onChange={(e) =>
                                form.setData((data) => ({
                                    ...data,
                                    property_id: e.target.value,
                                    unit_id: '',
                                }))
                            }
                        >
                            <option value="">{t('Select Property')}</option>
                            {properties.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </SelectField>
                    </Field>
                    <Field
                        id="unit_id"
                        label="Unit"
                        required
                        error={errors.unit_id}
                    >
                        <SelectField
                            id="unit_id"
                            value={form.data.unit_id}
                            onChange={(e) => {
                                const tenantId = units.find(
                                    (u) => String(u.id) === e.target.value,
                                )?.active_lease?.tenant_id;
                                form.setData((data) => ({
                                    ...data,
                                    unit_id: e.target.value,
                                    // Default to whoever currently rents the unit.
                                    tenant_id: tenantId
                                        ? String(tenantId)
                                        : data.tenant_id,
                                }));
                            }}
                        >
                            <option value="">{t('Select Unit')}</option>
                            {units.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </SelectField>
                    </Field>
                    <Field
                        id="tenant_id"
                        label="Tenant"
                        required
                        error={errors.tenant_id}
                    >
                        <SelectField
                            id="tenant_id"
                            value={form.data.tenant_id}
                            onChange={(e) =>
                                form.setData('tenant_id', e.target.value)
                            }
                        >
                            <option value="">{t('Select Tenant')}</option>
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </SelectField>
                    </Field>
                    <Field
                        id="invoice_month"
                        label="Invoice Month"
                        required
                        error={errors.invoice_month}
                    >
                        <DatePicker
                            id="invoice_month"
                            value={form.data.invoice_month}
                            onChange={(value) =>
                                form.setData(
                                    'invoice_month',
                                    value && `${value.slice(0, 7)}-01`,
                                )
                            }
                        />
                    </Field>
                    <Field
                        id="end_date"
                        label="Due Date"
                        required
                        error={errors.end_date}
                    >
                        <DatePicker
                            id="end_date"
                            value={form.data.end_date}
                            onChange={(value) =>
                                form.setData('end_date', value)
                            }
                        />
                    </Field>
                    <div className="grid content-start gap-2">
                        <Label className="flex items-center gap-2 sm:mt-7">
                            <Checkbox
                                checked={form.data.is_recurring}
                                onCheckedChange={(checked) =>
                                    form.setData(
                                        'is_recurring',
                                        checked === true,
                                    )
                                }
                            />
                            {t('Recurring Invoice')}
                        </Label>
                        {form.data.is_recurring && (
                            <SelectField
                                id="recurring_day"
                                aria-label={t('Recurring Day')}
                                value={form.data.recurring_day}
                                onChange={(e) =>
                                    form.setData(
                                        'recurring_day',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">
                                    {t('Day of the month')}
                                </option>
                                {Array.from({ length: 28 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {i + 1}
                                    </option>
                                ))}
                            </SelectField>
                        )}
                        <InputError message={errors.recurring_day} />
                    </div>
                    <div className="sm:col-span-3">
                        <Field id="notes" label="Notes" error={errors.notes}>
                            <textarea
                                id="notes"
                                rows={2}
                                className={textareaClass}
                                value={form.data.notes}
                                onChange={(e) =>
                                    form.setData('notes', e.target.value)
                                }
                            />
                        </Field>
                    </div>
                </section>

                <section className="grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-semibold">{t('Invoice Items')}</h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                form.setData('items', [
                                    ...form.data.items,
                                    blankItem,
                                ])
                            }
                        >
                            <Plus /> {t('Add Item')}
                        </Button>
                    </div>
                    <InputError message={errors.items} />

                    <div className="grid gap-3">
                        <div className="hidden gap-3 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[12rem_10rem_1fr_2.25rem]">
                            <span>{t('Type')}</span>
                            <span>{t('Amount')}</span>
                            <span>{t('Description')}</span>
                        </div>
                        {form.data.items.map((item, index) => {
                            const removable =
                                form.data.items.length > 1 &&
                                (item.id === null ||
                                    can('delete-invoice-items'));

                            return (
                                <div
                                    key={item.id ?? `new-${index}`}
                                    className="grid gap-3 border-b pb-3 last:border-0 sm:grid-cols-[12rem_10rem_1fr_2.25rem] sm:border-0 sm:pb-0"
                                >
                                    <div className="grid content-start gap-1">
                                        <SelectField
                                            aria-label={t('Type')}
                                            value={item.type_id}
                                            onChange={(e) =>
                                                setItem(index, {
                                                    type_id: e.target.value,
                                                })
                                            }
                                        >
                                            <option value="">
                                                {t('Select Type')}
                                            </option>
                                            {types.map((type) => (
                                                <option
                                                    key={type.id}
                                                    value={type.id}
                                                >
                                                    {type.name}
                                                </option>
                                            ))}
                                        </SelectField>
                                        <InputError
                                            message={
                                                errors[`items.${index}.type_id`]
                                            }
                                        />
                                    </div>
                                    <div className="grid content-start gap-1">
                                        <Input
                                            aria-label={t('Amount')}
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={item.amount}
                                            onChange={(e) =>
                                                setItem(index, {
                                                    amount: e.target.value,
                                                })
                                            }
                                        />
                                        <InputError
                                            message={
                                                errors[`items.${index}.amount`]
                                            }
                                        />
                                    </div>
                                    <div className="grid content-start gap-1">
                                        <Input
                                            aria-label={t('Description')}
                                            value={item.description}
                                            onChange={(e) =>
                                                setItem(index, {
                                                    description: e.target.value,
                                                })
                                            }
                                        />
                                        <InputError
                                            message={
                                                errors[
                                                    `items.${index}.description`
                                                ]
                                            }
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t('Remove')}
                                        disabled={!removable}
                                        onClick={() =>
                                            form.setData(
                                                'items',
                                                form.data.items.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end gap-4 border-t pt-4 text-lg font-semibold">
                        <span>{t('Total')}</span>
                        <span>{money(total)}</span>
                    </div>
                </section>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                        <Link href={back}>{t('Cancel')}</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing && <Spinner />}
                        {t(invoice ? 'Save' : 'Create Invoice')}
                    </Button>
                </div>
            </form>
        </>
    );
}

InvoiceForm.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Invoices', href: invoiceRoutes.index() },
    ],
};
