<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocaleController;
use Illuminate\Support\Facades\Route;

Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');
Route::get('translations/{locale}', [LocaleController::class, 'translations'])->name('translations.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->middleware('permission:manage-dashboard')->name('dashboard');
});

require __DIR__.'/app.php';

require __DIR__.'/settings.php';
