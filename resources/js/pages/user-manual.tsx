import { Head } from '@inertiajs/react';
import {
    BookOpen,
    Building2,
    ChartColumn,
    Contact,
    FileSignature,
    Globe,
    HardHat,
    Home,
    LifeBuoy,
    Megaphone,
    Rocket,
    Settings,
    Wallet,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard, userManual } from '@/routes';

/** A topic's explanation, optionally followed by numbered steps. */
type Topic = { title: string; body: string; steps?: string[] };

type Chapter = {
    id: string;
    title: string;
    icon: LucideIcon;
    intro: string;
    topics: Topic[];
};

/**
 * The user guide. Everyone who can sign in may read it; each chapter notes which role usually
 * does the work, and menus a user lacks permission for are simply hidden from their sidebar.
 */
const CHAPTERS: Chapter[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Rocket,
        intro: 'How to sign in, find your way around and set up your own account.',
        topics: [
            {
                title: 'Signing in',
                body: 'Open the system in your browser and sign in with the email and password the management office gave you. There is no public sign-up: the admin creates every account. Use “Forgot password?” on the sign-in page to set a new password by email.',
            },
            {
                title: 'Roles',
                body: 'Admin manages everything, including roles, settings and reports. Manager runs the day-to-day work: properties, tenants, invoices, expenses and maintenance. Tenant sees their own home, invoices, repair requests and agreement. Maintainer sees only the repair jobs assigned to them. Menus you are not allowed to use do not appear in your sidebar.',
            },
            {
                title: 'Finding your way',
                body: 'The sidebar groups every module the same way as the menu: Overview, Property Management, Communication and System Setup. Groups with an arrow open to show their pages, and “Search menu…” at the top finds any page by name. Your dashboard is the first page after signing in.',
            },
            {
                title: 'Language and appearance',
                body: 'Use the language button at the top right of every page to switch between English, Bahasa Melayu and 中文; your choice is remembered and emails are sent to you in it. The moon/sun button next to it switches between dark and light mode.',
            },
            {
                title: 'Your profile and security',
                body: 'Open the menu under your name (bottom of the sidebar) to update your name, email and password, add a passkey or turn on two-factor authentication.',
            },
        ],
    },
    {
        id: 'setup',
        title: 'Setting Up the System',
        icon: Settings,
        intro: 'Do this once before adding properties and tenants. Usually done by the Admin.',
        topics: [
            {
                title: 'Company settings',
                body: 'System Setup → Settings holds your company name, address and tax details (printed on invoices and agreements), the number prefixes for invoices, expenses and agreements, the date, time and currency formats, the email (SMTP) server and the default agreement terms. Use “Send Test Email” after saving the email settings.',
            },
            {
                title: 'Types',
                body: 'System Setup → Types lists the choices used in forms: invoice item types (Rent, Utility, Late Fee…), expense types, maintenance issue types and maintainer trades. Add your own and switch off any you don’t use.',
            },
            {
                title: 'Amenities and advantages',
                body: 'Property Amenity (gym, pool, lift…) and Property Advantages (24/7 security, pets allowed…) are ticked on each property and shown on its page and the public listing.',
            },
            {
                title: 'Email notifications',
                body: 'System Setup → Email Notification has one template per event: tenant or maintainer created, maintenance request created or completed, invoice created, payment reminder and payment received. Edit the subject and message in each language, use the listed placeholders such as {tenant_name} or {amount}, and switch any email off.',
            },
            {
                title: 'Staff and roles',
                body: 'Staff Management → Users adds staff logins (tenants and maintainers are added in their own modules). Roles lets you create roles such as “Accounts” and tick exactly which permissions they have. The Admin role cannot be edited, so nobody can lock the company out. Logged History shows every sign-in.',
                steps: [
                    'Open Staff Management → Roles and click Add Role.',
                    'Name the role and tick its permissions, grouped by module.',
                    'Open Staff Management → Users, click Add User and give the user that role.',
                ],
            },
        ],
    },
    {
        id: 'properties',
        title: 'Properties & Units',
        icon: Building2,
        intro: 'Every building or plot you manage, and the rentable units inside it.',
        topics: [
            {
                title: 'Adding a property',
                body: 'A property is either owned or leased. Its first unit is created together with it.',
                steps: [
                    'Open Real Estate → Properties and click Create Property.',
                    'Choose Own or Lease, enter the name, address and a description, and upload a photo.',
                    'Fill in the first unit: name, rooms, rent and its terms.',
                    'Tick its amenities and advantages, and tick “Show this property on the public website” to list it for rent or sale with a price.',
                    'Click Create Property. You land on the property’s page.',
                ],
            },
            {
                title: 'Units and their terms',
                body: 'Each unit has bedrooms, kitchen and baths, a rent that is monthly, yearly or for a custom number of days, a deposit and a late fee (each fixed or a percentage), an incident receipt amount and a payment due date. Add more units from the property page (Units tab → Add Unit) or from Real Estate → Units.',
            },
            {
                title: 'Occupancy',
                body: 'A unit is occupied while it has an active lease and vacant otherwise. Property cards show the units, occupied and vacant counts, and Real Estate → Units can be filtered by status. Properties and units with tenancy history can’t be deleted, so records are never lost.',
            },
        ],
    },
    {
        id: 'tenants',
        title: 'Tenants & Leases',
        icon: Contact,
        intro: 'Moving tenants in, renewing their leases and moving them out.',
        topics: [
            {
                title: 'Adding a tenant',
                body: 'Creating a tenant also creates their login and moves them into a vacant unit.',
                steps: [
                    'Open Tenants and click Create Tenant.',
                    'Enter their name, email, phone number, family members and a password for their login, and optionally a photo.',
                    'Enter their address.',
                    'Choose the property and a vacant unit (occupied units can’t be picked) and the lease start and end dates.',
                    'Click Create Tenant. They receive a welcome email if that notification is switched on.',
                ],
            },
            {
                title: 'Renewing a lease',
                body: 'Click the renew icon on a tenant card, or Renew Lease on the tenant’s page. Choose the same unit or a different one and the new dates. The old lease is kept in the history as “renewed”.',
            },
            {
                title: 'Moving a tenant out',
                body: 'On the tenant’s page click Exit Tenant and enter the exit date, the exit amount (for example the deposit refunded), any extra charge and the reason. The unit becomes vacant at once and the tenant moves to the Exited tab; their history stays.',
            },
            {
                title: 'Tenant page',
                body: 'Shows days left on the current lease, contact details, family size, address, the current property and unit, and the full lease history with every renewal and exit.',
            },
        ],
    },
    {
        id: 'maintenance',
        title: 'Maintenance',
        icon: Wrench,
        intro: 'Repair requests from report to completion, and the maintainers who do the work.',
        topics: [
            {
                title: 'Maintainers',
                body: 'Open Maintainers → Create Maintainer to add a tradesperson: their login, phone, trade (Electrician, Plumber…) and the properties they cover. Only maintainers who cover a property can be assigned its requests.',
            },
            {
                title: 'Logging a request',
                body: 'Staff open Maintenance → All Requests → Create and choose the property, unit, issue type and date; the unit’s current tenant is filled in. Tenants log their own requests the same way, and only choose the issue type, notes and a photo.',
            },
            {
                title: 'Maintainer page',
                body: 'Opening a maintainer shows their contact details, trade, the properties they cover and every request assigned to them.',
            },
            {
                title: 'Request list',
                body: 'Maintenance → All Requests lists every request with tabs for each status and filters by property and maintainer; the Pending and In Progress menus open the list already filtered.',
            },
            {
                title: 'Request page',
                body: 'Opening a request shows the property, unit, tenant, issue type, dates, notes, the attached photo (open it full size or download it), the assigned maintainer and the comment thread.',
            },
            {
                title: 'Assigning and following up',
                body: 'Use Assign on a request to pick the maintainer and set the status: Pending, In Progress or Completed. The Pending and In Progress menus list what is still open. Everyone involved can add comments on the request page, and the tenant is emailed when it is completed.',
            },
        ],
    },
    {
        id: 'finance',
        title: 'Invoices, Payments & Expenses',
        icon: Wallet,
        intro: 'Billing tenants, recording what they pay and tracking what you spend.',
        topics: [
            {
                title: 'Creating an invoice',
                body: 'Invoices are numbered automatically with your prefix (for example INV-0001).',
                steps: [
                    'Open Finance → Invoices and click Create Invoice.',
                    'Choose the property and unit; the current tenant is filled in.',
                    'Pick the invoice month and the due date.',
                    'Add one line per charge: type (Rent, Utility, Late Fee…), amount and description.',
                    'Tick “Recurring Invoice” and a day of the month to bill it again every month automatically.',
                    'Save. The tenant is emailed if that notification is switched on.',
                ],
            },
            {
                title: 'Invoice list',
                body: 'Finance → Invoices lists every invoice with its month, tenant, unit, due date, amount and status, with tabs for Unpaid, Partially Paid, Paid and Overdue and filters by property and tenant.',
            },
            {
                title: 'Invoice page',
                body: 'Shows the invoice as it prints: your company details, the tenant billed, each line item, the total, the amount paid and still due, and the payment history with receipts.',
            },
            {
                title: 'Recording a payment',
                body: 'On the invoice page click Record Payment and enter the amount, date, method (bank transfer, cash or online) and optionally the receipt. The invoice becomes partially paid or paid by itself, and turns overdue when the due date passes unpaid.',
            },
            {
                title: 'Payments from tenants',
                body: 'Tenants pay by bank transfer and upload the receipt on their invoice. The payment stays pending until staff click Approve (or Reject) on the invoice page; only approved payments count, and the tenant is emailed a receipt.',
            },
            {
                title: 'Automatic jobs',
                body: 'Every day the system creates the month’s copies of recurring invoices, and at 9 am it emails tenants whose unpaid invoice is due in three days.',
            },
            {
                title: 'Expenses',
                body: 'Finance → Expense records money spent on a property or one of its units: title, type, date, amount and receipt. Filter by property, type and date range; the total of the filtered rows is shown. A property’s page lists its expenses too.',
            },
            {
                title: 'Printing',
                body: 'Use Print on an invoice or agreement page; only the document itself is printed, with your company details from Settings.',
            },
        ],
    },
    {
        id: 'agreements',
        title: 'Agreements & Calendar',
        icon: FileSignature,
        intro: 'Tenancy agreements and the dates that matter.',
        topics: [
            {
                title: 'Agreements',
                body: 'Open Agreement → Create Agreement, choose the property and unit (the tenant is filled in), the dates and the status. The terms start from the default terms in Settings and can be changed per agreement. Set the status to Pending to let the tenant confirm it online from their own login.',
            },
            {
                title: 'Calendar',
                body: 'Calendar shows lease starts and ends, agreement dates, invoice due dates and maintenance requests month by month. Click an entry to open it.',
            },
        ],
    },
    {
        id: 'reports',
        title: 'Dashboard & Reports',
        icon: ChartColumn,
        intro: 'How the business is doing. Reports are for the Admin.',
        topics: [
            {
                title: 'Dashboard',
                body: 'Staff see the number of properties, units and active tenants, the vacancy rate, this month’s revenue and expense, the amount still owed, open maintenance, an income and expense chart for the year, occupancy per property and the unpaid invoices due first.',
            },
            {
                title: 'Report filters',
                body: 'Every report has a filter row at the top: pick a property, then optionally one of its units, and the year where the report is by month.',
            },
            {
                title: 'Income report',
                body: 'Payments collected and amounts billed for each month of the year, the totals, and the collection rate (collected divided by billed).',
            },
            {
                title: 'Expense report',
                body: 'Money spent each month, the year’s total and the largest category, plus the spending per expense type.',
            },
            {
                title: 'Profit & Loss report',
                body: 'Income received against expenses for each month, and the year’s net profit or loss. The table view adds the net amount for every month.',
            },
            {
                title: 'Property Unit report',
                body: 'Occupied against vacant units per property, then each property’s units with rooms, rent, status, current tenant and lease end date.',
            },
            {
                title: 'Tenant History report',
                body: 'Every lease ever made, with the tenant, unit, dates and status (active, renewed or exited), including the move-out date; filter by property, unit and status.',
            },
            {
                title: 'Maintenance report',
                body: 'Requests counted per issue type and status, and the full list of requests with tenant, maintainer, date and status; filter by tenant, property, unit and status.',
            },
            {
                title: 'Chart or table',
                body: 'Every chart has a table button in its corner that shows the same figures as a table, with totals.',
            },
        ],
    },
    {
        id: 'communication',
        title: 'Contact Diary & Notice Board',
        icon: Megaphone,
        intro: 'Keeping in touch with tenants and staff.',
        topics: [
            {
                title: 'Contact diary',
                body: 'Your own list of useful contacts (contractors, agents, suppliers): name, email, number, subject and notes. Each user sees only the contacts they added.',
            },
            {
                title: 'Notice board',
                body: 'Notices with an optional attachment, such as water disruptions or lift servicing. Everyone, including tenants and maintainers, can read them; the latest appear on their dashboards.',
            },
        ],
    },
    {
        id: 'website',
        title: 'Public Website',
        icon: Globe,
        intro: 'The page visitors see before signing in.',
        topics: [
            {
                title: 'Home page',
                body: 'System Setup → Frontend Manager → Home Page edits the hero text, the cards for tenants, maintainers and management, the features, the benefits and the questions and answers. Text is shown exactly as typed.',
            },
            {
                title: 'Custom pages and listings',
                body: 'Additional adds pages such as Privacy Policy and Terms & Conditions, linked from the website footer. Properties marked “Show this property on the public website” appear in the listing with their photo and price.',
            },
        ],
    },
    {
        id: 'for-tenants',
        title: 'For Tenants',
        icon: Home,
        intro: 'What you can do after signing in.',
        topics: [
            {
                title: 'Your dashboard',
                body: 'Shows your unit, rent, lease dates, the amount you owe, your unpaid invoices, your repair requests and the latest notices.',
            },
            {
                title: 'Paying an invoice',
                steps: [
                    'Open Finance → Invoices and open the invoice.',
                    'Transfer the amount from your bank.',
                    'Click Pay Invoice, enter the amount and upload the bank receipt.',
                    'Your payment shows as pending until the office approves it; you then receive a receipt by email.',
                ],
                body: 'Payments are made by bank transfer with the receipt uploaded.',
            },
            {
                title: 'Reporting a repair',
                body: 'Open Maintenance → Create, choose the issue type, describe the problem and attach a photo. Your property and unit are taken from your lease. Follow progress and add comments on the request page.',
            },
            {
                title: 'Your agreement',
                body: 'Open Agreement to read your tenancy agreement. When it is pending, click Confirm Agreement to accept it.',
            },
        ],
    },
    {
        id: 'for-maintainers',
        title: 'For Maintainers',
        icon: HardHat,
        intro: 'Handling the jobs assigned to you.',
        topics: [
            {
                title: 'Your jobs',
                body: 'Your dashboard counts your pending, in-progress and completed jobs and lists the open ones. Open Maintenance to see every job assigned to you.',
            },
            {
                title: 'Updating a job',
                body: 'Open the request, read the details and the tenant’s photo, then use Update Status to mark it In Progress or Completed. Add a comment to tell the office or the tenant what was done.',
            },
        ],
    },
    {
        id: 'help',
        title: 'Help & Troubleshooting',
        icon: LifeBuoy,
        intro: 'Common questions.',
        topics: [
            {
                title: 'I can’t see a menu',
                body: 'Menus appear only for the permissions your role has. Ask the Admin to add the permission to your role.',
            },
            {
                title: 'A unit can’t be chosen for a tenant',
                body: 'It is occupied by another tenant’s active lease. Exit or renew that tenant into another unit first.',
            },
            {
                title: 'Emails are not arriving',
                body: 'Check System Setup → Settings → Email (SMTP) and use Send Test Email, and make sure the notification is switched on under Email Notification.',
            },
            {
                title: 'My account is deactivated',
                body: 'Deactivated users can’t sign in. Ask the Admin to activate your account under Staff Management → Users.',
            },
        ],
    },
];

