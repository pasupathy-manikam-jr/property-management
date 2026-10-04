import { Head, useForm } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    FileSignature,
    Hash,
    Mail,
    Save,
    Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import settingsRoutes from '@/routes/company-settings';
import { test as testEmail } from '@/routes/company-settings/email';
import type { GlobalSettings } from '@/types/global';

type Settings = GlobalSettings & {
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    taxTitle: string;
    taxNumber: string;
    invoicePrefix: string;
    expensePrefix: string;
    agreementPrefix: string;
    timezone: string;
    mailHost: string;
    mailPort: number;
    mailUsername: string;
    mailEncryption: 'tls' | 'ssl' | 'none';
    mailFromAddress: string;
    mailFromName: string;
    agreementTerms: string;
};

type Props = {
    settings: Settings;
    mailPasswordSet: boolean;
    timezones: string[];
    dateFormats: Record<string, string>;
    timeFormats: Record<string, string>;
};

const TABS: { id: string; title: string; icon: LucideIcon }[] = [
    { id: 'company', title: 'Company', icon: Building2 },
    { id: 'numbering', title: 'Numbering', icon: Hash },
    { id: 'formats', title: 'Formats', icon: Banknote },
    { id: 'email', title: 'Email (SMTP)', icon: Mail },
    { id: 'agreement', title: 'Agreement', icon: FileSignature },
];

const textareaClass =
    'rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

function Section({
    title,
    description,
    onSubmit,
    processing,
    children,
}: {
    title: string;
    description: string;
    onSubmit: (e: FormEvent) => void;
    processing: boolean;
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <form
            noValidate
            onSubmit={onSubmit}
            className="rounded-xl border bg-card p-6 shadow-sm"
        >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">{t(title)}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(description)}
                    </p>
                </div>
                <Button type="submit" disabled={processing}>
                    <Save /> {t('Save Changes')}
                </Button>
            </div>
            <div className="grid gap-5">{children}</div>
        </form>
    );
}

function Field({
    label,
    error,
    className,
    children,
}: {
    label: string;
    error?: string;
    className?: string;
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <div className={cn('grid content-start gap-2', className)}>
            <Label>{t(label)}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

function CompanySection({ settings }: Props) {
    const form = useForm({
        companyName: settings.companyName,
        companyEmail: settings.companyEmail,
        companyPhone: settings.companyPhone,
        companyAddress: settings.companyAddress,
        taxTitle: settings.taxTitle,
        taxNumber: settings.taxNumber,
    });
    const text = (
        key: keyof typeof form.data,
        label: string,
        type = 'text',
    ) => (
        <Field label={label} error={form.errors[key]}>
            <Input
                type={type}
                value={form.data[key]}
                onChange={(e) => form.setData(key, e.target.value)}
            />
        </Field>
    );

    return (
        <Section
            title="Company"
            description="Your company's details, shown on invoices and emails."
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(settingsRoutes.company(), { preserveScroll: true });
            }}
            processing={form.processing}
        >
            <div className="grid gap-5 md:grid-cols-2">
                {text('companyName', 'Company Name')}
                {text('companyEmail', 'Email', 'email')}
                {text('companyPhone', 'Phone Number')}
                {text('taxTitle', 'Tax Title')}
                {text('taxNumber', 'Tax Number')}
            </div>
            <Field label="Address" error={form.errors.companyAddress}>
                <textarea
                    rows={3}
                    className={textareaClass}
                    value={form.data.companyAddress}
                    onChange={(e) =>
                        form.setData('companyAddress', e.target.value)
                    }
                />
            </Field>
        </Section>
    );
}

function NumberingSection({ settings }: Props) {
    const form = useForm({
        invoicePrefix: settings.invoicePrefix,
        expensePrefix: settings.expensePrefix,
        agreementPrefix: settings.agreementPrefix,
    });
    const fields: [keyof typeof form.data, string][] = [
        ['invoicePrefix', 'Invoice Number Prefix'],
        ['expensePrefix', 'Expense Number Prefix'],
        ['agreementPrefix', 'Agreement Number Prefix'],
    ];

    return (
        <Section
            title="Numbering"
            description="Prefixes for new invoice, expense and agreement numbers."
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(settingsRoutes.numbering(), {
                    preserveScroll: true,
                });
            }}
            processing={form.processing}
        >
            <div className="grid gap-5 md:grid-cols-3">
                {fields.map(([key, label]) => (
                    <Field key={key} label={label} error={form.errors[key]}>
                        <Input
                            value={form.data[key]}
                            onChange={(e) => form.setData(key, e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground" dir="ltr">
                            {form.data[key]}0001
                        </p>
                    </Field>
                ))}
            </div>
        </Section>
    );
}

