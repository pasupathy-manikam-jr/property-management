import { Head, useForm } from '@inertiajs/react';
import { SquarePen } from 'lucide-react';
import { useState } from 'react';
import { FormDialog } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import notificationRoutes from '@/routes/notifications';

type Template = {
    event: string;
    label: string;
    subject: Record<string, string>;
    body: Record<string, string>;
    enabled: boolean;
    placeholders: string[];
};

type Language = { code: string; name: string };

export default function Notifications({
    templates,
    languages,
}: {
    templates: Template[];
    languages: Language[];
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<Template | null>(null);

    return (
        <>
            <Head title={t('Email Notifications')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Email Notifications"
                    description="The emails sent for each event, in English, Malay and Chinese. Each user gets them in their own language."
                />

                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/60 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-start font-medium">
                                        {t('Module')}
                                    </th>
                                    <th className="px-4 py-3 text-start font-medium">
                                        {t('Subject')}
                                    </th>
                                    <th className="px-4 py-3 text-start font-medium">
                                        {t('Email')}
                                    </th>
                                    <th className="px-4 py-3 text-end font-medium">
                                        {t('Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {templates.map((template) => (
                                    <tr
                                        key={template.event}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {t(template.label)}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {template.subject.en || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge
                                                status={
                                                    template.enabled
                                                        ? 'active'
                                                        : 'inactive'
                                                }
                                                label={t(
                                                    template.enabled
                                                        ? 'Enabled'
                                                        : 'Disabled',
                                                )}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={t('Edit')}
                                                onClick={() =>
                                                    setEditing(template)
                                                }
                                            >
                                                <SquarePen />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editing && (
                <TemplateDialog
                    key={editing.event}
                    template={editing}
                    languages={languages}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

function TemplateDialog({
    template,
    languages,
    onClose,
}: {
    template: Template;
    languages: Language[];
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [lang, setLang] = useState(languages[0].code);
    const form = useForm({
        enabled: template.enabled,
        subject: Object.fromEntries(
            languages.map(({ code }) => [code, template.subject[code] ?? '']),
        ),
        body: Object.fromEntries(
            languages.map(({ code }) => [code, template.body[code] ?? '']),
        ),
    });
    const errors = form.errors as Record<string, string | undefined>;

    return (
        <FormDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title={template.label}
            description="English is required and used when a translation is blank."
            processing={form.processing}
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(notificationRoutes.update(template.event), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
        >
            <div className="flex items-center justify-between gap-4">
                <Label htmlFor="template-enabled">
                    {t('Enabled Email Notification')}
                </Label>
                <Switch
                    id="template-enabled"
                    checked={form.data.enabled}
                    onCheckedChange={(checked) =>
                        form.setData('enabled', checked)
                    }
                />
            </div>

            <div role="tablist" className="flex gap-1 border-b">
                {languages.map(({ code, name }) => (
                    <button
                        key={code}
                        type="button"
                        role="tab"
                        aria-selected={lang === code}
                        onClick={() => setLang(code)}
                        className={cn(
                            '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
                            lang === code
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground',
                            (errors[`subject.${code}`] ||
                                errors[`body.${code}`]) &&
                                'text-destructive',
                        )}
                    >
                        {name}
                    </button>
                ))}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="template-subject">{t('Subject')}</Label>
                <Input
                    id="template-subject"
                    value={form.data.subject[lang]}
                    onChange={(e) =>
                        form.setData('subject', {
                            ...form.data.subject,
                            [lang]: e.target.value,
                        })
                    }
                />
                <InputError message={errors[`subject.${lang}`]} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="template-body">{t('Message')}</Label>
                <textarea
                    id="template-body"
                    rows={12}
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                    value={form.data.body[lang]}
                    onChange={(e) =>
                        form.setData('body', {
                            ...form.data.body,
                            [lang]: e.target.value,
                        })
                    }
                />
                <InputError message={errors[`body.${lang}`]} />
            </div>
            <div className="grid gap-2">
                <p className="text-sm font-medium">{t('Placeholders')}</p>
                <div className="flex flex-wrap gap-1.5">
                    {template.placeholders.map((name) => (
                        <code
                            key={name}
                            dir="ltr"
                            className="rounded bg-muted px-1.5 py-0.5 text-xs"
                        >
                            {`{${name}}`}
                        </code>
                    ))}
                </div>
            </div>
        </FormDialog>
    );
}

Notifications.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Email Notifications', href: notificationRoutes.index() },
    ],
};
