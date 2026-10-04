import { Head, Link } from '@inertiajs/react';
import { ChartCard, OccupancyBars, OccupancyTable } from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { ReportFilters } from '@/components/report-filters';
import { StatusBadge } from '@/components/status-badge';
import { IdBadge } from '@/components/table-cells';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import reports from '@/routes/reports';
import tenantRoutes from '@/routes/tenants';
import type { TableFilters } from '@/types';

type Occupancy = { id: number; name: string; occupied: number; vacant: number };
type PropertyUnits = {
    id: number;
    name: string;
    units: {
        id: number;
        name: string;
        bedroom: number;
        baths: number;
        rent: string;
        rent_type: string;
        active_lease: {
            end_date: string;
            tenant: { id: number; user: { name: string } };
        } | null;
    }[];
};

export default function PropertyUnitReport({
    properties,
    occupancy,
    units,
    filters,
}: {
    properties: { id: number; name: string }[];
    occupancy: Occupancy[];
    units: PropertyUnits[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { date, money } = useFormat();

    return (
        <>
            <Head title={t('Property Unit Report')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Property Unit Report"
                    description="Occupancy and rent roll for every unit."
                />
                <ReportFilters
                    url={reports.propertyUnit()}
                    filters={filters}
                    properties={properties}
                    withUnit={false}
                />
                <ChartCard
                    title="Occupied vs Vacant"
                    table={<OccupancyTable rows={occupancy} />}
                >
                    <OccupancyBars rows={occupancy} />
                </ChartCard>
                {units.map((property) => (
                    <section
                        key={property.id}
                        className="rounded-xl border bg-card shadow-sm"
                    >
                        <h2 className="border-b px-5 py-4 font-semibold">
                            {property.name}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        {[
                                            'Unit',
                                            'Bed / Bath',
                                            'Rent',
                                            'Status',
                                            'Tenant',
                                            'Lease End',
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="px-5 py-3 text-start font-medium whitespace-nowrap"
                                            >
                                                {t(h)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {property.units.map((unit) => (
                                        <tr
                                            key={unit.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-5 py-3">
                                                <IdBadge>{unit.name}</IdBadge>
                                            </td>
                                            <td className="px-5 py-3">
                                                {unit.bedroom} / {unit.baths}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap tabular-nums">
                                                {money(Number(unit.rent))}
                                            </td>
                                            <td className="px-5 py-3">
                                                <StatusBadge
                                                    status={
                                                        unit.active_lease
                                                            ? 'occupied'
                                                            : 'vacant'
                                                    }
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                {unit.active_lease ? (
                                                    <Link
                                                        href={tenantRoutes.show(
                                                            unit.active_lease
                                                                .tenant.id,
                                                        )}
                                                        className="hover:underline"
                                                    >
                                                        {
                                                            unit.active_lease
                                                                .tenant.user
                                                                .name
                                                        }
                                                    </Link>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {unit.active_lease
                                                    ? date(
                                                          unit.active_lease
                                                              .end_date,
                                                      )
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))}
            </div>
        </>
    );
}

PropertyUnitReport.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Property Unit Report', href: reports.propertyUnit() },
    ],
};
