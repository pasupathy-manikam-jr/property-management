<?php

use App\Http\Controllers\System\CompanySettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-settings'])
    ->controller(CompanySettingsController::class)
    ->prefix('company-settings')
    ->name('company-settings.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::put('company', 'updateCompany')->name('company');
        Route::put('numbering', 'updateNumbering')->name('numbering');
        Route::put('formats', 'updateFormats')->name('formats');
        Route::put('email', 'updateEmail')->name('email');
        Route::post('email/test', 'testEmail')->middleware('throttle:5,1')->name('email.test');
        Route::put('agreement', 'updateAgreement')->name('agreement');
    });
