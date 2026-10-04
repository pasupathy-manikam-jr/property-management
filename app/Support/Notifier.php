<?php

namespace App\Support;

use App\Mail\NotificationMail;
use App\Models\NotificationTemplate;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the email notification for an event (Email Notifications page) in the recipient's language.
 */
class Notifier
{
    /**
     * Email $to the event's template filled with $data, when the template exists and is enabled.
     * A mail failure is reported, never thrown, so it can't break the action that triggered it.
     *
     * @param  array<string, string|int|float|null>  $data  placeholder values, e.g. ['invoice_number' => 'INV-0001']
     */
    public static function send(string $event, User $to, array $data = []): bool
    {
        $mail = static::compose($event, $to, $data);

        if ($mail === null) {
            return false;
        }

        return (bool) rescue(function () use ($to, $mail) {
            Mail::to($to)->send(new NotificationMail($mail['subject'], $mail['body']));

            return true;
        }, false);
    }

    /**
     * The filled subject and body in the recipient's language (falling back to English), or null when disabled.
     *
     * @param  array<string, string|int|float|null>  $data
     * @return array{subject: string, body: string}|null
     */
    public static function compose(string $event, User $to, array $data = []): ?array
    {
        $template = NotificationTemplate::query()->where('event', $event)->first();

        if (! $template?->enabled) {
            return null;
        }

        $settings = Setting::values();
        $values = [
            'user_name' => $to->name,
            'company_name' => $settings['companyName'],
            'company_email' => $settings['companyEmail'],
            'company_phone' => $settings['companyPhone'],
            'app_url' => url('/'),
            ...$data,
        ];
        $lang = $to->lang ?? 'en';
        $pick = fn (array $texts) => ($texts[$lang] ?? '') !== '' ? $texts[$lang] : ($texts['en'] ?? '');

        return [
            'subject' => static::render($pick($template->subject), $values),
            'body' => static::render($pick($template->body), $values),
        ];
    }

    /**
     * Replace {name} placeholders; unknown ones stay as written so the author can spot them.
     *
     * @param  array<string, string|int|float|null>  $values
     */
    public static function render(string $template, array $values): string
    {
        return (string) preg_replace_callback(
            '/\{([a-z0-9_]+)\}/i',
            fn (array $match) => array_key_exists($key = strtolower($match[1]), $values) ? (string) $values[$key] : $match[0],
            $template,
        );
    }
}
