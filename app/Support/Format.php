<?php

namespace App\Support;

use App\Models\Setting;
use DateTimeInterface;

/**
 * Server-side money and date text in the Settings formats (the UI uses useFormat()).
 */
class Format
{
    public static function money(float|int|string $amount): string
    {
        $s = Setting::values();
        $number = number_format((float) $amount, (int) $s['decimalFormat'], $s['decimalSeparator'], $s['thousandsSeparator']);
        $space = $s['currencySymbolSpace'] ? ' ' : '';

        return $s['currencySymbolPosition'] === 'after'
            ? $number.$space.$s['currencySymbol']
            : $s['currencySymbol'].$space.$number;
    }

    public static function date(?DateTimeInterface $date): string
    {
        return $date ? $date->format(Setting::get('dateFormat')) : '';
    }
}
