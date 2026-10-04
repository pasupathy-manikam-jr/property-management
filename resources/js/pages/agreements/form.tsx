import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import agreementRoutes from '@/routes/agreements';

type PropertyOption = {
    id: number;
    name: string;
    units: {
        id: number;
        name: string;
        active_lease: { tenant_id: number } | null;
    }[];
};

type EditableAgreement = {
    id: number;
    number: string;
    unit_id: number;
    tenant_id: number;
    start_date: string;
    end_date: string;
    status: string;
    terms: string;
    description: string | null;
    file_name: string | null;
    unit: { property_id: number };
};

const STATUSES = [
    'draft',
    'pending',
    'active',
    'confirmed',
    'completed',
    'cancelled',
];

const textareaClass =
    'rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

function Field({
    id,
    label,
    required = false,
    error,
    className,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    className?: string;
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <div className={cn('grid content-start gap-2', className)}>
            <Label htmlFor={id}>
                {t(label)}
                {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

export default function AgreementForm({
    agreement,
    properties,
    tenants,
    defaultTerms = '',
}: {
    agreement: EditableAgreement | null;
    properties: PropertyOption[];
    tenants: { id: number; name: string }[];
    defaultTerms?: string;
}) {
    const { t } = useTranslation();
    const form = useForm({
        property_id: agreement ? String(agreement.unit.property_id) : '',
        unit_id: agreement ? String(agreement.unit_id) : '',
        tenant_id: agreement ? String(agreement.tenant_id) : '',
        start_date: agreement?.start_date ?? '',
        end_date: agreement?.end_date ?? '',
        status: agreement?.status ?? 'draft',
        terms: agreement?.terms ?? defaultTerms,
        description: agreement?.description ?? '',
        document: null as File | null,
    });
    const units =
        properties.find((p) => String(p.id) === form.data.property_id)?.units ??
        [];
    const title = agreement ? 'Edit Agreement' : 'Create Agreement';
    const back = agreement
        ? agreementRoutes.show(agreement.id)
        : agreementRoutes.index();

    return (
        <>
            <Head title={t(title)} />
            <form
                noValidate
                className="flex flex-1 flex-col gap-6 p-4 md:p-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    // Files need multipart; PHP only parses it on POST, so updates spoof PUT via _method.
                    form.post(
                        agreement
                            ? agreementRoutes.update.form(agreement.id).action
                            : agreementRoutes.store().url,
                        { forceFormData: true },
                    );
                }}
            >
                <PageHeader
                    title={title}
                    description={
                        agreement
                            ? agreement.number
                            : 'The tenant defaults to whoever currently leases the unit.'
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

                <section className="grid gap-4 rounded-xl border bg-card p-6 shadow-sm sm:grid-cols-2">
                    <Field id="property_id" label="Property" required>
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
                        error={form.errors.unit_id}
                    >
                        <SelectField
                            id="unit_id"
                            value={form.data.unit_id}
                            onChange={(e) => {
                                const unit = units.find(
                                    (u) => String(u.id) === e.target.value,
                                );
                                form.setData((data) => ({
                                    ...data,
                                    unit_id: e.target.value,
                                    tenant_id: unit?.active_lease
                                        ? String(unit.active_lease.tenant_id)
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
                        error={form.errors.tenant_id}
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
                        id="status"
                        label="Status"
                        required
                        error={form.errors.status}
                    >
                        <SelectField
                            id="status"
                            value={form.data.status}
                            onChange={(e) =>
                                form.setData('status', e.target.value)
                            }
                        >
                            {STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {t(
                                        status.charAt(0).toUpperCase() +
                                            status.slice(1),
                                    )}
                                </option>
                            ))}
                        </SelectField>
                    </Field>
                    <Field
                        id="start_date"
                        label="Agreement Start Date"
                        required
                        error={form.errors.start_date}
                    >
                        <DatePicker
                            id="start_date"
                            value={form.data.start_date}
                            onChange={(value) =>
                                form.setData('start_date', value)
                            }
                        />
                    </Field>
                    <Field
                        id="end_date"
                        label="Agreement End Date"
                        required
                        error={form.errors.end_date}
                    >
                        <DatePicker
                            id="end_date"
                            value={form.data.end_date}
                            onChange={(value) =>
                                form.setData('end_date', value)
                            }
                        />
                    </Field>
                    <Field
                        id="terms"
                        label="Terms & Conditions"
                        required
                        error={form.errors.terms}
                        className="sm:col-span-2"
                    >
                        <textarea
                            id="terms"
                            rows={8}
                            className={textareaClass}
                            value={form.data.terms}
                            onChange={(e) =>
                                form.setData('terms', e.target.value)
                            }
                        />
                    </Field>
                    <Field
                        id="description"
                        label="Description"
                        error={form.errors.description}
                        className="sm:col-span-2"
                    >
                        <textarea
                            id="description"
                            rows={4}
                            className={textareaClass}
                            value={form.data.description}
                            onChange={(e) =>
                                form.setData('description', e.target.value)
                            }
                        />
                    </Field>
                    <Field
                        id="document"
                        label="Attachment"
                        error={form.errors.document}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="document"
                            type="file"
                            onChange={(e) =>
                                form.setData(
                                    'document',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                        />
                        {agreement?.file_name && (
                            <p className="text-sm text-muted-foreground">
                                {t('Current file: :name', {
                                    name: agreement.file_name,
                                })}
                            </p>
                        )}
                    </Field>
                </section>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                        <Link href={back}>{t('Cancel')}</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing && <Spinner />}
                        {t(agreement ? 'Save' : 'Create Agreement')}
                    </Button>
                </div>
            </form>
        </>
    );
}

AgreementForm.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Agreements', href: agreementRoutes.index() },
    ],
};
