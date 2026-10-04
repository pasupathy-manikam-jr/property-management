<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use DateTimeZone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class CompanySettingsController extends Controller
{
    /** PHP date formats offered under Formats. */
    private const DATE_FORMATS = ['d/m/Y', 'd-m-Y', 'd.m.Y', 'Y-m-d', 'm/d/Y', 'm-d-Y', 'Y/m/d', 'd M Y', 'j F Y', 'M j, Y', 'F j, Y', 'D, d M Y'];

    private const TIME_FORMATS = ['h:i A', 'g:i A', 'h:i a', 'H:i', 'H:i:s', 'G:i'];

    public function index(): Response
    {
        $now = now();

        return Inertia::render('company-settings', [
            'settings' => Arr::except(Setting::public(), ['homeContent']),
            'mailPasswordSet' => Setting::get('mailPassword') !== '',
            'timezones' => DateTimeZone::listIdentifiers(),
            'dateFormats' => collect(self::DATE_FORMATS)->mapWithKeys(fn ($format) => [$format => $now->format($format)]),
            'timeFormats' => collect(self::TIME_FORMATS)->mapWithKeys(fn ($format) => [$format => $now->format($format)]),
        ]);
    }

    public function updateCompany(Request $request): RedirectResponse
    {
        return $this->save($request->validate([
            'companyName' => ['required', 'string', 'max:255'],
            'companyEmail' => ['nullable', 'email', 'max:255'],
            'companyPhone' => ['nullable', 'string', 'max:30'],
            'companyAddress' => ['nullable', 'string', 'max:500'],
            'taxTitle' => ['nullable', 'string', 'max:30'],
            'taxNumber' => ['nullable', 'string', 'max:50'],
        ]), 'Company settings saved.');
    }

    public function updateNumbering(Request $request): RedirectResponse
    {
        return $this->save($request->validate([
            'invoicePrefix' => ['required', 'string', 'max:20'],
            'expensePrefix' => ['required', 'string', 'max:20'],
            'agreementPrefix' => ['required', 'string', 'max:20'],
        ]), 'Numbering settings saved.');
    }

    public function updateFormats(Request $request): RedirectResponse
    {
        return $this->save($request->validate([
            'dateFormat' => ['required', Rule::in(self::DATE_FORMATS)],
            'timeFormat' => ['required', Rule::in(self::TIME_FORMATS)],
            'timezone' => ['required', 'timezone:all'],
            'currencySymbol' => ['required', 'string', 'max:10'],
            'decimalFormat' => ['required', 'integer', 'between:0,4'],
            'decimalSeparator' => ['required', Rule::in(['.', ','])],
            'thousandsSeparator' => ['present', 'nullable', Rule::in([',', '.', ' '])],
            'currencySymbolPosition' => ['required', Rule::in(['before', 'after'])],
            'currencySymbolSpace' => ['required', 'boolean'],
        ]), 'Format settings saved.');
    }

    public function updateEmail(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'mailHost' => ['required', 'string', 'max:255'],
            'mailPort' => ['required', 'integer', 'between:1,65535'],
            'mailUsername' => ['nullable', 'string', 'max:255'],
            // Left blank to keep the saved password.
            'mailPassword' => ['nullable', 'string', 'max:255'],
            'mailEncryption' => ['required', Rule::in(['tls', 'ssl', 'none'])],
            'mailFromAddress' => ['required', 'email', 'max:255'],
            'mailFromName' => ['required', 'string', 'max:255'],
        ]);

        if (($validated['mailPassword'] ?? '') === '') {
            unset($validated['mailPassword']);
        }

        return $this->save($validated, 'Email settings saved.');
    }

    public function testEmail(Request $request): RedirectResponse
    {
        $to = $request->validate(['email' => ['required', 'email']])['email'];

        try {
            Mail::raw(__('This is a test email from :app.', ['app' => Setting::get('companyName')]), fn ($message) => $message
                ->to($to)
                ->subject(__('Test email')));
        } catch (Throwable $e) {
            return $this->toast('error', __('Could not send the test email: :error', ['error' => $e->getMessage()]));
        }

        return $this->done(__('Test email sent to :email.', ['email' => $to]));
    }

    public function updateAgreement(Request $request): RedirectResponse
    {
        return $this->save($request->validate([
            'agreementTerms' => ['nullable', 'string', 'max:20000'],
        ]), 'Agreement settings saved.');
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function save(array $values, string $message): RedirectResponse
    {
        // Optional text fields arrive as null; store them as empty strings like their defaults.
        Setting::put(array_map(fn ($value) => $value ?? '', $values));

        return $this->done(__($message));
    }
}
