<?php

namespace App\Http\Controllers;

use App\Models\CustomPage;
use App\Models\Property;
use App\Models\Setting;
use App\Support\TableQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The company's public site (welcome page, property listing, custom pages) and the
 * Website screens that edit it. All content is plain text; the pages never render it as HTML.
 */
class WebsiteController extends Controller
{
    /** The welcome page copy until the admin edits it (the UI translates these defaults). */
    public const DEFAULT_HOME = [
        'hero_title' => 'Your rental, managed in one place',
        'hero_subtitle' => 'Tenants pay rent, view agreements and report repairs. Our team handles properties, tenancies and maintenance.',
        'portals' => [
            ['title' => 'Tenants', 'items' => ['Pay invoices online or upload a bank receipt', 'View your tenancy agreement', 'Report repairs and follow their progress']],
            ['title' => 'Maintainers', 'items' => ['See the jobs assigned to you', 'Update progress and add comments', 'Close jobs when the work is done']],
            ['title' => 'Management', 'items' => ['Manage properties, units and tenancies', 'Raise invoices and record payments', 'Assign maintenance and track expenses']],
        ],
        'listing_enabled' => true,
        'listing_title' => 'Available properties',
        'listing_subtitle' => 'Units we currently have for rent or sale.',
        'features_title' => 'Everything in one system',
        'features_subtitle' => 'From the first viewing to the final move-out.',
        'features' => [
            ['title' => 'Properties & units', 'body' => 'Track every building and unit with rent, deposit and late-fee rules.'],
            ['title' => 'Tenants & leases', 'body' => 'Onboard tenants, renew leases and handle move-outs in a few clicks.'],
            ['title' => 'Invoices & payments', 'body' => 'Raise one-off or recurring invoices and record online or bank payments.'],
            ['title' => 'Maintenance', 'body' => 'Tenants log issues, you assign maintainers and follow progress to completion.'],
            ['title' => 'Expenses', 'body' => 'Record repairs, insurance and taxes against each property and unit.'],
            ['title' => 'Reports', 'body' => 'Income, expense, profit & loss, occupancy and tenant history at a glance.'],
        ],
        'benefits_title' => 'Less paperwork, more time',
        'benefits_text' => 'Automate the routine work of renting so you can focus on your tenants and your portfolio.',
        'benefits' => [
            'Replace paper forms with digital workflows',
            'Keep receipts and agreements in one place',
            'Issue tenancy agreements from templates',
            'Never miss a lease end or payment due date',
            'Role-based access for staff, tenants and maintainers',
        ],
        'faq_title' => 'Frequently asked questions',
        'faq_subtitle' => 'Quick answers for tenants and staff.',
        'faqs' => [
            ['question' => 'How do I get an account?', 'answer' => 'The management office creates your account when your tenancy starts and emails you the login details.'],
            ['question' => 'I forgot my password.', 'answer' => 'Use "Forgot password" on the login page and we will email you a reset link.'],
            ['question' => 'How do I report a repair?', 'answer' => 'Log in, open Maintenance and create a request. You can attach a photo and follow its progress.'],
            ['question' => 'Which languages are supported?', 'answer' => 'English, Bahasa Melayu and Chinese. Each user picks their own.'],
        ],
    ];

    /**
     * @return array<string, mixed>
     */
    public static function homeContent(): array
    {
        return array_replace(self::DEFAULT_HOME, (array) Setting::get('homeContent'));
    }

    public function home(): Response
    {
        $content = self::homeContent();

        return Inertia::render('welcome', [
            'content' => $content,
            'listings' => $content['listing_enabled'] ? Property::query()
                ->where('display_in_listing', true)
                ->latest()
                ->limit(12)
                ->get()
                ->map(fn (Property $property) => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'city' => $property->city,
                    'state' => $property->state,
                    'listing_type' => $property->listing_type,
                    'listing_price' => $property->listing_price,
                    'thumbnail' => $property->file_path ? route('website.listing-thumbnail', ['property' => $property->id, 'v' => substr(md5($property->file_path), 0, 8)]) : null,
                ]) : [],
            'pages' => $this->footerPages(),
        ]);
    }

    public function page(string $slug): Response
    {
        $page = CustomPage::query()->where('slug', $slug)->where('enabled', true)->firstOrFail();

        return Inertia::render('custom-page', [
            'page' => $page->only(['title', 'content']),
            'pages' => $this->footerPages(),
        ]);
    }

    /**
     * Thumbnails of listed properties are public; every other thumbnail stays behind properties.thumbnail.
     */
    public function listingThumbnail(Property $property): StreamedResponse
    {
        abort_unless($property->display_in_listing, 404);

        return $property->previewUpload();
    }

    public function editHome(): Response
    {
        return Inertia::render('website/home', ['content' => self::homeContent()]);
    }

    public function updateHome(Request $request): RedirectResponse
    {
        $text = ['required', 'string', 'max:255'];
        $long = ['required', 'string', 'max:1000'];

        $content = $request->validate([
            'hero_title' => $text,
            'hero_subtitle' => $long,
            'portals' => ['present', 'array', 'max:6'],
            'portals.*.title' => $text,
            'portals.*.items' => ['present', 'array', 'max:10'],
            'portals.*.items.*' => $text,
            'listing_enabled' => ['required', 'boolean'],
            'listing_title' => $text,
            'listing_subtitle' => ['nullable', 'string', 'max:1000'],
            'features_title' => $text,
            'features_subtitle' => ['nullable', 'string', 'max:1000'],
            'features' => ['present', 'array', 'max:12'],
            'features.*.title' => $text,
            'features.*.body' => $long,
            'benefits_title' => $text,
            'benefits_text' => ['nullable', 'string', 'max:1000'],
            'benefits' => ['present', 'array', 'max:12'],
            'benefits.*' => $text,
            'faq_title' => $text,
            'faq_subtitle' => ['nullable', 'string', 'max:1000'],
            'faqs' => ['present', 'array', 'max:30'],
            'faqs.*.question' => $text,
            'faqs.*.answer' => ['required', 'string', 'max:2000'],
        ]);

        Setting::put(['homeContent' => array_map(fn ($value) => $value ?? '', $content)]);

        return $this->done(__('Home page saved.'));
    }

    public function additional(Request $request): Response
    {
        return Inertia::render('website/additional', [
            'pages' => TableQuery::paginate(CustomPage::query(), $request, ['title', 'slug'], ['title', 'slug', 'created_at'], 'title'),
            'filters' => TableQuery::filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        CustomPage::create($this->validated($request));

        return $this->done(__('Page created successfully.'));
    }

    public function update(Request $request, CustomPage $page): RedirectResponse
    {
        $page->update($this->validated($request, $page));

        return $this->done(__('Page updated successfully.'));
    }

    public function destroy(CustomPage $page): RedirectResponse
    {
        $page->delete();

        return $this->done(__('Page deleted successfully.'));
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?CustomPage $page = null): array
    {
        // A blank slug is made from the title.
        $request->merge(['slug' => Str::slug($request->string('slug')->toString() ?: $request->string('title')->toString())]);

        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique(CustomPage::class)->ignore($page)],
            'content' => ['required', 'string', 'max:65000'],
            'enabled' => ['required', 'boolean'],
        ]);
    }

    /**
     * @return list<array{title: string, slug: string}>
     */
    private function footerPages(): array
    {
        /** @var list<array{title: string, slug: string}> */
        return CustomPage::query()->where('enabled', true)->orderBy('title')->get(['title', 'slug'])->toArray();
    }
}
