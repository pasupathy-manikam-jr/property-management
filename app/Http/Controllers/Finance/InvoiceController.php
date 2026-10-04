<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Property;
use App\Models\Setting;
use App\Models\Tenant;
use App\Models\Type;
use App\Support\Notify;
use App\Support\TableQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $staff = ! $request->user()->hasRole('tenant');
        $status = in_array($request->input('status'), Invoice::STATUSES, true) ? $request->input('status') : null;

        $base = Invoice::query()->visibleTo($request->user())
            ->when($request->integer('property_id'), fn (Builder $q, int $id) => $q->where('property_id', $id))
            ->when($staff && $request->integer('tenant_id'), fn (Builder $q) => $q->where('tenant_id', $request->integer('tenant_id')));

        $query = (clone $base)
            ->with('property:id,name', 'unit:id,name', 'tenant:id,user_id', 'tenant.user:id,name,avatar_path')
            ->when($status, fn (Builder $q, string $s) => $q->status($s));

        return Inertia::render('invoices/index', [
            'invoices' => TableQuery::paginate($query, $request, ['number'], ['number', 'invoice_month', 'end_date', 'total', 'created_at']),
            'counts' => [
                'all' => (clone $base)->count(),
                ...collect(Invoice::STATUSES)->mapWithKeys(fn (string $s) => [$s => (clone $base)->status($s)->count()]),
            ],
            'properties' => Property::query()->orderBy('name')->get(['id', 'name']),
            'tenants' => $staff ? $this->tenantOptions() : [],
            'filters' => TableQuery::filters($request, ['property_id', 'tenant_id', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('invoices/form', ['invoice' => null, ...$this->formOptions()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $invoice = DB::transaction(function () use ($data) {
            $invoice = Invoice::create($this->attributes($data));
            $invoice->items()->createMany(Arr::map($data['items'], fn (array $item) => Arr::except($item, 'id')));
            $invoice->refreshTotals();

            return $invoice;
        });

        Notify::invoiceCreated($invoice);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invoice created successfully.')]);

        return to_route('invoices.show', $invoice);
    }

    public function show(Request $request, Invoice $invoice): Response
    {
        abort_unless(Invoice::query()->visibleTo($request->user())->whereKey($invoice->id)->exists(), 404);

        return Inertia::render('invoices/show', [
            'invoice' => $invoice->load(
                'property:id,name,address,city,state,zip_code,country',
                'unit:id,name',
                'tenant:id,user_id,address,city,state,zip_code,country',
                'tenant.user:id,name,email,phone',
                'items.type:id,name',
            ),
            'payments' => $invoice->payments()->with('user:id,name')->latest('payment_date')->latest('id')->get()
                ->each(fn ($payment) => $payment->setAttribute('has_receipt', $payment->file_path !== null)),
            'company' => Arr::only(Setting::values(), ['companyName', 'companyEmail', 'companyPhone', 'companyAddress', 'taxTitle', 'taxNumber']),
            'payAsTenant' => $request->user()->hasRole('tenant'),
        ]);
    }

    public function edit(Invoice $invoice): Response
    {
        return Inertia::render('invoices/form', ['invoice' => $invoice->load('items'), ...$this->formOptions()]);
    }

    public function update(Request $request, Invoice $invoice): RedirectResponse
    {
        $data = $this->validated($request);
        $kept = array_filter(Arr::pluck($data['items'], 'id'));

        if (! $request->user()->can('delete-invoice-items') && $invoice->items()->whereNotIn('id', $kept)->exists()) {
            throw ValidationException::withMessages(['items' => __('You do not have permission to remove invoice items.')]);
        }

        DB::transaction(function () use ($invoice, $data, $kept) {
            $invoice->update($this->attributes($data));
            $invoice->items()->whereNotIn('id', $kept)->delete();

            foreach ($data['items'] as $item) {
                $values = Arr::except($item, 'id');
                empty($item['id'])
                    ? $invoice->items()->create($values)
                    : $invoice->items()->whereKey($item['id'])->update($values);
            }

            $invoice->refreshTotals();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invoice updated successfully.')]);

        return to_route('invoices.show', $invoice);
    }

    public function destroy(Invoice $invoice): RedirectResponse
    {
        // Payment receipts are removed with their rows (StoresUploads deletes on each model).
        DB::transaction(function () use ($invoice) {
            $invoice->payments->each->delete();
            $invoice->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invoice deleted successfully.')]);

        return to_route('invoices.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'property_id' => ['required', 'integer', Rule::exists('properties', 'id')],
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('property_id', $request->integer('property_id'))],
            'tenant_id' => ['required', 'integer', Rule::exists('tenants', 'id')],
            'invoice_month' => ['required', 'date'],
            'end_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_recurring' => ['boolean'],
            'recurring_day' => ['nullable', 'required_if_accepted:is_recurring', 'integer', 'min:1', 'max:28'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.type_id' => ['required', 'integer', Rule::exists('types', 'id')->where('kind', 'invoice')],
            'items.*.amount' => ['required', 'numeric', 'min:0.01', 'max:9999999999999'],
            'items.*.description' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        $recurring = (bool) ($data['is_recurring'] ?? false);

        return [
            ...Arr::only($data, ['property_id', 'unit_id', 'tenant_id', 'end_date', 'notes']),
            'invoice_month' => Carbon::parse($data['invoice_month'])->startOfMonth(),
            'is_recurring' => $recurring,
            'recurring_day' => $recurring ? $data['recurring_day'] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            // Each unit carries its current tenant so the form can pre-select them.
            'properties' => Property::query()->orderBy('name')
                ->with(['units' => fn ($q) => $q->orderBy('name')->select('id', 'property_id', 'name')->with('activeLease:id,unit_id,tenant_id')])
                ->get(['id', 'name']),
            'tenants' => $this->tenantOptions(),
            'types' => Type::query()->options('invoice')->get(),
        ];
    }

    /**
     * @return Collection<int, Tenant>
     */
    private function tenantOptions(): Collection
    {
        return Tenant::query()->join('users', 'users.id', '=', 'tenants.user_id')
            ->orderBy('users.name')->get(['tenants.id', 'users.name']);
    }
}
