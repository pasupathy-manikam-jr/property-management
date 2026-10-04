// A tenant as listed: login account plus the current lease, if any.
export type TenantRow = {
    id: number;
    family_member: number;
    user: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
        avatar: string | null;
    };
    active_lease: {
        id: number;
        unit_id: number;
        start_date: string;
        end_date: string;
        unit: {
            id: number;
            name: string;
            property_id: number;
            property: { id: number; name: string };
        };
    } | null;
};
