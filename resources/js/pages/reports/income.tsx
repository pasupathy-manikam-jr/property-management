import { Head } from '@inertiajs/react';
import { Percent, Receipt, Wallet } from 'lucide-react';
import {
    ChartCard,
    MonthlyBars,
    MonthlyTable,
    monthlyRows,
} from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { ReportFilters } from '@/components/report-filters';
import type { ReportProperty } from '@/components/report-filters';
import { StatCards } from '@/components/stat-cards';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import reports from '@/routes/reports';
import type { TableFilters } from '@/types';

const series = [
    { key: 'income', label: 'Collected', color: 'var(--chart-1)' },
    { key: 'billed', label: 'Billed', color: 'var(--chart-2)' },
];

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

export default function IncomeReport({
    income,
    billed,
    properties,
    years,
    filters,
}: {
    income: number[];
    billed: number[];
    properties: ReportProperty[];
    years: number[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { money } = useFormat();
    const rows = monthlyRows({ income, billed });
    const collected = sum(income);
    const invoiced = sum(billed);

    return (
        <>
            <Head title={t('Income Report')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Income Report"
                    description="Payments received against invoices billed, by month."
                />
                <ReportFilters
                    url={reports.income()}
                    filters={filters}
                    properties={properties}
                    years={years}
                />
                <StatCards
                    className="xl:grid-cols-3"
                    stats={[
                        {
                            label: 'Collected',
                            value: money(collected),
                            note: 'Approved payments',
                            icon: Wallet,
                            tone: 'bg-accent text-accent-foreground',
                        },
                        {
                            label: 'Billed',
                            value: money(invoiced),
                            note: 'Invoices for these months',
                            icon: Receipt,
                            tone: 'bg-accent text-accent-foreground',
                        },
                        {
                            label: 'Collection Rate',
                            value: invoiced
                                ? `${Math.round((collected / invoiced) * 100)}%`
                                : '-',
                            note: 'Collected ÷ billed',
                            icon: Percent,
                            tone: 'bg-accent text-accent-foreground',
                        },
                    ]}
                />
                <ChartCard
                    title="Income by Month"
                    description={t('Year :year', { year: filters.year ?? '' })}
                    table={<MonthlyTable rows={rows} series={series} />}
                >
                    <MonthlyBars rows={rows} series={series} />
                </ChartCard>
            </div>
        </>
    );
}

IncomeReport.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Income Report', href: reports.income() },
    ],
};
