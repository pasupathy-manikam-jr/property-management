<?php

use App\Http\Controllers\Lookups\TypeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-types'])
    ->controller(TypeController::class)
    ->prefix('types')
    ->name('types.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('permission:create-types')->name('store');
        Route::put('{id}', 'update')->whereNumber('id')->middleware('permission:edit-types')->name('update');
        Route::delete('{id}', 'destroy')->whereNumber('id')->middleware('permission:delete-types')->name('destroy');
    });
