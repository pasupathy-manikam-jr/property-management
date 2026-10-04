import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { blankUnit, UnitFields } from '@/components/unit-fields';
import type { UnitData } from '@/components/unit-fields';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import propertyRoutes from '@/routes/properties';

type Option = { id: number; name: string };

type EditableProperty = {
    id: number;
    type: 'own' | 'lease';
    name: string;
    description: string | null;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    thumbnail: string | null;
    display_in_listing: boolean;
    listing_type: 'rent' | 'sell' | null;
    listing_price: string | null;
    amenities: number[];
    advantages: number[];
};

const TEXT_FIELDS = [
    ['name', 'Name'],
    ['address', 'Address'],
    ['city', 'City'],
    ['state', 'State'],
    ['zip_code', 'Zip Code'],
    ['country', 'Country'],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
    const { t } = useTranslation();

    return (
        <section className="grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold">{t(title)}</h2>
            {children}
        </section>
    );
}

export default function PropertyForm({
    property,
    amenities,
    advantages,
}: {
    property: EditableProperty | null;
    amenities: Option[];
    advantages: Option[];
}) {
    const { t } = useTranslation();
    const form = useForm({
        type: property?.type ?? '',
        name: property?.name ?? '',
        description: property?.description ?? '',
        address: property?.address ?? '',
        city: property?.city ?? '',
        state: property?.state ?? '',
        zip_code: property?.zip_code ?? '',
        country: property?.country ?? 'Malaysia',
        thumbnail: null as File | null,
        amenities: property?.amenities ?? [],
        advantages: property?.advantages ?? [],
        display_in_listing: property?.display_in_listing ?? false,
        listing_type: property?.listing_type ?? 'rent',
        listing_price: property?.listing_price ?? '',
        unit: blankUnit,
    });
    const title = property ? 'Edit Property' : 'Create Property';
    const back = property
        ? propertyRoutes.show(property.id)
        : propertyRoutes.index();

    const errors = form.errors as Record<string, string | undefined>;
    const unitErrors = Object.fromEntries(
        Object.entries(errors)
            .filter(([key]) => key.startsWith('unit.'))
            .map(([key, message]) => [key.slice(5), message]),
    ) as Partial<Record<keyof UnitData, string>>;

    const toggle = (key: 'amenities' | 'advantages', id: number, on: boolean) =>
        form.setData(
            key,
            on
                ? [...form.data[key], id]
                : form.data[key].filter((value) => value !== id),
        );

    const checklist = (key: 'amenities' | 'advantages', options: Option[]) =>
        options.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
                {options.map((option) => (
                    <label
                        key={option.id}
                        className="flex items-center gap-2 text-sm"
                    >
                        <Checkbox
                            checked={form.data[key].includes(option.id)}
                            onCheckedChange={(on) =>
                                toggle(key, option.id, on === true)
                            }
                        />
                        {option.name}
                    </label>
                ))}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground">
                {t('None set up yet.')}
            </p>
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
                        property
                            ? propertyRoutes.update.form(property.id).action
                            : propertyRoutes.store().url,
                        { forceFormData: true },
                    );
                }}
            >
                <PageHeader
                    title={title}
                    description="Property details, amenities and listing."
                    action={
                        <Button variant="outline" asChild>
                            <Link href={back}>
                                <ArrowLeft className="rtl:rotate-180" />{' '}
                                {t('Back')}
                            </Link>
                        </Button>
                    }
                />

                <Section title="Property Details">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="type">
                                {t('Type')}
                                <span className="text-destructive">*</span>
                            </Label>
                            <SelectField
                                id="type"
                                value={form.data.type}
                                onChange={(e) =>
                                    form.setData(
                                        'type',
                                        e.target.value as 'own' | 'lease',
                                    )
                                }
                            >
                                <option value="">{t('Select Type')}</option>
                                <option value="own">{t('Own Property')}</option>
                                <option value="lease">
                                    {t('Lease Property')}
                                </option>
                            </SelectField>
                            <InputError message={errors.type} />
                        </div>
                        {TEXT_FIELDS.map(([key, label]) => (
                            <div key={key} className="grid gap-2">
                                <Label htmlFor={key}>
                                    {t(label)}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id={key}
                                    required
                                    value={form.data[key]}
                                    onChange={(e) =>
                                        form.setData(key, e.target.value)
                                    }
                                />
                                <InputError message={errors[key]} />
                            </div>
                        ))}
                        <div className="grid gap-2">
                            <Label htmlFor="thumbnail">
                                {t('Thumbnail Image')}
                            </Label>
                            <Input
                                id="thumbnail"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(e) =>
                                    form.setData(
                                        'thumbnail',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                            />
                            {property?.thumbnail && (
                                <img
                                    src={property.thumbnail}
                                    alt=""
                                    className="h-20 w-32 rounded-md object-cover"
                                />
                            )}
                            <InputError message={errors.thumbnail} />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="description">
                                {t('Description')}
                            </Label>
                            <textarea
                                id="description"
                                rows={4}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                                value={form.data.description}
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                            />
                            <InputError message={errors.description} />
                        </div>
                    </div>
                </Section>

                {!property && (
                    <Section title="First Unit">
                        <UnitFields
                            data={form.data.unit}
                            onChange={(key, value) =>
                                form.setData('unit', {
                                    ...form.data.unit,
                                    [key]: value,
                                })
                            }
                            errors={unitErrors}
                        />
                    </Section>
                )}

                <Section title="Amenities">
                    {checklist('amenities', amenities)}
                </Section>

                <Section title="Advantages">
                    {checklist('advantages', advantages)}
                </Section>

                <Section title="Listing">
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={form.data.display_in_listing}
                            onCheckedChange={(on) =>
                                form.setData('display_in_listing', on === true)
                            }
                        />
                        {t('Show this property on the public website')}
                    </label>
                    {form.data.display_in_listing && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="listing_type">
                                    {t('Listing Type')}
                                </Label>
                                <SelectField
                                    id="listing_type"
                                    value={form.data.listing_type}
                                    onChange={(e) =>
                                        form.setData(
                                            'listing_type',
                                            e.target.value as 'rent' | 'sell',
                                        )
                                    }
                                >
                                    <option value="rent">{t('Rent')}</option>
                                    <option value="sell">{t('Sell')}</option>
                                </SelectField>
                                <InputError message={errors.listing_type} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="listing_price">
                                    {t('Price')}
                                </Label>
                                <Input
                                    id="listing_price"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.data.listing_price}
                                    onChange={(e) =>
                                        form.setData(
                                            'listing_price',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError message={errors.listing_price} />
                            </div>
                        </div>
                    )}
                </Section>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                        <Link href={back}>{t('Cancel')}</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing && <Spinner />}
                        {t(property ? 'Save' : 'Create Property')}
                    </Button>
                </div>
            </form>
        </>
    );
}

PropertyForm.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Properties', href: propertyRoutes.index() },
    ],
};
