<?php

namespace Tests\Feature\Agreements;

use App\Models\Agreement;
use App\Models\Property;
use App\Models\Setting;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AgreementTest extends TestCase
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
     * A tenant login leasing the unit.
     */
    private function tenantIn(Unit $unit): Tenant
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create()->assignRole('tenant');
        $tenant = $user->tenant()->create(['family_member' => 1, 'address' => 'Jalan 2', 'city' => 'KL', 'state' => 'WP', 'zip_code' => '50000', 'country' => 'Malaysia']);
        $tenant->leases()->create(['unit_id' => $unit->id, 'start_date' => '2026-01-01', 'end_date' => '2026-12-31']);

        return $tenant;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Unit $unit, array $overrides = []): array
    {
        return [
            'unit_id' => $unit->id, 'start_date' => '2026-01-01', 'end_date' => '2026-12-31',
            'status' => 'pending', 'terms' => 'Pay rent on time.', 'description' => 'Standard',
            ...$overrides,
        ];
    }

    public function test_admin_creates_numbered_agreements_defaulting_to_the_units_tenant(): void
    {
        Storage::fake('local');
        $this->actingAs($this->userWithRole());
        $unit = $this->unit();
        $tenant = $this->tenantIn($unit);

        $this->post(route('agreements.store'), ['status' => 'bogus', 'end_date' => 'x'])
            ->assertSessionHasErrors(['unit_id', 'tenant_id', 'start_date', 'status', 'terms']);
        $this->post(route('agreements.store'), $this->payload($unit, ['end_date' => '2025-01-01']))->assertSessionHasErrors('end_date');

        $this->post(route('agreements.store'), $this->payload($unit, ['document' => UploadedFile::fake()->create('lease.pdf', 10, 'application/pdf')]))
            ->assertRedirect(route('agreements.show', 1));

        Setting::put(['agreementPrefix' => 'TA-']);
        $this->post(route('agreements.store'), $this->payload($unit, ['tenant_id' => $tenant->id, 'status' => 'draft']));

        $this->assertSame(['AGR-0001', 'TA-0002'], Agreement::query()->orderBy('id')->pluck('number')->all());
        $first = Agreement::query()->findOrFail(1);
        $this->assertSame($tenant->id, $first->tenant_id);
        $this->assertSame('lease.pdf', $first->file_name);
        $this->get(route('agreements.document', $first))->assertDownload('lease.pdf');

        $this->get(route('agreements.index', ['status' => 'pending']))->assertInertia(fn ($page) => $page
            ->component('agreements/index')->has('agreements.data', 1)
            ->where('counts.all', 2)->where('counts.draft', 1)->where('counts.pending', 1));
        $this->get(route('agreements.index', ['property_id' => $unit->property_id + 1]))->assertInertia(fn ($page) => $page->has('agreements.data', 0));
        $this->get(route('agreements.show', $first))->assertInertia(fn ($page) => $page->component('agreements/show')->where('canConfirm', false));
    }

    public function test_updating_and_deleting_an_agreement(): void
    {
        $this->actingAs($this->userWithRole());
        $unit = $this->unit();
        $this->tenantIn($unit);
        $this->post(route('agreements.store'), $this->payload($unit));
        $agreement = Agreement::query()->sole();

        $this->get(route('agreements.edit', $agreement))->assertInertia(fn ($page) => $page->component('agreements/form'));
        $this->put(route('agreements.update', $agreement), $this->payload($unit, ['status' => 'active', 'terms' => 'New terms']))
            ->assertRedirect(route('agreements.show', $agreement));
        $this->assertSame('active', $agreement->fresh()?->status);
        $this->assertSame('AGR-0001', $agreement->fresh()?->number);

        $this->delete(route('agreements.destroy', $agreement))->assertRedirect(route('agreements.index'));
        $this->assertModelMissing($agreement);
    }

    public function test_tenants_see_and_confirm_only_their_own_pending_agreements(): void
    {
        $this->actingAs($this->userWithRole());
        $mine = $this->unit();
        $other = $this->unit('A-2');
        $tenant = $this->tenantIn($mine);
        $this->tenantIn($other);
        $this->post(route('agreements.store'), $this->payload($mine));
        $this->post(route('agreements.store'), $this->payload($other));
        [$own, $theirs] = Agreement::query()->orderBy('id')->get()->all();

        $this->actingAs($tenant->user);
        $this->get(route('agreements.index'))->assertInertia(fn ($page) => $page->has('agreements.data', 1)->where('agreements.data.0.id', $own->id));
        $this->get(route('agreements.show', $own))->assertInertia(fn ($page) => $page->where('canConfirm', true));
        $this->get(route('agreements.show', $theirs))->assertNotFound();
        $this->get(route('agreements.document', $theirs))->assertNotFound();
        $this->post(route('agreements.confirm', $theirs))->assertNotFound();

        $this->post(route('agreements.confirm', $own))->assertSessionHasNoErrors();
        $this->assertSame('confirmed', $own->fresh()?->status);

        // Only a pending agreement can be accepted, and nothing else may be changed.
        $own->update(['status' => 'draft']);
        $this->post(route('agreements.confirm', $own));
        $this->assertSame('draft', $own->fresh()?->status);
        $this->get(route('agreements.create'))->assertForbidden();
        $this->put(route('agreements.update', $own), $this->payload($mine))->assertForbidden();
        $this->delete(route('agreements.destroy', $own))->assertForbidden();
    }

    public function test_staff_cannot_confirm_and_roles_without_permission_are_denied(): void
    {
        $this->actingAs($this->userWithRole());
        $unit = $this->unit();
        $this->tenantIn($unit);
        $this->post(route('agreements.store'), $this->payload($unit));

        $this->post(route('agreements.confirm', Agreement::query()->sole()))->assertNotFound();

        $this->actingAs($this->userWithRole('maintainer'))->get(route('agreements.index'))->assertForbidden();
    }

    public function test_create_form_prefills_the_default_terms_from_settings(): void
    {
        Setting::put(['agreementTerms' => 'Rent is due on the 1st.']);

        $this->actingAs($this->userWithRole())
            ->get(route('agreements.create'))
            ->assertInertia(fn ($page) => $page->component('agreements/form')->where('defaultTerms', 'Rent is due on the 1st.'));
    }
}
