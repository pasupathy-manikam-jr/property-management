<?php

use App\Http\Controllers\Communication\NoteController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-notes'])
    ->controller(NoteController::class)
    ->prefix('notes')
    ->name('notes.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('permission:create-notes')->name('store');
        Route::put('{note}', 'update')->middleware('permission:edit-notes')->name('update');
        Route::get('{note}/document', 'document')->name('document');
        Route::delete('{note}', 'destroy')->middleware('permission:delete-notes')->name('destroy');
    });
