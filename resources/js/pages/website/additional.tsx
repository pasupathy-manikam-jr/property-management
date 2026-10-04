import { Head, router, useForm } from '@inertiajs/react';
import { ExternalLink, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ClampedText } from '@/components/table-cells';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import customPage from '@/routes/custom-page';
import websiteRoutes from '@/routes/website';
import pageRoutes from '@/routes/website/pages';
import type { Paginated, TableFilters } from '@/types';

type Page = {
    id: number;
    title: string;
    slug: string;
    content: string;
    enabled: boolean;
};

export default function AdditionalPages({
    pages,
    filters,
}: {
    pages: Paginated<Page>;
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const [dialog, setDialog] = useState<{ page: Page | null } | null>(null);
    const [deleting, setDeleting] = useState<Page | null>(null);

    return (
        <>
            <Head title={t('Additional Pages')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Additional Pages"
                    description="Pages such as the privacy policy, linked from the website footer."
                    action={
                        <Button onClick={() => setDialog({ page: null })}>
                            <Plus /> {t('Create Page')}
                        </Button>
                    }
                />

                <DataTable
                    data={pages}
                    filters={filters}
                    url={websiteRoutes.additional()}
                    columns={[
                        {
                            key: 'title',
                            label: 'Title',
                            sortable: true,
                            render: (p) => (
                                <span className="font-medium">{p.title}</span>
                            ),
                        },
                        {
                            key: 'slug',
                            label: 'Slug',
                            sortable: true,
                            render: (p) => (
                                <span dir="ltr" className="font-mono text-xs">
                                    /page/{p.slug}
                                </span>
                            ),
                        },
                        {
                            key: 'content',
                            label: 'Content',
                            render: (p) => <ClampedText text={p.content} />,
                        },
                        {
                            key: 'enabled',
                            label: 'Status',
                            render: (p) => (
                                <StatusBadge
                                    status={p.enabled ? 'active' : 'inactive'}
                                    label={t(
                                        p.enabled ? 'Enabled' : 'Disabled',
                                    )}
                                />
                            ),
                        },
                    ]}
                    actions={(p) => (
                        <>
                            {p.enabled && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('View')}
                                    asChild
                                >
                                    <a
                                        href={customPage.show(p.slug).url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink />
                                    </a>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t('Edit')}
                                onClick={() => setDialog({ page: p })}
                            >
                                <SquarePen />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t('Delete')}
                                onClick={() => setDeleting(p)}
                            >
                                <Trash2 />
                            </Button>
                        </>
                    )}
                />
            </div>

            {dialog && (
                <PageDialog
                    page={dialog.page}
                    onClose={() => setDialog(null)}
                />
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This page will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(pageRoutes.destroy(deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

function PageDialog({
    page,
    onClose,
}: {
    page: Page | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({
        title: page?.title ?? '',
        slug: page?.slug ?? '',
        content: page?.content ?? '',
        enabled: page?.enabled ?? true,
    });

    return (
        <FormDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title={page ? 'Edit Page' : 'Create Page'}
            processing={form.processing}
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(
                    page ? pageRoutes.update(page.id) : pageRoutes.store(),
                    { preserveScroll: true, onSuccess: onClose },
                );
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="title">{t('Title')}</Label>
                    <Input
                        id="title"
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                    <InputError message={form.errors.title} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="slug">{t('Slug')}</Label>
                    <Input
                        id="slug"
                        dir="ltr"
                        placeholder={t('Made from the title when blank')}
                        value={form.data.slug}
                        onChange={(e) => form.setData('slug', e.target.value)}
                    />
                    <InputError message={form.errors.slug} />
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="content">{t('Content')}</Label>
                <textarea
                    id="content"
                    rows={14}
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                    value={form.data.content}
                    onChange={(e) => form.setData('content', e.target.value)}
                />
                <InputError message={form.errors.content} />
            </div>
            <div className="flex items-center justify-between gap-4">
                <Label htmlFor="enabled">{t('Enabled')}</Label>
                <Switch
                    id="enabled"
                    checked={form.data.enabled}
                    onCheckedChange={(checked) =>
                        form.setData('enabled', checked)
                    }
                />
            </div>
        </FormDialog>
    );
}

AdditionalPages.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Additional Pages', href: websiteRoutes.additional() },
    ],
};
