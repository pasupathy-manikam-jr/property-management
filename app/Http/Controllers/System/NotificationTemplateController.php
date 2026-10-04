<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\NotificationTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationTemplateController extends Controller
{
    public function index(): Response
    {
        $templates = NotificationTemplate::query()->get()->keyBy('event');

        return Inertia::render('notifications/index', [
            // Every event in a fixed order; one without a saved template starts blank and disabled.
            'templates' => collect(NotificationTemplate::EVENTS)->map(function (array $event, string $key) use ($templates) {
                $template = $templates[$key] ?? new NotificationTemplate(['event' => $key, 'subject' => [], 'body' => [], 'enabled' => false]);

                return [
                    'event' => $key,
                    'label' => $event['label'],
                    'subject' => (object) $template->subject,
                    'body' => (object) $template->body,
                    'enabled' => $template->enabled,
                    'placeholders' => $template->placeholders(),
                ];
            })->values(),
            'languages' => collect(config()->array('app.locales'))->map(fn (array $locale, string $code) => ['code' => $code, 'name' => $locale[0]])->values(),
        ]);
    }

    public function update(Request $request, string $event): RedirectResponse
    {
        $locales = array_keys(config()->array('app.locales'));
        $rules = ['enabled' => ['required', 'boolean']];

        foreach ($locales as $locale) {
            // English is the fallback, so it must be filled in.
            $rules["subject.{$locale}"] = [$locale === 'en' ? 'required' : 'nullable', 'string', 'max:255'];
            $rules["body.{$locale}"] = [$locale === 'en' ? 'required' : 'nullable', 'string', 'max:10000'];
        }

        $data = $request->validate($rules, [], ['subject.en' => __('subject'), 'body.en' => __('message')]);

        NotificationTemplate::query()->updateOrCreate(['event' => $event], [
            'enabled' => $data['enabled'],
            'subject' => collect($locales)->mapWithKeys(fn ($locale) => [$locale => $data['subject'][$locale] ?? ''])->all(),
            'body' => collect($locales)->mapWithKeys(fn ($locale) => [$locale => $data['body'][$locale] ?? ''])->all(),
        ]);

        return $this->done(__('Notification template saved.'));
    }
}
