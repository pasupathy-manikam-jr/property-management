import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { SelectField } from '@/components/select-field';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import maintenanceRequestRoutes from '@/routes/maintenance-requests';

export const MAINTENANCE_STATUSES = [
    ['pending', 'Pending'],
    ['in_progress', 'In Progress'],
    ['completed', 'Completed'],
] as const;

export type MaintainerOption = {
    id: number;
    name: string;
    type: string | null;
    properties: number[];
};

/** The demo's "Maintainer - Type" option label. */
export const maintainerLabel = (m: MaintainerOption) =>
    m.type ? `${m.name} - ${m.type}` : m.name;

export function StatusSelect({
    id,
    value,
    onChange,
    error,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    const { t } = useTranslation();

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                {t('Status')}
                <span className="text-destructive">*</span>
            </Label>
            <SelectField
                id={id}
                required
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {MAINTENANCE_STATUSES.map(([status, label]) => (
                    <option key={status} value={status}>
                        {t(label)}
                    </option>
                ))}
            </SelectField>
            <InputError message={error} />
        </div>
    );
}

/**
 * Assign a maintainer of the request's property and set the status (staff), or, with
 * `statusOnly`, let the assigned maintainer report progress.
 */
export function AssignDialog({
    request,
    maintainers,
    statusOnly = false,
    onClose,
}: {
    request: {
        id: number;
        property_id: number;
        maintainer_id: number | null;
        status: string;
    } | null;
    maintainers: MaintainerOption[];
    statusOnly?: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({ maintainer_id: '', status: 'pending' });

    useEffect(() => {
        if (request) {
            form.clearErrors();
            form.setData({
                maintainer_id: String(request.maintainer_id ?? ''),
                status: request.status,
            });
        }
        // Reset only when the dialog opens.
    }, [request]);

    return (
        <FormDialog
            open={request !== null}
            onOpenChange={(open) => !open && onClose()}
            title={statusOnly ? 'Update Status' : 'Assign Maintainer'}
            submitLabel={statusOnly ? 'Save' : 'Assign'}
            processing={form.processing}
            onSubmit={(e) => {
                e.preventDefault();

                if (!request) {
                    return;
                }

                form.submit(
                    statusOnly
                        ? maintenanceRequestRoutes.status(request.id)
                        : maintenanceRequestRoutes.assign(request.id),
                    { preserveScroll: true, onSuccess: onClose },
                );
            }}
        >
            {!statusOnly && (
                <div className="grid gap-2">
                    <Label htmlFor="assign-maintainer">
                        {t('Maintainer')}
                        <span className="text-destructive">*</span>
                    </Label>
                    <SelectField
                        id="assign-maintainer"
                        required
                        placeholder={t('Select Maintainer')}
                        value={form.data.maintainer_id}
                        onChange={(e) =>
                            form.setData('maintainer_id', e.target.value)
                        }
                    >
                        {maintainers
                            .filter((m) =>
                                m.properties.includes(
                                    request?.property_id ?? 0,
                                ),
                            )
                            .map((m) => (
                                <option key={m.id} value={m.id}>
                                    {maintainerLabel(m)}
                                </option>
                            ))}
                    </SelectField>
                    <InputError message={form.errors.maintainer_id} />
                </div>
            )}
            <StatusSelect
                id="assign-status"
                value={form.data.status}
                onChange={(value) => form.setData('status', value)}
                error={form.errors.status}
            />
        </FormDialog>
    );
}
