import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, Paperclip, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import noteRoutes from '@/routes/notes';
import type { Paginated, TableFilters } from '@/types';

type Note = {
    id: number;
    title: string;
    description: string | null;
    file_name: string | null;
    created_at: string;
};

const blank = { title: '', description: '', document: null as File | null };

export default function Notes({
    notes,
    filters,
}: {
    notes: Paginated<Note>;
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const { date } = useFormat();
    const can = useCan();
    const [editing, setEditing] = useState<Note | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState<Note | null>(null);
    const form = useForm(blank);

    const openForm = (note: Note | null) => {
        setEditing(note);
        form.clearErrors();
        form.setData(
            note
                ? {
                      title: note.title,
                      description: note.description ?? '',
                      document: null,
                  }
                : blank,
        );
        setFormOpen(true);
    };

    return (
        <>
            <Head title={t('Notice Board')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Notice Board"
                    description="Announcements for staff and tenants."
                    action={
                        can('create-notes') && (
                            <Button onClick={() => openForm(null)}>
                                <Plus /> {t('Create Notice')}
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={notes}
                    filters={filters}
                    url={noteRoutes.index()}
                    columns={[]}
                    cardsOnly
                    renderCard={(note, actions) => (
                        <article className="flex h-full flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CalendarDays className="size-4" />
                                {date(note.created_at)}
                            </div>
                            <h2 className="text-lg font-semibold break-words">
                                {note.title}
                            </h2>
                            <p className="flex-1 text-sm whitespace-pre-line text-muted-foreground">
                                {note.description}
                            </p>
                            <div className="flex items-center justify-between gap-2 border-t pt-3">
                                {note.file_name ? (
                                    <a
                                        href={noteRoutes.document(note.id).url}
                                        className="inline-flex min-w-0 items-center gap-1.5 text-sm text-primary hover:underline"
                                        title={note.file_name}
                                    >
                                        <Paperclip className="size-4 shrink-0" />
                                        <span className="truncate">
                                            {note.file_name}
                                        </span>
                                    </a>
                                ) : (
                                    <span />
                                )}
                                {actions}
                            </div>
                        </article>
                    )}
                    actions={
                        can('edit-notes') || can('delete-notes')
                            ? (note) => (
                                  <>
                                      {can('edit-notes') && (
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              aria-label={t('Edit')}
                                              onClick={() => openForm(note)}
                                          >
                                              <SquarePen />
                                          </Button>
                                      )}
                                      {can('delete-notes') && (
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              aria-label={t('Delete')}
                                              onClick={() => setDeleting(note)}
                                          >
                                              <Trash2 />
                                          </Button>
                                      )}
                                  </>
                              )
                            : undefined
                    }
                />
            </div>

            <FormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit Notice' : 'Create Notice'}
                processing={form.processing}
                onSubmit={(e) => {
                    e.preventDefault();
                    // Files need multipart; PHP only parses it on POST, so updates spoof PUT via _method.
                    form.post(
                        editing
                            ? noteRoutes.update.form(editing.id).action
                            : noteRoutes.store().url,
                        {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => setFormOpen(false),
                        },
                    );
                }}
            >
                <div className="grid gap-2">
                    <Label htmlFor="note-title">
                        {t('Title')}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="note-title"
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                    <InputError message={form.errors.title} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="note-description">{t('Description')}</Label>
                    <textarea
                        id="note-description"
                        rows={5}
                        className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                    />
                    <InputError message={form.errors.description} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="note-document">{t('Attachment')}</Label>
                    <Input
                        id="note-document"
                        type="file"
                        onChange={(e) =>
                            form.setData(
                                'document',
                                e.target.files?.[0] ?? null,
                            )
                        }
                    />
                    {editing?.file_name && (
                        <p className="text-sm text-muted-foreground">
                            {t('Current file: :name', {
                                name: editing.file_name,
                            })}
                        </p>
                    )}
                    <InputError message={form.errors.document} />
                </div>
            </FormDialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This notice will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(noteRoutes.destroy(deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

Notes.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Notice Board', href: noteRoutes.index() },
    ],
};
