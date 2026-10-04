<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Property;
use App\Models\Type;
use App\Support\TableQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim($request->string('search')->toString());

        $query = Expense::query()->with('type:id,name', 'property:id,name', 'unit:id,name')
            ->when($request->integer('property_id'), fn (Builder $q, int $id) => $q->where('property_id', $id))
            ->when($request->integer('type_id'), fn (Builder $q, int $id) => $q->where('type_id', $id))
            ->when($request->date('date_from'), fn (Builder $q, $date) => $q->whereDate('date', '>=', $date))
            ->when($request->date('date_to'), fn (Builder $q, $date) => $q->whereDate('date', '<=', $date))
            ->when($search, fn (Builder $q) => $q->where(fn (Builder $w) => $w->whereLike('title', "%{$search}%")->orWhereLike('number', "%{$search}%")));

        return Inertia::render('expenses/index', [
            'total' => (clone $query)->sum('amount'),
            'expenses' => TableQuery::paginate($query, $request->merge(['search' => null]), [], ['number', 'title', 'date', 'amount', 'created_at'], 'date'),
            ...$this->options(),
            'filters' => [...TableQuery::filters($request, ['property_id', 'type_id', 'date_from', 'date_to']), 'search' => $request->query('search')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $expense = new Expense(Arr::except($this->validated($request), 'receipt'));
        $expense->attachUploadFrom($request, 'receipt')->save();

        return $this->done(__('Expense created successfully.'));
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $expense->fill(Arr::except($this->validated($request), 'receipt'))->attachUploadFrom($request, 'receipt')->save();

        return $this->done(__('Expense updated successfully.'));
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        $expense->delete();

        return $this->done(__('Expense deleted successfully.'));
    }

    public function receipt(Expense $expense): StreamedResponse
    {
        return $expense->downloadUpload();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type_id' => ['required', 'integer', Rule::exists('types', 'id')->where('kind', 'expense')],
            'property_id' => ['required', 'integer', Rule::exists('properties', 'id')],
            'unit_id' => ['nullable', 'integer', Rule::exists('units', 'id')->where('property_id', $request->integer('property_id'))],
            'date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:9999999999999'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'receipt' => Expense::uploadRules(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'properties' => Property::query()->orderBy('name')
                ->with(['units' => fn ($q) => $q->orderBy('name')->select('id', 'property_id', 'name')])
                ->get(['id', 'name']),
            'types' => Type::query()->options('expense')->get(),
        ];
    }
}
