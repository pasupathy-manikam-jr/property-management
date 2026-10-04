<?php

namespace Tests\Feature\Maintenance;

use App\Models\Maintainer;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Type;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaintainerTest extends TestCase
{
    use RefreshDatabase;

    private function property(string $name = 'Bayu'): Property
    {
        return Property::query()->create([
            'type' => 'own', 'name' => $name, 'address' => 'Jalan 1', 'city' => 'PJ', 'state' => 'Selangor', 'zip_code' => '47800', 'country' => 'Malaysia',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'name' => 'Ahmad Zulkifli', 'email' => 'ahmad@example.com', 'phone' => '012-7783401',
            'password' => 'Secret123!', 'password_confirmation' => 'Secret123!',
            'type_id' => Type::query()->firstOrCreate(['kind' => 'maintainer_type', 'name' => 'Electrician'])->id,
            'properties' => [$this->property()->id],
            ...$overrides,
        ];
    }

    public function test_creating_a_maintainer_makes_a_login_with_properties(): void
    {
        $this->actingAs($this->userWithRole());
        $issue = Type::query()->create(['kind' => 'maintenance_issue', 'name' => 'Plumbing']);

        $this->post(route('maintainers.store'), ['type_id' => $issue->id])
            ->assertSessionHasErrors(['name', 'email', 'phone', 'password', 'type_id', 'properties']);

        $this->post(route('maintainers.store'), $this->payload())->assertRedirect();

        $maintainer = Maintainer::query()->sole();
        $this->assertTrue($maintainer->user->hasRole('maintainer'));
        $this->assertCount(1, $maintainer->properties);

        $this->get(route('maintainers.show', $maintainer))
            ->assertInertia(fn ($page) => $page->component('maintainers/show')->has('maintainer.properties', 1)->has('requests', 0));
    }

    public function test_listing_filters_by_property_and_type(): void
    {
        $this->actingAs($this->userWithRole());
        $this->post(route('maintainers.store'), $this->payload());
        $other = $this->property('Bangsar');
        $plumber = Type::query()->create(['kind' => 'maintainer_type', 'name' => 'Plumber']);
        $this->post(route('maintainers.store'), $this->payload(['email' => 'lee@example.com', 'type_id' => $plumber->id, 'properties' => [$other->id]]));

        $this->get(route('maintainers.index'))->assertInertia(fn ($page) => $page->component('maintainers/index')->has('maintainers.data', 2));
        $this->get(route('maintainers.index', ['property_id' => $other->id]))->assertInertia(fn ($page) => $page->has('maintainers.data', 1));
        $this->get(route('maintainers.index', ['type_id' => $plumber->id]))->assertInertia(fn ($page) => $page->has('maintainers.data', 1)->where('maintainers.data.0.user.email', 'lee@example.com'));
    }

    public function test_updating_and_deleting_a_maintainer(): void
    {
        $this->actingAs($this->userWithRole());
        $this->post(route('maintainers.store'), $this->payload());
        $maintainer = Maintainer::query()->sole();
        $other = $this->property('Bangsar');

        $this->put(route('maintainers.update', $maintainer), [...$this->payload(), 'name' => 'Ahmad Z.', 'properties' => [$other->id]])
            ->assertRedirect(route('maintainers.show', $maintainer));
        $this->assertSame('Ahmad Z.', $maintainer->user->fresh()?->name);
        $this->assertSame([$other->id], $maintainer->properties()->pluck('properties.id')->all());

        $request = MaintenanceRequest::query()->create([
            'property_id' => $other->id, 'unit_id' => $other->units()->create(['name' => 'A-1', 'rent' => 1, 'rent_type' => 'monthly', 'deposit_type' => 'fixed', 'late_fee_type' => 'fixed'])->id,
            'maintainer_id' => $maintainer->id, 'request_date' => '2026-10-01', 'status' => 'pending',
        ]);

        $userId = $maintainer->user_id;
        $this->delete(route('maintainers.destroy', $maintainer))->assertRedirect(route('maintainers.index'));
        $this->assertNull(User::find($userId));
        $this->assertNull($request->fresh()?->maintainer_id);
    }

    public function test_only_staff_with_permission_manage_maintainers(): void
    {
        foreach (['tenant', 'maintainer'] as $role) {
            $this->actingAs($this->userWithRole($role))->get(route('maintainers.index'))->assertForbidden();
        }

        $this->actingAs($this->userWithRole('manager'))->get(route('maintainers.index'))->assertOk();
        $this->actingAs($this->userWithRole('maintainer'))->post(route('maintainers.store'), $this->payload())->assertForbidden();
    }
}
