import { Head, Link, router, useForm } from '@inertiajs/react';
import { Eye, Plus, SquarePen, Trash2, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { DatePicker } from '@/components/date-picker';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import {
    AssignDialog,
    StatusSelect,
    maintainerLabel,
} from '@/components/maintenance-dialogs';
import type { MaintainerOption } from '@/components/maintenance-dialogs';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { DateCell, DocumentLink, IdBadge } from '@/components/table-cells';
import { FilterSelect, StatusTabs } from '@/components/table-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCan } from '@/hooks/use-can';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import maintenanceRequestRoutes from '@/routes/maintenance-requests';
import type { Paginated, TableFilters } from '@/types';

type Option = { id: number; name: string };
type PropertyOption = Option & { units: Option[] };
type TenantOption = Option & { unit_id: number; current: boolean };
type Scope = 'staff' | 'tenant' | 'maintainer';

type Row = {
    id: number;
    property_id: number;
    unit_id: number;
    tenant_id: number | null;
    maintainer_id: number | null;
    issue_type_id: number | null;
    request_date: string;
    status: string;
    fixed_date: string | null;
    notes: string | null;
    file_name: string | null;
    property: Option;
    unit: Option;
    tenant: { id: number; user: { name: string } } | null;
    maintainer: { id: number; user: { name: string } } | null;
    issue_type: Option | null;
};

const blank = {
    property_id: '',
    unit_id: '',
    tenant_id: '',
    request_date: '',
    issue_type_id: '',
    maintainer_id: '',
    status: 'pending',
    fixed_date: '',
    notes: '',
    attachment: null as File | null,
};

const today = () => {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function RequestDialog({
    open,
    onOpenChange,
    request,
    scope,
    issueTypes,
    properties,
    tenants,
    maintainers,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: Row | null;
    scope: Scope;
    issueTypes: Option[];
    properties: PropertyOption[];
    tenants: TenantOption[];
    maintainers: MaintainerOption[];
}) {
    const { t } = useTranslation();
    const form = useForm(blank);
    const staff = scope === 'staff';
    const propertyId = Number(form.data.property_id);
    const unitId = Number(form.data.unit_id);

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData(
                request
                    ? {
                          property_id: String(request.property_id),
                          unit_id: String(request.unit_id),
                          tenant_id: String(request.tenant_id ?? ''),
                          request_date: request.request_date,
                          issue_type_id: String(request.issue_type_id ?? ''),
                          maintainer_id: String(request.maintainer_id ?? ''),
                          status: request.status,
                          fixed_date: request.fixed_date ?? '',
                          notes: request.notes ?? '',
                          attachment: null,
                      }
                    : { ...blank, request_date: today() },
            );
        }
        // Reset only when the dialog opens.
    }, [open]);

    const field = (
        id: keyof typeof blank,
        label: string,
        control: React.ReactNode,
        required = true,
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`request-${id}`}>
                {t(label)}
                {required && <span className="text-destructive">*</span>}
            </Label>
            {control}
            <InputError message={form.errors[id]} />
        </div>
    );

    const select = (
        id: Exclude<keyof typeof blank, 'attachment'>,
        options: Option[],
        placeholder: string,
        onChange: (value: string) => void,
        required = true,
    ) => (
        <SelectField
            id={`request-${id}`}
            required={required}
            placeholder={t(placeholder)}
            value={form.data[id]}
            onChange={(e) => onChange(e.target.value)}
        >
            {!required && <option value="">{t(placeholder)}</option>}
            {options.map((o) => (
                <option key={o.id} value={o.id}>
                    {o.name}
                </option>
            ))}
        </SelectField>
    );

    return (
        <FormDialog
            open={open}
            onOpenChange={onOpenChange}
            title={
                request
                    ? 'Edit Maintenance Request'
                    : 'Create Maintenance Request'
            }
            description={
                staff
                    ? undefined
                    : 'Your property and unit are taken from your lease.'
            }
            processing={form.processing}
            onSubmit={(e) => {
                e.preventDefault();
                // Files need multipart; PHP only parses it on POST, so updates spoof PUT via _method.
                form.post(
                    request
                        ? maintenanceRequestRoutes.update.form(request.id)
                              .action
                        : maintenanceRequestRoutes.store().url,
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () => onOpenChange(false),
                    },
                );
            }}
        >
            {staff && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {field(
                        'property_id',
                        'Property',
                        select(
                            'property_id',
                            properties,
                            'Select Property',
                            (value) =>
                                form.setData((data) => ({
                                    ...data,
                                    property_id: value,
                                    unit_id: '',
                                    tenant_id: '',
                                    maintainer_id: '',
                                })),
                        ),
                    )}
                    {field(
                        'unit_id',
                        'Unit',
                        select(
                            'unit_id',
                            properties.find((p) => p.id === propertyId)
                                ?.units ?? [],
                            'Select Unit',
                            (value) =>
                                form.setData((data) => ({
                                    ...data,
                                    unit_id: value,
                                    // Default to the unit's current tenant.
                                    tenant_id: String(
                                        tenants.find(
                                            (tenant) =>
                                                tenant.unit_id ===
                                                    Number(value) &&
                                                tenant.current,
                                        )?.id ?? '',
                                    ),
                                })),
                        ),
                    )}
                    {field(
                        'tenant_id',
                        'Tenant',
                        select(
                            'tenant_id',
                            tenants.filter(
                                (tenant) => tenant.unit_id === unitId,
                            ),
                            'No Tenant',
                            (value) => form.setData('tenant_id', value),
                            false,
                        ),
                        false,
                    )}
                    {field(
                        'request_date',
                        'Request Date',
                        <DatePicker
                            id="request-request_date"
                            value={form.data.request_date}
                            clearable={false}
                            onChange={(value) =>
                                form.setData('request_date', value)
                            }
                        />,
                    )}
                    {field(
                        'maintainer_id',
                        'Maintainer',
                        select(
                            'maintainer_id',
                            maintainers
                                .filter((m) =>
                                    m.properties.includes(propertyId),
                                )
                                .map((m) => ({
                                    id: m.id,
                                    name: maintainerLabel(m),
                                })),
                            'Not Assigned',
                            (value) => form.setData('maintainer_id', value),
                            false,
                        ),
                        false,
                    )}
                    <StatusSelect
                        id="request-status"
                        value={form.data.status}
                        onChange={(value) => form.setData('status', value)}
                        error={form.errors.status}
                    />
                    {form.data.status === 'completed' &&
                        field(
                            'fixed_date',
                            'Fixed Date',
                            <DatePicker
                                id="request-fixed_date"
                                value={form.data.fixed_date}
                                onChange={(value) =>
                                    form.setData('fixed_date', value)
                                }
                            />,
                            false,
                        )}
                </div>
            )}
            {field(
                'issue_type_id',
                'Issue Type',
                select('issue_type_id', issueTypes, 'Select Type', (value) =>
                    form.setData('issue_type_id', value),
                ),
            )}
            {field(
                'attachment',
                'Issue Attachment',
                <Input
                    id="request-attachment"
                    type="file"
                    onChange={(e) =>
                        form.setData('attachment', e.target.files?.[0] ?? null)
                    }
                />,
                false,
            )}
            {field(
                'notes',
                'Notes',
                <textarea
                    id="request-notes"
                    rows={4}
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                    value={form.data.notes}
                    onChange={(e) => form.setData('notes', e.target.value)}
                />,
                false,
            )}
        </FormDialog>
    );
}

