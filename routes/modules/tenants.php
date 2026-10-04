<?php

use App\Http\Controllers\TenantController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-tenants'])
    ->controller(TenantController::class)
    ->prefix('tenants')
    ->name('tenants.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('create', 'create')->middleware('permission:create-tenants')->name('create');
        Route::post('/', 'store')->middleware('permission:create-tenants')->name('store');
        Route::get('{tenant}', 'show')->whereNumber('tenant')->middleware('permission:show-tenants')->name('show');
        Route::get('{tenant}/edit', 'edit')->middleware('permission:edit-tenants')->name('edit');
        Route::put('{tenant}', 'update')->middleware('permission:edit-tenants')->name('update');
        Route::post('{tenant}/renew', 'renew')->middleware('permission:edit-tenants')->name('renew');
        Route::post('{tenant}/exit', 'exit')->middleware('permission:edit-tenants')->name('exit');
        Route::delete('{tenant}', 'destroy')->middleware('permission:delete-tenants')->name('destroy');
    });
