import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarRange,
    DoorOpen,
    Eye,
    Phone,
    Plus,
    RefreshCw,
    SquarePen,
    Trash2,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { RenewLeaseDialog } from '@/components/lease-dialogs';
import type { PropertyOption } from '@/components/lease-dialogs';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { FilterSelect, StatusTabs } from '@/components/table-filters';
import { PersonCell } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import tenantRoutes from '@/routes/tenants';
import type { Paginated, TableFilters, TenantRow } from '@/types';

export default function Tenants({
    tenants,
    counts,
    properties,
    filters,
}: {
    tenants: Paginated<TenantRow>;
    counts: Record<string, number>;
    properties: PropertyOption[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { date } = useFormat();
    const can = useCan();
    const [renewing, setRenewing] = useState<TenantRow | null>(null);
    const [deleting, setDeleting] = useState<TenantRow | null>(null);
    const url = tenantRoutes.index();

    return (
        <>
            <Head title={t('Tenants')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Tenants"
                    description="People renting your units, with their current lease."
                    action={
                        can('create-tenants') && (
                            <Button asChild>
                                <Link href={tenantRoutes.create()}>
                                    <Plus /> {t('Create Tenant')}
                                </Link>
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={tenants}
                    filters={filters}
                    url={url}
                    cardsOnly
                    columns={[
                        {
                            key: 'name',
                            label: 'Name',
                            render: (row) => row.user.name,
                        },
                    ]}
                    tabs={
                        <StatusTabs
                            url={url}
                            filters={filters}
                            counts={{
                                all: counts.all ?? 0,
                                active: counts.active ?? 0,
                                exited: counts.exited ?? 0,
                            }}
                        />
                    }
                    toolbar={
                        <FilterSelect
                            url={url}
                            filters={filters}
                            name="property_id"
                            label="All Properties"
                            options={properties}
                        />
                    }
                    actions={(row) => (
                        <>
                            {can('show-tenants') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('View')}
                                    asChild
                                >
                                    <Link href={tenantRoutes.show(row.id)}>
                                        <Eye />
                                    </Link>
                                </Button>
                            )}
                            {can('edit-tenants') && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t('Edit')}
                                        asChild
                                    >
                                        <Link href={tenantRoutes.edit(row.id)}>
                                            <SquarePen />
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t('Renew Lease')}
                                        title={t('Renew Lease')}
                                        onClick={() => setRenewing(row)}
                                    >
                                        <RefreshCw />
                                    </Button>
                                </>
                            )}
                            {can('delete-tenants') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(row)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </>
                    )}
                    renderCard={(row, actions) => {
                        const lease = row.active_lease;

                        return (
                            <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
                                <div className="flex items-start justify-between gap-2 border-b p-4">
                                    <PersonCell
                                        name={row.user.name}
                                        detail={row.user.email}
                                        src={row.user.avatar}
                                    />
                                    <StatusBadge
                                        status={lease ? 'active' : 'exited'}
                                    />
                                </div>
                                <dl className="grid flex-1 content-start gap-2 p-4 text-sm">
                                    {(
                                        [
                                            [Phone, row.user.phone],
                                            [
                                                Users,
                                                t(':count family members', {
                                                    count: row.family_member,
                                                }),
                                            ],
                                            [
                                                DoorOpen,
                                                lease &&
                                                    `${lease.unit.property.name} · ${lease.unit.name}`,
                                            ],
                                            [
                                                CalendarRange,
                                                lease &&
                                                    `${date(lease.start_date)} – ${date(lease.end_date)}`,
                                            ],
                                        ] as [LucideIcon, string | null][]
                                    ).map(
                                        ([Icon, value], i) =>
                                            value && (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 text-muted-foreground"
                                                >
                                                    <Icon className="size-4 shrink-0" />
                                                    <span className="text-foreground">
                                                        {value}
                                                    </span>
                                                </div>
                                            ),
                                    )}
                                </dl>
                                <div className="flex justify-end border-t px-4 py-2">
                                    {actions}
                                </div>
                            </div>
                        );
                    }}
                />
            </div>

            <RenewLeaseDialog
                tenant={renewing}
                onClose={() => setRenewing(null)}
                properties={properties}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This tenant, their login and lease history will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(tenantRoutes.destroy(deleting.id), {
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

Tenants.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Tenants', href: tenantRoutes.index() },
    ],
};
