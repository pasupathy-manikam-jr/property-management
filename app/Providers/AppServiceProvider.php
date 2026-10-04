<?php

namespace App\Providers;

use App\Models\Setting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->applyMailSettings();
    }

    /**
     * Use the SMTP server saved in Settings -> Email (when set) from the first time mail is used.
     * ponytail: a long-running queue worker keeps the settings it first read; restart it after changing SMTP.
     */
    protected function applyMailSettings(): void
    {
        $this->app->resolving('mail.manager', function () {
            $settings = Setting::values();

            if ($settings['mailHost'] === '') {
                return;
            }

            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => $settings['mailHost'],
                'mail.mailers.smtp.port' => $settings['mailPort'],
                'mail.mailers.smtp.username' => $settings['mailUsername'],
                'mail.mailers.smtp.password' => $settings['mailPassword'],
                'mail.mailers.smtp.scheme' => $settings['mailEncryption'] === 'ssl' ? 'smtps' : null,
                'mail.from.address' => $settings['mailFromAddress'],
                'mail.from.name' => $settings['mailFromName'],
            ]);
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
