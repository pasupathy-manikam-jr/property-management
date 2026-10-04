<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

/**
 * Company-wide key/value settings, read through a forever cache that every write clears.
 */
#[Fillable(['key', 'value'])]
class Setting extends Model
{
    /**
     * Keys and their values before anything is saved.
     */
    public const DEFAULTS = [
        // Company
        'companyName' => 'Property Management Sdn Bhd',
        'companyEmail' => '',
        'companyPhone' => '',
        'companyAddress' => '',
        'taxTitle' => 'SST',
        'taxNumber' => '',
        // Numbering
        'invoicePrefix' => 'INV-',
        'expensePrefix' => 'EXP-',
        'agreementPrefix' => 'AGR-',
        // Formats
        'dateFormat' => 'd/m/Y',
        'timeFormat' => 'h:i A',
        'timezone' => 'Asia/Kuala_Lumpur',
        'currencySymbol' => 'RM',
        'decimalFormat' => 2,
        'decimalSeparator' => '.',
        'thousandsSeparator' => ',',
        'currencySymbolPosition' => 'before',
        'currencySymbolSpace' => true,
        // Email
        'mailHost' => '',
        'mailPort' => 587,
        'mailUsername' => '',
        'mailPassword' => '',
        'mailEncryption' => 'tls',
        'mailFromAddress' => '',
        'mailFromName' => 'Property',
        // Agreement: default terms & conditions for new agreements
        'agreementTerms' => "1. The tenant shall pay the rent in full on or before the due date each month.\n2. The security deposit is refundable at the end of the tenancy, less any amount owed for damage or unpaid charges.\n3. The tenant shall keep the unit clean and in good condition and report any damage promptly.\n4. The tenant shall not sublet the unit or make structural alterations without written consent.\n5. Either party may end this agreement by giving one month's written notice.",
        // Website: public home page content (empty = WebsiteController::DEFAULT_HOME)
        'homeContent' => [],
    ];

    /** Stored encrypted; never sent to the browser. */
    public const SECRETS = ['mailPassword'];

    private const CACHE_KEY = 'settings';

    /**
     * Every setting, saved values over defaults.
     *
     * @return array<string, mixed>
     */
    public static function values(): array
    {
        $saved = Cache::rememberForever(self::CACHE_KEY, fn () => static::query()->pluck('value', 'key')->all());

        $values = self::DEFAULTS;

        foreach ($saved as $key => $json) {
            if (array_key_exists($key, self::DEFAULTS)) {
                $value = json_decode($json, true);
                $values[$key] = in_array($key, self::SECRETS, true) && $value !== '' ? Crypt::decryptString($value) : $value;
            }
        }

        return $values;
    }

    public static function get(string $key): mixed
    {
        return static::values()[$key];
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            // Keep each value the same type as its default (form input arrives as strings).
            $value = match (gettype(self::DEFAULTS[$key])) {
                'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
                'integer' => (int) $value,
                default => $value,
            };

            if (in_array($key, self::SECRETS, true) && $value !== '') {
                $value = Crypt::encryptString($value);
            }

            static::query()->updateOrCreate(['key' => $key], ['value' => json_encode($value)]);
        }

        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Settings safe to share with every page (no secrets).
     *
     * @return array<string, mixed>
     */
    public static function public(): array
    {
        return array_diff_key(static::values(), array_flip(self::SECRETS));
    }
}
