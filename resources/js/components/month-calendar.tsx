import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatPhpDate, useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { addDays, pad, ymd } from '@/lib/dates';
import { cn } from '@/lib/utils';

export type CalendarEvent = {
    id: string | number;
    title: string;
    /** Y-m-d */
    date: string;
    href?: string | null;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PER_DAY = 3;

const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/**
 * A month grid of single-day events (adapted from hrms's month-calendar). The month comes
 * from the server (?month=YYYY-MM): prev / next / today are links built with `monthHref`.
 */
export function MonthCalendar<T extends CalendarEvent>({
    month,
    events,
    monthHref,
    chipClass,
    legend,
}: {
    /** "YYYY-MM" */
    month: string;
    events: T[];
    monthHref: (month: string) => NonNullable<InertiaLinkProps['href']>;
    /** Colour classes for an event's chip (and its row in the day dialog). */
    chipClass: (event: T) => string;
    legend?: { label: string; className: string }[];
}) {
    const { t } = useTranslation();
    const { date } = useFormat();
    const [openDay, setOpenDay] = useState<string | null>(null);

    const [year, monthIndex] = month.split('-').map(Number);
    const first = new Date(year, monthIndex - 1, 1);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    const leading = first.getDay();
    const days = Array.from(
        { length: Math.ceil((leading + daysInMonth) / 7) * 7 },
        (_, i) => addDays(first, i - leading),
    );
    const today = ymd(new Date());
    const eventsOn = (day: string) => events.filter((e) => e.date === day);

    const Chip = ({ e }: { e: T }) => {
        const className = cn(
            'block w-full truncate rounded border-s-4 px-1.5 py-0.5 text-start text-xs',
            chipClass(e),
        );

        return e.href ? (
            <Link href={e.href} title={e.title} className={className}>
                {e.title}
            </Link>
        ) : (
            <span title={e.title} className={className}>
                {e.title}
            </span>
        );
    };

    return (
        <>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label={t('Previous')}
                            asChild
                        >
                            <Link
                                href={monthHref(
                                    monthKey(new Date(year, monthIndex - 2, 1)),
                                )}
                                preserveScroll
                            >
                                <ChevronLeft className="rtl:rotate-180" />
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label={t('Next')}
                            asChild
                        >
                            <Link
                                href={monthHref(
                                    monthKey(new Date(year, monthIndex, 1)),
                                )}
                                preserveScroll
                            >
                                <ChevronRight className="rtl:rotate-180" />
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={monthHref(monthKey(new Date()))}>
                                {t('Today')}
                            </Link>
                        </Button>
                    </div>
                    <h2 className="text-xl font-semibold">
                        {t(formatPhpDate(first, 'F'))} {year}
                    </h2>
                    {legend && (
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            {legend.map((item) => (
                                <span
                                    key={item.label}
                                    className="flex items-center gap-1.5"
                                >
                                    <span
                                        className={cn(
                                            'size-2.5 rounded-full',
                                            item.className,
                                        )}
                                    />
                                    {t(item.label)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[44rem]">
                        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-sm font-semibold">
                            {WEEKDAYS.map((day) => (
                                <div key={day} className="px-1 py-2">
                                    {t(day)}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {days.map((day) => {
                                const key = ymd(day);
                                const inMonth =
                                    day.getMonth() === monthIndex - 1;
                                const dayEvents = inMonth ? eventsOn(key) : [];

                                return (
                                    <div
                                        key={key}
                                        className={cn(
                                            'flex min-h-28 min-w-0 flex-col gap-1 border-e border-b p-1 [&:nth-child(7n)]:border-e-0',
                                            !inMonth && 'bg-muted/30',
                                            key === today && 'bg-primary/5',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'self-end px-1 text-sm',
                                                !inMonth &&
                                                    'text-muted-foreground/60',
                                                key === today &&
                                                    'rounded-full bg-primary px-2 text-primary-foreground',
                                            )}
                                        >
                                            {day.getDate()}
                                        </span>
                                        {dayEvents
                                            .slice(0, MAX_PER_DAY)
                                            .map((e) => (
                                                <Chip key={e.id} e={e} />
                                            ))}
                                        {dayEvents.length > MAX_PER_DAY && (
                                            <button
                                                type="button"
                                                onClick={() => setOpenDay(key)}
                                                className="text-start text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                +
                                                {dayEvents.length - MAX_PER_DAY}{' '}
                                                {t('more')}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={openDay !== null}
                onOpenChange={(open) => !open && setOpenDay(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{openDay && date(openDay)}</DialogTitle>
                        <DialogDescription className="sr-only">
                            {t('Events')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        {openDay &&
                            eventsOn(openDay).map((e) => (
                                <Chip key={e.id} e={e} />
                            ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
