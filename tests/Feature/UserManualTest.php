<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManualTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_role_can_read_the_manual_and_guests_cannot(): void
    {
        $this->get(route('user-manual'))->assertRedirect(route('login'));

        foreach (['admin', 'manager', 'tenant', 'maintainer'] as $role) {
            $this->actingAs($this->userWithRole($role))
                ->get(route('user-manual'))
                ->assertInertia(fn ($page) => $page->component('user-manual'));
        }
    }
}
