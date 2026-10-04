import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { DatePicker } from '@/components/date-picker';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { SelectField } from '@/components/select-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import unitRoutes from '@/routes/units';

export type UnitData = {
    name: string;
    bedroom: string;
    kitchen: string;
    baths: string;
    rent: string;
    rent_type: 'monthly' | 'yearly' | 'custom';
    rent_duration: string;
    start_date: string;
    end_date: string;
    payment_due_date: string;
    deposit_type: 'fixed' | 'percentage';
    deposit_amount: string;
    late_fee_type: 'fixed' | 'percentage';
    late_fee_amount: string;
    incident_receipt_amount: string;
    notes: string;
};

export type Unit = {
    id: number;
    property_id: number;
    name: string;
    bedroom: number;
    kitchen: number;
    baths: number;
    rent: string;
    rent_type: UnitData['rent_type'];
    rent_duration: number | null;
    start_date: string | null;
    end_date: string | null;
    payment_due_date: string | null;
    deposit_type: UnitData['deposit_type'];
    deposit_amount: string;
    late_fee_type: UnitData['late_fee_type'];
    late_fee_amount: string;
    incident_receipt_amount: string;
    notes: string | null;
};

export const blankUnit: UnitData = {
    name: '',
    bedroom: '1',
    kitchen: '1',
    baths: '1',
    rent: '',
    rent_type: 'monthly',
    rent_duration: '',
    start_date: '',
    end_date: '',
    payment_due_date: '',
    deposit_type: 'fixed',
    deposit_amount: '0',
    late_fee_type: 'fixed',
    late_fee_amount: '0',
    incident_receipt_amount: '0',
    notes: '',
};

export function unitData(unit: Unit): UnitData {
    return {
        name: unit.name,
        bedroom: String(unit.bedroom),
        kitchen: String(unit.kitchen),
        baths: String(unit.baths),
        rent: unit.rent,
        rent_type: unit.rent_type,
        rent_duration: unit.rent_duration ? String(unit.rent_duration) : '',
        start_date: unit.start_date ?? '',
        end_date: unit.end_date ?? '',
        payment_due_date: unit.payment_due_date ?? '',
        deposit_type: unit.deposit_type,
        deposit_amount: unit.deposit_amount,
        late_fee_type: unit.late_fee_type,
        late_fee_amount: unit.late_fee_amount,
        incident_receipt_amount: unit.incident_receipt_amount,
        notes: unit.notes ?? '',
    };
}

/**
 * The unit's rent, deposit and late-fee fields. Used on its own (unit dialog) and nested
 * under "unit." in the property form, so the caller maps keys to its form state and errors.
 */
