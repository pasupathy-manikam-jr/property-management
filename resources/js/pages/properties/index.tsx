import { Head, Link, router } from '@inertiajs/react';
import { Building2, Eye, MapPin, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { ClampedText } from '@/components/table-cells';
import { StatusTabs } from '@/components/table-filters';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useTranslation } from '@/hooks/use-translation';
import { propertyTypeLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import propertyRoutes from '@/routes/properties';
import type { Paginated, TableFilters } from '@/types';

export type PropertySummary = {
    id: number;
    type: 'own' | 'lease';
    name: string;
    description: string | null;
    address: string;
    city: string;
    state: string;
    thumbnail: string | null;
    units_count: number;
    occupied_units_count: number;
};

export default function Properties({
    properties,
    counts,
    filters,
}: {
    properties: Paginated<PropertySummary>;
    counts: Record<string, number>;
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const can = useCan();
    const [deleting, setDeleting] = useState<PropertySummary | null>(null);
    const url = propertyRoutes.index();

    return (
        <>
            <Head title={t('Properties')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Properties"
                    description="Buildings the company owns or leases, with their units."
                    action={
                        can('create-properties') && (
                            <Button asChild>
                                <Link href={propertyRoutes.create()}>
                                    <Plus /> {t('Create Property')}
                                </Link>
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={properties}
                    filters={filters}
                    url={url}
                    cardsOnly
                    columns={[
                        {
                            key: 'name',
                            label: 'Name',
                            sortable: true,
                            render: (p) => p.name,
                        },
                    ]}
                    tabs={
                        <StatusTabs
                            url={url}
                            filters={filters}
                            name="type"
                            counts={{
                                all: counts.all ?? 0,
                                own: counts.own ?? 0,
                                lease: counts.lease ?? 0,
                            }}
                        />
                    }
                    actions={(p) => (
                        <>
                            {can('show-properties') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('View')}
                                    asChild
                                >
                                    <Link href={propertyRoutes.show(p.id)}>
                                        <Eye />
                                    </Link>
                                </Button>
                            )}
                            {can('edit-properties') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Edit')}
                                    asChild
                                >
                                    <Link href={propertyRoutes.edit(p.id)}>
                                        <SquarePen />
                                    </Link>
                                </Button>
                            )}
                            {can('delete-properties') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(p)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </>
                    )}
                    renderCard={(p, actions) => (
                        <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                            <div className="relative aspect-video bg-accent">
                                {p.thumbnail ? (
                                    <img
                                        src={p.thumbnail}
                                        alt={p.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <Building2 className="absolute inset-0 m-auto size-12 text-primary/40" />
                                )}
                                <span
                                    className={cn(
                                        'absolute start-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-md ring-1 ring-white/40',
                                        p.type === 'own'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-amber-500 text-white',
                                    )}
                                >
                                    {t(propertyTypeLabel[p.type])}
                                </span>
                            </div>
                            <div className="grid flex-1 content-start gap-2 p-4">
                                <h3 className="font-semibold">{p.name}</h3>
                                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                    <MapPin className="mt-0.5 size-4 shrink-0" />
                                    {[p.address, p.city, p.state].join(', ')}
                                </p>
                                <ClampedText text={p.description} />
                                <div className="mt-1 grid grid-cols-3 divide-x rounded-lg border text-center text-xs">
                                    {(
                                        [
                                            ['Units', p.units_count, ''],
                                            [
                                                'Occupied',
                                                p.occupied_units_count,
                                                'text-primary',
                                            ],
                                            [
                                                'Vacant',
                                                p.units_count -
                                                    p.occupied_units_count,
                                                'text-amber-600',
                                            ],
                                        ] as const
                                    ).map(([label, value, tone]) => (
                                        <div key={label} className="py-2">
                                            <div
                                                className={cn(
                                                    'text-base font-semibold',
                                                    tone,
                                                )}
                                            >
                                                {value}
                                            </div>
                                            <div className="text-muted-foreground">
                                                {t(label)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end border-t px-4 py-2">
                                {actions}
                            </div>
                        </div>
                    )}
                />
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This property and all its units will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(propertyRoutes.destroy(deleting.id), {
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

Properties.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Properties', href: propertyRoutes.index() },
    ],
};
