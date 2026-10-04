<?php

use App\Http\Controllers\Finance\InvoiceController;
use App\Http\Controllers\Finance\InvoicePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-invoices'])
    ->prefix('invoices')
    ->name('invoices.')
    ->group(function () {
        Route::controller(InvoiceController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('create', 'create')->middleware('permission:create-invoices')->name('create');
            Route::post('/', 'store')->middleware('permission:create-invoices')->name('store');
            Route::get('{invoice}', 'show')->whereNumber('invoice')->middleware('permission:show-invoices')->name('show');
            Route::get('{invoice}/edit', 'edit')->middleware('permission:edit-invoices')->name('edit');
            Route::put('{invoice}', 'update')->middleware('permission:edit-invoices')->name('update');
            Route::delete('{invoice}', 'destroy')->middleware('permission:delete-invoices')->name('destroy');
        });

        Route::controller(InvoicePaymentController::class)->prefix('{invoice}/payments')->name('payments.')->scopeBindings()->group(function () {
            Route::post('/', 'store')->middleware('permission:create-invoice-payments')->name('store');
            Route::get('{payment}/receipt', 'receipt')->name('receipt');
            // Approving a tenant's transfer is staff work: tenants hold create-invoice-payments but never edit-invoices.
            Route::post('{payment}/approve', 'approve')->middleware('permission:edit-invoices')->name('approve');
            Route::post('{payment}/reject', 'reject')->middleware('permission:edit-invoices')->name('reject');
            Route::delete('{payment}', 'destroy')->middleware('permission:delete-invoice-payments')->name('destroy');
        });
    });
