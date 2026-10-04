<?php

namespace Tests\Feature\System;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_roles_are_listed_with_counts_and_permissions_are_grouped_by_module()
    {
        $this->actingAs($this->userWithRole());

        $this->assertSame('Manage user', Permission::findByName('manage-users')->getAttribute('label'));
        $this->assertSame('users', Permission::findByName('manage-users')->getAttribute('module'));

        $this->get(route('roles.index', ['search' => 'admin']))
            ->assertInertia(fn ($page) => $page
                ->component('roles/index')
                ->has('roles.data', 1)
                ->where('roles.data.0.label', 'Admin')
                ->where('roles.data.0.permissions_count', Role::findByName('admin')->permissions()->count())
                ->where('roles.data.0.users_count', 1)
                ->where('roles.data.0.is_editable', false)
                ->where('roles.data.0.is_deletable', false));

        $this->get(route('roles.create'))
            ->assertInertia(fn ($page) => $page
                ->component('roles/form')
                ->where('permissions.Users.0.name', 'manage-users')
                ->has('permissions.Roles')
                ->has('permissions.Properties'));
    }

    public function test_custom_roles_can_be_created_updated_and_deleted()
    {
        $this->actingAs($this->userWithRole());

        $this->post(route('roles.store'), ['label' => '', 'permissions' => ['nope']])->assertSessionHasErrors(['label', 'permissions.0']);
        $this->post(route('roles.store'), ['label' => 'Admin'])->assertSessionHasErrors('label');

        $this->post(route('roles.store'), ['label' => 'Team Lead', 'description' => 'Leads', 'permissions' => ['manage-dashboard', 'manage-users']])
            ->assertRedirect(route('roles.index'));

        $role = Role::findByName('team-lead');
        $this->assertSame(['manage-dashboard', 'manage-users'], $role->permissions->pluck('name')->sort()->values()->all());

        $this->get(route('roles.edit', $role))->assertInertia(fn ($page) => $page->where('role.label', 'Team Lead')->has('role.permissions', 2));

        $this->put(route('roles.update', $role), ['label' => 'Squad Lead', 'permissions' => ['manage-dashboard']])->assertSessionHasNoErrors();
        $this->assertSame('Squad Lead', $role->fresh()->getAttribute('label'));
        $this->assertSame('team-lead', $role->fresh()->name);
        $this->assertCount(1, $role->fresh()->permissions);

        $this->delete(route('roles.destroy', $role));
        $this->assertModelMissing($role);
    }

    public function test_built_in_roles_are_protected()
    {
        $this->actingAs($this->userWithRole());
        $admin = Role::findByName('admin');
        $count = $admin->permissions()->count();

        $this->get(route('roles.edit', $admin))->assertForbidden();
        $this->put(route('roles.update', $admin), ['label' => 'Company', 'permissions' => []])->assertForbidden();
        $this->assertSame($count, $admin->permissions()->count());

        foreach (['admin', 'manager', 'tenant', 'maintainer'] as $name) {
            $this->delete(route('roles.destroy', Role::findByName($name)))->assertSessionHas('inertia.flash_data.toast.type', 'error');
            $this->assertModelExists(Role::findByName($name));
        }

        // hr stays editable (label, description, permissions) but keeps its name.
        $hr = Role::findByName('manager');
        $this->put(route('roles.update', $hr), ['label' => 'People Team', 'permissions' => ['manage-dashboard']])->assertSessionHasNoErrors();
        $this->assertSame('manager', $hr->fresh()->name);
    }

    public function test_a_role_held_by_users_cannot_be_deleted()
    {
        $this->actingAs($this->userWithRole());
        $role = Role::create(['name' => 'auditor', 'label' => 'Auditor']);
        User::factory()->create()->assignRole($role);

        $this->delete(route('roles.destroy', $role))
            ->assertSessionHas('inertia.flash_data.toast.type', 'error')
            ->assertSessionHas('inertia.flash_data.toast.message', 'This role is assigned to users. Reassign them before deleting it.');
        $this->assertModelExists($role);
    }

    public function test_role_edits_apply_to_holders_on_their_next_request()
    {
        $this->actingAs($this->userWithRole());
        $role = Role::create(['name' => 'viewer', 'label' => 'Viewer'])->givePermissionTo(['manage-dashboard', 'manage-users']);
        $holder = User::factory()->create()->assignRole($role);

        $this->actingAs($holder)->get(route('users.index'))->assertOk();

        $this->actingAs(User::role('admin')->firstOrFail())
            ->put(route('roles.update', $role), ['label' => 'Viewer', 'permissions' => ['manage-dashboard']])
            ->assertSessionHasNoErrors();

        $this->actingAs($holder->fresh())->get(route('users.index'))->assertForbidden();
        $this->get(route('dashboard'))->assertInertia(fn ($page) => $page->where('auth.permissions', ['manage-dashboard']));
    }

    public function test_tenants_and_maintainers_cannot_manage_roles()
    {
        $role = Role::create(['name' => 'temp', 'label' => 'Temp']);

        foreach (['tenant', 'maintainer'] as $name) {
            $this->actingAs($this->userWithRole($name));

            $this->get(route('roles.index'))->assertForbidden();
            $this->get(route('roles.create'))->assertForbidden();
            $this->post(route('roles.store'), ['label' => 'X'])->assertForbidden();
            $this->put(route('roles.update', $role), ['label' => 'X'])->assertForbidden();
            $this->delete(route('roles.destroy', $role))->assertForbidden();
        }

        $this->assertModelExists($role);
    }

    public function test_role_page_shows_users_and_permissions_grouped_by_module()
    {
        $this->withoutVite();
        $admin = $this->userWithRole();
        $hr = User::factory()->create()->assignRole('manager');

        $this->actingAs($admin)
            ->get(route('roles.show', Role::findByName('manager')))
            ->assertInertia(fn ($page) => $page
                ->component('roles/show')
                ->where('role.name', 'manager')
                ->where('users.0.email', $hr->email)
                ->has('permissions.Tenants')
                ->where('permissions.Tenants', fn ($items) => collect($items)->pluck('name')->contains('manage-tenants')));
    }

    public function test_only_role_managers_can_open_a_role()
    {
        $this->withoutVite();

        $this->actingAs($this->userWithRole('manager'))->get(route('roles.show', Role::findByName('manager')))->assertForbidden();
    }
}
