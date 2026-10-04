<?php

use App\Http\Controllers\Lookups\AmenityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-amenities'])
    ->controller(AmenityController::class)
    ->prefix('amenities')
    ->name('amenities.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('permission:create-amenities')->name('store');
        Route::put('{id}', 'update')->whereNumber('id')->middleware('permission:edit-amenities')->name('update');
        Route::delete('{id}', 'destroy')->whereNumber('id')->middleware('permission:delete-amenities')->name('destroy');
    });
