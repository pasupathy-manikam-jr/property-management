<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_welcome_page_shares_the_three_languages(): void
    {
        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->where('locale', 'en')
            ->where('locales', fn ($locales) => array_keys($locales->all()) === ['en', 'ms', 'zh']));
    }

    public function test_guest_can_switch_language(): void
    {
        $this->post(route('locale.update'), ['locale' => 'ms'])->assertRedirect();

        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('locale', 'ms'));
    }

    public function test_unsupported_language_is_rejected(): void
    {
        $this->post(route('locale.update'), ['locale' => 'ar'])->assertSessionHasErrors('locale');
        $this->get(route('translations.show', 'ar'))->assertNotFound();
    }

    public function test_translations_are_served(): void
    {
        $this->get(route('translations.show', 'zh'))->assertOk()->assertJsonPath('Log in', '登录');
    }
}
