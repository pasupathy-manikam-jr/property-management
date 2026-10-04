<?php

use App\Http\Controllers\System\NotificationTemplateController;
use App\Models\NotificationTemplate;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:manage-notifications'])
    ->controller(NotificationTemplateController::class)
    ->prefix('notifications')
    ->name('notifications.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::put('{event}', 'update')->whereIn('event', array_keys(NotificationTemplate::EVENTS))->name('update');
    });
