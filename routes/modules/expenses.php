<?php

use App\Http\Controllers\Finance\ExpenseController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-expenses'])
    ->controller(ExpenseController::class)
    ->prefix('expenses')
    ->name('expenses.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('permission:create-expenses')->name('store');
        Route::put('{expense}', 'update')->middleware('permission:edit-expenses')->name('update');
        Route::get('{expense}/receipt', 'receipt')->middleware('permission:show-expenses')->name('receipt');
        Route::delete('{expense}', 'destroy')->middleware('permission:delete-expenses')->name('destroy');
    });
