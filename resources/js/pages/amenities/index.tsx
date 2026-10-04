import { Sparkles } from 'lucide-react';
import { LookupPage } from '@/components/lookup-page';
import type { LookupRecord } from '@/components/lookup-page';
import { dashboard } from '@/routes';
import amenityRoutes from '@/routes/amenities';
import type { Paginated, TableFilters } from '@/types';

export default function Amenities({
    amenities,
    filters,
}: {
    amenities: Paginated<LookupRecord>;
    filters: TableFilters;
}) {
    return (
        <LookupPage
            records={amenities}
            filters={filters}
            routes={amenityRoutes}
            module="amenities"
            title="Property Amenities"
            description="Facilities a property offers, such as a gym or swimming pool."
            singular="Amenity"
            nameLabel="Amenity Name"
            namePlaceholder="e.g., Gym, Swimming Pool"
            icon={Sparkles}
            iconClass="bg-accent text-accent-foreground"
        />
    );
}

Amenities.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Property Amenities', href: amenityRoutes.index() },
    ],
};
