<?php

namespace Tests\Feature\System;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CompanySettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_the_settings_without_the_mail_password(): void
    {
        $this->actingAs($this->userWithRole());
        Setting::put(['mailPassword' => 'top-secret']);

        $this->get(route('company-settings.index'))->assertInertia(fn ($page) => $page
            ->component('company-settings')
            ->where('settings.companyName', Setting::DEFAULTS['companyName'])
            ->missing('settings.mailPassword')
            ->missing('settings.homeContent')
            ->where('mailPasswordSet', true));
    }

    public function test_each_tab_validates_and_saves(): void
    {
        $this->actingAs($this->userWithRole());

        $this->put(route('company-settings.company'), ['companyName' => '', 'companyEmail' => 'x'])->assertSessionHasErrors(['companyName', 'companyEmail']);
        $this->put(route('company-settings.company'), ['companyName' => 'Harta Sdn Bhd', 'companyEmail' => 'office@harta.my', 'taxNumber' => null])->assertSessionHasNoErrors();

        $this->put(route('company-settings.numbering'), ['invoicePrefix' => '', 'expensePrefix' => 'E-', 'agreementPrefix' => 'A-'])->assertSessionHasErrors('invoicePrefix');
        $this->put(route('company-settings.numbering'), ['invoicePrefix' => 'HI-', 'expensePrefix' => 'E-', 'agreementPrefix' => 'A-'])->assertSessionHasNoErrors();

        $formats = ['dateFormat' => 'Y-m-d', 'timeFormat' => 'H:i', 'timezone' => 'Asia/Kuala_Lumpur', 'currencySymbol' => 'MYR', 'decimalFormat' => 0,
            'decimalSeparator' => '.', 'thousandsSeparator' => ' ', 'currencySymbolPosition' => 'after', 'currencySymbolSpace' => false];
        $this->put(route('company-settings.formats'), ['dateFormat' => 'nope', 'timezone' => 'Mars/Base'] + $formats)->assertSessionHasErrors(['dateFormat', 'timezone']);
        $this->put(route('company-settings.formats'), $formats)->assertSessionHasNoErrors();

        $this->put(route('company-settings.agreement'), ['agreementTerms' => 'Pay on time.'])->assertSessionHasNoErrors();

        $settings = Setting::values();
        $this->assertSame('Harta Sdn Bhd', $settings['companyName']);
        $this->assertSame('', $settings['taxNumber']);
        $this->assertSame('HI-', $settings['invoicePrefix']);
        $this->assertSame(0, $settings['decimalFormat']);
        $this->assertFalse($settings['currencySymbolSpace']);
        $this->assertSame('Pay on time.', $settings['agreementTerms']);

        // Shared with every page.
        $this->get(route('company-settings.index'))->assertInertia(fn ($page) => $page->where('globalSettings.currencySymbol', 'MYR'));
    }

    public function test_email_settings_store_the_password_encrypted_and_keep_it_when_blank(): void
    {
        $this->actingAs($this->userWithRole());
        $payload = ['mailHost' => 'smtp.harta.my', 'mailPort' => 587, 'mailUsername' => 'bot', 'mailEncryption' => 'tls',
            'mailFromAddress' => 'bot@harta.my', 'mailFromName' => 'Harta'];

        $this->put(route('company-settings.email'), ['mailFromAddress' => 'x'] + $payload)->assertSessionHasErrors('mailFromAddress');
        $this->put(route('company-settings.email'), $payload + ['mailPassword' => 'p4ss'])->assertSessionHasNoErrors();

        $stored = json_decode((string) DB::table('settings')->where('key', 'mailPassword')->value('value'));
        $this->assertNotSame('p4ss', $stored);
        $this->assertSame('p4ss', Crypt::decryptString($stored));

        $this->put(route('company-settings.email'), $payload + ['mailPassword' => ''])->assertSessionHasNoErrors();
        $this->assertSame('p4ss', Setting::get('mailPassword'));

        // Applied to the mailer when mail is first used.
        $this->app->forgetInstance('mail.manager');
        $this->app->make('mail.manager');
        $this->assertSame('smtp.harta.my', config('mail.mailers.smtp.host'));
        $this->assertSame('p4ss', config('mail.mailers.smtp.password'));
    }

    public function test_test_email_is_sent_and_throttled(): void
    {
        Mail::fake();
        $this->actingAs($this->userWithRole());

        $this->post(route('company-settings.email.test'), ['email' => 'nope'])->assertSessionHasErrors('email');

        for ($i = 0; $i < 4; $i++) {
            $this->post(route('company-settings.email.test'), ['email' => 'me@harta.my'])->assertSessionHasNoErrors();
        }

        $this->post(route('company-settings.email.test'), ['email' => 'me@harta.my'])->assertTooManyRequests();
    }

    public function test_tenants_and_maintainers_cannot_manage_settings(): void
    {
        foreach (['tenant', 'maintainer', 'manager'] as $role) {
            $this->actingAs($this->userWithRole($role));

            $this->get(route('company-settings.index'))->assertForbidden();
            $this->put(route('company-settings.company'), ['companyName' => 'Hacked'])->assertForbidden();
        }

        $this->assertSame(Setting::DEFAULTS['companyName'], Setting::get('companyName'));
    }
}
