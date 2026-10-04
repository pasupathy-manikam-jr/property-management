<?php

use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-units'])
    ->controller(UnitController::class)
    ->prefix('units')
    ->name('units.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('permission:create-units')->name('store');
        Route::put('{unit}', 'update')->middleware('permission:edit-units')->name('update');
        Route::delete('{unit}', 'destroy')->middleware('permission:delete-units')->name('destroy');
    });