function FormatsSection({
    settings,
    timezones,
    dateFormats,
    timeFormats,
}: Props) {
    const { t } = useTranslation();
    const form = useForm({
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        timezone: settings.timezone,
        currencySymbol: settings.currencySymbol,
        decimalFormat: settings.decimalFormat,
        decimalSeparator: settings.decimalSeparator,
        thousandsSeparator: settings.thousandsSeparator,
        currencySymbolPosition: settings.currencySymbolPosition,
        currencySymbolSpace: settings.currencySymbolSpace,
    });

    return (
        <Section
            title="Formats"
            description="How dates, times and amounts are displayed."
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(settingsRoutes.formats(), { preserveScroll: true });
            }}
            processing={form.processing}
        >
            <div className="grid gap-5 md:grid-cols-2">
                <Field label="Date Format" error={form.errors.dateFormat}>
                    <SelectField
                        value={form.data.dateFormat}
                        onChange={(e) =>
                            form.setData('dateFormat', e.target.value)
                        }
                    >
                        {Object.entries(dateFormats).map(
                            ([format, example]) => (
                                <option key={format} value={format}>
                                    {example}
                                </option>
                            ),
                        )}
                    </SelectField>
                </Field>
                <Field label="Time Format" error={form.errors.timeFormat}>
                    <SelectField
                        value={form.data.timeFormat}
                        onChange={(e) =>
                            form.setData('timeFormat', e.target.value)
                        }
                    >
                        {Object.entries(timeFormats).map(
                            ([format, example]) => (
                                <option key={format} value={format}>
                                    {example}
                                </option>
                            ),
                        )}
                    </SelectField>
                </Field>
                <Field label="Timezone" error={form.errors.timezone}>
                    <SelectField
                        value={form.data.timezone}
                        onChange={(e) =>
                            form.setData('timezone', e.target.value)
                        }
                    >
                        {timezones.map((zone) => (
                            <option key={zone} value={zone}>
                                {zone}
                            </option>
                        ))}
                    </SelectField>
                </Field>
                <Field
                    label="Currency Symbol"
                    error={form.errors.currencySymbol}
                >
                    <Input
                        value={form.data.currencySymbol}
                        onChange={(e) =>
                            form.setData('currencySymbol', e.target.value)
                        }
                    />
                </Field>
                <Field
                    label="Currency Symbol Position"
                    error={form.errors.currencySymbolPosition}
                >
                    <SelectField
                        value={form.data.currencySymbolPosition}
                        onChange={(e) =>
                            form.setData(
                                'currencySymbolPosition',
                                e.target.value as 'before' | 'after',
                            )
                        }
                    >
                        <option value="before">{t('Before amount')}</option>
                        <option value="after">{t('After amount')}</option>
                    </SelectField>
                </Field>
                <Field label="Decimal Places" error={form.errors.decimalFormat}>
                    <SelectField
                        value={form.data.decimalFormat}
                        onChange={(e) =>
                            form.setData('decimalFormat', +e.target.value)
                        }
                    >
                        {[0, 1, 2, 3, 4].map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </SelectField>
                </Field>
                <Field
                    label="Decimal Separator"
                    error={form.errors.decimalSeparator}
                >
                    <SelectField
                        value={form.data.decimalSeparator}
                        onChange={(e) =>
                            form.setData('decimalSeparator', e.target.value)
                        }
                    >
                        <option value=".">{t('Dot')} (.)</option>
                        <option value=",">{t('Comma')} (,)</option>
                    </SelectField>
                </Field>
                <Field
                    label="Thousands Separator"
                    error={form.errors.thousandsSeparator}
                >
                    <SelectField
                        value={form.data.thousandsSeparator}
                        onChange={(e) =>
                            form.setData('thousandsSeparator', e.target.value)
                        }
                    >
                        <option value=",">{t('Comma')} (,)</option>
                        <option value=".">{t('Dot')} (.)</option>
                        <option value=" ">{t('Space')}</option>
                        <option value="">{t('None')}</option>
                    </SelectField>
                </Field>
            </div>
            <div className="flex items-center justify-between gap-4">
                <Label htmlFor="currency-space">
                    {t('Space between symbol and amount')}
                </Label>
                <Switch
                    id="currency-space"
                    checked={form.data.currencySymbolSpace}
                    onCheckedChange={(checked) =>
                        form.setData('currencySymbolSpace', checked)
                    }
                />
            </div>
            <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                {t('Preview')}:{' '}
                <span className="font-semibold" dir="ltr">
                    {formatMoney(1234567.891, { ...settings, ...form.data })}
                </span>
            </div>
        </Section>
    );
}

