import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard, home, login } from '@/routes';
import customPage from '@/routes/custom-page';

export type FooterPage = { title: string; slug: string };

/**
 * Header and footer of the public site (welcome page and custom pages). Used as the page's
 * Inertia layout, so it gets the page props: `pages` are the footer links.
 */
export default function SiteLayout({
    children,
    pages = [],
}: {
    children: ReactNode;
    pages?: FooterPage[];
}) {
    const { auth, globalSettings } = usePage().props;
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
                <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
                    <Link
                        href={home()}
                        className="flex min-w-0 items-center gap-2 font-semibold"
                    >
                        <AppLogoIcon className="size-7 shrink-0 fill-current text-primary" />
                        <span className="truncate">
                            {globalSettings.companyName}
                        </span>
                    </Link>
                    <div className="ms-auto hidden gap-6 text-sm text-muted-foreground md:flex">
                        <a href="/#features" className="hover:text-foreground">
                            {t('Features')}
                        </a>
                        <a href="/#faq" className="hover:text-foreground">
                            {t('FAQ')}
                        </a>
                    </div>
                    <div className="ms-auto flex shrink-0 items-center gap-2 md:ms-0">
                        <LanguageSwitcher />
                        <Button asChild>
                            {auth.user ? (
                                <Link href={dashboard()}>{t('Dashboard')}</Link>
                            ) : (
                                <Link href={login()}>{t('Log in')}</Link>
                            )}
                        </Button>
                    </div>
                </nav>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t py-8 text-sm text-muted-foreground">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
                    <span>
                        © {new Date().getFullYear()}{' '}
                        {globalSettings.companyName}
                    </span>
                    {pages.length > 0 && (
                        <ul className="flex flex-wrap gap-x-6 gap-y-2">
                            {pages.map((page) => (
                                <li key={page.slug}>
                                    <Link
                                        href={customPage.show(page.slug)}
                                        className="hover:text-foreground"
                                    >
                                        {page.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </footer>
        </div>
    );
}
