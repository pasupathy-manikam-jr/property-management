import { Head, Link } from '@inertiajs/react';
import {
    Building2,
    Contact,
    DoorOpen,
    Hourglass,
    Percent,
    TrendingDown,
    TrendingUp,
    Wrench,
} from 'lucide-react';
import {
    ChartCard,
    MonthlyBars,
    MonthlyTable,
    monthlyRows,
    OccupancyBars,
    OccupancyTable,
} from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { StatCards } from '@/components/stat-cards';
import { StatusBadge } from '@/components/status-badge';
import { IdBadge } from '@/components/table-cells';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import invoiceRoutes from '@/routes/invoices';

type DueInvoice = {
    id: number;
    number: string;
    invoice_month: string;
    end_date: string;
    total: string;
    paid: string;
    property: { name: string };
    unit: { name: string };
    tenant: { user: { name: string } };
};

const series = [
    { key: 'income', label: 'Income', color: 'var(--chart-1)' },
    { key: 'expense', label: 'Expense', color: 'var(--chart-2)' },
];

export default function Dashboard({
    stats,
    year,
    income,
    expense,
    occupancy,
    dueInvoices,
}: {
    stats: {
        properties: number;
        units: number;
        tenants: number;
        monthRevenue: number;
        monthExpense: number;
        pendingPayments: number;
        pendingMaintenance: number;
        vacancyRate: number;
    };
    year: number;
    income: number[];
    expense: number[];
    occupancy: {
        id: number;
        name: string;
        occupied: number;
        vacant: number;
    }[];
    dueInvoices: DueInvoice[];
}) {
    const { t } = useTranslation();
    const { date, money } = useFormat();
    const rows = monthlyRows({ income, expense });
    const today = new Date().toISOString().slice(0, 10);

    return (
        <>
            <Head title={t('Dashboard')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Dashboard"
                    description="Your portfolio at a glance."
                />

                <StatCards
                    stats={[
                        {
                            label: 'Total Properties',
                            value: stats.properties,
                            note: 'Owned and leased',
                            icon: Building2,
                            tone: 'bg-accent text-accent-foreground',
                        },
                        {
                            label: 'Total Units',
                            value: stats.units,
                            note: 'Across all properties',
                            icon: DoorOpen,
                            tone: 'bg-accent text-accent-foreground',
                        },
                        {
                            label: 'Active Tenants',
                            value: stats.tenants,
                            note: 'With a current lease',
                            icon: Contact,
                            tone: 'bg-accent text-accent-foreground',
                        },
                        {
                            label: 'Vacancy Rate',
                            value: `${stats.vacancyRate}%`,
                            note: 'Units without a tenant',
                            icon: Percent,
                            tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        },
                        {
                            label: 'This Month Revenue',
                            value: money(stats.monthRevenue),
                            note: 'Approved payments',
                            icon: TrendingUp,
                            tone: 'bg-accent text-accent-foreground',
                        },
                        {
                            label: 'This Month Expense',
                            value: money(stats.monthExpense),
                            note: 'Recorded expenses',
                            icon: TrendingDown,
                            tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        },
                        {
                            label: 'Pending Payments',
                            value: money(stats.pendingPayments),
                            note: 'Still owed on invoices',
                            icon: Hourglass,
                            tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        },
                        {
                            label: 'Open Maintenance',
                            value: stats.pendingMaintenance,
                            note: 'Pending or in progress',
                            icon: Wrench,
                            tone: 'bg-accent text-accent-foreground',
                        },
                    ]}
                    className="[&_.text-3xl]:text-2xl"
                />

                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <ChartCard
                            title="Income and Expense"
                            description={t('Monthly totals for :year', {
                                year,
                            })}
                            table={<MonthlyTable rows={rows} series={series} />}
                        >
                            <MonthlyBars rows={rows} series={series} />
                        </ChartCard>
                    </div>
                    <ChartCard
                        title="Occupied vs Vacant"
                        description="Units per property"
                        table={<OccupancyTable rows={occupancy} />}
                    >
                        <OccupancyBars rows={occupancy} />
                    </ChartCard>
                </div>

                {dueInvoices.length > 0 && (
                    <section className="rounded-xl border bg-card shadow-sm">
                        <div className="flex items-center justify-between border-b p-5">
                            <div>
                                <h2 className="font-semibold">
                                    {t('Due / Overdue Invoices')}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {t('Unpaid invoices, earliest due first.')}
                                </p>
                            </div>
                            <Link
                                href={invoiceRoutes.index()}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                {t('View all')}
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        {[
                                            'Invoice',
                                            'Tenant',
                                            'Property & Unit',
                                            'Due Date',
                                            'Amount Due',
                                            'Status',
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
                                    {dueInvoices.map((inv) => (
                                        <tr
                                            key={inv.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-5 py-3">
                                                <Link
                                                    href={invoiceRoutes.show(
                                                        inv.id,
                                                    )}
                                                >
                                                    <IdBadge>
                                                        {inv.number}
                                                    </IdBadge>
                                                </Link>
                                            </td>
                                            <td className="px-5 py-3">
                                                {inv.tenant.user.name}
                                            </td>
                                            <td className="px-5 py-3">
                                                {inv.property.name} ·{' '}
                                                {inv.unit.name}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {date(inv.end_date)}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap tabular-nums">
                                                {money(
                                                    Number(inv.total) -
                                                        Number(inv.paid),
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <StatusBadge
                                                    status={
                                                        inv.end_date < today
                                                            ? 'overdue'
                                                            : Number(inv.paid) >
                                                                0
                                                              ? 'partially_paid'
                                                              : 'unpaid'
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
