<?php

namespace Tests\Feature\Maintenance;

use App\Models\Maintainer;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Type;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MaintenanceRequestTest extends TestCase
{
    use RefreshDatabase;

    private Property $property;

    private Unit $unit;

    private Type $issue;

    protected function setUp(): void
    {
        parent::setUp();

        $this->property = Property::query()->create([
            'type' => 'own', 'name' => 'Bayu', 'address' => 'Jalan 1', 'city' => 'PJ', 'state' => 'Selangor', 'zip_code' => '47800', 'country' => 'Malaysia',
        ]);
        $this->unit = $this->unit('A-1');
        $this->issue = Type::query()->create(['kind' => 'maintenance_issue', 'name' => 'Plumbing']);
    }

    private function unit(string $name, ?Property $property = null): Unit
    {
        return ($property ?? $this->property)->units()->create([
            'name' => $name, 'rent' => 2000, 'rent_type' => 'monthly', 'deposit_type' => 'fixed', 'late_fee_type' => 'fixed',
        ]);
    }

    private function tenant(?Unit $unit = null): Tenant
    {
        $user = $this->userWithRole('tenant');
        $tenant = $user->tenant()->create(['family_member' => 1, 'address' => 'Jalan 2', 'city' => 'KL', 'state' => 'WP', 'zip_code' => '50000', 'country' => 'Malaysia']);
        $tenant->leases()->create(['unit_id' => ($unit ?? $this->unit)->id, 'start_date' => '2026-01-01', 'end_date' => '2026-12-31']);

        return $tenant;
    }

    private function maintainer(?Property $property = null): Maintainer
    {
        $maintainer = Maintainer::query()->create(['user_id' => $this->userWithRole('maintainer')->id]);
        $maintainer->properties()->attach(($property ?? $this->property)->id);

        return $maintainer;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function request(array $attributes = []): MaintenanceRequest
    {
        return MaintenanceRequest::query()->create([
            'property_id' => $this->property->id, 'unit_id' => $this->unit->id, 'issue_type_id' => $this->issue->id,
            'request_date' => '2026-10-01', 'status' => 'pending', ...$attributes,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'property_id' => $this->property->id, 'unit_id' => $this->unit->id, 'request_date' => '2026-10-01',
            'issue_type_id' => $this->issue->id, 'status' => 'pending', 'notes' => 'Leaking sink',
            ...$overrides,
        ];
    }

    public function test_staff_create_a_request_defaulting_to_the_units_tenant(): void
    {
        Storage::fake('local');
        $this->actingAs($this->userWithRole());
        $tenant = $this->tenant();
        $outsider = $this->maintainer($other = Property::query()->create([
            'type' => 'own', 'name' => 'Bangsar', 'address' => 'Jalan 3', 'city' => 'KL', 'state' => 'WP', 'zip_code' => '59000', 'country' => 'Malaysia',
        ]));

        $this->post(route('maintenance-requests.store'), ['status' => 'x'])
            ->assertSessionHasErrors(['property_id', 'unit_id', 'request_date', 'issue_type_id', 'status']);
        // The unit must belong to the property, and the maintainer must cover it.
        $this->post(route('maintenance-requests.store'), $this->payload(['unit_id' => $this->unit('B-1', $other)->id, 'maintainer_id' => $outsider->id]))
            ->assertSessionHasErrors(['unit_id', 'maintainer_id']);

        $this->post(route('maintenance-requests.store'), $this->payload([
            'status' => 'completed', 'attachment' => UploadedFile::fake()->image('sink.jpg'),
        ]))->assertSessionHasNoErrors();

        $request = MaintenanceRequest::query()->sole();
        $this->assertSame($tenant->id, $request->tenant_id);
        $this->assertNotNull($request->fixed_date);
        $this->assertNotNull($request->preview);

        $this->get(route('maintenance-requests.preview', $request))->assertOk();
        $this->get(route('maintenance-requests.attachment', $request))->assertDownload('sink.jpg');
    }

    public function test_updating_and_deleting_a_request(): void
    {
        $this->actingAs($this->userWithRole());
        $request = $this->request(['status' => 'completed', 'fixed_date' => '2026-10-02']);

        $this->put(route('maintenance-requests.update', $request), $this->payload(['notes' => 'Fixed tap', 'status' => 'in_progress']))->assertSessionHasNoErrors();
        $request->refresh();
        $this->assertSame('Fixed tap', $request->notes);
        $this->assertNull($request->fixed_date);

        $request->comments()->create(['user_id' => auth()->id(), 'comment' => 'Hi']);
        $this->delete(route('maintenance-requests.destroy', $request))->assertRedirect(route('maintenance-requests.index'));
        $this->assertModelMissing($request);
        $this->assertDatabaseCount('maintenance_request_comments', 0);
    }

    public function test_status_tabs_and_filters(): void
    {
        $this->actingAs($this->userWithRole());
        $maintainer = $this->maintainer();
        $this->request(['maintainer_id' => $maintainer->id]);
        $this->request(['status' => 'in_progress']);
        $this->request(['status' => 'completed']);

        $this->get(route('maintenance-requests.index', ['status' => 'pending']))
            ->assertInertia(fn ($page) => $page->component('maintenance-requests/index')
                ->has('requests.data', 1)
                ->where('counts', ['all' => 3, 'pending' => 1, 'in_progress' => 1, 'completed' => 1]));
        $this->get(route('maintenance-requests.index', ['maintainer_id' => $maintainer->id]))
            ->assertInertia(fn ($page) => $page->has('requests.data', 1)->where('counts.all', 1));
        $this->get(route('maintenance-requests.index', ['property_id' => $this->property->id + 1]))
            ->assertInertia(fn ($page) => $page->has('requests.data', 0));
    }

    public function test_assigning_a_maintainer_and_commenting(): void
    {
        $this->actingAs($admin = $this->userWithRole());
        $request = $this->request();
        $maintainer = $this->maintainer();
        $outsider = $this->maintainer(Property::query()->create([
            'type' => 'own', 'name' => 'Bangsar', 'address' => 'Jalan 3', 'city' => 'KL', 'state' => 'WP', 'zip_code' => '59000', 'country' => 'Malaysia',
        ]));

        $this->post(route('maintenance-requests.assign', $request), ['maintainer_id' => $outsider->id, 'status' => 'pending'])->assertSessionHasErrors('maintainer_id');
        $this->post(route('maintenance-requests.assign', $request), ['maintainer_id' => $maintainer->id, 'status' => 'in_progress'])->assertSessionHasNoErrors();
        $this->assertSame([$maintainer->id, 'in_progress'], [$request->fresh()?->maintainer_id, $request->fresh()?->status]);

        $this->post(route('maintenance-requests.comment', $request), ['comment' => ''])->assertSessionHasErrors('comment');
        $this->post(route('maintenance-requests.comment', $request), ['comment' => 'On the way'])->assertSessionHasNoErrors();

        // The assigned maintainer sees it, comments and reports progress, but can't assign or delete.
        $this->actingAs($maintainer->user);
        $this->get(route('maintenance-requests.show', $request))
            ->assertInertia(fn ($page) => $page->component('maintenance-requests/show')->has('comments', 1)->where('canChangeStatus', true));
        $this->post(route('maintenance-requests.comment', $request), ['comment' => 'Done'])->assertSessionHasNoErrors();
        $this->post(route('maintenance-requests.status', $request), ['status' => 'completed'])->assertSessionHasNoErrors();
        $this->assertNotNull($request->fresh()?->fixed_date);
        $this->post(route('maintenance-requests.assign', $request), ['maintainer_id' => $maintainer->id, 'status' => 'pending'])->assertForbidden();
        $this->delete(route('maintenance-requests.destroy', $request))->assertForbidden();
        $this->post(route('maintenance-requests.store'), $this->payload())->assertForbidden();

        // Staff can't use the maintainer's status shortcut.
        $this->actingAs($admin)->post(route('maintenance-requests.status', $request), ['status' => 'pending'])->assertForbidden();
    }

    public function test_tenants_see_and_create_only_their_own_requests(): void
    {
        $tenant = $this->tenant();
        $neighbour = $this->tenant($this->unit('A-2'));
        $theirs = $this->request(['tenant_id' => $neighbour->id]);
        $this->actingAs($tenant->user);

        $this->post(route('maintenance-requests.store'), [])->assertSessionHasErrors('issue_type_id');
        // Property, unit and status come from the lease, whatever is posted.
        $this->post(route('maintenance-requests.store'), ['issue_type_id' => $this->issue->id, 'notes' => 'Door', 'unit_id' => 999, 'status' => 'completed'])->assertSessionHasNoErrors();

        $own = MaintenanceRequest::query()->where('tenant_id', $tenant->id)->sole();
        $this->assertSame([$this->unit->id, 'pending'], [$own->unit_id, $own->status]);

        $this->get(route('maintenance-requests.index'))
            ->assertInertia(fn ($page) => $page->has('requests.data', 1)->where('requests.data.0.id', $own->id)->where('scope', 'tenant')->has('properties', 0));
        $this->get(route('maintenance-requests.show', $own))->assertOk();
        $this->put(route('maintenance-requests.update', $own), ['issue_type_id' => $this->issue->id, 'notes' => 'Front door'])->assertSessionHasNoErrors();
        $this->assertSame('Front door', $own->fresh()?->notes);

        foreach ([
            fn () => $this->get(route('maintenance-requests.show', $theirs)),
            fn () => $this->put(route('maintenance-requests.update', $theirs), ['issue_type_id' => $this->issue->id]),
            fn () => $this->delete(route('maintenance-requests.destroy', $theirs)),
            fn () => $this->post(route('maintenance-requests.comment', $theirs), ['comment' => 'x']),
            fn () => $this->get(route('maintenance-requests.attachment', $theirs)),
        ] as $call) {
            $call()->assertNotFound();
        }
    }

    public function test_maintainers_see_only_requests_assigned_to_them(): void
    {
        $mine = $this->maintainer();
        $other = $this->maintainer();
        $assigned = $this->request(['maintainer_id' => $mine->id]);
        $notMine = $this->request(['maintainer_id' => $other->id]);
        $this->request();

        $this->actingAs($mine->user);
        $this->get(route('maintenance-requests.index'))
            ->assertInertia(fn ($page) => $page->has('requests.data', 1)->where('requests.data.0.id', $assigned->id)->where('counts.all', 1));
        $this->get(route('maintenance-requests.show', $notMine))->assertNotFound();
        $this->post(route('maintenance-requests.status', $notMine), ['status' => 'completed'])->assertNotFound();
    }

    public function test_users_without_permission_are_denied(): void
    {
        $user = User::factory()->create();
        $request = $this->request();

        $this->actingAs($user)->get(route('maintenance-requests.index'))->assertForbidden();
        $this->actingAs($user)->get(route('maintenance-requests.show', $request))->assertForbidden();
    }
}
