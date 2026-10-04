<?php

use App\Http\Controllers\AgreementController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-agreements'])
    ->controller(AgreementController::class)
    ->prefix('agreements')
    ->name('agreements.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('create', 'create')->middleware('permission:create-agreements')->name('create');
        Route::post('/', 'store')->middleware('permission:create-agreements')->name('store');
        Route::get('{agreement}', 'show')->whereNumber('agreement')->middleware('permission:show-agreements')->name('show');
        Route::get('{agreement}/edit', 'edit')->middleware('permission:edit-agreements')->name('edit');
        Route::put('{agreement}', 'update')->middleware('permission:edit-agreements')->name('update');
        // The tenant's acceptance; the controller allows only the agreement's own tenant.
        Route::post('{agreement}/confirm', 'confirm')->name('confirm');
        Route::get('{agreement}/document', 'document')->middleware('permission:show-agreements')->name('document');
        Route::delete('{agreement}', 'destroy')->middleware('permission:delete-agreements')->name('destroy');
    });
