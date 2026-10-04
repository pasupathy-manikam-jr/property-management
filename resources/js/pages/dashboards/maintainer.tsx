import { Head, Link } from '@inertiajs/react';
import { CircleCheck, Clock, Hourglass } from 'lucide-react';
import { NoticeList } from '@/components/notice-list';
import { PageHeader } from '@/components/page-header';
import { StatCards } from '@/components/stat-cards';
import { StatusBadge } from '@/components/status-badge';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import maintenanceRoutes from '@/routes/maintenance-requests';

export default function MaintainerDashboard({
    counts,
    requests,
    notices,
}: {
    counts: { pending: number; in_progress: number; completed: number };
    requests: {
        id: number;
        request_date: string;
        status: string;
        property: { name: string };
        unit: { name: string };
        issue_type: { name: string } | null;
        tenant: { user: { name: string } } | null;
    }[];
    notices: { id: number; title: string; description: string | null }[];
}) {
    const { t } = useTranslation();
    const { date } = useFormat();

    return (
        <>
            <Head title={t('Dashboard')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Dashboard"
                    description="Jobs assigned to you."
                />
                <StatCards
                    className="xl:grid-cols-3"
                    stats={[
                        {
                            label: 'Pending',
                            value: counts.pending,
                            note: 'Waiting to start',
                            icon: Hourglass,
                            tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        },
                        {
                            label: 'In Progress',
                            value: counts.in_progress,
                            note: 'Being worked on',
                            icon: Clock,
                            tone: 'bg-accent text-accent-foreground',
                        },
                        {
                            label: 'Completed',
                            value: counts.completed,
                            note: 'Done',
                            icon: CircleCheck,
                            tone: 'bg-accent text-accent-foreground',
                        },
                    ]}
                />
                <div className="grid gap-6 lg:grid-cols-3">
                    <section className="rounded-xl border bg-card shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <h2 className="font-semibold">{t('Open Jobs')}</h2>
                            <Link
                                href={maintenanceRoutes.index()}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                {t('View all')}
                            </Link>
                        </div>
                        {requests.length ? (
                            <ul className="divide-y">
                                {requests.map((r) => (
                                    <li key={r.id}>
                                        <Link
                                            href={maintenanceRoutes.show(r.id)}
                                            className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/40"
                                        >
                                            <div className="grid gap-0.5">
                                                <span className="font-medium">
                                                    {r.issue_type?.name ??
                                                        t(
                                                            'Maintenance Request',
                                                        )}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {r.property.name} ·{' '}
                                                    {r.unit.name}
                                                    {r.tenant &&
                                                        ` · ${r.tenant.user.name}`}{' '}
                                                    · {date(r.request_date)}
                                                </span>
                                            </div>
                                            <StatusBadge status={r.status} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="p-5 text-sm text-muted-foreground">
                                {t('No open jobs. Nice work!')}
                            </p>
                        )}
                    </section>
                    <section className="rounded-xl border bg-card shadow-sm">
                        <div className="border-b px-5 py-4">
                            <h2 className="font-semibold">
                                {t('Notice Board')}
                            </h2>
                        </div>
                        <div className="p-5">
                            <NoticeList notices={notices} />
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

MaintainerDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
