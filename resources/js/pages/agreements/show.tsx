import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleCheck,
    Paperclip,
    Printer,
    SquarePen,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import agreementRoutes from '@/routes/agreements';

type Agreement = {
    id: number;
    number: string;
    tenant_id: number;
    start_date: string;
    end_date: string;
    status: string;
    terms: string;
    description: string | null;
    file_name: string | null;
    created_at: string;
    unit: {
        name: string;
        rent: string;
        rent_type: string;
        deposit_type: 'fixed' | 'percentage';
        deposit_amount: string;
        property: {
            name: string;
            address: string;
            city: string;
            state: string;
            zip_code: string;
            country: string;
        };
    };
    tenant: { user: { name: string; email: string; phone: string | null } };
};

type Company = {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
};

// Print only the document, not the app shell around it.
const PRINT_CSS = `@media print {
    body * { visibility: hidden; }
    #agreement-document, #agreement-document * { visibility: visible; }
    #agreement-document { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0; box-shadow: none; }
}`;

function Party({
    title,
    rows,
}: {
    title: string;
    rows: [string, ReactNode][];
}) {
    const { t } = useTranslation();

    return (
        <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">{t(title)}</h3>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                {rows.map(([label, value]) => (
                    <div key={label} className="contents">
                        <dt className="text-muted-foreground">{t(label)}</dt>
                        <dd className="font-medium break-words">
                            {value || '-'}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export default function ShowAgreement({
    agreement,
    company,
    canConfirm,
}: {
    agreement: Agreement;
    company: Company;
    /** The signed-in tenant may accept this pending agreement. */
    canConfirm: boolean;
}) {
    const { t } = useTranslation();
    const { date, money } = useFormat();
    const can = useCan();
    const unit = agreement.unit;
    const property = unit.property;
    const deposit =
        unit.deposit_type === 'percentage'
            ? (Number(unit.rent) * Number(unit.deposit_amount)) / 100
            : Number(unit.deposit_amount);
    const rentType = t(
        unit.rent_type.charAt(0).toUpperCase() + unit.rent_type.slice(1),
    );

    return (
        <>
            <Head title={agreement.number} />
            <style>{PRINT_CSS}</style>
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={agreement.number}
                    description="Rental agreement"
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild>
                                <Link href={agreementRoutes.index()}>
                                    <ArrowLeft className="rtl:rotate-180" />{' '}
                                    {t('Back')}
                                </Link>
                            </Button>
                            {agreement.file_name && (
                                <Button variant="outline" asChild>
                                    <a
                                        href={
                                            agreementRoutes.document(
                                                agreement.id,
                                            ).url
                                        }
                                    >
                                        <Paperclip /> {t('Attachment')}
                                    </a>
                                </Button>
                            )}
                            {can('edit-agreements') && (
                                <Button variant="outline" asChild>
                                    <Link
                                        href={agreementRoutes.edit(
                                            agreement.id,
                                        )}
                                    >
                                        <SquarePen /> {t('Edit')}
                                    </Link>
                                </Button>
                            )}
                            {canConfirm && (
                                <Button
                                    onClick={() =>
                                        router.post(
                                            agreementRoutes.confirm(
                                                agreement.id,
                                            ),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <CircleCheck /> {t('Confirm Agreement')}
                                </Button>
                            )}
                            <Button onClick={() => window.print()}>
                                <Printer /> {t('Print')}
                            </Button>
                        </div>
                    }
                />

                <article
                    id="agreement-document"
                    className="mx-auto grid w-full max-w-4xl gap-8 rounded-xl border bg-card p-6 text-card-foreground shadow-sm md:p-10"
                >
                    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
                        <div>
                            <h2 className="text-2xl font-bold">
                                {t('Rental Agreement')}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t(
                                    'This agreement is made on :date between the Landlord and Tenant under the terms mentioned below.',
                                    { date: date(agreement.created_at) },
                                )}
                            </p>
                        </div>
                        <div className="text-end">
                            <div className="font-mono text-lg font-semibold">
                                {agreement.number}
                            </div>
                            <div className="mt-1">
                                <StatusBadge status={agreement.status} />
                            </div>
                        </div>
                    </header>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Party
                            title="Landlord"
                            rows={[
                                ['Company', company.companyName],
                                ['Address', company.companyAddress],
                                ['Phone', company.companyPhone],
                                ['Email', company.companyEmail],
                            ]}
                        />
                        <Party
                            title="Tenant"
                            rows={[
                                ['Name', agreement.tenant.user.name],
                                ['Phone', agreement.tenant.user.phone],
                                ['Email', agreement.tenant.user.email],
                            ]}
                        />
                        <Party
                            title="Property"
                            rows={[
                                ['Property', property.name],
                                ['Unit', unit.name],
                                [
                                    'Address',
                                    [
                                        property.address,
                                        property.city,
                                        `${property.zip_code} ${property.state}`,
                                        property.country,
                                    ].join(', '),
                                ],
                            ]}
                        />
                        <Party
                            title="Rent & Term"
                            rows={[
                                [
                                    'Rent',
                                    `${money(Number(unit.rent))} / ${rentType}`,
                                ],
                                ['Security Deposit', money(deposit)],
                                ['Start Date', date(agreement.start_date)],
                                ['End Date', date(agreement.end_date)],
                            ]}
                        />
                    </div>

                    <section>
                        <h3 className="mb-2 font-semibold">
                            {t('Terms & Conditions')}
                        </h3>
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                            {agreement.terms}
                        </p>
                    </section>

                    {agreement.description && (
                        <section>
                            <h3 className="mb-2 font-semibold">
                                {t('Description')}
                            </h3>
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                                {agreement.description}
                            </p>
                        </section>
                    )}

                    <footer className="grid gap-10 pt-8 sm:grid-cols-2">
                        {[
                            [
                                company.companyName,
                                'Landlord / Authorised Signatory',
                            ],
                            [agreement.tenant.user.name, 'Tenant'],
                        ].map(([name, role]) => (
                            <div key={role}>
                                <div className="h-16 border-b border-dashed" />
                                <div className="mt-2 font-medium">{name}</div>
                                <div className="text-sm text-muted-foreground">
                                    {t(role)}
                                </div>
                            </div>
                        ))}
                    </footer>
                </article>
            </div>
        </>
    );
}

ShowAgreement.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Agreements', href: agreementRoutes.index() },
    ],
};
