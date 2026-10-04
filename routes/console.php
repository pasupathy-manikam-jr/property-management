<?php

use App\Models\LoginHistory;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('model:prune', ['--model' => [LoginHistory::class]])->daily();

Schedule::command('invoices:generate-recurring')->daily();
Schedule::command('invoices:send-reminders')->dailyAt('09:00');
