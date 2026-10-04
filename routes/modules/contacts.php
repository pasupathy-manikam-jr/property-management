<?php

use App\Http\Controllers\Communication\ContactController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-contacts'])
    ->controller(ContactController::class)
    ->prefix('contacts')
    ->name('contacts.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('permission:create-contacts')->name('store');
        Route::put('{contact}', 'update')->middleware('permission:edit-contacts')->name('update');
        Route::delete('{contact}', 'destroy')->middleware('permission:delete-contacts')->name('destroy');
    });
