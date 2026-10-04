import { Head, Link } from '@inertiajs/react';
import {
    CalendarRange,
    DoorOpen,
    LogOut,
    Mail,
    Phone,
    RefreshCw,
    SquarePen,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import {
    DetailPage,
    Fields,
    RecordList,
    Summary,
} from '@/components/detail-page';
import { ExitTenantDialog, RenewLeaseDialog } from '@/components/lease-dialogs';
import type { PropertyOption } from '@/components/lease-dialogs';
import { StatusBadge } from '@/components/status-badge';
import { IdBadge } from '@/components/table-cells';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import tenantRoutes from '@/routes/tenants';
import type { TenantRow } from '@/types';

type Tenant = TenantRow & {
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
};

type Lease = {
    id: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'renewed' | 'exited';
    exit_date: string | null;
    exit_amount: string | null;
    extra_charge: string | null;
    exit_reason: string | null;
    unit: { id: number; name: string; property: { id: number; name: string } };
};

const DAY = 86_400_000;

export default function ShowTenant({
    tenant,
    leases,
    properties,
}: {
    tenant: Tenant;
    leases: Lease[];
    properties: PropertyOption[];
}) {
    const { t } = useTranslation();
    const { date, money } = useFormat();
    const can = useCan();
    const [renewing, setRenewing] = useState(false);
    const [exiting, setExiting] = useState(false);
    const lease = tenant.active_lease;
    const daysLeft = lease
        ? Math.ceil(
              (new Date(`${lease.end_date}T23:59:59`).getTime() - Date.now()) /
                  DAY,
          )
        : null;

    return (
        <>
            <Head title={tenant.user.name} />
            <DetailPage
                title={tenant.user.name}
                description="Tenant details and lease history."
                back={tenantRoutes.index()}
                summary={
                    <>
                        <Summary
                            media={
                                <UserAvatar
                                    name={tenant.user.name}
                                    src={tenant.user.avatar}
                                    className="size-24 text-2xl"
                                />
                            }
                            title={tenant.user.name}
                            subtitle={
                                daysLeft === null
                                    ? t('No active lease')
                                    : daysLeft >= 0
                                      ? t(':days days left', { days: daysLeft })
                                      : t('Lease ended :days days ago', {
                                            days: -daysLeft,
                                        })
                            }
                            status={lease ? 'active' : 'exited'}
                            facts={[
                                [Mail, tenant.user.email],
                                [Phone, tenant.user.phone],
                                [
                                    Users,
                                    t(':count family members', {
                                        count: tenant.family_member,
                                    }),
                                ],
                                [
                                    DoorOpen,
                                    lease &&
                                        `${lease.unit.property.name} · ${lease.unit.name}`,
                                ],
                                [
                                    CalendarRange,
                                    lease &&
                                        `${date(lease.start_date)} – ${date(lease.end_date)}`,
                                ],
                            ]}
                        />
                        {can('edit-tenants') && (
                            <div className="mt-6 grid w-full gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={tenantRoutes.edit(tenant.id)}>
                                        <SquarePen /> {t('Edit Tenant')}
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setRenewing(true)}
                                >
                                    <RefreshCw /> {t('Renew Lease')}
                                </Button>
                                {lease && (
                                    <Button
                                        variant="outline"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setExiting(true)}
                                    >
                                        <LogOut /> {t('Exit Tenant')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </>
                }
                tabs={[
                    {
                        label: 'Details',
                        heading: 'Personal Information',
                        content: (
                            <Fields
                                items={[
                                    ['Email', tenant.user.email],
                                    ['Phone Number', tenant.user.phone],
                                    [
                                        'Total Family Members',
                                        tenant.family_member,
                                    ],
                                    ['Address', tenant.address],
                                    ['City', tenant.city],
                                    ['State', tenant.state],
                                    ['Zip Code', tenant.zip_code],
                                    ['Country', tenant.country],
                                    ['Property', lease?.unit.property.name],
                                    ['Unit', lease?.unit.name],
                                    [
                                        'Lease Start Date',
                                        lease && date(lease.start_date),
                                    ],
                                    [
                                        'Lease End Date',
                                        lease && date(lease.end_date),
                                    ],
                                ]}
                            />
                        ),
                    },
                    {
                        label: 'Lease History',
                        content: (
                            <RecordList
                                items={leases}
                                empty="No leases yet"
                                render={(item) => (
                                    <>
                                        <div className="grid gap-1">
                                            <div className="flex flex-wrap items-center gap-2 font-medium">
                                                {item.unit.property.name}
                                                <IdBadge>
                                                    {item.unit.name}
                                                </IdBadge>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {date(item.start_date)} –{' '}
                                                {date(item.end_date)}
                                            </div>
                                            {item.status === 'exited' && (
                                                <div className="text-sm text-muted-foreground">
                                                    {t('Moved out')}{' '}
                                                    {item.exit_date &&
                                                        date(item.exit_date)}
                                                    {item.exit_amount &&
                                                        ` · ${t('Exit Amount')}: ${money(Number(item.exit_amount))}`}
                                                    {item.extra_charge &&
                                                        ` · ${t('Extra Charge')}: ${money(Number(item.extra_charge))}`}
                                                    {item.exit_reason &&
                                                        ` · ${item.exit_reason}`}
                                                </div>
                                            )}
                                        </div>
                                        <StatusBadge status={item.status} />
                                    </>
                                )}
                            />
                        ),
                    },
                ]}
            />

            <RenewLeaseDialog
                tenant={renewing ? tenant : null}
                onClose={() => setRenewing(false)}
                properties={properties}
            />
            <ExitTenantDialog
                tenantId={exiting ? tenant.id : null}
                onClose={() => setExiting(false)}
            />
        </>
    );
}

ShowTenant.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Tenants', href: tenantRoutes.index() },
    ],
};
