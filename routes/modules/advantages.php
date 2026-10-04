<?php

use App\Http\Controllers\Lookups\AdvantageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-advantages'])
    ->controller(AdvantageController::class)
    ->prefix('advantages')
    ->name('advantages.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('permission:create-advantages')->name('store');
        Route::put('{id}', 'update')->whereNumber('id')->middleware('permission:edit-advantages')->name('update');
        Route::delete('{id}', 'destroy')->whereNumber('id')->middleware('permission:delete-advantages')->name('destroy');
    });
