<?php

namespace Tests\Feature\System;

use App\Mail\NotificationMail;
use App\Models\NotificationTemplate;
use App\Models\Setting;
use App\Models\User;
use App\Support\Notifier;
use Database\Seeders\Modules\SettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotificationTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_event_is_listed_with_its_placeholders(): void
    {
        $this->actingAs($this->userWithRole());
        $this->seed(SettingsSeeder::class);

        $this->get(route('notifications.index'))->assertInertia(fn ($page) => $page
            ->component('notifications/index')
            ->has('templates', count(NotificationTemplate::EVENTS))
            ->where('templates.4.event', 'invoice_created')
            ->where('templates.4.subject.zh', '来自 {company_name} 的发票 {invoice_number}')
            ->where('templates.4.placeholders', fn ($placeholders) => collect($placeholders)->contains('invoice_number'))
            ->has('languages', 3));
    }

    public function test_a_template_is_saved_per_language_with_english_required(): void
    {
        $this->actingAs($this->userWithRole());

        $this->put(route('notifications.update', 'payment_received'), ['enabled' => true, 'subject' => ['ms' => 'Terima'], 'body' => []])
            ->assertSessionHasErrors(['subject.en', 'body.en']);

        $this->put(route('notifications.update', 'payment_received'), [
            'enabled' => false,
            'subject' => ['en' => 'Paid {invoice_number}', 'ms' => 'Dibayar {invoice_number}'],
            'body' => ['en' => 'Thanks {tenant_name}'],
        ])->assertSessionHasNoErrors();

        $template = NotificationTemplate::query()->where('event', 'payment_received')->sole();
        $this->assertFalse($template->enabled);
        $this->assertSame(['en' => 'Paid {invoice_number}', 'ms' => 'Dibayar {invoice_number}', 'zh' => ''], $template->subject);

        $this->put(route('notifications.update', 'not_an_event'), ['enabled' => true])->assertNotFound();
    }

    public function test_notifier_sends_in_the_recipients_language_with_english_fallback(): void
    {
        Mail::fake();
        $this->seed(SettingsSeeder::class);
        Setting::put(['companyName' => 'Harta Sdn Bhd']);
        $data = ['tenant_name' => 'Aisyah', 'invoice_number' => 'INV-0007', 'amount' => 'RM 1,200.00', 'due_date' => '05/11/2026'];

        $malay = User::factory()->create(['lang' => 'ms']);
        $this->assertTrue(Notifier::send('invoice_created', $malay, $data));
        Mail::assertSent(NotificationMail::class, fn (NotificationMail $mail) => $mail->hasTo($malay->email)
            && $mail->mailSubject === 'Invois INV-0007 daripada Harta Sdn Bhd'
            && str_contains($mail->body, 'Jumlah: RM 1,200.00'));

        // A blank translation falls back to English; unknown placeholders stay visible.
        NotificationTemplate::query()->where('event', 'invoice_created')->sole()->update(['subject' => ['en' => 'Invoice {invoice_number} {unknown}', 'ms' => '', 'zh' => '']]);
        $this->assertSame('Invoice INV-0007 {unknown}', Notifier::compose('invoice_created', $malay, $data)['subject'] ?? null);

        $english = User::factory()->create(['lang' => null]);
        $this->assertStringContainsString('Dear Aisyah', Notifier::compose('invoice_created', $english, $data)['body'] ?? '');
    }

    public function test_notifier_skips_disabled_or_missing_templates(): void
    {
        Mail::fake();
        $this->seed(SettingsSeeder::class);
        NotificationTemplate::query()->where('event', 'payment_reminder')->update(['enabled' => false]);
        NotificationTemplate::query()->where('event', 'tenant_created')->delete();
        $user = User::factory()->create();

        $this->assertFalse(Notifier::send('payment_reminder', $user));
        $this->assertFalse(Notifier::send('tenant_created', $user));
        Mail::assertNothingSent();
    }

    public function test_the_mail_body_is_escaped_text(): void
    {
        $html = (new NotificationMail('Hi', "<b>bold</b>\nline"))->render();

        $this->assertStringContainsString('&lt;b&gt;bold&lt;/b&gt;<br />', $html);
    }

    public function test_tenants_and_maintainers_cannot_manage_notifications(): void
    {
        foreach (['tenant', 'maintainer'] as $role) {
            $this->actingAs($this->userWithRole($role));

            $this->get(route('notifications.index'))->assertForbidden();
            $this->put(route('notifications.update', 'invoice_created'), ['enabled' => true])->assertForbidden();
        }
    }
}
