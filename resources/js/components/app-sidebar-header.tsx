import { Moon, Sun } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { useTranslation } from '@/hooks/use-translation';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    const { t } = useTranslation();

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ms-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="ms-auto flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                    aria-label={t(isDark ? 'Light mode' : 'Dark mode')}
                    title={t(isDark ? 'Light mode' : 'Dark mode')}
                >
                    {isDark ? <Sun /> : <Moon />}
                </Button>
                <LanguageSwitcher />
            </div>
        </header>
    );
}
