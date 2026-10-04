import { Head, Link } from '@inertiajs/react';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { ReportFilters } from '@/components/report-filters';
import type { ReportProperty } from '@/components/report-filters';
import { StatusBadge } from '@/components/status-badge';
import { IdBadge } from '@/components/table-cells';
import { StatusTabs } from '@/components/table-filters';
import { PersonCell } from '@/components/user-avatar';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import reports from '@/routes/reports';
import tenantRoutes from '@/routes/tenants';
import type { Paginated, TableFilters } from '@/types';

type Lease = {
    id: number;
    start_date: string;
    end_date: string;
    status: string;
    exit_date: string | null;
    exit_reason: string | null;
    tenant: {
        id: number;
        user: { name: string; email: string; avatar: string | null };
    };
    unit: { name: string; property: { name: string } };
};

export default function TenantHistoryReport({
    leases,
    counts,
    properties,
    filters,
}: {
    leases: Paginated<Lease>;
    counts: Record<string, number>;
    properties: ReportProperty[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { date } = useFormat();
    const url = reports.tenantHistory();

    return (
        <>
            <Head title={t('Tenant History')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Tenant History"
                    description="Every tenancy: move-ins, renewals and move-outs."
                />
                <ReportFilters
                    url={url}
                    filters={filters}
                    properties={properties}
                />
                <DataTable
                    data={leases}
                    filters={filters}
                    url={url}
                    tabs={
                        <StatusTabs
                            url={url}
                            filters={filters}
                            counts={{
                                all: counts.all ?? 0,
                                active: counts.active ?? 0,
                                renewed: counts.renewed ?? 0,
                                exited: counts.exited ?? 0,
                            }}
                        />
                    }
                    columns={[
                        {
                            key: 'tenant',
                            label: 'Tenant',
                            render: (l) => (
                                <Link href={tenantRoutes.show(l.tenant.id)}>
                                    <PersonCell
                                        name={l.tenant.user.name}
                                        detail={l.tenant.user.email}
                                        src={l.tenant.user.avatar}
                                    />
                                </Link>
                            ),
                        },
                        {
                            key: 'unit',
                            label: 'Property & Unit',
                            render: (l) => (
                                <div className="flex items-center gap-2">
                                    {l.unit.property.name}
                                    <IdBadge>{l.unit.name}</IdBadge>
                                </div>
                            ),
                        },
                        {
                            key: 'start_date',
                            label: 'Start',
                            sortable: true,
                            render: (l) => (
                                <span className="whitespace-nowrap">
                                    {date(l.start_date)}
                                </span>
                            ),
                        },
                        {
                            key: 'end_date',
                            label: 'End',
                            sortable: true,
                            render: (l) => (
                                <span className="whitespace-nowrap">
                                    {date(l.end_date)}
                                </span>
                            ),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (l) => (
                                <div className="grid gap-1">
                                    <StatusBadge status={l.status} />
                                    {l.exit_date && (
                                        <span className="text-xs text-muted-foreground">
                                            {t('Moved out')} {date(l.exit_date)}
                                        </span>
                                    )}
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </>
    );
}

TenantHistoryReport.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Tenant History', href: reports.tenantHistory() },
    ],
};
