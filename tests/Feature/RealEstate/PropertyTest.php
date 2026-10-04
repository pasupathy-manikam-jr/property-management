<?php

namespace Tests\Feature\RealEstate;

use App\Models\Amenity;
use App\Models\Property;
use App\Models\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PropertyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'type' => 'own',
            'name' => 'Residensi Bayu',
            'description' => 'Condo near the MRT',
            'address' => 'Jalan PJU 7/3',
            'city' => 'Petaling Jaya',
            'state' => 'Selangor',
            'zip_code' => '47800',
            'country' => 'Malaysia',
            'display_in_listing' => false,
            ...$overrides,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function unit(array $overrides = []): array
    {
        return [
            'name' => 'A-10-1', 'bedroom' => 3, 'kitchen' => 1, 'baths' => 2,
            'rent' => 2800, 'rent_type' => 'monthly',
            'deposit_type' => 'fixed', 'deposit_amount' => 5600,
            'late_fee_type' => 'percentage', 'late_fee_amount' => 5,
            'incident_receipt_amount' => 0,
            ...$overrides,
        ];
    }

    public function test_admin_creates_a_property_with_its_first_unit_thumbnail_and_amenities(): void
    {
        Storage::fake('local');
        $this->actingAs($this->userWithRole());
        $gym = Amenity::create(['name' => 'Gym', 'status' => 'active']);

        $this->post(route('properties.store'), ['type' => 'nope', 'unit' => ['rent_type' => 'custom']])
            ->assertSessionHasErrors(['type', 'name', 'address', 'unit.name', 'unit.rent', 'unit.rent_duration', 'unit.start_date']);

        $response = $this->post(route('properties.store'), $this->payload([
            'thumbnail' => UploadedFile::fake()->image('front.jpg'),
            'amenities' => [$gym->id],
            'unit' => $this->unit(),
        ]));

        $property = Property::query()->sole();
        $response->assertRedirect(route('properties.show', $property));
        $this->assertSame(['Gym'], $property->amenities->pluck('name')->all());
        $this->assertSame('A-10-1', $property->units()->sole()->name);
        Storage::disk('local')->assertExists((string) $property->file_path);

        $this->get(route('properties.thumbnail', $property))->assertOk();
        $this->get(route('properties.show', $property))
            ->assertInertia(fn ($page) => $page->component('properties/show')->where('property.amenities.0.name', 'Gym')->has('units', 1));
    }

    public function test_listing_needs_a_type_and_price_when_shown_on_the_website(): void
    {
        $this->actingAs($this->userWithRole());
        $property = Property::create($this->payload());

        $this->put(route('properties.update', $property), $this->payload(['display_in_listing' => true, 'listing_type' => null]))
            ->assertSessionHasErrors(['listing_type', 'listing_price']);

        $this->put(route('properties.update', $property), $this->payload(['name' => 'Bayu II', 'display_in_listing' => true, 'listing_type' => 'rent', 'listing_price' => 2500]))
            ->assertRedirect(route('properties.show', $property));
        $this->assertSame('Bayu II', $property->fresh()?->name);
    }

    public function test_list_filters_by_type_and_counts_each_type(): void
    {
        $this->actingAs($this->userWithRole());
        Property::create($this->payload(['name' => 'Owned']));
        Property::create($this->payload(['name' => 'Leased', 'type' => 'lease']));

        $this->get(route('properties.index', ['type' => 'lease']))
            ->assertInertia(fn ($page) => $page->component('properties/index')
                ->has('properties.data', 1)->where('properties.data.0.name', 'Leased')
                ->where('counts', ['all' => 2, 'own' => 1, 'lease' => 1]));
    }

    public function test_deleting_a_property_removes_its_units(): void
    {
        $this->actingAs($this->userWithRole());
        $property = Property::create($this->payload());
        $unit = $property->units()->create($this->unit());

        $this->delete(route('properties.destroy', $property))->assertRedirect(route('properties.index'));
        $this->assertModelMissing($unit);
    }

    public function test_units_can_be_added_updated_and_deleted(): void
    {
        $this->actingAs($this->userWithRole('manager'));
        $property = Property::create($this->payload());

        $this->post(route('units.store'), $this->unit(['property_id' => $property->id]))->assertSessionHasNoErrors();
        $unit = Unit::query()->sole();

        $this->put(route('units.update', $unit), $this->unit(['rent' => 3000, 'rent_type' => 'custom', 'rent_duration' => 90, 'start_date' => '2026-01-01', 'end_date' => '2025-12-01']))
            ->assertSessionHasErrors('end_date');
        $this->put(route('units.update', $unit), $this->unit(['rent' => 3000]))->assertSessionHasNoErrors();
        $this->assertSame('3000.00', $unit->fresh()?->rent);

        $this->get(route('units.index', ['property_id' => $property->id]))->assertInertia(fn ($page) => $page->has('units.data', 1)->where('units.data.0.property.name', 'Residensi Bayu'));

        $this->delete(route('units.destroy', $unit))->assertSessionHasNoErrors();
        $this->assertModelMissing($unit);
    }

    public function test_tenants_and_maintainers_cannot_manage_properties(): void
    {
        foreach (['tenant', 'maintainer'] as $role) {
            $this->actingAs($this->userWithRole($role));
            $this->get(route('properties.index'))->assertForbidden();
            $this->get(route('units.index'))->assertForbidden();
            $this->post(route('properties.store'), $this->payload())->assertForbidden();
        }
    }
}
