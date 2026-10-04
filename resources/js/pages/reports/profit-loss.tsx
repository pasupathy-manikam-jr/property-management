import { Head } from '@inertiajs/react';
import { Scale, TrendingDown, TrendingUp } from 'lucide-react';
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
    { key: 'income', label: 'Income', color: 'var(--chart-1)' },
    { key: 'expense', label: 'Expense', color: 'var(--chart-2)' },
];
const tableSeries = [
    ...series,
    { key: 'net', label: 'Net Profit', color: 'var(--foreground)' },
];

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

export default function ProfitLossReport({
    income,
    expense,
    properties,
    years,
    filters,
}: {
    income: number[];
    expense: number[];
    properties: ReportProperty[];
    years: number[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { money } = useFormat();
    const net = income.map((value, i) => value - (expense[i] ?? 0));
    const rows = monthlyRows({ income, expense, net });
    const totalNet = sum(net);

    return (
        <>
            <Head title={t('Profit & Loss')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Profit & Loss"
                    description="Income received less expenses, by month."
                />
                <ReportFilters
                    url={reports.profitLoss()}
                    filters={filters}
                    properties={properties}
                    years={years}
                />
                <StatCards
                    className="xl:grid-cols-3"
                    stats={[
                        {
                            label: 'Income',
                            value: money(sum(income)),
                            note: 'Approved payments',
                            icon: TrendingUp,
                            tone: 'bg-accent text-accent-foreground',
                        },
                        {
                            label: 'Expense',
                            value: money(sum(expense)),
                            note: 'Recorded expenses',
                            icon: TrendingDown,
                            tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        },
                        {
                            label: totalNet >= 0 ? 'Net Profit' : 'Net Loss',
                            value: money(totalNet),
                            note: t('Year :year', { year: filters.year ?? '' }),
                            icon: Scale,
                            tone:
                                totalNet >= 0
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
                        },
                    ]}
                />
                <ChartCard
                    title="Income and Expense Overview"
                    table={<MonthlyTable rows={rows} series={tableSeries} />}
                >
                    <MonthlyBars rows={rows} series={series} />
                </ChartCard>
            </div>
        </>
    );
}

ProfitLossReport.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Profit & Loss', href: reports.profitLoss() },
    ],
};
