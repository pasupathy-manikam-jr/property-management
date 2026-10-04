import { ChartColumn, Table2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';

// Series colours are the validated theme tokens (resources/css/app.css --chart-1/2),
// assigned in fixed order: chart-1 = income/occupied, chart-2 = expense/vacant.
export type Series = { key: string; label: string; color: string };

export const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

/** One row per month from parallel 12-value arrays, e.g. { month: 'Jan', income: 0, expense: 0 }. */
export function monthlyRows(values: Record<string, number[]>) {
    return MONTHS.map((month, i) => ({
        month,
        ...Object.fromEntries(
            Object.entries(values).map(([key, list]) => [key, list[i] ?? 0]),
        ),
    }));
}

const axis = {
    stroke: 'var(--muted-foreground)',
    fontSize: 12,
    tickLine: false,
    axisLine: false,
} as const;

/**
 * A titled card that shows a chart, or the same numbers as a table (the accessible view).
 */
export function ChartCard({
    title,
    description,
    action,
    table,
    children,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    table: ReactNode;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    const [asTable, setAsTable] = useState(false);

    return (
        <section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="font-semibold">{t(title)}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground">
                            {t(description)}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {action}
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label={t(asTable ? 'Show chart' : 'Show table')}
                        title={t(asTable ? 'Show chart' : 'Show table')}
                        onClick={() => setAsTable(!asTable)}
                    >
                        {asTable ? <ChartColumn /> : <Table2 />}
                    </Button>
                </div>
            </div>
            {asTable ? (
                <div className="overflow-x-auto">{table}</div>
            ) : (
                children
            )}
        </section>
    );
}

/**
 * Grouped monthly bars on one money axis (never two y-scales).
 */
export function MonthlyBars({
    rows,
    series,
    height = 300,
}: {
    rows: Record<string, string | number>[];
    series: Series[];
    height?: number;
}) {
    const { t } = useTranslation();
    const { money } = useFormat();

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} barGap={2} barCategoryGap="28%">
                    <CartesianGrid
                        vertical={false}
                        stroke="var(--border)"
                        strokeDasharray="0"
                    />
                    <XAxis
                        dataKey="month"
                        {...axis}
                        tickFormatter={(m: string) => t(m)}
                    />
                    <YAxis
                        {...axis}
                        width={72}
                        tickFormatter={(v: number) =>
                            v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                        }
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                        contentStyle={{
                            background: 'var(--popover)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            color: 'var(--popover-foreground)',
                        }}
                        labelFormatter={(m) =>
                            t(typeof m === 'string' ? m : '')
                        }
                        formatter={(value, name) => [
                            money(Number(value)),
                            t(String(name)),
                        ]}
                    />
                    <Legend
                        itemSorter={null}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                            <span className="text-sm text-foreground">
                                {t(String(value))}
                            </span>
                        )}
                    />
                    {series.map((s) => (
                        <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.label}
                            fill={s.color}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={22}
                            isAnimationActive={false}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/** The table view of monthly series, with a total row. */
export function MonthlyTable({
    rows,
    series,
}: {
    rows: Record<string, string | number>[];
    series: Series[];
}) {
    const { t } = useTranslation();
    const { money } = useFormat();
    const total = (key: string) =>
        rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);

    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-start font-medium">
                        {t('Month')}
                    </th>
                    {series.map((s) => (
                        <th key={s.key} className="py-2 text-end font-medium">
                            {t(s.label)}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={String(row.month)} className="border-b">
                        <td className="py-2">{t(String(row.month))}</td>
                        {series.map((s) => (
                            <td
                                key={s.key}
                                className="py-2 text-end tabular-nums"
                            >
                                {money(Number(row[s.key] ?? 0))}
                            </td>
                        ))}
                    </tr>
                ))}
                <tr className="font-semibold">
                    <td className="py-2">{t('Total')}</td>
                    {series.map((s) => (
                        <td key={s.key} className="py-2 text-end tabular-nums">
                            {money(total(s.key))}
                        </td>
                    ))}
                </tr>
            </tbody>
        </table>
    );
}

/**
 * Occupied vs vacant per property: one stacked horizontal bar each, with direct counts
 * (identity is also in the legend, never colour alone).
 */
export function OccupancyBars({
    rows,
}: {
    rows: { id: number; name: string; occupied: number; vacant: number }[];
}) {
    const { t } = useTranslation();

    return (
        <div className="grid gap-3">
            <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-chart-1" />
                    {t('Occupied')}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-chart-2" />
                    {t('Vacant')}
                </span>
            </div>
            {rows.map((row) => {
                const units = row.occupied + row.vacant;

                return (
                    <div key={row.id} className="grid gap-1">
                        <div className="flex justify-between gap-2 text-sm">
                            <span className="truncate">{row.name}</span>
                            <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                                {t(':occupied of :units occupied', {
                                    occupied: row.occupied,
                                    units,
                                })}
                            </span>
                        </div>
                        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                            {units > 0 && (
                                <>
                                    <div
                                        className="rounded-full bg-chart-1"
                                        style={{
                                            width: `${(row.occupied / units) * 100}%`,
                                        }}
                                    />
                                    <div
                                        className="rounded-full bg-chart-2"
                                        style={{
                                            width: `${(row.vacant / units) * 100}%`,
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** Table view for OccupancyBars. */
export function OccupancyTable({
    rows,
}: {
    rows: { id: number; name: string; occupied: number; vacant: number }[];
}) {
    const { t } = useTranslation();

    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-start font-medium">
                        {t('Property')}
                    </th>
                    <th className="py-2 text-end font-medium">{t('Units')}</th>
                    <th className="py-2 text-end font-medium">
                        {t('Occupied')}
                    </th>
                    <th className="py-2 text-end font-medium">{t('Vacant')}</th>
                    <th className="py-2 text-end font-medium">
                        {t('Occupancy')}
                    </th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => {
                    const units = row.occupied + row.vacant;

                    return (
                        <tr key={row.id} className="border-b">
                            <td className="py-2">{row.name}</td>
                            <td className="py-2 text-end tabular-nums">
                                {units}
                            </td>
                            <td className="py-2 text-end tabular-nums">
                                {row.occupied}
                            </td>
                            <td className="py-2 text-end tabular-nums">
                                {row.vacant}
                            </td>
                            <td className="py-2 text-end tabular-nums">
                                {units
                                    ? `${Math.round((row.occupied / units) * 100)}%`
                                    : '-'}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
