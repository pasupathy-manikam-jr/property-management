import { Tags } from 'lucide-react';
import { LookupPage } from '@/components/lookup-page';
import type { LookupRecord } from '@/components/lookup-page';
import { dashboard } from '@/routes';
import typeRoutes from '@/routes/types';
import type { Paginated, TableFilters } from '@/types';

// Matches Type::KINDS.
const kinds = [
    { id: 'invoice', name: 'Invoice' },
    { id: 'expense', name: 'Expense' },
    { id: 'maintenance_issue', name: 'Maintenance Issue' },
    { id: 'maintainer_type', name: 'Maintainer Type' },
];

export default function Types({
    types,
    filters,
}: {
    types: Paginated<LookupRecord>;
    filters: TableFilters;
}) {
    return (
        <LookupPage
            records={types}
            filters={filters}
            routes={typeRoutes}
            module="types"
            title="Types"
            description="Categories for invoices, expenses, maintenance issues and maintainer trades."
            singular="Type"
            nameLabel="Title"
            namePlaceholder="e.g., Rent, Plumbing Problems"
            icon={Tags}
            iconClass="bg-accent text-accent-foreground"
            kinds={kinds}
        />
    );
}

Types.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Types', href: typeRoutes.index() },
    ],
};
