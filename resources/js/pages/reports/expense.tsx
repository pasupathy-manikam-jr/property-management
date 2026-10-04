import { Head } from '@inertiajs/react';
import { Tags, TrendingDown } from 'lucide-react';
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

const series = [{ key: 'expense', label: 'Expense', color: 'var(--chart-2)' }];

export default function ExpenseReport({
    expense,
    byType,
    properties,
    years,
    filters,
}: {
    expense: number[];
    byType: { name: string; total: number }[];
    properties: ReportProperty[];
    years: number[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { money } = useFormat();
    const rows = monthlyRows({ expense });
    const total = expense.reduce((a, b) => a + b, 0);
    const max = Math.max(1, ...byType.map((row) => row.total));

    return (
        <>
            <Head title={t('Expense Report')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Expense Report"
                    description="Money spent on your properties, by month and by type."
                />
                <ReportFilters
                    url={reports.expense()}
                    filters={filters}
                    properties={properties}
                    years={years}
                />
                <StatCards
                    className="xl:grid-cols-2"
                    stats={[
                        {
                            label: 'Total Expense',
                            value: money(total),
                            note: t('Year :year', { year: filters.year ?? '' }),
                            icon: TrendingDown,
                            tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        },
                        {
                            label: 'Largest Category',
                            value: byType[0]?.name ?? '-',
                            note: byType[0] ? money(byType[0].total) : '',
                            icon: Tags,
                            tone: 'bg-accent text-accent-foreground',
                        },
                    ]}
                />
                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <ChartCard
                            title="Expense by Month"
                            table={<MonthlyTable rows={rows} series={series} />}
                        >
                            <MonthlyBars rows={rows} series={series} />
                        </ChartCard>
                    </div>
                    <section className="rounded-xl border bg-card p-5 shadow-sm">
                        <h2 className="mb-4 font-semibold">
                            {t('By Expense Type')}
                        </h2>
                        {byType.length ? (
                            <ul className="grid gap-3">
                                {byType.map((row) => (
                                    <li key={row.name} className="grid gap-1">
                                        <div className="flex justify-between gap-2 text-sm">
                                            <span className="truncate">
                                                {row.name}
                                            </span>
                                            <span className="tabular-nums">
                                                {money(row.total)}
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted">
                                            <div
                                                className="h-2 rounded-full bg-chart-2"
                                                style={{
                                                    width: `${(row.total / max) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t('No expenses in this period')}
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

ExpenseReport.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Expense Report', href: reports.expense() },
    ],
};
