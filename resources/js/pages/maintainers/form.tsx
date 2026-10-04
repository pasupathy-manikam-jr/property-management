import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import maintainerRoutes from '@/routes/maintainers';

type Option = { id: number; name: string };

type EditableMaintainer = {
    id: number;
    type_id: number | null;
    properties: number[];
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

export default function MaintainerForm({
    maintainer,
    properties,
    types,
}: {
    maintainer: EditableMaintainer | null;
    properties: Option[];
    types: Option[];
}) {
    const { t } = useTranslation();
    const form = useForm({
        name: maintainer?.user.name ?? '',
        email: maintainer?.user.email ?? '',
        phone: maintainer?.user.phone ?? '',
        password: '',
        password_confirmation: '',
        photo: null as File | null,
        type_id: String(maintainer?.type_id ?? ''),
        properties: maintainer?.properties ?? ([] as number[]),
    });
    const errors = form.errors as Record<string, string | undefined>;
    const title = maintainer ? 'Edit Maintainer' : 'Create Maintainer';
    const back = maintainer
        ? maintainerRoutes.show(maintainer.id)
        : maintainerRoutes.index();

    const text = (
        key: 'name' | 'email' | 'phone' | 'password' | 'password_confirmation',
        label: string,
        props: React.ComponentProps<typeof Input> = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={key}>
                {t(label)}
                <span className="text-destructive">*</span>
            </Label>
            <Input
                id={key}
                value={form.data[key]}
                onChange={(e) => form.setData(key, e.target.value)}
                {...props}
            />
            <InputError message={errors[key]} />
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
                        maintainer
                            ? maintainerRoutes.update.form(maintainer.id).action
                            : maintainerRoutes.store().url,
                        { forceFormData: true },
                    );
                }}
            >
                <PageHeader
                    title={title}
                    description={
                        maintainer
                            ? 'Update the maintainer’s details and properties.'
                            : 'Create the maintainer’s login and choose the properties they cover.'
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
                    description="The maintainer signs in with this email."
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {text('name', 'Name')}
                        {text('email', 'Email', { type: 'email' })}
                        {text('phone', 'Phone Number', { type: 'tel' })}
                        <div className="grid gap-2">
                            <Label htmlFor="type_id">
                                {t('Type')}
                                <span className="text-destructive">*</span>
                            </Label>
                            <SelectField
                                id="type_id"
                                required
                                placeholder={t('Select Type')}
                                value={form.data.type_id}
                                onChange={(e) =>
                                    form.setData('type_id', e.target.value)
                                }
                            >
                                {types.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </SelectField>
                            <InputError message={errors.type_id} />
                        </div>
                        {!maintainer && (
                            <>
                                {text('password', 'Password', {
                                    type: 'password',
                                })}
                                {text(
                                    'password_confirmation',
                                    'Confirm Password',
                                    { type: 'password' },
                                )}
                            </>
                        )}
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="photo">{t('Profile Photo')}</Label>
                            <div className="flex items-center gap-4">
                                {maintainer && (
                                    <UserAvatar
                                        name={maintainer.user.name}
                                        src={maintainer.user.avatar}
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
                            <InputError message={errors.photo} />
                        </div>
                    </div>
                </Section>

                <Section
                    title="Properties"
                    description="Requests for these properties can be assigned to this maintainer."
                >
                    {properties.length ? (
                        <div className="grid gap-3 sm:grid-cols-3">
                            {properties.map((property) => (
                                <label
                                    key={property.id}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={form.data.properties.includes(
                                            property.id,
                                        )}
                                        onCheckedChange={(on) =>
                                            form.setData(
                                                'properties',
                                                on === true
                                                    ? [
                                                          ...form.data
                                                              .properties,
                                                          property.id,
                                                      ]
                                                    : form.data.properties.filter(
                                                          (id) =>
                                                              id !==
                                                              property.id,
                                                      ),
                                            )
                                        }
                                    />
                                    {property.name}
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t('None set up yet.')}
                        </p>
                    )}
                    <InputError message={errors.properties} />
                </Section>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                        <Link href={back}>{t('Cancel')}</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing && <Spinner />}
                        {t(maintainer ? 'Save' : 'Create Maintainer')}
                    </Button>
                </div>
            </form>
        </>
    );
}

MaintainerForm.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Maintainers', href: maintainerRoutes.index() },
    ],
};
