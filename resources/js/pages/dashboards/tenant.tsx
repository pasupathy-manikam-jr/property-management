import { Head, Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { CalendarRange, DoorOpen, MapPin, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { NoticeList } from '@/components/notice-list';
import type { NoticeItem } from '@/components/notice-list';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { IdBadge } from '@/components/table-cells';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import invoiceRoutes from '@/routes/invoices';
import maintenanceRoutes from '@/routes/maintenance-requests';
import noteRoutes from '@/routes/notes';

function Panel({
    title,
    href,
    children,
}: {
    title: string;
    href?: InertiaLinkProps['href'];
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <section className="flex flex-col rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="font-semibold">{t(title)}</h2>
                {href && (
                    <Link
                        href={href}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        {t('View all')}
                    </Link>
                )}
            </div>
            <div className="flex-1 p-5">{children}</div>
        </section>
    );
}

export default function TenantDashboard({
    lease,
    invoices,
    requests,
    notices,
}: {
    lease: {
        start_date: string;
        end_date: string;
        unit: {
            name: string;
            rent: string;
            rent_type: string;
            property: {
                name: string;
                address: string;
                city: string;
                state: string;
            };
        };
    } | null;
    invoices: {
        id: number;
        number: string;
        end_date: string;
        total: string;
        paid: string;
    }[];
    requests: {
        id: number;
        request_date: string;
        status: string;
        issue_type: { name: string } | null;
    }[];
    notices: NoticeItem[];
}) {
    const { t } = useTranslation();
    const { date, money } = useFormat();
    const owed = invoices.reduce(
        (sum, i) => sum + Number(i.total) - Number(i.paid),
        0,
    );

    return (
        <>
            <Head title={t('Dashboard')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Dashboard"
                    description="Your home, rent and repair requests."
                />

                <div className="grid gap-6 lg:grid-cols-3">
                    <section className="rounded-xl border bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm lg:col-span-2">
                        {lease ? (
                            <div className="grid gap-3">
                                <div className="text-sm opacity-80">
                                    {t('Your home')}
                                </div>
                                <div className="text-2xl font-bold">
                                    {lease.unit.property.name} ·{' '}
                                    {lease.unit.name}
                                </div>
                                <div className="grid gap-2 text-sm sm:grid-cols-2">
                                    <span className="flex items-center gap-2">
                                        <MapPin className="size-4" />
                                        {[
                                            lease.unit.property.address,
                                            lease.unit.property.city,
                                        ].join(', ')}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <CalendarRange className="size-4" />
                                        {date(lease.start_date)} –{' '}
                                        {date(lease.end_date)}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <DoorOpen className="size-4" />
                                        {money(Number(lease.unit.rent))} /{' '}
                                        {t(
                                            lease.unit.rent_type === 'yearly'
                                                ? 'Yearly'
                                                : 'Monthly',
                                        )}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p>{t('You have no active lease.')}</p>
                        )}
                    </section>
                    <section className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Wallet className="size-4" />
                                {t('Amount owed')}
                            </div>
                            <div className="mt-1 text-3xl font-bold tabular-nums">
                                {money(owed)}
                            </div>
                        </div>
                        <Button asChild>
                            <Link href={invoiceRoutes.index()}>
                                {t('View invoices')}
                            </Link>
                        </Button>
                    </section>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Panel title="Unpaid Invoices" href={invoiceRoutes.index()}>
                        {invoices.length ? (
                            <ul className="grid gap-3">
                                {invoices.map((inv) => (
                                    <li
                                        key={inv.id}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <Link
                                            href={invoiceRoutes.show(inv.id)}
                                            className="grid gap-0.5"
                                        >
                                            <IdBadge>{inv.number}</IdBadge>
                                            <span className="text-xs text-muted-foreground">
                                                {t('Due')} {date(inv.end_date)}
                                            </span>
                                        </Link>
                                        <span className="font-semibold tabular-nums">
                                            {money(
                                                Number(inv.total) -
                                                    Number(inv.paid),
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t('All paid. Thank you!')}
                            </p>
                        )}
                    </Panel>
                    <Panel
                        title="My Repair Requests"
                        href={maintenanceRoutes.index()}
                    >
                        {requests.length ? (
                            <ul className="grid gap-3">
                                {requests.map((r) => (
                                    <li
                                        key={r.id}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <Link
                                            href={maintenanceRoutes.show(r.id)}
                                            className="grid gap-0.5"
                                        >
                                            <span className="font-medium">
                                                {r.issue_type?.name ??
                                                    t('Maintenance Request')}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {date(r.request_date)}
                                            </span>
                                        </Link>
                                        <StatusBadge status={r.status} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t('No maintenance requests yet')}
                            </p>
                        )}
                    </Panel>
                    <Panel title="Notice Board" href={noteRoutes.index()}>
                        <NoticeList notices={notices} />
                    </Panel>
                </div>
            </div>
        </>
    );
}

TenantDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
