<?php

use App\Http\Controllers\MaintenanceRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-maintenance-requests'])
    ->controller(MaintenanceRequestController::class)
    ->prefix('maintenance-requests')
    ->name('maintenance-requests.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('permission:create-maintenance-requests')->name('store');
        Route::get('{maintenanceRequest}', 'show')->whereNumber('maintenanceRequest')->middleware('permission:show-maintenance-requests')->name('show');
        Route::put('{maintenanceRequest}', 'update')->middleware('permission:edit-maintenance-requests')->name('update');
        Route::delete('{maintenanceRequest}', 'destroy')->middleware('permission:delete-maintenance-requests')->name('destroy');
        Route::post('{maintenanceRequest}/assign', 'assign')->middleware('permission:assign-maintainers')->name('assign');
        Route::post('{maintenanceRequest}/status', 'status')->middleware('role:maintainer')->name('status');
        Route::post('{maintenanceRequest}/comments', 'comment')->name('comment');
        Route::get('{maintenanceRequest}/attachment', 'attachment')->name('attachment');
        Route::get('{maintenanceRequest}/preview', 'preview')->name('preview');
    });
