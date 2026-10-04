import {
    BadgeCheck,
    Building2,
    CalendarDays,
    ChartColumn,
    Contact,
    FileSignature,
    Globe,
    HardHat,
    LayoutGrid,
    LifeBuoy,
    Mail,
    Megaphone,
    NotebookTabs,
    Settings,
    Sparkles,
    Tags,
    UserCog,
    Wallet,
    Wrench,
} from 'lucide-react';
import { dashboard, userManual } from '@/routes';
import advantages from '@/routes/advantages';
import agreements from '@/routes/agreements';
import amenities from '@/routes/amenities';
import calendar from '@/routes/calendar';
import companySettings from '@/routes/company-settings';
import contacts from '@/routes/contacts';
import expenses from '@/routes/expenses';
import invoices from '@/routes/invoices';
import loginHistory from '@/routes/login-history';
import maintainers from '@/routes/maintainers';
import maintenanceRequests from '@/routes/maintenance-requests';
import notes from '@/routes/notes';
import notifications from '@/routes/notifications';
import properties from '@/routes/properties';
import reports from '@/routes/reports';
import roles from '@/routes/roles';
import tenants from '@/routes/tenants';
import types from '@/routes/types';
import units from '@/routes/units';
import users from '@/routes/users';
import website from '@/routes/website';
import type { NavSection } from '@/types';

// Mirrors the demo owner's sidebar (routes/app.php lists the same modules). Each entry
// carries the permission its route requires; NavMain hides the rest.
export const navigation: NavSection[] = [
    {
        title: 'Overview',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                permission: 'manage-dashboard',
                icon: LayoutGrid,
            },
            {
                title: 'Staff Management',
                icon: UserCog,
                children: [
                    {
                        title: 'Users',
                        href: users.index(),
                        permission: 'manage-users',
                    },
                    {
                        title: 'Roles',
                        href: roles.index(),
                        permission: 'manage-roles',
                    },
                    {
                        title: 'Logged History',
                        href: loginHistory.index(),
                        permission: 'manage-login-history',
                    },
                ],
            },
        ],
    },
    {
        title: 'Property Management',
        items: [
            {
                title: 'Tenants',
                href: tenants.index(),
                permission: 'manage-tenants',
                icon: Contact,
            },
            {
                title: 'Maintainers',
                href: maintainers.index(),
                permission: 'manage-maintainers',
                icon: HardHat,
            },
            {
                title: 'Real Estate',
                icon: Building2,
                children: [
                    {
                        title: 'Properties',
                        href: properties.index(),
                        permission: 'manage-properties',
                    },
                    {
                        title: 'Units',
                        href: units.index(),
                        permission: 'manage-units',
                    },
                ],
            },
            {
                title: 'Maintenance',
                icon: Wrench,
                children: [
                    {
                        title: 'All Requests',
                        href: maintenanceRequests.index(),
                        permission: 'manage-maintenance-requests',
                    },
                    {
                        title: 'Pending',
                        href: maintenanceRequests.index({
                            query: { status: 'pending' },
                        }),
                        permission: 'manage-maintenance-requests',
                    },
                    {
                        title: 'In Progress',
                        href: maintenanceRequests.index({
                            query: { status: 'in_progress' },
                        }),
                        permission: 'manage-maintenance-requests',
                    },
                ],
            },
            {
                title: 'Finance',
                icon: Wallet,
                children: [
                    {
                        title: 'Invoices',
                        href: invoices.index(),
                        permission: 'manage-invoices',
                    },
                    {
                        title: 'Expense',
                        href: expenses.index(),
                        permission: 'manage-expenses',
                    },
                ],
            },
            {
                title: 'Calendar',
                href: calendar.index(),
                permission: 'manage-calendar',
                icon: CalendarDays,
            },
            {
                title: 'Agreement',
                href: agreements.index(),
                permission: 'manage-agreements',
                icon: FileSignature,
            },
            {
                title: 'Reports',
                icon: ChartColumn,
                children: [
                    {
                        title: 'Income',
                        href: reports.income(),
                        permission: 'manage-income-report',
                    },
                    {
                        title: 'Expense',
                        href: reports.expense(),
                        permission: 'manage-expense-report',
                    },
                    {
                        title: 'Profit & Loss',
                        href: reports.profitLoss(),
                        permission: 'manage-profit-loss-report',
                    },
                    {
                        title: 'Property Unit',
                        href: reports.propertyUnit(),
                        permission: 'manage-property-unit-report',
                    },
                    {
                        title: 'Tenant History',
                        href: reports.tenantHistory(),
                        permission: 'manage-tenant-history-report',
                    },
                    {
                        title: 'Maintenance',
                        href: reports.maintenance(),
                        permission: 'manage-maintenance-report',
                    },
                ],
            },
        ],
    },
    {
        title: 'Communication',
        items: [
            {
                title: 'Contact Diary',
                href: contacts.index(),
                permission: 'manage-contacts',
                icon: NotebookTabs,
            },
            {
                title: 'Notice Board',
                href: notes.index(),
                permission: 'manage-notes',
                icon: Megaphone,
            },
        ],
    },
    {
        title: 'System Setup',
        items: [
            {
                title: 'Types',
                href: types.index(),
                permission: 'manage-types',
                icon: Tags,
            },
            {
                title: 'Property Amenity',
                href: amenities.index(),
                permission: 'manage-amenities',
                icon: Sparkles,
            },
            {
                title: 'Property Advantages',
                href: advantages.index(),
                permission: 'manage-advantages',
                icon: BadgeCheck,
            },
            {
                title: 'Email Notification',
                href: notifications.index(),
                permission: 'manage-notifications',
                icon: Mail,
            },
            {
                title: 'Frontend Manager',
                icon: Globe,
                children: [
                    {
                        title: 'Home Page',
                        href: website.home(),
                        permission: 'manage-website',
                    },
                    {
                        title: 'Additional',
                        href: website.additional(),
                        permission: 'manage-website',
                    },
                ],
            },
            {
                title: 'Settings',
                href: companySettings.index(),
                permission: 'manage-settings',
                icon: Settings,
            },
            {
                title: 'User Manual',
                href: userManual(),
                icon: LifeBuoy,
            },
        ],
    },
];
