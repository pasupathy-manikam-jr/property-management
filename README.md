# Property — Property Management System

Run a rental portfolio in one web app: properties and units, tenants and leases, rent invoices and payments,
maintenance, expenses, tenancy agreements and reports — with separate portals for management, tenants and maintainers.
Built for a single management company in Malaysia.

**Live demo:** <https://ui.staging.oriclabdev.com/property-management>

| Role       | Email                  | Password   |
| ---------- | ---------------------- | ---------- |
| Admin      | admin@example.com      | `Zx123456` |
| Manager    | manager@example.com    | `Zx123456` |
| Tenant     | tenant@example.com     | `Zx123456` |
| Maintainer | maintainer@example.com | `Zx123456` |

Built with Laravel 13, Inertia 3, React 19, Tailwind CSS 4 and shadcn/ui.

---

## Features

### Made for Malaysia

- Amounts in Ringgit (RM), dates as dd/mm/yyyy and the Asia/Kuala_Lumpur time zone (all configurable in Settings).
- Three interface languages, chosen per user: **English, Bahasa Melayu and 中文**. Email notifications go out in
  each recipient's language.
- Malaysian sample data: properties in Petaling Jaya, Bangsar South, Penang, Shah Alam and Johor Bahru.

### Roles

- **Admin** — everything, including roles, settings and reports.
- **Manager** — day-to-day operations (properties, tenants, invoices, expenses, maintenance).
- **Tenant** — their own home, invoices, repair requests and agreement.
- **Maintainer** — only the repair jobs assigned to them.
- Admin can create more roles from about 90 permissions. There is no public sign-up: the admin creates every account.

### Dashboard

- Staff: total properties, units and active tenants, vacancy rate, this month's revenue and expense, pending payments,
  open maintenance; income vs expense chart, occupied vs vacant per property and the due / overdue invoice list.
- Tenant: their unit, rent, amount owed, unpaid invoices, repair requests and notices.
- Maintainer: pending / in progress / completed counts and their open jobs.

### Real estate

- Properties (owned or leased) with a photo, address, amenities and advantages, and an optional public listing
  (rent or sell, with price).
- Units with bedrooms / kitchen / baths, rent (monthly, yearly or custom period), deposit and late fee
  (fixed or percentage) and payment due date.
- Occupied / vacant counts on every property card; a property's page shows its units, amenities, advantages and expenses.

### Tenants & leases

- Creating a tenant creates their login and moves them into a vacant unit — occupied units can't be picked.
- Lease history per tenant: **renew** (same or another unit) and **exit tenant** with exit amount, extra charge and reason.
- Tenant page with days left on the lease, personal details and every past lease.

### Maintenance

- Maintainers with their trade and the properties they cover.
- Repair requests with issue type, attachment (photo), assigned maintainer and status
  (pending, in progress, completed); comment thread on each request.
- Tenants report issues for their own unit; maintainers update status on their jobs.

### Finance

- Invoices numbered automatically (`INV-0001`), with line items (rent, utility, late fee…), due date and optional
  monthly recurrence; printable invoice.
- Payments: staff record cash, bank transfer or online payments; tenants pay by bank transfer and upload the receipt,
  which staff approve or reject. Status is worked out as unpaid, partially paid, paid or overdue.
- Expenses per property or unit with type, receipt and running total.
- Daily jobs generate recurring invoices and email payment reminders three days before the due date.

### Agreements & calendar

- Tenancy agreements (`AGR-0001`) with default terms from Settings, printable, confirmed by the tenant online.
- Calendar of lease starts and ends, agreement dates, invoice due dates and maintenance requests.

### Reports

- **Income**, **Expense** and **Profit & Loss** by month, filtered by property, unit and year.
- **Property Unit** (occupancy and rent roll), **Tenant History** and **Maintenance** (by issue type and status).
- Every chart can switch to a table of the same figures.

### Communication, website & system

- Contact diary and notice board.
- Email notification templates per event, in all three languages, each with an on/off switch.
- Frontend manager: edit the public home page, add custom pages (privacy policy, terms), list properties publicly.
- Settings: company details, document number prefixes, date / time / currency formats, SMTP email (with a test email)
  and default agreement terms.
- Light and dark themes, login history, two-factor authentication and passkeys.

## Getting started

Requirements: PHP 8.4, Composer, Node 22, MySQL 8 (or SQLite).

```bash
git clone https://github.com/pasupathy-manikam-jr/property-management.git
cd property-management
composer install
cp .env.example .env
php artisan key:generate
# set DB_* in .env, then:
php artisan migrate --seed
npm install
npm run build
php artisan serve
```

Sign in with one of the demo accounts above. `php artisan migrate --seed` loads a full set of Malaysian sample data.
For the recurring invoices and payment reminders, run Laravel's scheduler (`* * * * * php artisan schedule:run`).

## Checks

```bash
composer ci:check   # lint, formatting, TypeScript, PHPStan and the test suite
```

## Deployment

Servers never run Node. On every push to `main`, GitHub Actions builds the front-end and publishes a `deploy`
branch (`main` + compiled assets); the server then runs:

```bash
cd ~/property-management && bash scripts/deploy.sh
```

## Credits

The sample property photos are from Wikimedia Commons; authors and licences are listed in
[`database/demo/images/CREDITS.md`](database/demo/images/CREDITS.md).
