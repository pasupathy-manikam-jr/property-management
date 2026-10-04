import { Head, Link, router } from '@inertiajs/react';
import { Plus, SquarePen, Trash2 } from 'lucide-react';
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
import { formatPhpDate, useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import invoiceRoutes from '@/routes/invoices';
import type { Paginated, TableFilters } from '@/types';

type Row = {
    id: number;
    number: string;
    invoice_month: string;
    end_date: string;
    total: string;
    paid: string;
    status: string;
    property: { id: number; name: string };
    unit: { id: number; name: string };
    tenant: {
        id: number;
        user: { name: string; avatar: string | null };
    };
};

type Option = { id: number; name: string };

/** "2026-10-01" → "Oct 2026". */
const monthLabel = (value: string) =>
    formatPhpDate(new Date(`${value.slice(0, 7)}-01T00:00:00`), 'M Y');

export default function Invoices({
    invoices,
    counts,
    properties,
    tenants,
    filters,
}: {
    invoices: Paginated<Row>;
    counts: Record<string, number>;
    properties: Option[];
    tenants: Option[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { money } = useFormat();
    const can = useCan();
    const [deleting, setDeleting] = useState<Row | null>(null);
    const url = invoiceRoutes.index();

    return (
        <>
            <Head title={t('Invoices')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Invoices"
                    description="Rent and charges billed to tenants, and their payments."
                    action={
                        can('create-invoices') && (
                            <Button asChild>
                                <Link href={invoiceRoutes.create()}>
                                    <Plus /> {t('Create Invoice')}
                                </Link>
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={invoices}
                    filters={filters}
                    url={url}
                    columns={[
                        {
                            key: 'number',
                            label: 'Invoice',
                            sortable: true,
                            render: (i) => (
                                <div className="grid justify-items-start gap-1 whitespace-nowrap">
                                    {can('show-invoices') ? (
                                        <Link href={invoiceRoutes.show(i.id)}>
                                            <IdBadge>{i.number}</IdBadge>
                                        </Link>
                                    ) : (
                                        <IdBadge>{i.number}</IdBadge>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                        {monthLabel(i.invoice_month)}
                                    </span>
                                </div>
                            ),
                        },
                        {
                            key: 'property',
                            label: 'Property & Unit',
                            render: (i) => (
                                <div className="grid whitespace-nowrap">
                                    <span className="font-medium">
                                        {i.property.name}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {i.unit.name}
                                    </span>
                                </div>
                            ),
                        },
                        {
                            key: 'tenant',
                            label: 'Tenant',
                            render: (i) => (
                                <PersonCell
                                    name={i.tenant.user.name}
                                    src={i.tenant.user.avatar}
                                />
                            ),
                        },
                        {
                            key: 'end_date',
                            label: 'Due Date',
                            sortable: true,
                            render: (i) => <DateCell value={i.end_date} />,
                        },
                        {
                            key: 'total',
                            label: 'Amount',
                            sortable: true,
                            render: (i) => (
                                <div className="grid whitespace-nowrap">
                                    <span className="font-medium">
                                        {money(Number(i.total))}
                                    </span>
                                    {Number(i.paid) > 0 &&
                                        Number(i.paid) < Number(i.total) && (
                                            <span className="text-xs text-muted-foreground">
                                                {t('Paid')}{' '}
                                                {money(Number(i.paid))}
                                            </span>
                                        )}
                                </div>
                            ),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (i) => <StatusBadge status={i.status} />,
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
                            {tenants.length > 0 && (
                                <FilterSelect
                                    url={url}
                                    filters={filters}
                                    name="tenant_id"
                                    label="All Tenants"
                                    options={tenants}
                                />
                            )}
                        </>
                    }
                    tabs={
                        <StatusTabs
                            url={url}
                            filters={filters}
                            counts={counts}
                        />
                    }
                    actions={(i) => (
                        <>
                            {can('edit-invoices') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Edit')}
                                    asChild
                                >
                                    <Link href={invoiceRoutes.edit(i.id)}>
                                        <SquarePen />
                                    </Link>
                                </Button>
                            )}
                            {can('delete-invoices') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(i)}
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
                description="This invoice and its payments will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(invoiceRoutes.destroy(deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

Invoices.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Invoices', href: invoiceRoutes.index() },
    ],
};
