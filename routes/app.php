<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Module routes
|--------------------------------------------------------------------------
|
| Every sidebar module, mirroring the demo owner's menu. A module that isn't built yet
| shows the shared "coming soon" page; its own routes/modules/<module>.php replaces the
| placeholder automatically (same route name).
|
*/

$modules = [
    'maintainers.index' => ['maintainers', 'Maintainers', 'manage-maintainers'],
    'maintenance-requests.index' => ['maintenance-requests', 'Maintenance Requests', 'manage-maintenance-requests'],
    'invoices.index' => ['invoices', 'Invoices', 'manage-invoices'],
    'expenses.index' => ['expenses', 'Expenses', 'manage-expenses'],
    'calendar.index' => ['calendar', 'Calendar', 'manage-calendar'],
    'agreements.index' => ['agreements', 'Agreements', 'manage-agreements'],
    'reports.income' => ['reports/income', 'Income Report', 'manage-income-report'],
    'reports.expense' => ['reports/expense', 'Expense Report', 'manage-expense-report'],
    'reports.profit-loss' => ['reports/profit-loss', 'Profit & Loss', 'manage-profit-loss-report'],
    'reports.property-unit' => ['reports/property-unit', 'Property Unit Report', 'manage-property-unit-report'],
    'reports.tenant-history' => ['reports/tenant-history', 'Tenant History', 'manage-tenant-history-report'],
    'reports.maintenance' => ['reports/maintenance', 'Maintenance Report', 'manage-maintenance-report'],
    'contacts.index' => ['contacts', 'Contact Diary', 'manage-contacts'],
    'notes.index' => ['notes', 'Notice Board', 'manage-notes'],
    'notifications.index' => ['notifications', 'Email Notifications', 'manage-notifications'],
    'website.home' => ['website/home', 'Home Page', 'manage-website'],
    'website.additional' => ['website/additional', 'Additional Pages', 'manage-website'],
    'company-settings.index' => ['company-settings', 'Settings', 'manage-settings'],
];

foreach (glob(__DIR__.'/modules/*.php') ?: [] as $file) {
    require $file;
}

$router = app('router');
$router->getRoutes()->refreshNameLookups();

Route::middleware(['auth', 'verified'])->group(function () use ($modules, $router) {
    foreach ($modules as $name => [$uri, $title, $permission]) {
        if ($router->has($name)) {
            continue;
        }

        Route::inertia($uri, 'coming-soon', ['title' => $title])
            ->middleware("permission:{$permission}")
            ->name($name);
    }
});
