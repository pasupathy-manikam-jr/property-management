import { Head, Link } from '@inertiajs/react';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { ReportFilters } from '@/components/report-filters';
import type { ReportProperty } from '@/components/report-filters';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { IdBadge } from '@/components/table-cells';
import { applyFilters, StatusTabs } from '@/components/table-filters';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import maintenanceRoutes from '@/routes/maintenance-requests';
import reports from '@/routes/reports';
import type { Paginated, TableFilters } from '@/types';

type Row = {
    id: number;
    request_date: string;
    fixed_date: string | null;
    status: string;
    property: { name: string };
    unit: { name: string };
    issue_type: { name: string } | null;
    tenant: { user: { name: string } } | null;
    maintainer: { user: { name: string } } | null;
};

type TypeRow = {
    name: string;
    pending: number;
    in_progress: number;
    completed: number;
};

export default function MaintenanceReport({
    requests,
    counts,
    byType,
    properties,
    tenants,
    filters,
}: {
    requests: Paginated<Row>;
    counts: Record<string, number>;
    byType: TypeRow[];
    properties: ReportProperty[];
    tenants: { id: number; name: string }[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { date } = useFormat();
    const url = reports.maintenance();
    const max = Math.max(
        1,
        ...byType.map((r) => r.pending + r.in_progress + r.completed),
    );

    return (
        <>
            <Head title={t('Maintenance Report')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Maintenance Report"
                    description="Repair requests by issue type and status."
                />
                <ReportFilters
                    url={url}
                    filters={filters}
                    properties={properties}
                >
                    <SelectField
                        aria-label={t('All Tenants')}
                        className="w-auto max-w-60 min-w-40"
                        value={String(filters.tenant_id ?? '')}
                        onChange={(e) =>
                            applyFilters(url, filters, {
                                tenant_id: e.target.value,
                            })
                        }
                    >
                        <option value="">{t('All Tenants')}</option>
                        {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                                {tenant.name}
                            </option>
                        ))}
                    </SelectField>
                </ReportFilters>

                <section className="rounded-xl border bg-card p-5 shadow-sm">
                    <h2 className="mb-4 font-semibold">{t('By Issue Type')}</h2>
                    {byType.length ? (
                        <ul className="grid gap-3">
                            {byType.map((row) => {
                                const total =
                                    row.pending +
                                    row.in_progress +
                                    row.completed;

                                return (
                                    <li key={row.name} className="grid gap-1">
                                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                                            <span>{row.name}</span>
                                            <span className="text-muted-foreground tabular-nums">
                                                {t(
                                                    ':total total · :pending pending · :in_progress in progress · :completed completed',
                                                    { total, ...row },
                                                )}
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted">
                                            <div
                                                className="h-2 rounded-full bg-chart-1"
                                                style={{
                                                    width: `${(total / max) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t('No maintenance requests yet')}
                        </p>
                    )}
                </section>

                <DataTable
                    data={requests}
                    filters={filters}
                    url={url}
                    tabs={
                        <StatusTabs
                            url={url}
                            filters={filters}
                            counts={{
                                all: counts.all ?? 0,
                                pending: counts.pending ?? 0,
                                in_progress: counts.in_progress ?? 0,
                                completed: counts.completed ?? 0,
                            }}
                        />
                    }
                    columns={[
                        {
                            key: 'issue',
                            label: 'Issue',
                            render: (r) => (
                                <Link
                                    href={maintenanceRoutes.show(r.id)}
                                    className="font-medium hover:underline"
                                >
                                    {r.issue_type?.name ??
                                        t('Maintenance Request')}
                                </Link>
                            ),
                        },
                        {
                            key: 'unit',
                            label: 'Property & Unit',
                            render: (r) => (
                                <div className="flex items-center gap-2">
                                    {r.property.name}
                                    <IdBadge>{r.unit.name}</IdBadge>
                                </div>
                            ),
                        },
                        {
                            key: 'tenant',
                            label: 'Tenant',
                            render: (r) => r.tenant?.user.name ?? '-',
                        },
                        {
                            key: 'maintainer',
                            label: 'Maintainer',
                            render: (r) =>
                                r.maintainer?.user.name ?? t('Not Assigned'),
                        },
                        {
                            key: 'request_date',
                            label: 'Request Date',
                            sortable: true,
                            render: (r) => (
                                <span className="whitespace-nowrap">
                                    {date(r.request_date)}
                                </span>
                            ),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (r) => <StatusBadge status={r.status} />,
                        },
                    ]}
                />
            </div>
        </>
    );
}

MaintenanceReport.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Maintenance Report', href: reports.maintenance() },
    ],
};
