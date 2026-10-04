<?php

namespace Tests\Feature\Communication;

use App\Models\Contact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_keep_their_own_contact_diary(): void
    {
        $tenant = $this->userWithRole('tenant');
        $this->actingAs($tenant);

        $this->post(route('contacts.store'), ['email' => 'nope'])->assertSessionHasErrors(['name', 'email']);
        $this->post(route('contacts.store'), ['name' => 'Ahmad Plumber', 'email' => 'ahmad@example.com', 'contact_number' => '+60 12-334 5566', 'subject' => 'Plumbing'])
            ->assertSessionHasNoErrors();
        $own = Contact::query()->sole();
        $this->assertSame($tenant->id, $own->created_by);

        $this->put(route('contacts.update', $own), ['name' => 'Ahmad P.'])->assertSessionHasNoErrors();
        $this->assertSame('Ahmad P.', $own->fresh()?->name);

        // Another user doesn't see it and cannot touch it; the admin sees everyone's.
        $other = $this->userWithRole('maintainer');
        $this->actingAs($other)->post(route('contacts.store'), ['name' => 'Lift Tech']);
        $this->get(route('contacts.index'))->assertInertia(fn ($page) => $page->component('contacts/index')->has('contacts.data', 1)->where('contacts.data.0.name', 'Lift Tech'));
        $this->put(route('contacts.update', $own), ['name' => 'Hijack'])->assertNotFound();
        $this->delete(route('contacts.destroy', $own))->assertNotFound();

        $this->actingAs($this->userWithRole())->get(route('contacts.index', ['search' => 'lift']))->assertInertia(fn ($page) => $page->has('contacts.data', 1));
        $this->get(route('contacts.index'))->assertInertia(fn ($page) => $page->has('contacts.data', 2));

        $this->actingAs($tenant)->delete(route('contacts.destroy', $own))->assertSessionHasNoErrors();
        $this->assertModelMissing($own);
    }

    public function test_roles_without_contact_permissions_are_denied(): void
    {
        $user = $this->userWithRole('maintainer');
        $user->syncRoles([]);

        $this->actingAs($user)->get(route('contacts.index'))->assertForbidden();
    }
}
