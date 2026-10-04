import { Head } from '@inertiajs/react';
import { MonthCalendar } from '@/components/month-calendar';
import type { CalendarEvent } from '@/components/month-calendar';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import calendarRoutes from '@/routes/calendar';

type EventType =
    | 'lease_start'
    | 'lease_end'
    | 'agreement_start'
    | 'agreement_end'
    | 'invoice_due'
    | 'maintenance';

const TYPES: Record<EventType, { label: string; dot: string; chip: string }> = {
    lease_start: {
        label: 'Lease Start',
        dot: 'bg-chart-1',
        chip: 'border-chart-1 bg-chart-1/10',
    },
    lease_end: {
        label: 'Lease End',
        dot: 'bg-chart-2',
        chip: 'border-chart-2 bg-chart-2/10',
    },
    agreement_start: {
        label: 'Agreement Start',
        dot: 'bg-chart-3',
        chip: 'border-chart-3 bg-chart-3/10',
    },
    agreement_end: {
        label: 'Agreement End',
        dot: 'bg-chart-4',
        chip: 'border-chart-4 bg-chart-4/10',
    },
    invoice_due: {
        label: 'Invoice Due',
        dot: 'bg-chart-5',
        chip: 'border-chart-5 bg-chart-5/10',
    },
    maintenance: {
        label: 'Maintenance Request',
        dot: 'bg-destructive',
        chip: 'border-destructive bg-destructive/10',
    },
};

export default function Calendar({
    month,
    events,
}: {
    month: string;
    events: (CalendarEvent & { type: EventType })[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Calendar')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Calendar"
                    description="Lease and agreement dates, invoice due dates and maintenance requests."
                />
                <MonthCalendar
                    month={month}
                    events={events}
                    monthHref={(value) =>
                        calendarRoutes.index({ query: { month: value } })
                    }
                    chipClass={(e) => TYPES[e.type].chip}
                    legend={Object.values(TYPES).map((type) => ({
                        label: type.label,
                        className: type.dot,
                    }))}
                />
            </div>
        </>
    );
}

Calendar.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Calendar', href: calendarRoutes.index() },
    ],
};
