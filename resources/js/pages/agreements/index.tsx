import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { DateCell, IdBadge } from '@/components/table-cells';
import { FilterSelect, StatusTabs } from '@/components/table-filters';
import { PersonCell } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import agreementRoutes from '@/routes/agreements';
import type { Paginated, TableFilters } from '@/types';

type Row = {
    id: number;
    number: string;
    start_date: string;
    end_date: string;
    status: string;
    unit: { id: number; name: string; property: { id: number; name: string } };
    tenant: {
        id: number;
        user: { name: string; email: string; avatar: string | null };
    };
};

export default function Agreements({
    agreements,
    counts,
    properties,
    filters,
}: {
    agreements: Paginated<Row>;
    counts: Record<string, number>;
    properties: { id: number; name: string }[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const can = useCan();
    const [deleting, setDeleting] = useState<Row | null>(null);
    const url = agreementRoutes.index();

    return (
        <>
            <Head title={t('Agreements')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Agreements"
                    description="Rental agreements between the company and its tenants."
                    action={
                        can('create-agreements') && (
                            <Button asChild>
                                <Link href={agreementRoutes.create()}>
                                    <Plus /> {t('Create Agreement')}
                                </Link>
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={agreements}
                    filters={filters}
                    url={url}
                    columns={[
                        {
                            key: 'number',
                            label: 'Agreement',
                            sortable: true,
                            render: (a) => <IdBadge>{a.number}</IdBadge>,
                        },
                        {
                            key: 'tenant',
                            label: 'Tenant',
                            render: (a) => (
                                <PersonCell
                                    name={a.tenant.user.name}
                                    detail={a.tenant.user.email}
                                    src={a.tenant.user.avatar}
                                />
                            ),
                        },
                        {
                            key: 'unit',
                            label: 'Unit',
                            render: (a) => (
                                <div className="whitespace-nowrap">
                                    <div className="font-medium">
                                        {a.unit.property.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {a.unit.name}
                                    </div>
                                </div>
                            ),
                        },
                        {
                            key: 'start_date',
                            label: 'Period',
                            sortable: true,
                            render: (a) => (
                                <div className="grid gap-1">
                                    <DateCell value={a.start_date} />
                                    <DateCell value={a.end_date} />
                                </div>
                            ),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (a) => <StatusBadge status={a.status} />,
                        },
                    ]}
                    toolbar={
                        <FilterSelect
                            url={url}
                            filters={filters}
                            name="property_id"
                            label="All Properties"
                            options={properties}
                        />
                    }
                    tabs={
                        <StatusTabs
                            url={url}
                            filters={filters}
                            counts={counts}
                        />
                    }
                    actions={(a) => (
                        <>
                            {can('show-agreements') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('View')}
                                    asChild
                                >
                                    <Link href={agreementRoutes.show(a.id)}>
                                        <Eye />
                                    </Link>
                                </Button>
                            )}
                            {can('edit-agreements') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Edit')}
                                    asChild
                                >
                                    <Link href={agreementRoutes.edit(a.id)}>
                                        <SquarePen />
                                    </Link>
                                </Button>
                            )}
                            {can('delete-agreements') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(a)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </>
                    )}
                />
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This agreement will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(agreementRoutes.destroy(deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

Agreements.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Agreements', href: agreementRoutes.index() },
    ],
};
