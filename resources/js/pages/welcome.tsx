import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    CloudUpload,
    FileSignature,
    HardHat,
    Home,
    LineChart,
    MapPin,
    Receipt,
    ShieldCheck,
    Users,
    Wallet,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SiteLayout from '@/components/site-layout';
import type { FooterPage } from '@/components/site-layout';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard, login } from '@/routes';

// One management company runs this app: the admin creates every account (staff, tenants, maintainers).
// The copy comes from Website › Home Page (WebsiteController::DEFAULT_HOME until edited) and is
// rendered as plain text. t() translates the default copy and leaves edited text as written.

export type HomeContent = {
    hero_title: string;
    hero_subtitle: string;
    portals: { title: string; items: string[] }[];
    listing_enabled: boolean;
    listing_title: string;
    listing_subtitle: string;
    features_title: string;
    features_subtitle: string;
    features: { title: string; body: string }[];
    benefits_title: string;
    benefits_text: string;
    benefits: string[];
    faq_title: string;
    faq_subtitle: string;
    faqs: { question: string; answer: string }[];
};

type Listing = {
    id: number;
    name: string;
    city: string;
    state: string;
    listing_type: 'rent' | 'sell' | null;
    listing_price: string | null;
    thumbnail: string | null;
};

// Icons by position; edited lists reuse them in turn.
const portalIcons: LucideIcon[] = [Home, HardHat, ShieldCheck];
const featureIcons: LucideIcon[] = [
    Building2,
    Users,
    Receipt,
    Wrench,
    Wallet,
    LineChart,
];
const benefitIcons: LucideIcon[] = [
    ClipboardList,
    CloudUpload,
    FileSignature,
    CalendarClock,
    ShieldCheck,
];
const icon = (icons: LucideIcon[], index: number) =>
    icons[index % icons.length] ?? CheckCircle2;

export default function Welcome({
    content,
    listings,
}: {
    content: HomeContent;
    listings: Listing[];
    pages: FooterPage[];
}) {
    const { auth } = usePage().props;
    const { t } = useTranslation();
    const { money } = useFormat();
    const enter = auth.user ? (
        <Link href={dashboard()}>{t('Dashboard')}</Link>
    ) : (
        <Link href={login()}>{t('Log in')}</Link>
    );

    return (
        <>
            <Head title={t(content.hero_title)} />
            <section className="bg-gradient-to-b from-accent to-background">
                <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                        {t(content.hero_title)}
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg whitespace-pre-line text-muted-foreground">
                        {t(content.hero_subtitle)}
                    </p>
                    <div className="mt-8 flex justify-center">
                        <Button size="lg" asChild>
                            {enter}
                        </Button>
                    </div>
                    {content.portals.length > 0 && (
                        <div className="mt-16 grid gap-6 text-start md:grid-cols-3">
                            {content.portals.map((portal, i) => {
                                const Icon = icon(portalIcons, i);

                                return (
                                    <div
                                        key={i}
                                        className="rounded-xl border bg-card p-6"
                                    >
                                        <Icon className="size-8 text-primary" />
                                        <h2 className="mt-4 font-semibold">
                                            {t(portal.title)}
                                        </h2>
                                        <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                                            {portal.items.map((item, j) => (
                                                <li key={j}>{t(item)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {content.listing_enabled && listings.length > 0 && (
                <section id="listings" className="mx-auto max-w-6xl px-4 py-20">
                    <SectionHeading
                        title={content.listing_title}
                        subtitle={content.listing_subtitle}
                    />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {listings.map((property) => (
                            <article
                                key={property.id}
                                className="overflow-hidden rounded-xl border bg-card"
                            >
                                <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                                    {property.thumbnail ? (
                                        <img
                                            src={property.thumbnail}
                                            alt={property.name}
                                            loading="lazy"
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <Building2 className="size-12 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="grid gap-2 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="font-semibold">
                                            {property.name}
                                        </h3>
                                        {property.listing_type && (
                                            <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                                                {t(
                                                    property.listing_type ===
                                                        'sell'
                                                        ? 'For Sale'
                                                        : 'For Rent',
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <MapPin className="size-4 shrink-0" />
                                        {[property.city, property.state]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                    {property.listing_price !== null && (
                                        <p className="text-lg font-semibold text-primary">
                                            {money(
                                                Number(property.listing_price),
                                            )}
                                        </p>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {content.features.length > 0 && (
                <section id="features" className="bg-muted/40 py-20">
                    <div className="mx-auto max-w-6xl px-4">
                        <SectionHeading
                            title={content.features_title}
                            subtitle={content.features_subtitle}
                        />
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {content.features.map((feature, i) => {
                                const Icon = icon(featureIcons, i);

                                return (
                                    <div
                                        key={i}
                                        className="rounded-xl border bg-card p-6"
                                    >
                                        <Icon className="size-8 text-primary" />
                                        <h3 className="mt-4 font-semibold">
                                            {t(feature.title)}
                                        </h3>
                                        <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                                            {t(feature.body)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
                <div>
                    <h2 className="text-3xl font-bold">
                        {t(content.benefits_title)}
                    </h2>
                    {content.benefits_text && (
                        <p className="mt-4 whitespace-pre-line text-muted-foreground">
                            {t(content.benefits_text)}
                        </p>
                    )}
                </div>
                <ul className="space-y-4">
                    {content.benefits.map((text, i) => {
                        const Icon = icon(benefitIcons, i);

                        return (
                            <li key={i} className="flex items-start gap-3">
                                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                                <span>{t(text)}</span>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {content.faqs.length > 0 && (
                <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
                    <SectionHeading
                        title={content.faq_title}
                        subtitle={content.faq_subtitle}
                    />
                    <div className="divide-y rounded-xl border">
                        {content.faqs.map((faq, i) => (
                            <details key={i} className="group p-5">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                                    {t(faq.question)}
                                    <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
                                </summary>
                                <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">
                                    {t(faq.answer)}
                                </p>
                            </details>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}

Welcome.layout = SiteLayout;

function SectionHeading({
    title,
    subtitle,
}: {
    title: string;
    subtitle: string;
}) {
    const { t } = useTranslation();

    return (
        <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold">{t(title)}</h2>
            {subtitle && (
                <p className="mt-3 whitespace-pre-line text-muted-foreground">
                    {t(subtitle)}
                </p>
            )}
        </div>
    );
}
