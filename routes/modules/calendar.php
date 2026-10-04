<?php

use App\Http\Controllers\CalendarController;
use Illuminate\Support\Facades\Route;

Route::get('calendar', CalendarController::class)
    ->middleware(['auth', 'verified', 'permission:manage-calendar'])
    ->name('calendar.index');