export default function UserManual() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('User Manual')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="User Manual"
                    description="A guide to every part of the system, from setting up to collecting rent."
                />

                <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
                    <nav
                        aria-label={t('Contents')}
                        className="h-fit rounded-xl border bg-card p-4 shadow-sm lg:sticky lg:top-4"
                    >
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <BookOpen className="size-4" /> {t('Contents')}
                        </div>
                        <ol className="grid gap-0.5 text-sm">
                            {CHAPTERS.map(({ id, title, icon: Icon }) => (
                                <li key={id}>
                                    <a
                                        href={`#${id}`}
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        {t(title)}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>

                    <div className="grid gap-6">
                        {CHAPTERS.map(
                            ({ id, title, icon: Icon, intro, topics }) => (
                                <section
                                    key={id}
                                    id={id}
                                    className="scroll-mt-4 rounded-xl border bg-card p-6 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Icon className="size-5" />
                                        </span>
                                        <div>
                                            <h2 className="text-lg font-semibold">
                                                {t(title)}
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                {t(intro)}
                                            </p>
                                        </div>
                                    </div>
                                    <dl className="mt-5 grid gap-4">
                                        {topics.map((topic) => (
                                            <div key={topic.title}>
                                                <dt className="font-medium">
                                                    {t(topic.title)}
                                                </dt>
                                                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                                    {t(topic.body)}
                                                    {topic.steps && (
                                                        <ol className="mt-2 grid list-decimal gap-1 ps-5">
                                                            {topic.steps.map(
                                                                (step) => (
                                                                    <li
                                                                        key={
                                                                            step
                                                                        }
                                                                    >
                                                                        {t(
                                                                            step,
                                                                        )}
                                                                    </li>
                                                                ),
                                                            )}
                                                        </ol>
                                                    )}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </section>
                            ),
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

UserManual.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'User Manual', href: userManual() },
    ],
};
