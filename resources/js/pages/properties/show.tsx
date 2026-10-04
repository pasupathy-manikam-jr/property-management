import { Head, Link, router } from '@inertiajs/react';
import {
    Bath,
    BedDouble,
    Building2,
    CookingPot,
    DoorOpen,
    MapPin,
    Plus,
    SquarePen,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
    DetailPage,
    Fields,
    RecordList,
    Summary,
    SummaryIcon,
    TextBlock,
} from '@/components/detail-page';
import { IdBadge } from '@/components/table-cells';
import { UnitDialog } from '@/components/unit-fields';
import type { Unit } from '@/components/unit-fields';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { propertyTypeLabel } from '@/lib/labels';
import { dashboard } from '@/routes';
import propertyRoutes from '@/routes/properties';
import unitRoutes from '@/routes/units';

type Feature = { id: number; name: string; description: string | null };

type Property = {
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
    amenities: Feature[];
    advantages: Feature[];
};

type PropertyExpense = {
    id: number;
    number: string;
    title: string;
    date: string;
    amount: string;
    type: { id: number; name: string } | null;
    unit: { id: number; name: string } | null;
};

export default function ShowProperty({
    property,
    units,
    expenses,
}: {
    property: Property;
    units: Unit[];
    expenses: PropertyExpense[];
}) {
    const { t } = useTranslation();
    const { date, money } = useFormat();
    const can = useCan();
    const [unitDialog, setUnitDialog] = useState<{ unit: Unit | null } | null>(
        null,
    );
    const [deleting, setDeleting] = useState<Unit | null>(null);
    const amount = (type: string, value: string) =>
        type === 'percentage' ? `${Number(value)}%` : money(Number(value));

    const features = (items: Feature[], empty: string) => (
        <RecordList
            items={items}
            empty={empty}
            render={(item) => (
                <div>
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                        <div className="text-sm text-muted-foreground">
                            {item.description}
                        </div>
                    )}
                </div>
            )}
        />
    );

    return (
        <>
            <Head title={property.name} />
            <DetailPage
                title={property.name}
                description="Property details, units, amenities and advantages."
                back={propertyRoutes.index()}
                summary={
                    <Summary
                        media={
                            property.thumbnail ? (
                                <img
                                    src={property.thumbnail}
                                    alt={property.name}
                                    className="aspect-video w-full rounded-lg object-cover"
                                />
                            ) : (
                                <SummaryIcon icon={Building2} />
                            )
                        }
                        title={property.name}
                        status={propertyTypeLabel[property.type]}
                        facts={[
                            [
                                MapPin,
                                [
                                    property.address,
                                    property.city,
                                    property.state,
                                    property.zip_code,
                                    property.country,
                                ].join(', '),
                            ],
                            [
                                DoorOpen,
                                t(':count units', { count: units.length }),
                            ],
                        ]}
                    />
                }
                tabs={[
                    {
                        label: 'Details',
                        heading: 'Property Details',
                        content: (
                            <div className="grid gap-6">
                                <Fields
                                    items={[
                                        [
                                            'Type',
                                            t(propertyTypeLabel[property.type]),
                                        ],
                                        ['Address', property.address],
                                        ['City', property.city],
                                        ['State', property.state],
                                        ['Zip Code', property.zip_code],
                                        ['Country', property.country],
                                        [
                                            'Listed on Website',
                                            t(
                                                property.display_in_listing
                                                    ? 'Yes'
                                                    : 'No',
                                            ),
                                        ],
                                        [
                                            'Listing',
                                            property.display_in_listing &&
                                                property.listing_price &&
                                                `${t(property.listing_type === 'sell' ? 'Sell' : 'Rent')} · ${money(Number(property.listing_price))}`,
                                        ],
                                    ]}
                                />
                                <TextBlock
                                    label="Description"
                                    value={property.description}
                                />
                                {can('edit-properties') && (
                                    <div>
                                        <Button variant="outline" asChild>
                                            <Link
                                                href={propertyRoutes.edit(
                                                    property.id,
                                                )}
                                            >
                                                <SquarePen />{' '}
                                                {t('Edit Property')}
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ),
                    },
                    {
                        label: 'Units',
                        heading: 'Property Units',
                        content: (
                            <div className="grid gap-4">
                                {can('create-units') && (
                                    <div>
                                        <Button
                                            onClick={() =>
                                                setUnitDialog({ unit: null })
                                            }
                                        >
                                            <Plus /> {t('Add Unit')}
                                        </Button>
                                    </div>
                                )}
                                <RecordList
                                    items={units}
                                    empty="No units yet"
                                    render={(unit) => (
                                        <>
                                            <div className="grid gap-1">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <IdBadge>
                                                        {unit.name}
                                                    </IdBadge>
                                                    {money(Number(unit.rent))}
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        /{' '}
                                                        {t(
                                                            unit.rent_type ===
                                                                'custom'
                                                                ? ':days days'
                                                                : unit.rent_type ===
                                                                    'yearly'
                                                                  ? 'Yearly'
                                                                  : 'Monthly',
                                                            {
                                                                days:
                                                                    unit.rent_duration ??
                                                                    0,
                                                            },
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <BedDouble className="size-4" />
                                                        {unit.bedroom}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <CookingPot className="size-4" />
                                                        {unit.kitchen}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Bath className="size-4" />
                                                        {unit.baths}
                                                    </span>
                                                    <span>
                                                        {t('Deposit')}:{' '}
                                                        {amount(
                                                            unit.deposit_type,
                                                            unit.deposit_amount,
                                                        )}
                                                    </span>
                                                    <span>
                                                        {t('Late Fee')}:{' '}
                                                        {amount(
                                                            unit.late_fee_type,
                                                            unit.late_fee_amount,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex">
                                                {can('edit-units') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={t('Edit')}
                                                        onClick={() =>
                                                            setUnitDialog({
                                                                unit,
                                                            })
                                                        }
                                                    >
                                                        <SquarePen />
                                                    </Button>
                                                )}
                                                {can('delete-units') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={t('Delete')}
                                                        onClick={() =>
                                                            setDeleting(unit)
                                                        }
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                />
                            </div>
                        ),
                    },
                    {
                        label: 'Amenities',
                        content: features(
                            property.amenities,
                            'No amenities selected',
                        ),
                    },
                    {
                        label: 'Advantages',
                        content: features(
                            property.advantages,
                            'No advantages selected',
                        ),
                    },
                    ...(can('manage-expenses')
                        ? [
                              {
                                  label: 'Expenses',
                                  content: (
                                      <RecordList
                                          items={expenses}
                                          empty="No expenses yet"
                                          render={(expense) => (
                                              <>
                                                  <div className="grid gap-1">
                                                      <div className="flex flex-wrap items-center gap-2 font-medium">
                                                          <IdBadge>
                                                              {expense.number}
                                                          </IdBadge>
                                                          {expense.title}
                                                      </div>
                                                      <div className="text-sm text-muted-foreground">
                                                          {[
                                                              expense.type
                                                                  ?.name,
                                                              expense.unit
                                                                  ?.name ??
                                                                  t(
                                                                      'Whole property',
                                                                  ),
                                                              date(
                                                                  expense.date,
                                                              ),
                                                          ]
                                                              .filter(Boolean)
                                                              .join(' · ')}
                                                      </div>
                                                  </div>
                                                  <span className="font-semibold whitespace-nowrap">
                                                      {money(
                                                          Number(
                                                              expense.amount,
                                                          ),
                                                      )}
                                                  </span>
                                              </>
                                          )}
                                      />
                                  ),
                              },
                          ]
                        : []),
                ]}
            />

            <UnitDialog
                open={unitDialog !== null}
                onOpenChange={(open) => !open && setUnitDialog(null)}
                unit={unitDialog?.unit ?? null}
                propertyId={property.id}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                description="This unit will be permanently deleted."
                onConfirm={() =>
                    deleting &&
                    router.delete(unitRoutes.destroy(deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
            />
        </>
    );
}

ShowProperty.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Properties', href: propertyRoutes.index() },
    ],
};
