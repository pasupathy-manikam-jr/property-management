import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { DatePicker } from '@/components/date-picker';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { SelectField } from '@/components/select-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import tenantRoutes from '@/routes/tenants';

export type PropertyOption = {
    id: number;
    name: string;
    units: { id: number; name: string; occupied: boolean }[];
};

type LeaseData = {
    property_id: string;
    unit_id: string;
    start_date: string;
    end_date: string;
};

/**
 * Property → unit → start/end fields. Occupied units are listed but disabled,
 * except `ownUnitId` (the tenant's current unit when renewing).
 */
export function LeaseFields({
    data,
    onChange,
    errors,
    properties,
    ownUnitId,
}: {
    data: LeaseData;
    onChange: (changes: Partial<LeaseData>) => void;
    errors: Partial<Record<keyof LeaseData, string>>;
    properties: PropertyOption[];
    ownUnitId?: number;
}) {
    const { t } = useTranslation();
    const units =
        properties.find((p) => String(p.id) === data.property_id)?.units ?? [];

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor="lease-property">
                    {t('Property')}
                    <span className="text-destructive">*</span>
                </Label>
                <SelectField
                    id="lease-property"
                    value={data.property_id}
                    onChange={(e) =>
                        onChange({ property_id: e.target.value, unit_id: '' })
                    }
                >
                    <option value="">{t('Select Property')}</option>
                    {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </SelectField>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="lease-unit">
                    {t('Unit')}
                    <span className="text-destructive">*</span>
                </Label>
                <SelectField
                    id="lease-unit"
                    value={data.unit_id}
                    onChange={(e) => onChange({ unit_id: e.target.value })}
                >
                    <option value="">{t('Select Unit')}</option>
                    {units.map((u) => {
                        const taken = u.occupied && u.id !== ownUnitId;

                        return (
                            <option key={u.id} value={u.id} disabled={taken}>
                                {taken
                                    ? `${u.name} (${t('Occupied')})`
                                    : u.name}
                            </option>
                        );
                    })}
                </SelectField>
                <InputError message={errors.unit_id} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="lease-start">
                    {t('Lease Start Date')}
                    <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                    id="lease-start"
                    value={data.start_date}
                    onChange={(value) => onChange({ start_date: value })}
                />
                <InputError message={errors.start_date} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="lease-end">
                    {t('Lease End Date')}
                    <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                    id="lease-end"
                    value={data.end_date}
                    onChange={(value) => onChange({ end_date: value })}
                />
                <InputError message={errors.end_date} />
            </div>
        </div>
    );
}

export function RenewLeaseDialog({
    tenant,
    onClose,
    properties,
}: {
    tenant: {
        id: number;
        active_lease: {
            unit_id: number;
            end_date: string;
            unit: { property_id: number };
        } | null;
    } | null;
    onClose: () => void;
    properties: PropertyOption[];
}) {
    const form = useForm<LeaseData>({
        property_id: '',
        unit_id: '',
        start_date: '',
        end_date: '',
    });

    useEffect(() => {
        if (tenant) {
            const lease = tenant.active_lease;
            form.clearErrors();
            form.setData({
                property_id: lease ? String(lease.unit.property_id) : '',
                unit_id: lease ? String(lease.unit_id) : '',
                start_date: lease?.end_date ?? '',
                end_date: '',
            });
        }
        // Reset only when a tenant is picked.
    }, [tenant]);

    return (
        <FormDialog
            open={tenant !== null}
            onOpenChange={(open) => !open && onClose()}
            title="Renew Lease"
            description="Start a new lease period, in the same or another unit."
            submitLabel="Renew"
            processing={form.processing}
            onSubmit={(e) => {
                e.preventDefault();

                if (tenant) {
                    form.submit(tenantRoutes.renew(tenant.id), {
                        preserveScroll: true,
                        onSuccess: onClose,
                    });
                }
            }}
        >
            <LeaseFields
                data={form.data}
                onChange={(changes) =>
                    form.setData((data) => ({ ...data, ...changes }))
                }
                errors={form.errors}
                properties={properties}
                ownUnitId={tenant?.active_lease?.unit_id}
            />
        </FormDialog>
    );
}

export function ExitTenantDialog({
    tenantId,
    onClose,
}: {
    tenantId: number | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({
        exit_date: '',
        exit_amount: '',
        extra_charge: '',
        exit_reason: '',
    });

    useEffect(() => {
        if (tenantId) {
            form.reset();
            form.clearErrors();
        }
        // Reset only when a tenant is picked.
    }, [tenantId]);

    return (
        <FormDialog
            open={tenantId !== null}
            onOpenChange={(open) => !open && onClose()}
            title="Exit Tenant"
            description="Move the tenant out and record the deposit settlement. The unit becomes vacant."
            submitLabel="Exit Tenant"
            processing={form.processing}
            onSubmit={(e) => {
                e.preventDefault();

                if (tenantId) {
                    form.submit(tenantRoutes.exit(tenantId), {
                        preserveScroll: true,
                        onSuccess: onClose,
                    });
                }
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="exit-date">
                        {t('Exit Date')}
                        <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                        id="exit-date"
                        value={form.data.exit_date}
                        onChange={(value) => form.setData('exit_date', value)}
                    />
                    <InputError message={form.errors.exit_date} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="exit-amount">{t('Exit Amount')}</Label>
                    <Input
                        id="exit-amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.data.exit_amount}
                        onChange={(e) =>
                            form.setData('exit_amount', e.target.value)
                        }
                    />
                    <InputError message={form.errors.exit_amount} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="extra-charge">{t('Extra Charge')}</Label>
                    <Input
                        id="extra-charge"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.data.extra_charge}
                        onChange={(e) =>
                            form.setData('extra_charge', e.target.value)
                        }
                    />
                    <InputError message={form.errors.extra_charge} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="exit-reason">{t('Reason')}</Label>
                    <textarea
                        id="exit-reason"
                        rows={3}
                        className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                        value={form.data.exit_reason}
                        onChange={(e) =>
                            form.setData('exit_reason', e.target.value)
                        }
                    />
                    <InputError message={form.errors.exit_reason} />
                </div>
            </div>
        </FormDialog>
    );
}
