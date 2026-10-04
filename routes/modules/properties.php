<?php

use App\Http\Controllers\PropertyController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-properties'])
    ->controller(PropertyController::class)
    ->prefix('properties')
    ->name('properties.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('create', 'create')->middleware('permission:create-properties')->name('create');
        Route::post('/', 'store')->middleware('permission:create-properties')->name('store');
        Route::get('{property}', 'show')->whereNumber('property')->middleware('permission:show-properties')->name('show');
        Route::get('{property}/thumbnail', 'thumbnail')->whereNumber('property')->name('thumbnail');
        Route::get('{property}/edit', 'edit')->middleware('permission:edit-properties')->name('edit');
        Route::put('{property}', 'update')->middleware('permission:edit-properties')->name('update');
        Route::delete('{property}', 'destroy')->middleware('permission:delete-properties')->name('destroy');
    });
