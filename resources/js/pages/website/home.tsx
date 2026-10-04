import { Head, useForm } from '@inertiajs/react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard, home as publicHome } from '@/routes';
import websiteRoutes from '@/routes/website';
import type { HomeContent } from '@/pages/welcome';

const textareaClass =
    'rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

function Card({
    title,
    description,
    action,
    children,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">{t(title)}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground">
                            {t(description)}
                        </p>
                    )}
                </div>
                {action}
            </div>
            <div className="grid gap-4">{children}</div>
        </section>
    );
}

export default function WebsiteHome({ content }: { content: HomeContent }) {
    const { t } = useTranslation();
    const form = useForm(content);
    const errors = form.errors as Record<string, string | undefined>;
    const { data, setData } = form;

    const text = (key: keyof HomeContent, label: string, multiline = false) => (
        <div className="grid gap-2">
            <Label htmlFor={key}>{t(label)}</Label>
            {multiline ? (
                <textarea
                    id={key}
                    rows={2}
                    className={textareaClass}
                    value={data[key] as string}
                    onChange={(e) => setData(key, e.target.value)}
                />
            ) : (
                <Input
                    id={key}
                    value={data[key] as string}
                    onChange={(e) => setData(key, e.target.value)}
                />
            )}
            <InputError message={errors[key]} />
        </div>
    );
    // A list edited one item per line; blank lines are dropped on save.
    const lines = (
        value: string[],
        onChange: (items: string[]) => void,
        id: string,
    ) => (
        <textarea
            id={id}
            rows={Math.max(4, value.length + 1)}
            className={textareaClass}
            value={value.join('\n')}
            onChange={(e) => onChange(e.target.value.split('\n'))}
        />
    );
    const addButton = (onClick: () => void) => (
        <Button type="button" variant="outline" size="sm" onClick={onClick}>
            <Plus /> {t('Add')}
        </Button>
    );
    const removeButton = (onClick: () => void) => (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('Delete')}
            onClick={onClick}
        >
            <Trash2 />
        </Button>
    );
    const firstError = (prefix: string) =>
        Object.entries(errors).find(([key]) => key.startsWith(prefix))?.[1];

    return (
        <>
            <Head title={t('Home Page')} />
            <form
                noValidate
                className="flex flex-1 flex-col gap-6 p-4 md:p-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.transform((d) => ({
                        ...d,
                        portals: d.portals.map((p) => ({
                            ...p,
                            items: p.items.filter((i) => i.trim() !== ''),
                        })),
                        benefits: d.benefits.filter((b) => b.trim() !== ''),
                    }));
                    form.submit(websiteRoutes.home.update(), {
                        preserveScroll: true,
                    });
                }}
            >
                <PageHeader
                    title="Home Page"
                    description="The content of the public welcome page. Text is shown as written."
                    action={
                        <div className="flex gap-2">
                            <Button variant="outline" asChild>
                                <a
                                    href={publicHome().url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {t('View Site')}
                                </a>
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                <Save /> {t('Save Changes')}
                            </Button>
                        </div>
                    }
                />

                <Card title="Hero">
                    {text('hero_title', 'Title')}
                    {text('hero_subtitle', 'Sub Title', true)}
                </Card>

                <Card
                    title="Portal cards"
                    description="One card per kind of user, with one point per line."
                    action={addButton(() =>
                        setData('portals', [
                            ...data.portals,
                            { title: '', items: [] },
                        ]),
                    )}
                >
                    <div className="grid gap-4 md:grid-cols-3">
                        {data.portals.map((portal, i) => (
                            <div
                                key={i}
                                className="grid gap-2 rounded-lg border p-4"
                            >
                                <div className="flex items-center gap-2">
                                    <Input
                                        aria-label={t('Title')}
                                        value={portal.title}
                                        onChange={(e) =>
                                            setData(
                                                'portals',
                                                data.portals.map((p, j) =>
                                                    j === i
                                                        ? {
                                                              ...p,
                                                              title: e.target
                                                                  .value,
                                                          }
                                                        : p,
                                                ),
                                            )
                                        }
                                    />
                                    {removeButton(() =>
                                        setData(
                                            'portals',
                                            data.portals.filter(
                                                (_, j) => j !== i,
                                            ),
                                        ),
                                    )}
                                </div>
                                {lines(
                                    portal.items,
                                    (items) =>
                                        setData(
                                            'portals',
                                            data.portals.map((p, j) =>
                                                j === i ? { ...p, items } : p,
                                            ),
                                        ),
                                    `portal-${i}`,
                                )}
                            </div>
                        ))}
                    </div>
                    <InputError message={firstError('portals')} />
                </Card>

                <Card title="Property listing">
                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="listing_enabled">
                            {t('Show properties marked "Display in listing"')}
                        </Label>
                        <Switch
                            id="listing_enabled"
                            checked={data.listing_enabled}
                            onCheckedChange={(checked) =>
                                setData('listing_enabled', checked)
                            }
                        />
                    </div>
                    {text('listing_title', 'Title')}
                    {text('listing_subtitle', 'Sub Title', true)}
                </Card>

                <Card
                    title="Features"
                    action={addButton(() =>
                        setData('features', [
                            ...data.features,
                            { title: '', body: '' },
                        ]),
                    )}
                >
                    {text('features_title', 'Title')}
                    {text('features_subtitle', 'Sub Title', true)}
                    <div className="grid gap-3 md:grid-cols-2">
                        {data.features.map((feature, i) => (
                            <div
                                key={i}
                                className="grid gap-2 rounded-lg border p-4"
                            >
                                <div className="flex items-center gap-2">
                                    <Input
                                        aria-label={t('Title')}
                                        value={feature.title}
                                        onChange={(e) =>
                                            setData(
                                                'features',
                                                data.features.map((f, j) =>
                                                    j === i
                                                        ? {
                                                              ...f,
                                                              title: e.target
                                                                  .value,
                                                          }
                                                        : f,
                                                ),
                                            )
                                        }
                                    />
                                    {removeButton(() =>
                                        setData(
                                            'features',
                                            data.features.filter(
                                                (_, j) => j !== i,
                                            ),
                                        ),
                                    )}
                                </div>
                                <textarea
                                    aria-label={t('Description')}
                                    rows={2}
                                    className={textareaClass}
                                    value={feature.body}
                                    onChange={(e) =>
                                        setData(
                                            'features',
                                            data.features.map((f, j) =>
                                                j === i
                                                    ? {
                                                          ...f,
                                                          body: e.target.value,
                                                      }
                                                    : f,
                                            ),
                                        )
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <InputError message={firstError('features.')} />
                </Card>

                <Card title="Benefits" description="One benefit per line.">
                    {text('benefits_title', 'Title')}
                    {text('benefits_text', 'Sub Title', true)}
                    {lines(
                        data.benefits,
                        (items) => setData('benefits', items),
                        'benefits',
                    )}
                    <InputError message={firstError('benefits.')} />
                </Card>

                <Card
                    title="FAQ"
                    action={addButton(() =>
                        setData('faqs', [
                            ...data.faqs,
                            { question: '', answer: '' },
                        ]),
                    )}
                >
                    {text('faq_title', 'Title')}
                    {text('faq_subtitle', 'Sub Title', true)}
                    {data.faqs.map((faq, i) => (
                        <div
                            key={i}
                            className="grid gap-2 rounded-lg border p-4"
                        >
                            <div className="flex items-center gap-2">
                                <Input
                                    aria-label={t('Question')}
                                    placeholder={t('Question')}
                                    value={faq.question}
                                    onChange={(e) =>
                                        setData(
                                            'faqs',
                                            data.faqs.map((f, j) =>
                                                j === i
                                                    ? {
                                                          ...f,
                                                          question:
                                                              e.target.value,
                                                      }
                                                    : f,
                                            ),
                                        )
                                    }
                                />
                                {removeButton(() =>
                                    setData(
                                        'faqs',
                                        data.faqs.filter((_, j) => j !== i),
                                    ),
                                )}
                            </div>
                            <textarea
                                aria-label={t('Answer')}
                                placeholder={t('Answer')}
                                rows={2}
                                className={textareaClass}
                                value={faq.answer}
                                onChange={(e) =>
                                    setData(
                                        'faqs',
                                        data.faqs.map((f, j) =>
                                            j === i
                                                ? {
                                                      ...f,
                                                      answer: e.target.value,
                                                  }
                                                : f,
                                        ),
                                    )
                                }
                            />
                        </div>
                    ))}
                    <InputError message={firstError('faqs.')} />
                </Card>
            </form>
        </>
    );
}

WebsiteHome.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Home Page', href: websiteRoutes.home() },
    ],
};
