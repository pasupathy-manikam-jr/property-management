<?php

namespace Tests\Feature\System;

use App\Http\Controllers\WebsiteController;
use App\Models\CustomPage;
use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WebsiteTest extends TestCase
{
    use RefreshDatabase;

    private function property(string $name, bool $listed): Property
    {
        $property = Property::create([
            'type' => 'own', 'name' => $name, 'address' => 'Jalan 1', 'city' => 'Petaling Jaya', 'state' => 'Selangor',
            'zip_code' => '47800', 'country' => 'Malaysia', 'display_in_listing' => $listed,
            'listing_type' => $listed ? 'rent' : null, 'listing_price' => $listed ? 2500 : null,
        ]);

        return $property->attachUpload(UploadedFile::fake()->image('front.jpg'));
    }

    public function test_home_page_shows_default_content_listed_properties_and_enabled_pages(): void
    {
        Storage::fake('local');
        tap($this->property('Bayu Residence', true))->save();
        tap($this->property('Private Villa', false))->save();
        CustomPage::create(['title' => 'Privacy Policy', 'slug' => 'privacy-policy', 'content' => 'We care.', 'enabled' => true]);
        CustomPage::create(['title' => 'Draft', 'slug' => 'draft', 'content' => 'Soon.', 'enabled' => false]);

        $this->get(route('home'))->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('content.hero_title', WebsiteController::DEFAULT_HOME['hero_title'])
            ->has('listings', 1)
            ->where('listings.0.name', 'Bayu Residence')
            ->where('listings.0.thumbnail', fn ($url) => str_contains($url, '/listings/'))
            ->has('pages', 1)
            ->where('pages.0.slug', 'privacy-policy'));
    }

    public function test_public_thumbnail_is_served_only_for_listed_properties(): void
    {
        Storage::fake('local');
        $listed = tap($this->property('Bayu Residence', true))->save();
        $private = tap($this->property('Private Villa', false))->save();

        $this->get(route('website.listing-thumbnail', $listed))->assertOk();
        $this->get(route('website.listing-thumbnail', $private))->assertNotFound();
        // The regular thumbnail route still needs a login.
        $this->get(route('properties.thumbnail', $listed))->assertRedirect(route('login'));
    }

    public function test_admin_edits_the_home_page_content(): void
    {
        $this->actingAs($this->userWithRole());
        $content = [...WebsiteController::DEFAULT_HOME, 'hero_title' => '<script>alert(1)</script> Homes', 'faqs' => [['question' => 'Parking?', 'answer' => 'Two bays.']], 'listing_enabled' => false];

        $this->get(route('website.home'))->assertInertia(fn ($page) => $page->component('website/home')->has('content.features', 6));

        $this->put(route('website.home.update'), ['hero_title' => ''] + $content)->assertSessionHasErrors('hero_title');
        $this->put(route('website.home.update'), ['faqs' => [['question' => 'Q?']]] + $content)->assertSessionHasErrors('faqs.0.answer');
        $this->put(route('website.home.update'), $content)->assertSessionHasNoErrors();

        Storage::fake('local');
        tap($this->property('Bayu Residence', true))->save();

        // Stored and returned as plain text; the page renders it as text.
        $this->get(route('home'))->assertInertia(fn ($page) => $page
            ->where('content.hero_title', '<script>alert(1)</script> Homes')
            ->has('content.faqs', 1)
            ->has('listings', 0));
    }

    public function test_admin_manages_custom_pages_shown_publicly_while_enabled(): void
    {
        $this->actingAs($this->userWithRole());

        $this->post(route('website.pages.store'), ['title' => '', 'content' => ''])->assertSessionHasErrors(['title', 'content']);
        $this->post(route('website.pages.store'), ['title' => 'Terms & Conditions', 'slug' => '', 'content' => 'Be nice.', 'enabled' => true])->assertSessionHasNoErrors();

        $page = CustomPage::query()->sole();
        $this->assertSame('terms-conditions', $page->slug);
        $this->post(route('website.pages.store'), ['title' => 'Terms', 'slug' => 'terms-conditions', 'content' => 'x', 'enabled' => true])->assertSessionHasErrors('slug');

        $this->get(route('website.additional', ['search' => 'Terms']))->assertInertia(fn ($p) => $p->component('website/additional')->has('pages.data', 1));
        $this->get(route('custom-page.show', 'terms-conditions'))->assertInertia(fn ($p) => $p->component('custom-page')->where('page.content', 'Be nice.'));

        $this->put(route('website.pages.update', $page), ['title' => 'Terms', 'slug' => 'terms-conditions', 'content' => 'Be nice.', 'enabled' => false])->assertSessionHasNoErrors();
        $this->get(route('custom-page.show', 'terms-conditions'))->assertNotFound();
        $this->get(route('custom-page.show', 'missing'))->assertNotFound();

        $this->delete(route('website.pages.destroy', $page))->assertSessionHasNoErrors();
        $this->assertDatabaseCount('custom_pages', 0);
    }

    public function test_tenants_and_maintainers_cannot_manage_the_website(): void
    {
        $page = CustomPage::create(['title' => 'Privacy', 'slug' => 'privacy', 'content' => 'x', 'enabled' => true]);

        foreach (['tenant', 'maintainer'] as $role) {
            $this->actingAs($this->userWithRole($role));

            $this->get(route('website.home'))->assertForbidden();
            $this->put(route('website.home.update'), WebsiteController::DEFAULT_HOME)->assertForbidden();
            $this->get(route('website.additional'))->assertForbidden();
            $this->delete(route('website.pages.destroy', $page))->assertForbidden();
        }

        $this->assertDatabaseCount('custom_pages', 1);
    }
}
