import type { InertiaLinkProps } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SelectField } from '@/components/select-field';
import { applyFilters } from '@/components/table-filters';
import { useTranslation } from '@/hooks/use-translation';
import type { TableFilters } from '@/types';

export type ReportProperty = {
    id: number;
    name: string;
    units?: { id: number; name: string }[];
};

/**
 * The row of report filters above the charts: property → unit (optional) → year (optional).
 * Changing the property clears the unit.
 */
export function ReportFilters({
    url,
    filters,
    properties,
    years,
    withUnit = true,
    children,
}: {
    url: NonNullable<InertiaLinkProps['href']>;
    filters: TableFilters;
    properties: ReportProperty[];
    years?: number[];
    withUnit?: boolean;
    children?: ReactNode;
}) {
    const { t } = useTranslation();
    const units =
        properties.find((p) => String(p.id) === String(filters.property_id))
            ?.units ?? [];
    const select = (
        name: string,
        label: string,
        options: { id: number | string; name: string }[],
        changes: (value: string) => TableFilters = (value) => ({
            [name]: value,
        }),
    ) => (
        <SelectField
            aria-label={t(label)}
            className="w-auto max-w-60 min-w-40"
            value={String(filters[name] ?? '')}
            onChange={(e) =>
                applyFilters(url, filters, changes(e.target.value))
            }
        >
            <option value="">{t(label)}</option>
            {options.map((o) => (
                <option key={o.id} value={o.id}>
                    {o.name}
                </option>
            ))}
        </SelectField>
    );

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
            {select('property_id', 'All Properties', properties, (value) => ({
                property_id: value,
                unit_id: undefined,
            }))}
            {withUnit && filters.property_id
                ? select('unit_id', 'All Units', units)
                : null}
            {children}
            {years && (
                <SelectField
                    aria-label={t('Year')}
                    className="ms-auto w-28"
                    value={String(filters.year ?? '')}
                    onChange={(e) =>
                        applyFilters(url, filters, { year: e.target.value })
                    }
                >
                    {years.map((year) => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </SelectField>
            )}
        </div>
    );
}
