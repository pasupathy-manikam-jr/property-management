<?php

use Illuminate\Support\Facades\Route;

// The in-app guide, linked below Settings in the sidebar; every signed-in user can read it.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('user-manual', 'user-manual')->name('user-manual');
});
