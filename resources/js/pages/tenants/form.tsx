import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { LeaseFields } from '@/components/lease-dialogs';
import type { PropertyOption } from '@/components/lease-dialogs';
import { PageHeader } from '@/components/page-header';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import tenantRoutes from '@/routes/tenants';

type EditableTenant = {
    id: number;
    family_member: number;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    user: {
        name: string;
        email: string;
        phone: string | null;
        avatar: string | null;
    };
};

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <section className="grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
            <div>
                <h2 className="font-semibold">{t(title)}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {t(description)}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

export default function TenantForm({
    tenant,
    properties,
}: {
    tenant: EditableTenant | null;
    properties: PropertyOption[];
}) {
    const { t } = useTranslation();
    const form = useForm({
        name: tenant?.user.name ?? '',
        email: tenant?.user.email ?? '',
        phone: tenant?.user.phone ?? '',
        password: '',
        password_confirmation: '',
        photo: null as File | null,
        family_member: String(tenant?.family_member ?? 1),
        address: tenant?.address ?? '',
        city: tenant?.city ?? '',
        state: tenant?.state ?? '',
        zip_code: tenant?.zip_code ?? '',
        country: tenant?.country ?? 'Malaysia',
        property_id: '',
        unit_id: '',
        start_date: '',
        end_date: '',
    });
    const title = tenant ? 'Edit Tenant' : 'Create Tenant';
    const back = tenant ? tenantRoutes.show(tenant.id) : tenantRoutes.index();

    const text = (
        key: keyof typeof form.data,
        label: string,
        props: React.ComponentProps<typeof Input> = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={key}>
                {t(label)}
                {props.required !== false && (
                    <span className="text-destructive">*</span>
                )}
            </Label>
            <Input
                id={key}
                value={form.data[key] as string}
                onChange={(e) => form.setData(key, e.target.value)}
                {...props}
            />
            <InputError message={form.errors[key]} />
        </div>
    );

    return (
        <>
            <Head title={t(title)} />
            <form
                noValidate
                className="flex flex-1 flex-col gap-6 p-4 md:p-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    // Files need multipart; PHP only parses it on POST, so updates spoof PUT via _method.
                    form.post(
                        tenant
                            ? tenantRoutes.update.form(tenant.id).action
                            : tenantRoutes.store().url,
                        { forceFormData: true },
                    );
                }}
            >
                <PageHeader
                    title={title}
                    description={
                        tenant
                            ? 'Update the tenant’s contact and address details.'
                            : 'Create the tenant’s login and move them into a unit.'
                    }
                    action={
                        <Button variant="outline" asChild>
                            <Link href={back}>
                                <ArrowLeft className="rtl:rotate-180" />{' '}
                                {t('Back')}
                            </Link>
                        </Button>
                    }
                />

                <Section
                    title="Personal Details"
                    description="The tenant signs in with this email."
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {text('name', 'Name')}
                        {text('email', 'Email', { type: 'email' })}
                        {text('phone', 'Phone Number', { type: 'tel' })}
                        {text('family_member', 'Total Family Members', {
                            type: 'number',
                            min: 1,
                        })}
                        {!tenant && (
                            <>
                                {text('password', 'Password', {
                                    type: 'password',
                                })}
                                {text(
                                    'password_confirmation',
                                    'Confirm Password',
                                    {
                                        type: 'password',
                                    },
                                )}
                            </>
                        )}
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="photo">{t('Profile Photo')}</Label>
                            <div className="flex items-center gap-4">
                                {tenant && (
                                    <UserAvatar
                                        name={tenant.user.name}
                                        src={tenant.user.avatar}
                                        className="size-12"
                                    />
                                )}
                                <Input
                                    id="photo"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) =>
                                        form.setData(
                                            'photo',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                            </div>
                            <InputError message={form.errors.photo} />
                        </div>
                    </div>
                </Section>

                <Section title="Address">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            {text('address', 'Address')}
                        </div>
                        {text('city', 'City')}
                        {text('state', 'State')}
                        {text('zip_code', 'Zip Code')}
                        {text('country', 'Country')}
                    </div>
                </Section>

                {!tenant && (
                    <Section
                        title="Lease"
                        description="Occupied units can't be picked."
                    >
                        <LeaseFields
                            data={form.data}
                            onChange={(changes) =>
                                form.setData((data) => ({
                                    ...data,
                                    ...changes,
                                }))
                            }
                            errors={form.errors}
                            properties={properties}
                        />
                    </Section>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                        <Link href={back}>{t('Cancel')}</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing && <Spinner />}
                        {t(tenant ? 'Save' : 'Create Tenant')}
                    </Button>
                </div>
            </form>
        </>
    );
}

TenantForm.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Tenants', href: tenantRoutes.index() },
    ],
};
