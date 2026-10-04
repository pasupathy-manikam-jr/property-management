import { BadgeCheck } from 'lucide-react';
import { LookupPage } from '@/components/lookup-page';
import type { LookupRecord } from '@/components/lookup-page';
import { dashboard } from '@/routes';
import advantageRoutes from '@/routes/advantages';
import type { Paginated, TableFilters } from '@/types';

export default function Advantages({
    advantages,
    filters,
}: {
    advantages: Paginated<LookupRecord>;
    filters: TableFilters;
}) {
    return (
        <LookupPage
            records={advantages}
            filters={filters}
            routes={advantageRoutes}
            module="advantages"
            title="Property Advantages"
            description="Selling points shown on a property, such as 24/7 security."
            singular="Advantage"
            nameLabel="Advantage Name"
            namePlaceholder="e.g., 24/7 Security, Pet allowed"
            icon={BadgeCheck}
            iconClass="bg-accent text-accent-foreground"
        />
    );
}

Advantages.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Property Advantages', href: advantageRoutes.index() },
    ],
};
