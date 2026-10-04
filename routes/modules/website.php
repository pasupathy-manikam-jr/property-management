<?php

use App\Http\Controllers\WebsiteController;
use Illuminate\Support\Facades\Route;

// Public site. This replaces the `Route::inertia('/', 'welcome')->name('home')` in routes/web.php:
// modules load after it, and a later route with the same method, URI and name wins.
Route::controller(WebsiteController::class)->group(function () {
    Route::get('/', 'home')->name('home');
    Route::get('page/{slug}', 'page')->name('custom-page.show');
    Route::get('listings/{property}/thumbnail', 'listingThumbnail')->whereNumber('property')->name('website.listing-thumbnail');
});

Route::middleware(['auth', 'verified', 'permission:manage-website'])
    ->controller(WebsiteController::class)
    ->prefix('website')
    ->name('website.')
    ->group(function () {
        Route::get('home', 'editHome')->name('home');
        Route::put('home', 'updateHome')->name('home.update');
        Route::get('additional', 'additional')->name('additional');
        Route::post('pages', 'store')->name('pages.store');
        Route::put('pages/{page}', 'update')->whereNumber('page')->name('pages.update');
        Route::delete('pages/{page}', 'destroy')->whereNumber('page')->name('pages.destroy');
    });
