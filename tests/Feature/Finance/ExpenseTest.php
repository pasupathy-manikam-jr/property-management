<?php

namespace Tests\Feature\Finance;

use App\Models\Expense;
use App\Models\Property;
use App\Models\Type;
use App\Models\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    use RefreshDatabase;

    private Unit $unit;

    private Type $repairs;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->unit = $this->property('Bayu')->units()->create(['name' => 'A-1', 'rent' => 1000, 'rent_type' => 'monthly', 'deposit_type' => 'fixed', 'late_fee_type' => 'fixed']);
        $this->repairs = Type::query()->create(['kind' => 'expense', 'name' => 'Repairs']);
    }

    private function property(string $name): Property
    {
        return Property::query()->create(['type' => 'own', 'name' => $name, 'address' => 'x', 'city' => 'x', 'state' => 'x', 'zip_code' => '1', 'country' => 'x']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'title' => 'Pipe repair', 'type_id' => $this->repairs->id, 'property_id' => $this->unit->property_id,
            'unit_id' => $this->unit->id, 'date' => '2026-09-10', 'amount' => 480, 'notes' => 'Kitchen sink',
            ...$overrides,
        ];
    }

    public function test_creating_an_expense_with_a_receipt(): void
    {
        $this->actingAs($this->userWithRole());

        $this->post(route('expenses.store'), [])->assertSessionHasErrors(['title', 'type_id', 'property_id', 'date', 'amount']);
        $this->post(route('expenses.store'), $this->payload([
            'type_id' => Type::query()->create(['kind' => 'invoice', 'name' => 'Rent'])->id,
            'unit_id' => $this->property('Other')->units()->create(['name' => 'B-1', 'rent' => 1, 'rent_type' => 'monthly', 'deposit_type' => 'fixed', 'late_fee_type' => 'fixed'])->id,
            'receipt' => UploadedFile::fake()->create('virus.exe', 10),
        ]))->assertSessionHasErrors(['type_id', 'unit_id', 'receipt']);

        $this->post(route('expenses.store'), [...$this->payload(), 'receipt' => UploadedFile::fake()->create('receipt.pdf', 20, 'application/pdf')])->assertSessionHasNoErrors();

        $expense = Expense::query()->sole();
        $this->assertSame('EXP-0001', $expense->number);
        $this->assertSame('receipt.pdf', $expense->file_name);
        $this->get(route('expenses.receipt', $expense))->assertOk();
    }

    public function test_listing_filters_and_totals_the_matching_rows(): void
    {
        $this->actingAs($this->userWithRole());
        $other = $this->property('Other');
        $utilities = Type::query()->create(['kind' => 'expense', 'name' => 'Utilities']);

        Expense::query()->create($this->payload(['amount' => 100, 'date' => '2026-08-01']));
        Expense::query()->create($this->payload(['amount' => 250.5, 'date' => '2026-09-15']));
        Expense::query()->create($this->payload(['amount' => 70, 'date' => '2026-09-20', 'type_id' => $utilities->id]));
        Expense::query()->create($this->payload(['amount' => 999, 'property_id' => $other->id, 'unit_id' => null]));

        $this->get(route('expenses.index'))->assertInertia(fn ($page) => $page
            ->component('expenses/index')
            ->has('expenses.data', 4)
            ->where('total', fn ($total) => (float) $total === 1419.5));

        $this->get(route('expenses.index', [
            'property_id' => $this->unit->property_id, 'type_id' => $this->repairs->id, 'date_from' => '2026-09-01', 'date_to' => '2026-09-30',
        ]))->assertInertia(fn ($page) => $page
            ->has('expenses.data', 1)
            ->where('total', fn ($total) => (float) $total === 250.5));
    }

    public function test_updating_and_deleting_an_expense(): void
    {
        $this->actingAs($this->userWithRole());
        $this->post(route('expenses.store'), [...$this->payload(), 'receipt' => UploadedFile::fake()->image('old.jpg')]);
        $expense = Expense::query()->sole();
        $oldFile = $expense->file_path;

        $this->put(route('expenses.update', $expense), [...$this->payload(['amount' => 520, 'unit_id' => null]), 'receipt' => UploadedFile::fake()->image('new.jpg')])->assertSessionHasNoErrors();

        $expense->refresh();
        $this->assertSame(['520.00', null, 'new.jpg'], [$expense->amount, $expense->unit_id, $expense->file_name]);
        Storage::disk('local')->assertMissing((string) $oldFile);

        $this->delete(route('expenses.destroy', $expense));
        $this->assertModelMissing($expense);
        Storage::disk('local')->assertMissing((string) $expense->file_path);
    }

    public function test_only_staff_with_permission_manage_expenses(): void
    {
        foreach (['tenant', 'maintainer'] as $role) {
            $this->actingAs($this->userWithRole($role))->get(route('expenses.index'))->assertForbidden();
        }

        $this->actingAs($this->userWithRole('manager'))->get(route('expenses.index'))->assertOk();
    }
}