export function UnitFields({
    data,
    onChange,
    errors,
    idPrefix = 'unit',
}: {
    data: UnitData;
    onChange: <K extends keyof UnitData>(key: K, value: UnitData[K]) => void;
    errors: Partial<Record<keyof UnitData, string>>;
    idPrefix?: string;
}) {
    const { t } = useTranslation();

    const field = (
        key: keyof UnitData,
        label: string,
        props: React.ComponentProps<typeof Input> = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-${key}`}>
                {t(label)}
                {props.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
                id={`${idPrefix}-${key}`}
                value={data[key]}
                onChange={(e) =>
                    onChange(key, e.target.value as UnitData[typeof key])
                }
                {...props}
            />
            <InputError message={errors[key]} />
        </div>
    );

    const amountType = (
        key: 'deposit_type' | 'late_fee_type',
        label: string,
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-${key}`}>
                {t(label)}
                <span className="text-destructive">*</span>
            </Label>
            <SelectField
                id={`${idPrefix}-${key}`}
                value={data[key]}
                onChange={(e) =>
                    onChange(key, e.target.value as UnitData[typeof key])
                }
            >
                <option value="fixed">{t('Fixed')}</option>
                <option value="percentage">{t('Percentage')}</option>
            </SelectField>
            <InputError message={errors[key]} />
        </div>
    );

    const dateField = (
        key: 'payment_due_date' | 'start_date' | 'end_date',
        label: string,
        required = false,
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-${key}`}>
                {t(label)}
                {required && <span className="text-destructive">*</span>}
            </Label>
            <DatePicker
                id={`${idPrefix}-${key}`}
                value={data[key]}
                onChange={(value) => onChange(key, value)}
            />
            <InputError message={errors[key]} />
        </div>
    );

    const number = { type: 'number', min: 0, required: true } as const;
    const money = { ...number, step: '0.01' } as const;

    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
                {field('name', 'Unit Name', {
                    required: true,
                    placeholder: t('e.g., A-12-3'),
                })}
            </div>
            {field('bedroom', 'Bedroom', number)}
            {field('kitchen', 'Kitchen', number)}
            {field('baths', 'Bath', number)}
            {field('rent', 'Rent', money)}
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-rent_type`}>
                    {t('Rent Type')}
                    <span className="text-destructive">*</span>
                </Label>
                <SelectField
                    id={`${idPrefix}-rent_type`}
                    value={data.rent_type}
                    onChange={(e) =>
                        onChange(
                            'rent_type',
                            e.target.value as UnitData['rent_type'],
                        )
                    }
                >
                    <option value="monthly">{t('Monthly')}</option>
                    <option value="yearly">{t('Yearly')}</option>
                    <option value="custom">{t('Custom')}</option>
                </SelectField>
                <InputError message={errors.rent_type} />
            </div>
            {dateField('payment_due_date', 'Payment Due Date')}
            {data.rent_type === 'custom' && (
                <>
                    {field('rent_duration', 'Rent Duration (days)', {
                        ...number,
                        min: 1,
                    })}
                    {dateField('start_date', 'Start Date', true)}
                    {dateField('end_date', 'End Date', true)}
                </>
            )}
            {amountType('deposit_type', 'Deposit Type')}
            {field('deposit_amount', 'Deposit Amount', money)}
            <div />
            {amountType('late_fee_type', 'Late Fee Type')}
            {field('late_fee_amount', 'Late Fee Amount', money)}
            {field('incident_receipt_amount', 'Incident Receipt Amount', money)}
            <div className="grid gap-2 sm:col-span-3">
                <Label htmlFor={`${idPrefix}-notes`}>{t('Notes')}</Label>
                <textarea
                    id={`${idPrefix}-notes`}
                    rows={2}
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                    value={data.notes}
                    onChange={(e) => onChange('notes', e.target.value)}
                />
                <InputError message={errors.notes} />
            </div>
        </div>
    );
}

/**
 * Add a unit to a property, or edit one. `unit` null with a `propertyId` adds; when no
 * property is fixed (Units page), a property select is shown.
 */
export function UnitDialog({
    open,
    onOpenChange,
    unit,
    propertyId,
    properties,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unit: Unit | null;
    propertyId?: number;
    properties?: { id: number; name: string }[];
}) {
    const { t } = useTranslation();
    const form = useForm({ property_id: '', ...blankUnit });

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData({
                property_id: String(unit?.property_id ?? propertyId ?? ''),
                ...(unit ? unitData(unit) : blankUnit),
            });
        }
        // Reset only when the dialog opens.
    }, [open]);

    return (
        <FormDialog
            open={open}
            onOpenChange={onOpenChange}
            title={unit ? 'Edit Unit' : 'Add Unit'}
            processing={form.processing}
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(
                    unit ? unitRoutes.update(unit.id) : unitRoutes.store(),
                    {
                        preserveScroll: true,
                        onSuccess: () => onOpenChange(false),
                    },
                );
            }}
        >
            {!unit && properties && (
                <div className="grid gap-2">
                    <Label htmlFor="unit-property">
                        {t('Property')}
                        <span className="text-destructive">*</span>
                    </Label>
                    <SelectField
                        id="unit-property"
                        value={form.data.property_id}
                        onChange={(e) =>
                            form.setData('property_id', e.target.value)
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
            )}
            <UnitFields
                data={form.data}
                onChange={(key, value) =>
                    form.setData((data) => ({ ...data, [key]: value }))
                }
                errors={form.errors}
            />
        </FormDialog>
    );
}
