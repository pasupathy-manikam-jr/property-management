import { Head, router, useForm } from '@inertiajs/react';
import { Plus, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { ClampedText, DateCell } from '@/components/table-cells';
import { PersonCell } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCan } from '@/hooks/use-can';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import contactRoutes from '@/routes/contacts';
import type { Paginated, TableFilters } from '@/types';

type Contact = {
    id: number;
    name: string;
    email: string | null;
    contact_number: string | null;
    subject: string | null;
    message: string | null;
    created_at: string;
};

const blank = {
    name: '',
    email: '',
    contact_number: '',
    subject: '',
    message: '',
};

const FIELDS = [
    ['name', 'Name', 'text'],
    ['email', 'Email', 'email'],
    ['contact_number', 'Contact Number', 'tel'],
    ['subject', 'Subject', 'text'],
] as const;

export default function Contacts({
    contacts,
    filters,
}: {
    contacts: Paginated<Contact>;
    filters: TableFilters;
}) {
    const { t } = useTranslation();
    const can = useCan();
    const [editing, setEditing] = useState<Contact | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState<Contact | null>(null);
    const form = useForm(blank);

    const openForm = (contact: Contact | null) => {
        setEditing(contact);
        form.clearErrors();
        form.setData(
            contact
                ? {
                      name: contact.name,
                      email: contact.email ?? '',
                      contact_number: contact.contact_number ?? '',
                      subject: contact.subject ?? '',
                      message: contact.message ?? '',
                  }
                : blank,
        );
        setFormOpen(true);
    };

    return (
        <>
            <Head title={t('Contact Diary')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Contact Diary"
                    description="Your own list of useful contacts."
                    action={
                        can('create-contacts') && (
                            <Button onClick={() => openForm(null)}>
                                <Plus /> {t('Create Contact')}
                            </Button>
                        )
                    }
                />

                <DataTable
                    data={contacts}
                    filters={filters}
                    url={contactRoutes.index()}
                    columns={[
                        {
                            key: 'name',
                            label: 'Name',
                            sortable: true,
                            render: (c) => (
                                <PersonCell name={c.name} detail={c.email} />
                            ),
                        },
                        {
                            key: 'contact_number',
                            label: 'Contact Number',
                            render: (c) => (
                                <span className="whitespace-nowrap">
                                    {c.contact_number ?? '—'}
                                </span>
                            ),
                        },
                        {
                            key: 'subject',
                            label: 'Subject',
                            className: 'max-w-md',
                            render: (c) => (
                                <div>
                                    <div className="font-medium">
                                        {c.subject ?? '—'}
                                    </div>
                                    <ClampedText text={c.message} />
                                </div>
                            ),
                        },
                        {
                            key: 'created_at',
                            label: 'Created Date',
                            sortable: true,
                            render: (c) => <DateCell value={c.created_at} />,
                        },
                    ]}
                    actions={(c) => (
                        <>
                            {can('edit-contacts') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Edit')}
                                    onClick={() => openForm(c)}
                                >
                                    <SquarePen />
                                </Button>
                            )}
                            {can('delete-contacts') && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('Delete')}
                                    onClick={() => setDeleting(c)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </>
                    )}
                />
            </div>

            <FormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit Contact' : 'Create Contact'}
                processing={form.processing}
                onSubmit={(e) => {
                    e.preventDefault();
                    form.submit(
                        editing
                            ? contactRoutes.update(editing.id)
                            : contactRoutes.store(),
                        {
                            preserveScroll: true,
                            onSuccess: () => setFormOpen(false),
                        },
                    );
                }}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    {FIELDS.map(([key, label, type]) => (
                        <div key={key} className="grid content-start gap-2">
                            <Label htmlFor={`contact-${key}`}>
                                {t(label)}
                                {key === 'name' && (
                                    <span className="text-destructive">*</span>
                                )}
                            </Label>
                            <Input
                                id={`contact-${key}`}
                                type={type}
                                value={form.data[key]}
                                onChange={(e) =>
                                    form.setData(key, e.target.value)
                                }
                            />
                            <InputError message={form.errors[key]} />
                        </div>
                    ))}
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="contact-message">{t('Message')}</Label>
                        <textarea
                            id="contact-message"
                            rows={4}
                            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                            value={form.data.message}
                            onChange={(e) =>
                                form.setData('message', e.target.value)
                            }
                        />
                        <InputError message={form.errors.message} />
                    </div>
                </div>
            </FormDialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This contact will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(contactRoutes.destroy(deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

Contacts.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Contact Diary', href: contactRoutes.index() },
    ],
};