function EmailSection({ settings, mailPasswordSet }: Props) {
    const { t } = useTranslation();
    const form = useForm({
        mailHost: settings.mailHost,
        mailPort: settings.mailPort,
        mailUsername: settings.mailUsername,
        mailPassword: '',
        mailEncryption: settings.mailEncryption,
        mailFromAddress: settings.mailFromAddress,
        mailFromName: settings.mailFromName,
    });
    const test = useForm({ email: '' });

    return (
        <Section
            title="Email (SMTP)"
            description="The mail server used to send notifications."
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(settingsRoutes.email(), {
                    preserveScroll: true,
                    onSuccess: () => form.reset('mailPassword'),
                });
            }}
            processing={form.processing}
        >
            <div className="grid gap-5 md:grid-cols-2">
                <Field label="Mail Host" error={form.errors.mailHost}>
                    <Input
                        value={form.data.mailHost}
                        placeholder="smtp.example.com"
                        onChange={(e) =>
                            form.setData('mailHost', e.target.value)
                        }
                    />
                </Field>
                <Field label="Mail Port" error={form.errors.mailPort}>
                    <Input
                        type="number"
                        value={form.data.mailPort}
                        onChange={(e) =>
                            form.setData('mailPort', +e.target.value)
                        }
                    />
                </Field>
                <Field label="Mail Username" error={form.errors.mailUsername}>
                    <Input
                        value={form.data.mailUsername}
                        autoComplete="off"
                        onChange={(e) =>
                            form.setData('mailUsername', e.target.value)
                        }
                    />
                </Field>
                <Field label="Mail Password" error={form.errors.mailPassword}>
                    <Input
                        type="password"
                        value={form.data.mailPassword}
                        autoComplete="new-password"
                        placeholder={
                            mailPasswordSet
                                ? t('Leave blank to keep the current password')
                                : ''
                        }
                        onChange={(e) =>
                            form.setData('mailPassword', e.target.value)
                        }
                    />
                </Field>
                <Field
                    label="Mail Encryption"
                    error={form.errors.mailEncryption}
                >
                    <SelectField
                        value={form.data.mailEncryption}
                        onChange={(e) =>
                            form.setData(
                                'mailEncryption',
                                e.target.value as 'tls' | 'ssl' | 'none',
                            )
                        }
                    >
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">{t('None')}</option>
                    </SelectField>
                </Field>
                <Field
                    label="Mail From Address"
                    error={form.errors.mailFromAddress}
                >
                    <Input
                        type="email"
                        value={form.data.mailFromAddress}
                        onChange={(e) =>
                            form.setData('mailFromAddress', e.target.value)
                        }
                    />
                </Field>
                <Field label="Mail From Name" error={form.errors.mailFromName}>
                    <Input
                        value={form.data.mailFromName}
                        onChange={(e) =>
                            form.setData('mailFromName', e.target.value)
                        }
                    />
                </Field>
            </div>
            <div className="grid gap-2 border-t pt-5">
                <Label htmlFor="test-email">{t('Send Test Email')}</Label>
                <div className="flex gap-2">
                    <Input
                        id="test-email"
                        type="email"
                        placeholder="you@example.com"
                        value={test.data.email}
                        onChange={(e) => test.setData('email', e.target.value)}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={test.processing || !settings.mailHost}
                        onClick={() =>
                            test.submit(testEmail(), { preserveScroll: true })
                        }
                    >
                        <Send /> {t('Send')}
                    </Button>
                </div>
                {!settings.mailHost && (
                    <p className="text-sm text-muted-foreground">
                        {t('Save your SMTP settings before sending a test.')}
                    </p>
                )}
                <InputError message={test.errors.email} />
            </div>
        </Section>
    );
}

function AgreementSection({ settings }: Props) {
    const form = useForm({ agreementTerms: settings.agreementTerms });

    return (
        <Section
            title="Agreement"
            description="Default terms and conditions for new agreements."
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(settingsRoutes.agreement(), {
                    preserveScroll: true,
                });
            }}
            processing={form.processing}
        >
            <Field
                label="Terms & Conditions"
                error={form.errors.agreementTerms}
            >
                <textarea
                    rows={14}
                    className={textareaClass}
                    value={form.data.agreementTerms}
                    onChange={(e) =>
                        form.setData('agreementTerms', e.target.value)
                    }
                />
            </Field>
        </Section>
    );
}

const SECTIONS: Record<string, (props: Props) => ReactNode> = {
    company: CompanySection,
    numbering: NumberingSection,
    formats: FormatsSection,
    email: EmailSection,
    agreement: AgreementSection,
};

export default function CompanySettings(props: Props) {
    const { t } = useTranslation();
    const [active, setActive] = useState(TABS[0].id);
    const Active = SECTIONS[active];

    return (
        <>
            <Head title={t('Settings')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Settings"
                    description="Company details, numbering, formats, email and agreement defaults."
                />
                <div className="grid items-start gap-6 lg:grid-cols-[14rem_1fr]">
                    <nav
                        role="tablist"
                        className="grid gap-1 rounded-xl border bg-card p-2 shadow-sm"
                    >
                        {TABS.map(({ id, title, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={active === id}
                                onClick={() => setActive(id)}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-start text-sm font-medium hover:bg-accent',
                                    active === id && 'bg-accent text-primary',
                                )}
                            >
                                <Icon className="size-4 shrink-0" />
                                {t(title)}
                            </button>
                        ))}
                    </nav>
                    <Active key={active} {...props} />
                </div>
            </div>
        </>
    );
}

CompanySettings.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Settings', href: settingsRoutes.index() },
    ],
};
