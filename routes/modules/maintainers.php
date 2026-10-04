<?php

use App\Http\Controllers\MaintainerController;
use Illuminate\Support\Facades\Route;

// There is no show-maintainers permission: manage-maintainers covers the detail page.
Route::middleware(['auth', 'verified', 'permission:manage-maintainers'])
    ->controller(MaintainerController::class)
    ->prefix('maintainers')
    ->name('maintainers.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('create', 'create')->middleware('permission:create-maintainers')->name('create');
        Route::post('/', 'store')->middleware('permission:create-maintainers')->name('store');
        Route::get('{maintainer}', 'show')->whereNumber('maintainer')->name('show');
        Route::get('{maintainer}/edit', 'edit')->middleware('permission:edit-maintainers')->name('edit');
        Route::put('{maintainer}', 'update')->middleware('permission:edit-maintainers')->name('update');
        Route::delete('{maintainer}', 'destroy')->middleware('permission:delete-maintainers')->name('destroy');
    });
