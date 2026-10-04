<?php

use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])
    ->controller(ReportController::class)
    ->prefix('reports')
    ->name('reports.')
    ->group(function () {
        Route::get('income', 'income')->middleware('permission:manage-income-report')->name('income');
        Route::get('expense', 'expense')->middleware('permission:manage-expense-report')->name('expense');
        Route::get('profit-loss', 'profitLoss')->middleware('permission:manage-profit-loss-report')->name('profit-loss');
        Route::get('property-unit', 'propertyUnit')->middleware('permission:manage-property-unit-report')->name('property-unit');
        Route::get('tenant-history', 'tenantHistory')->middleware('permission:manage-tenant-history-report')->name('tenant-history');
        Route::get('maintenance', 'maintenance')->middleware('permission:manage-maintenance-report')->name('maintenance');
    });
