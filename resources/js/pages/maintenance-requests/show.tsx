import { Head, useForm } from '@inertiajs/react';
import {
    CalendarCheck,
    CalendarDays,
    DoorOpen,
    Download,
    UserCog,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import {
    DetailPage,
    Fields,
    Summary,
    SummaryIcon,
    TextBlock,
} from '@/components/detail-page';
import InputError from '@/components/input-error';
import { AssignDialog } from '@/components/maintenance-dialogs';
import type { MaintainerOption } from '@/components/maintenance-dialogs';
import { IdBadge } from '@/components/table-cells';
import { PersonCell, UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import maintenanceRequestRoutes from '@/routes/maintenance-requests';

type Person = {
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
};

type MaintenanceRequest = {
    id: number;
    property_id: number;
    maintainer_id: number | null;
    request_date: string;
    status: string;
    fixed_date: string | null;
    notes: string | null;
    file_name: string | null;
    preview: string | null;
    property: { name: string; address: string; city: string; state: string };
    unit: { name: string };
    issue_type: { name: string } | null;
    tenant: { user: Person } | null;
    maintainer: { user: Person; type: { name: string } | null } | null;
};

type Comment = {
    id: number;
    comment: string;
    created_at: string;
    user: { id: number; name: string; avatar: string | null };
};

export default function ShowMaintenanceRequest({
    request,
    comments,
    maintainers,
    canChangeStatus,
}: {
    request: MaintenanceRequest;
    comments: Comment[];
    maintainers: MaintainerOption[];
    canChangeStatus: boolean;
}) {
    const { t } = useTranslation();
    const { date, dateTime } = useFormat();
    const can = useCan();
    const [assigning, setAssigning] = useState(false);
    const form = useForm({ comment: '' });
    const canAssign = can('assign-maintainers') && maintainers.length > 0;
    const title = request.issue_type?.name ?? t('Maintenance Request');

    return (
        <>
            <Head title={title} />
            <DetailPage
                title={title}
                description="Maintenance request details and comments."
                back={maintenanceRequestRoutes.index()}
                summary={
                    <>
                        <Summary
                            media={<SummaryIcon icon={Wrench} />}
                            title={title}
                            subtitle={request.property.name}
                            status={request.status}
                            facts={[
                                [
                                    DoorOpen,
                                    `${request.property.address}, ${request.property.city}`,
                                ],
                                [CalendarDays, date(request.request_date)],
                                [
                                    CalendarCheck,
                                    request.fixed_date &&
                                        t('Fixed on :date', {
                                            date: date(request.fixed_date),
                                        }),
                                ],
                                [
                                    UserCog,
                                    request.maintainer?.user.name ??
                                        t('Not Assigned'),
                                ],
                            ]}
                        />
                        {(canAssign || canChangeStatus) && (
                            <div className="mt-6 grid w-full gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setAssigning(true)}
                                >
                                    <UserCog />{' '}
                                    {t(
                                        canAssign
                                            ? 'Assign Maintainer'
                                            : 'Update Status',
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                }
                tabs={[
                    {
                        label: 'Details',
                        heading: 'Request Information',
                        content: (
                            <div className="grid gap-6">
                                <Fields
                                    items={[
                                        ['Property', request.property.name],
                                        [
                                            'Unit',
                                            <IdBadge key="unit">
                                                {request.unit.name}
                                            </IdBadge>,
                                        ],
                                        ['Issue', request.issue_type?.name],
                                        [
                                            'Request Date',
                                            date(request.request_date),
                                        ],
                                        [
                                            'Fixed Date',
                                            request.fixed_date &&
                                                date(request.fixed_date),
                                        ],
                                        [
                                            'Tenant',
                                            request.tenant && (
                                                <PersonCell
                                                    name={
                                                        request.tenant.user.name
                                                    }
                                                    detail={
                                                        request.tenant.user
                                                            .phone ??
                                                        request.tenant.user
                                                            .email
                                                    }
                                                    src={
                                                        request.tenant.user
                                                            .avatar
                                                    }
                                                />
                                            ),
                                        ],
                                        [
                                            'Maintainer',
                                            request.maintainer && (
                                                <PersonCell
                                                    name={
                                                        request.maintainer.user
                                                            .name
                                                    }
                                                    detail={[
                                                        request.maintainer.type
                                                            ?.name,
                                                        request.maintainer.user
                                                            .phone,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                    src={
                                                        request.maintainer.user
                                                            .avatar
                                                    }
                                                />
                                            ),
                                        ],
                                    ]}
                                />
                                <TextBlock
                                    label="Notes"
                                    value={request.notes}
                                />
                                <div>
                                    <div className="text-sm text-muted-foreground">
                                        {t('Attachment')}
                                    </div>
                                    {request.file_name ? (
                                        <div className="mt-2 grid justify-items-start gap-3">
                                            {request.preview && (
                                                <img
                                                    src={request.preview}
                                                    alt={request.file_name}
                                                    className="max-h-64 rounded-lg border object-contain"
                                                />
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={maintenanceRequestRoutes.attachment.url(
                                                        request.id,
                                                    )}
                                                >
                                                    <Download />{' '}
                                                    {request.file_name}
                                                </a>
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="mt-1">-</p>
                                    )}
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: 'Comments',
                        content: (
                            <div className="grid gap-6">
                                {comments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('No comments yet')}
                                    </p>
                                ) : (
                                    <ul className="grid gap-4">
                                        {comments.map((c) => (
                                            <li
                                                key={c.id}
                                                className="flex gap-3"
                                            >
                                                <UserAvatar
                                                    name={c.user.name}
                                                    src={c.user.avatar}
                                                    className="size-9"
                                                />
                                                <div className="min-w-0 flex-1 rounded-lg bg-muted/50 px-4 py-3">
                                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                        <span className="font-medium">
                                                            {c.user.name}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {dateTime(
                                                                c.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-sm break-words whitespace-pre-line">
                                                        {c.comment}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <form
                                    noValidate
                                    className="grid gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        form.submit(
                                            maintenanceRequestRoutes.comment(
                                                request.id,
                                            ),
                                            {
                                                preserveScroll: true,
                                                onSuccess: () => form.reset(),
                                            },
                                        );
                                    }}
                                >
                                    <textarea
                                        aria-label={t('Add Comment')}
                                        placeholder={t('Add Comment')}
                                        rows={3}
                                        className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                                        value={form.data.comment}
                                        onChange={(e) =>
                                            form.setData(
                                                'comment',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.comment} />
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={form.processing}
                                        >
                                            {form.processing && <Spinner />}
                                            {t('Send')}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        ),
                    },
                ]}
            />

            <AssignDialog
                request={assigning ? request : null}
                maintainers={maintainers}
                statusOnly={!canAssign}
                onClose={() => setAssigning(false)}
            />
        </>
    );
}

ShowMaintenanceRequest.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        {
            title: 'Maintenance Requests',
            href: maintenanceRequestRoutes.index(),
        },
    ],
};
