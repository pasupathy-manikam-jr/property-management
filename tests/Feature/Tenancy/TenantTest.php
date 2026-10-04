<?php

namespace Tests\Feature\Tenancy;

use App\Models\Lease;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantTest extends TestCase
{
    use RefreshDatabase;

    private function unit(string $name = 'A-1'): Unit
    {
        $property = Property::query()->firstOrCreate(['name' => 'Bayu'], [
            'type' => 'own', 'address' => 'Jalan 1', 'city' => 'PJ', 'state' => 'Selangor', 'zip_code' => '47800', 'country' => 'Malaysia',
        ]);

        return $property->units()->create([
            'name' => $name, 'rent' => 2000, 'rent_type' => 'monthly',
            'deposit_type' => 'fixed', 'late_fee_type' => 'fixed',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Unit $unit, array $overrides = []): array
    {
        return [
            'name' => 'Nurul Aisyah', 'email' => 'nurul@example.com', 'phone' => '012-3456789',
            'password' => 'Secret123!', 'password_confirmation' => 'Secret123!',
            'family_member' => 3, 'address' => 'Jalan 2', 'city' => 'KL', 'state' => 'WP', 'zip_code' => '50000', 'country' => 'Malaysia',
            'unit_id' => $unit->id, 'start_date' => '2026-01-01', 'end_date' => '2026-12-31',
            ...$overrides,
        ];
    }

    public function test_creating_a_tenant_makes_a_login_and_occupies_the_unit(): void
    {
        $this->actingAs($this->userWithRole());
        $unit = $this->unit();

        $this->post(route('tenants.store'), ['end_date' => 'x'])->assertSessionHasErrors(['name', 'email', 'unit_id', 'start_date', 'family_member']);

        $this->post(route('tenants.store'), $this->payload($unit))->assertRedirect();

        $tenant = Tenant::query()->sole();
        $this->assertTrue($tenant->user->hasRole('tenant'));
        $this->assertSame($unit->id, $tenant->activeLease?->unit_id);

        // The unit is now taken.
        $this->post(route('tenants.store'), $this->payload($unit, ['email' => 'other@example.com']))->assertSessionHasErrors('unit_id');

        $this->get(route('units.index', ['status' => 'occupied']))->assertInertia(fn ($page) => $page->has('units.data', 1));
        $this->get(route('properties.index'))->assertInertia(fn ($page) => $page->where('properties.data.0.occupied_units_count', 1));
    }

    public function test_renewing_closes_the_lease_and_can_keep_or_change_the_unit(): void
    {
        $this->actingAs($this->userWithRole());
        $first = $this->unit();
        $second = $this->unit('A-2');
        $this->post(route('tenants.store'), $this->payload($first));
        $tenant = Tenant::query()->sole();

        // Same unit is allowed for the tenant who holds it.
        $this->post(route('tenants.renew', $tenant), ['unit_id' => $first->id, 'start_date' => '2027-01-01', 'end_date' => '2027-12-31'])->assertSessionHasNoErrors();
        $this->post(route('tenants.renew', $tenant), ['unit_id' => $second->id, 'start_date' => '2028-01-01', 'end_date' => '2028-12-31'])->assertSessionHasNoErrors();

        $this->assertSame(['renewed', 'renewed', 'active'], $tenant->leases()->orderBy('id')->pluck('status')->all());
        $this->assertSame($second->id, $tenant->fresh()?->activeLease?->unit_id);

        $this->get(route('tenants.show', $tenant))->assertInertia(fn ($page) => $page->component('tenants/show')->has('leases', 3));
    }

    public function test_exiting_records_the_settlement_and_frees_the_unit(): void
    {
        $this->actingAs($this->userWithRole());
        $unit = $this->unit();
        $this->post(route('tenants.store'), $this->payload($unit));
        $tenant = Tenant::query()->sole();

        $this->post(route('tenants.exit', $tenant), ['exit_date' => '2025-01-01'])->assertSessionHasErrors('exit_date');
        $this->post(route('tenants.exit', $tenant), ['exit_date' => '2026-06-30', 'exit_amount' => 4000, 'extra_charge' => 150, 'exit_reason' => 'Moving'])->assertSessionHasNoErrors();

        $lease = Lease::query()->sole();
        $this->assertSame('exited', $lease->status);
        $this->assertSame('150.00', $lease->extra_charge);
        $this->assertNull($unit->activeLease()->first());

        $this->get(route('tenants.index', ['status' => 'exited']))->assertInertia(fn ($page) => $page->has('tenants.data', 1)->where('counts.active', 0));
    }

    public function test_updating_and_deleting_a_tenant(): void
    {
        $this->actingAs($this->userWithRole());
        $unit = $this->unit();
        $this->post(route('tenants.store'), $this->payload($unit));
        $tenant = Tenant::query()->sole();

        $this->put(route('tenants.update', $tenant), [...$this->payload($unit), 'name' => 'Nurul A.', 'family_member' => 4])->assertRedirect(route('tenants.show', $tenant));
        $this->assertSame('Nurul A.', $tenant->user->fresh()?->name);

        // Units with tenancy history are protected.
        $this->delete(route('units.destroy', $unit));
        $this->assertModelExists($unit);

        $userId = $tenant->user_id;
        $this->delete(route('tenants.destroy', $tenant))->assertRedirect(route('tenants.index'));
        $this->assertNull(User::find($userId));
        $this->assertSame(0, Lease::query()->count());
    }

    public function test_only_staff_with_permission_manage_tenants(): void
    {
        foreach (['tenant', 'maintainer'] as $role) {
            $this->actingAs($this->userWithRole($role))->get(route('tenants.index'))->assertForbidden();
        }

        $this->actingAs($this->userWithRole('manager'))->get(route('tenants.index'))->assertOk();
    }
}
