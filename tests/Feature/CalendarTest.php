<?php

namespace Tests\Feature;

use App\Models\Agreement;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_month_shows_lease_and_agreement_dates(): void
    {
        $this->actingAs($this->userWithRole());
        $unit = Property::query()->create([
            'name' => 'Bayu', 'type' => 'own', 'address' => 'Jalan 1', 'city' => 'PJ', 'state' => 'Selangor', 'zip_code' => '47800', 'country' => 'Malaysia',
        ])->units()->create(['name' => 'A-1', 'rent' => 2000, 'rent_type' => 'monthly', 'deposit_type' => 'fixed', 'late_fee_type' => 'fixed']);
        $tenant = User::factory()->create(['name' => 'Nurul'])->tenant()->create(['address' => 'J', 'city' => 'KL', 'state' => 'WP', 'zip_code' => '1', 'country' => 'MY']);
        $tenant->leases()->create(['unit_id' => $unit->id, 'start_date' => '2026-03-05', 'end_date' => '2027-03-04']);
        Agreement::query()->create(['unit_id' => $unit->id, 'tenant_id' => $tenant->id, 'start_date' => '2026-03-05', 'end_date' => '2026-03-31', 'status' => 'active', 'terms' => 'T']);

        $this->get(route('calendar.index', ['month' => '2026-03']))->assertInertia(fn ($page) => $page
            ->component('calendar/index')
            ->where('month', '2026-03')
            ->has('events', 3)
            ->where('events.0.date', '2026-03-05')
            ->where('events.2.type', 'agreement_end'));

        $this->get(route('calendar.index', ['month' => '2027-03']))->assertInertia(fn ($page) => $page->has('events', 1)->where('events.0.type', 'lease_end'));
        $this->get(route('calendar.index', ['month' => 'garbage']))->assertInertia(fn ($page) => $page->where('month', now()->format('Y-m')));
    }

    public function test_tenants_cannot_open_the_calendar(): void
    {
        $this->actingAs($this->userWithRole('tenant'))->get(route('calendar.index'))->assertForbidden();
    }
}
