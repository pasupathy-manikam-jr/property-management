import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    CalendarDays,
    Eye,
    Phone,
    Plus,
    SquarePen,
    Trash2,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { FilterSelect } from '@/components/table-filters';
import { PersonCell } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import maintainerRoutes from '@/routes/maintainers';
import type { Paginated, TableFilters } from '@/types';

type Option = { id: number; name: string };

type MaintainerRow = {
    id: number;
    created_at: string;
    user: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
        avatar: string | null;
    };
    type: Option | null;
    properties: Option[];
};

export default function Maintainers({
    maintainers,
    properties,
    types,
    filters,
}: {
    maintainers: Paginated<MaintainerRow>;
    properties: Option[];
    types: Option[];
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { date } = useFormat();
    const can = useCan();
    const [deleting, setDeleting] = useState<MaintainerRow | null>(null);
    const url = maintainerRoutes.index();

    return (
        <>
            <Head title={t('Maintainers')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Maintainers"
                    description="Tradespeople who handle maintenance requests for your properties."
                    action={
                        can('create-maintainers') && (
                            <Button asChild>
                                <Link href={maintainerRoutes.create()}>
                                    <Plus /> {t('Create Maintainer')}
                                </Link>
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={maintainers}
                    filters={filters}
                    url={url}
                    cardsOnly
                    columns={[
                        {
                            key: 'name',
                            label: 'Name',
                            render: (row) => row.user.name,
                        },
                    ]}
                    toolbar={
                        <>
                            <FilterSelect
                                url={url}
                                filters={filters}
                                name="property_id"
                                label="All Properties"
                                options={properties}
                            />
                            <FilterSelect
                                url={url}
                                filters={filters}
                                name="type_id"
                                label="All Types"
                                options={types}
                            />
                        </>
                    }
                    actions={(row) => (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t('View')}
                                asChild
                            >
                                <Link href={maintainerRoutes.show(row.id)}>
                                    <Eye />
                                </Link>
                            </Button>
                            {can('edit-maintainers') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Edit')}
                                    asChild
                                >
                                    <Link href={maintainerRoutes.edit(row.id)}>
                                        <SquarePen />
                                    </Link>
                                </Button>
                            )}
                            {can('delete-maintainers') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(row)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </>
                    )}
                    renderCard={(row, actions) => (
                        <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
                            <div className="border-b p-4">
                                <PersonCell
                                    name={row.user.name}
                                    detail={row.user.email}
                                    src={row.user.avatar}
                                />
                            </div>
                            <dl className="grid flex-1 content-start gap-2 p-4 text-sm">
                                {(
                                    [
                                        [Phone, row.user.phone],
                                        [Wrench, row.type?.name],
                                        [CalendarDays, date(row.created_at)],
                                        [
                                            Building2,
                                            row.properties
                                                .map((p) => p.name)
                                                .join(', '),
                                        ],
                                    ] as [LucideIcon, string | null][]
                                ).map(
                                    ([Icon, value], i) =>
                                        value && (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2 text-muted-foreground"
                                            >
                                                <Icon className="mt-0.5 size-4 shrink-0" />
                                                <span className="text-foreground">
                                                    {value}
                                                </span>
                                            </div>
                                        ),
                                )}
                            </dl>
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
                description="This maintainer and their login will be permanently deleted. Their requests become unassigned."
                onConfirm={() =>
                    deleting &&
                    router.delete(maintainerRoutes.destroy(deleting.id), {
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

Maintainers.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Maintainers', href: maintainerRoutes.index() },
    ],
};
