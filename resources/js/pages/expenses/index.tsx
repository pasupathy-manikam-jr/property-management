import { Head, router, useForm } from '@inertiajs/react';
import { Eye, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { DatePicker } from '@/components/date-picker';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { DateCell, DocumentLink, IdBadge } from '@/components/table-cells';
import { DateRangeFilter, FilterSelect } from '@/components/table-filters';
import { ViewDialog } from '@/components/view-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import expenseRoutes from '@/routes/expenses';
import type { Paginated, TableFilters } from '@/types';

type Option = { id: number; name: string };
type PropertyOption = Option & { units: Option[] };

type Expense = {
    id: number;
    number: string;
    title: string;
    type_id: number | null;
    property_id: number;
    unit_id: number | null;
    date: string;
    amount: string;
    notes: string | null;
    file_name: string | null;
    type: Option | null;
    property: Option;
    unit: Option | null;
};

const textareaClass =
    'rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

export default function Expenses({
    expenses,
    total,
    properties,
    types,
    filters,
}: {
    expenses: Paginated<Expense>;
    total: string | number;
    properties: PropertyOption[];
    types: Option[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { date, money } = useFormat();
    const can = useCan();
    const [editing, setEditing] = useState<{ expense: Expense | null } | null>(
        null,
    );
    const [viewing, setViewing] = useState<Expense | null>(null);
    const [deleting, setDeleting] = useState<Expense | null>(null);
    const url = expenseRoutes.index();
    const receipt = (e: Expense) => (
        <DocumentLink
            href={expenseRoutes.receipt(e.id).url}
            fileName={e.file_name}
        />
    );

    return (
        <>
            <Head title={t('Expenses')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Expenses"
                    description="Money spent on your properties and units."
                    action={
                        can('create-expenses') && (
                            <Button
                                onClick={() => setEditing({ expense: null })}
                            >
                                <Plus /> {t('Create Expense')}
                            </Button>
                        )
                    }
                />

                <div className="flex flex-wrap items-baseline gap-2 rounded-xl border bg-card px-6 py-4 shadow-sm">
                    <span className="text-sm text-muted-foreground">
                        {t('Total of the listed expenses')}
                    </span>
                    <span className="text-xl font-bold">
                        {money(Number(total))}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        ({t(':count records', { count: expenses.total })})
                    </span>
                </div>

                <DataTable
                    data={expenses}
                    filters={filters}
                    url={url}
                    columns={[
                        {
                            key: 'number',
                            label: 'Expense',
                            sortable: true,
                            render: (e) => <IdBadge>{e.number}</IdBadge>,
                        },
                        {
                            key: 'title',
                            label: 'Title',
                            sortable: true,
                            render: (e) => (
                                <div className="grid">
                                    <span className="font-medium">
                                        {e.title}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {e.type?.name}
                                    </span>
                                </div>
                            ),
                        },
                        {
                            key: 'property',
                            label: 'Property & Unit',
                            render: (e) => (
                                <div className="grid">
                                    <span>{e.property.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {e.unit?.name ?? t('Whole property')}
                                    </span>
                                </div>
                            ),
                        },
                        {
                            key: 'date',
                            label: 'Date',
                            sortable: true,
                            render: (e) => <DateCell value={e.date} />,
                        },
                        {
                            key: 'amount',
                            label: 'Amount',
                            sortable: true,
                            render: (e) => (
                                <span className="font-medium whitespace-nowrap">
                                    {money(Number(e.amount))}
                                </span>
                            ),
                        },
                        {
                            key: 'receipt',
                            label: 'Receipt',
                            render: receipt,
                        },
                    ]}
                    toolbar={
                        <>
                            <FilterSelect
                                url={url}
                                filters={filters}
                                name="property_id"
                                label="All Properties"
                                options={properties}
                            />
                            <FilterSelect
                                url={url}
                                filters={filters}
                                name="type_id"
                                label="All Types"
                                options={types}
                            />
                        </>
                    }
                    moreFilters={
                        <DateRangeFilter url={url} filters={filters} />
                    }
                    actions={(e) => (
                        <>
                            {can('show-expenses') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('View')}
                                    onClick={() => setViewing(e)}
                                >
                                    <Eye />
                                </Button>
                            )}
                            {can('edit-expenses') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Edit')}
                                    onClick={() => setEditing({ expense: e })}
                                >
                                    <SquarePen />
                                </Button>
                            )}
                            {can('delete-expenses') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(e)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </>
                    )}
                />
            </div>

            <ExpenseDialog
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
                expense={editing?.expense ?? null}
                properties={properties}
                types={types}
            />

            <ViewDialog
                open={viewing !== null}
                onClose={() => setViewing(null)}
                title={viewing ? `${viewing.number} · ${viewing.title}` : ''}
                fields={
                    viewing
                        ? [
                              ['Expense Type', viewing.type?.name],
                              ['Amount', money(Number(viewing.amount))],
                              ['Property', viewing.property.name],
                              ['Unit', viewing.unit?.name],
                              ['Date', date(viewing.date)],
                              [
                                  'Receipt',
                                  viewing.file_name && receipt(viewing),
                              ],
                              ['Notes', viewing.notes, true],
                          ]
                        : []
                }
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This expense will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(expenseRoutes.destroy(deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

function ExpenseDialog({
    open,
    onOpenChange,
    expense,
    properties,
    types,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expense: Expense | null;
    properties: PropertyOption[];
    types: Option[];
}) {
    const { t } = useTranslation();
    const form = useForm({
        title: '',
        type_id: '',
        property_id: '',
        unit_id: '',
        date: '',
        amount: '',
        notes: '',
        receipt: null as File | null,
    });
    const units =
        properties.find((p) => String(p.id) === form.data.property_id)?.units ??
        [];

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData({
                title: expense?.title ?? '',
                type_id: String(expense?.type_id ?? ''),
                property_id: String(expense?.property_id ?? ''),
                unit_id: String(expense?.unit_id ?? ''),
                date: expense?.date ?? '',
                amount: expense?.amount ?? '',
                notes: expense?.notes ?? '',
                receipt: null,
            });
        }
        // Reset only when the dialog opens.
    }, [open]);

    const label = (id: string, text: string, required = true) => (
        <Label htmlFor={id}>
            {t(text)}
            {required && <span className="text-destructive">*</span>}
        </Label>
    );

    return (
        <FormDialog
            open={open}
            onOpenChange={onOpenChange}
            title={expense ? 'Edit Expense' : 'Create Expense'}
            description={expense?.number}
            processing={form.processing}
            onSubmit={(e) => {
                e.preventDefault();
                // Files need multipart; PHP only parses it on POST, so updates spoof PUT via _method.
                form.post(
                    expense
                        ? expenseRoutes.update.form(expense.id).action
                        : expenseRoutes.store().url,
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () => onOpenChange(false),
                    },
                );
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-2 sm:col-span-2">
                    {label('expense-title', 'Expense Title')}
                    <Input
                        id="expense-title"
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                    <InputError message={form.errors.title} />
                </div>
                <div className="grid content-start gap-2">
                    {label('expense-type', 'Expense Type')}
                    <SelectField
                        id="expense-type"
                        value={form.data.type_id}
                        onChange={(e) =>
                            form.setData('type_id', e.target.value)
                        }
                    >
                        <option value="">{t('Select Type')}</option>
                        {types.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.name}
                            </option>
                        ))}
                    </SelectField>
                    <InputError message={form.errors.type_id} />
                </div>
                <div className="grid content-start gap-2">
                    {label('expense-amount', 'Amount')}
                    <Input
                        id="expense-amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.data.amount}
                        onChange={(e) => form.setData('amount', e.target.value)}
                    />
                    <InputError message={form.errors.amount} />
                </div>
                <div className="grid content-start gap-2">
                    {label('expense-property', 'Property')}
                    <SelectField
                        id="expense-property"
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
                    <InputError message={form.errors.property_id} />
                </div>
                <div className="grid content-start gap-2">
                    {label('expense-unit', 'Unit', false)}
                    <SelectField
                        id="expense-unit"
                        value={form.data.unit_id}
                        onChange={(e) =>
                            form.setData('unit_id', e.target.value)
                        }
                    >
                        <option value="">{t('Whole property')}</option>
                        {units.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </SelectField>
                    <InputError message={form.errors.unit_id} />
                </div>
                <div className="grid content-start gap-2">
                    {label('expense-date', 'Date')}
                    <DatePicker
                        id="expense-date"
                        value={form.data.date}
                        onChange={(value) => form.setData('date', value)}
                    />
                    <InputError message={form.errors.date} />
                </div>
                <div className="grid content-start gap-2">
                    {label('expense-receipt', 'Receipt', false)}
                    <Input
                        id="expense-receipt"
                        type="file"
                        onChange={(e) =>
                            form.setData('receipt', e.target.files?.[0] ?? null)
                        }
                    />
                    {expense?.file_name && (
                        <span className="text-xs text-muted-foreground">
                            {t('Current file: :name', {
                                name: expense.file_name,
                            })}
                        </span>
                    )}
                    <InputError message={form.errors.receipt} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                    {label('expense-notes', 'Notes', false)}
                    <textarea
                        id="expense-notes"
                        rows={3}
                        className={textareaClass}
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                    />
                    <InputError message={form.errors.notes} />
                </div>
            </div>
        </FormDialog>
    );
}

Expenses.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Expenses', href: expenseRoutes.index() },
    ],
};
