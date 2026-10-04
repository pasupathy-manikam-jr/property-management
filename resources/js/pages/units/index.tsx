import { Head, Link, router } from '@inertiajs/react';
import { Plus, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { IdBadge } from '@/components/table-cells';
import { FilterSelect } from '@/components/table-filters';
import { UnitDialog } from '@/components/unit-fields';
import type { Unit } from '@/components/unit-fields';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import propertyRoutes from '@/routes/properties';
import tenantRoutes from '@/routes/tenants';
import unitRoutes from '@/routes/units';
import type { Paginated, TableFilters } from '@/types';

type Row = Unit & {
    property: { id: number; name: string };
    active_lease: {
        end_date: string;
        tenant: { id: number; user: { name: string } };
    } | null;
};

export default function Units({
    units,
    properties,
    filters,
}: {
    units: Paginated<Row>;
    properties: { id: number; name: string }[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { money } = useFormat();
    const can = useCan();
    const [dialog, setDialog] = useState<{ unit: Unit | null } | null>(null);
    const [deleting, setDeleting] = useState<Row | null>(null);
    const url = unitRoutes.index();

    return (
        <>
            <Head title={t('Units')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Units"
                    description="Every rentable unit across your properties."
                    action={
                        can('create-units') && (
                            <Button onClick={() => setDialog({ unit: null })}>
                                <Plus /> {t('Create Unit')}
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={units}
                    filters={filters}
                    url={url}
                    columns={[
                        {
                            key: 'name',
                            label: 'Unit',
                            sortable: true,
                            render: (u) => <IdBadge>{u.name}</IdBadge>,
                        },
                        {
                            key: 'property',
                            label: 'Property',
                            render: (u) => (
                                <Link
                                    href={propertyRoutes.show(u.property.id)}
                                    className="hover:underline"
                                >
                                    {u.property.name}
                                </Link>
                            ),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (u) =>
                                u.active_lease ? (
                                    <div className="grid gap-1">
                                        <StatusBadge status="occupied" />
                                        <Link
                                            href={tenantRoutes.show(
                                                u.active_lease.tenant.id,
                                            )}
                                            className="text-sm text-muted-foreground hover:underline"
                                        >
                                            {u.active_lease.tenant.user.name}
                                        </Link>
                                    </div>
                                ) : (
                                    <StatusBadge status="vacant" />
                                ),
                        },
                        {
                            key: 'rooms',
                            label: 'Bed / Kitchen / Bath',
                            render: (u) =>
                                `${u.bedroom} / ${u.kitchen} / ${u.baths}`,
                        },
                        {
                            key: 'rent',
                            label: 'Rent',
                            sortable: true,
                            render: (u) => (
                                <span className="whitespace-nowrap">
                                    {money(Number(u.rent))}{' '}
                                    <span className="text-muted-foreground">
                                        /{' '}
                                        {t(
                                            u.rent_type === 'custom'
                                                ? 'Custom'
                                                : u.rent_type === 'yearly'
                                                  ? 'Yearly'
                                                  : 'Monthly',
                                        )}
                                    </span>
                                </span>
                            ),
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
                                name="status"
                                label="All Statuses"
                                options={[
                                    { id: 'occupied', name: t('Occupied') },
                                    { id: 'vacant', name: t('Vacant') },
                                ]}
                            />
                        </>
                    }
                    actions={(u) => (
                        <>
                            {can('edit-units') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Edit')}
                                    onClick={() => setDialog({ unit: u })}
                                >
                                    <SquarePen />
                                </Button>
                            )}
                            {can('delete-units') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(u)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </>
                    )}
                />
            </div>

            <UnitDialog
                open={dialog !== null}
                onOpenChange={(open) => !open && setDialog(null)}
                unit={dialog?.unit ?? null}
                properties={properties}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This unit will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(unitRoutes.destroy(deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

Units.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Units', href: unitRoutes.index() },
    ],
};