export default function MaintenanceRequests({
    requests,
    counts,
    scope,
    issueTypes,
    properties,
    tenants,
    maintainers,
    filters,
}: {
    requests: Paginated<Row>;
    counts: Record<string, number>;
    scope: Scope;
    issueTypes: Option[];
    properties: PropertyOption[];
    tenants: TenantOption[];
    maintainers: MaintainerOption[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const can = useCan();
    const [dialog, setDialog] = useState<{ request: Row | null } | null>(null);
    const [assigning, setAssigning] = useState<Row | null>(null);
    const [deleting, setDeleting] = useState<Row | null>(null);
    const url = maintenanceRequestRoutes.index();
    const staff = scope === 'staff';
    const canAssign = staff && can('assign-maintainers');
    const canChangeStatus = scope === 'maintainer';

    const columns: (Column<Row> | false)[] = [
        {
            key: 'property',
            label: 'Property',
            render: (r) => (
                <div className="grid justify-items-start gap-1">
                    <span className="font-medium">{r.property.name}</span>
                    <IdBadge>{r.unit.name}</IdBadge>
                </div>
            ),
        },
        {
            key: 'issue',
            label: 'Issue',
            render: (r) => r.issue_type?.name ?? '—',
        },
        scope !== 'tenant' && {
            key: 'tenant',
            label: 'Tenant',
            render: (r) => r.tenant?.user.name ?? '—',
        },
        scope !== 'maintainer' && {
            key: 'maintainer',
            label: 'Maintainer',
            render: (r) =>
                r.maintainer?.user.name ?? (
                    <span className="text-muted-foreground">
                        {t('Not Assigned')}
                    </span>
                ),
        },
        {
            key: 'request_date',
            label: 'Request Date',
            sortable: true,
            render: (r) => <DateCell value={r.request_date} />,
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => <StatusBadge status={r.status} />,
        },
        {
            key: 'attachment',
            label: 'Attachment',
            render: (r) => (
                <DocumentLink
                    href={maintenanceRequestRoutes.attachment.url(r.id)}
                    fileName={r.file_name}
                />
            ),
        },
    ];

    return (
        <>
            <Head title={t('Maintenance Requests')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Maintenance Requests"
                    description={
                        scope === 'tenant'
                            ? 'Report problems in your unit and follow their progress.'
                            : scope === 'maintainer'
                              ? 'Requests assigned to you.'
                              : 'Repair requests across your properties.'
                    }
                    action={
                        can('create-maintenance-requests') &&
                        scope !== 'maintainer' && (
                            <Button
                                onClick={() => setDialog({ request: null })}
                            >
                                <Plus /> {t('Create Maintenance Request')}
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={requests}
                    filters={filters}
                    url={url}
                    columns={columns.filter((c): c is Column<Row> => !!c)}
                    tabs={
                        <StatusTabs
                            url={url}
                            filters={filters}
                            counts={counts}
                        />
                    }
                    toolbar={
                        staff && (
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
                                    name="maintainer_id"
                                    label="All Maintainers"
                                    options={maintainers}
                                />
                            </>
                        )
                    }
                    actions={(r) => (
                        <>
                            {can('show-maintenance-requests') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('View')}
                                    asChild
                                >
                                    <Link
                                        href={maintenanceRequestRoutes.show(
                                            r.id,
                                        )}
                                    >
                                        <Eye />
                                    </Link>
                                </Button>
                            )}
                            {(canAssign || canChangeStatus) && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t(
                                        canAssign
                                            ? 'Assign Maintainer'
                                            : 'Update Status',
                                    )}
                                    title={t(
                                        canAssign
                                            ? 'Assign Maintainer'
                                            : 'Update Status',
                                    )}
                                    onClick={() => setAssigning(r)}
                                >
                                    <UserCog />
                                </Button>
                            )}
                            {can('edit-maintenance-requests') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Edit')}
                                    onClick={() => setDialog({ request: r })}
                                >
                                    <SquarePen />
                                </Button>
                            )}
                            {can('delete-maintenance-requests') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(r)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </>
                    )}
                />
            </div>

            <RequestDialog
                open={dialog !== null}
                onOpenChange={(open) => !open && setDialog(null)}
                request={dialog?.request ?? null}
                scope={scope}
                issueTypes={issueTypes}
                properties={properties}
                tenants={tenants}
                maintainers={maintainers}
            />

            <AssignDialog
                request={assigning}
                maintainers={maintainers}
                statusOnly={!canAssign}
                onClose={() => setAssigning(null)}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This maintenance request and its comments will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(
                        maintenanceRequestRoutes.destroy(deleting.id),
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

MaintenanceRequests.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        {
            title: 'Maintenance Requests',
            href: maintenanceRequestRoutes.index(),
        },
    ],
};
