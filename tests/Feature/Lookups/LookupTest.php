<?php

namespace Tests\Feature\Lookups;

use App\Models\Advantage;
use App\Models\Amenity;
use App\Models\Type;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LookupTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string, class-string<Model>, array<string, string>}>
     */
    public static function lookups(): array
    {
        return [
            'amenities' => ['amenities', Amenity::class, []],
            'advantages' => ['advantages', Advantage::class, []],
            'types' => ['types', Type::class, ['kind' => 'expense']],
        ];
    }

    /**
     * @param  class-string<Model>  $model
     * @param  array<string, string>  $extra
     */
    #[DataProvider('lookups')]
    public function test_admin_can_list_create_update_and_delete(string $module, string $model, array $extra): void
    {
        $this->actingAs($this->userWithRole());

        $this->post(route("{$module}.store"), ['name' => '', 'status' => 'nope'])->assertSessionHasErrors(['name', 'status', ...array_keys($extra)]);

        $this->post(route("{$module}.store"), ['name' => 'Rooftop', 'description' => 'Garden', 'status' => 'active', ...$extra])->assertSessionHasNoErrors();
        $record = $model::query()->where('name', 'Rooftop')->firstOrFail();

        $this->get(route("{$module}.index", ['search' => 'roof']))
            ->assertInertia(fn ($page) => $page->component("{$module}/index")->has("{$module}.data", 1)->where("{$module}.data.0.name", 'Rooftop'));

        $this->put(route("{$module}.update", $record->getKey()), ['name' => 'Roof Deck', 'status' => 'inactive', ...$extra])->assertSessionHasNoErrors();
        $this->assertSame('inactive', $record->fresh()?->getAttribute('status'));

        $this->get(route("{$module}.index", ['status' => 'active', 'search' => 'roof']))->assertInertia(fn ($page) => $page->has("{$module}.data", 0));

        $this->delete(route("{$module}.destroy", $record->getKey()))->assertSessionHasNoErrors();
        $this->assertModelMissing($record);
    }

    public function test_tenants_cannot_manage_lookups(): void
    {
        $this->actingAs($this->userWithRole('tenant'));

        foreach (['amenities', 'advantages', 'types'] as $module) {
            $this->get(route("{$module}.index"))->assertForbidden();
            $this->post(route("{$module}.store"), ['name' => 'X', 'status' => 'active'])->assertForbidden();
        }
    }

    public function test_types_filter_by_kind(): void
    {
        $this->actingAs($this->userWithRole());
        Type::create(['kind' => 'invoice', 'name' => 'Rent', 'status' => 'active']);
        Type::create(['kind' => 'expense', 'name' => 'Repairs', 'status' => 'active']);

        $this->get(route('types.index', ['kind' => 'expense']))
            ->assertInertia(fn ($page) => $page->has('types.data', 1)->where('types.data.0.name', 'Repairs')->where('filters.kind', 'expense'));
    }
}
