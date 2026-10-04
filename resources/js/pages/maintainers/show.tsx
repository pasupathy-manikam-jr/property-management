import { Head, Link } from '@inertiajs/react';
import { CalendarDays, Mail, Phone, SquarePen } from 'lucide-react';
import { DetailPage, RecordList, Summary } from '@/components/detail-page';
import { StatusBadge } from '@/components/status-badge';
import { IdBadge } from '@/components/table-cells';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import maintainerRoutes from '@/routes/maintainers';
import maintenanceRequestRoutes from '@/routes/maintenance-requests';

type Maintainer = {
    id: number;
    user: {
        name: string;
        email: string;
        phone: string | null;
        avatar: string | null;
        created_at: string;
    };
    type: { name: string } | null;
    properties: {
        id: number;
        name: string;
        type: 'own' | 'lease';
        address: string;
        city: string;
        state: string;
    }[];
};

type Request = {
    id: number;
    request_date: string;
    status: string;
    property: { name: string };
    unit: { name: string };
    issue_type: { name: string } | null;
};

export default function ShowMaintainer({
    maintainer,
    requests,
}: {
    maintainer: Maintainer;
    requests: Request[];
}) {
    const { t } = useTranslation();
    const { date } = useFormat();
    const can = useCan();

    return (
        <>
            <Head title={maintainer.user.name} />
            <DetailPage
                title={maintainer.user.name}
                description="Maintainer details, properties and requests."
                back={maintainerRoutes.index()}
                summary={
                    <>
                        <Summary
                            media={
                                <UserAvatar
                                    name={maintainer.user.name}
                                    src={maintainer.user.avatar}
                                    className="size-24 text-2xl"
                                />
                            }
                            title={maintainer.user.name}
                            subtitle={maintainer.type?.name}
                            facts={[
                                [Mail, maintainer.user.email],
                                [Phone, maintainer.user.phone],
                                [
                                    CalendarDays,
                                    date(maintainer.user.created_at),
                                ],
                            ]}
                        />
                        {can('edit-maintainers') && (
                            <div className="mt-6 grid w-full gap-2">
                                <Button variant="outline" asChild>
                                    <Link
                                        href={maintainerRoutes.edit(
                                            maintainer.id,
                                        )}
                                    >
                                        <SquarePen /> {t('Edit Maintainer')}
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </>
                }
                tabs={[
                    {
                        label: 'Properties',
                        content: (
                            <RecordList
                                items={maintainer.properties}
                                empty="No properties assigned"
                                render={(property) => (
                                    <>
                                        <div className="grid gap-1">
                                            <div className="font-medium">
                                                {property.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {property.address},{' '}
                                                {property.city},{' '}
                                                {property.state}
                                            </div>
                                        </div>
                                        <StatusBadge
                                            status={property.type}
                                            label={
                                                property.type === 'own'
                                                    ? 'Own Property'
                                                    : 'Lease Property'
                                            }
                                        />
                                    </>
                                )}
                            />
                        ),
                    },
                    {
                        label: 'Maintenance Requests',
                        content: (
                            <RecordList
                                items={requests}
                                empty="No maintenance requests yet"
                                render={(item) => (
                                    <>
                                        <div className="grid gap-1">
                                            <div className="flex flex-wrap items-center gap-2 font-medium">
                                                {can(
                                                    'show-maintenance-requests',
                                                ) ? (
                                                    <Link
                                                        href={maintenanceRequestRoutes.show(
                                                            item.id,
                                                        )}
                                                        className="hover:underline"
                                                    >
                                                        {item.issue_type
                                                            ?.name ??
                                                            t('Maintenance')}
                                                    </Link>
                                                ) : (
                                                    (item.issue_type?.name ??
                                                    t('Maintenance'))
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                {item.property.name}
                                                <IdBadge>
                                                    {item.unit.name}
                                                </IdBadge>
                                                · {date(item.request_date)}
                                            </div>
                                        </div>
                                        <StatusBadge status={item.status} />
                                    </>
                                )}
                            />
                        ),
                    },
                ]}
            />
        </>
    );
}

ShowMaintainer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Maintainers', href: maintainerRoutes.index() },
    ],
};
