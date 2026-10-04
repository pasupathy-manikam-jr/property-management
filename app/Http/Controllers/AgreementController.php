<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\Property;
use App\Models\Setting;
use App\Models\Tenant;
use App\Models\Unit;
use App\Support\TableQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AgreementController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Agreement::query()->visibleTo($request->user())
            ->with('unit:id,name,property_id', 'unit.property:id,name', 'tenant:id,user_id', 'tenant.user:id,name,email,avatar_path')
            ->when($request->integer('property_id'), fn (Builder $q, int $id) => $q->whereHas('unit', fn (Builder $u) => $u->where('property_id', $id)));

        $counts = TableQuery::countBy($query, 'status');
        $status = in_array($request->input('status'), Agreement::STATUSES, true) ? $request->input('status') : null;

        return Inertia::render('agreements/index', [
            'agreements' => TableQuery::paginate($query->when($status, fn (Builder $q, string $s) => $q->where('status', $s)), $request, ['number'], ['number', 'start_date', 'end_date', 'created_at']),
            'counts' => ['all' => $counts->sum(), ...collect(Agreement::STATUSES)->mapWithKeys(fn (string $s) => [$s => $counts[$s] ?? 0])],
            'properties' => Property::query()->orderBy('name')->get(['id', 'name']),
            'filters' => TableQuery::filters($request, ['property_id', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('agreements/form', [
            'agreement' => null,
            'defaultTerms' => Setting::get('agreementTerms'),
            ...$this->options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $agreement = new Agreement($this->validated($request));
        $agreement->attachUploadFrom($request)->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agreement created successfully.')]);

        return to_route('agreements.show', $agreement);
    }

    public function show(Request $request, Agreement $agreement): Response
    {
        $this->ensureVisible($request, $agreement);

        return Inertia::render('agreements/show', [
            'agreement' => $agreement->load('unit.property:id,name,address,city,state,zip_code,country', 'tenant.user:id,name,email,phone'),
            'canConfirm' => $agreement->status === 'pending' && $agreement->tenant_id === $request->user()?->tenant?->id,
            'company' => Arr::only(Setting::values(), ['companyName', 'companyEmail', 'companyPhone', 'companyAddress']),
        ]);
    }

    public function edit(Agreement $agreement): Response
    {
        return Inertia::render('agreements/form', [
            'agreement' => $agreement->load('unit:id,property_id'),
            ...$this->options(),
        ]);
    }

    public function update(Request $request, Agreement $agreement): RedirectResponse
    {
        $agreement->fill($this->validated($request))->attachUploadFrom($request)->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agreement updated successfully.')]);

        return to_route('agreements.show', $agreement);
    }

    /**
     * The tenant accepts a pending agreement.
     */
    public function confirm(Request $request, Agreement $agreement): RedirectResponse
    {
        abort_unless($agreement->tenant_id === $request->user()?->tenant?->id, 404);

        if ($agreement->status !== 'pending') {
            return $this->toast('error', __('Only a pending agreement can be confirmed.'));
        }

        $agreement->update(['status' => 'confirmed']);

        return $this->done(__('Agreement confirmed successfully.'));
    }

    public function document(Request $request, Agreement $agreement): StreamedResponse
    {
        $this->ensureVisible($request, $agreement);

        return $agreement->downloadUpload();
    }

    public function destroy(Agreement $agreement): RedirectResponse
    {
        $agreement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agreement deleted successfully.')]);

        return to_route('agreements.index');
    }

    private function ensureVisible(Request $request, Agreement $agreement): void
    {
        abort_unless(Agreement::query()->visibleTo($request->user())->whereKey($agreement->id)->exists(), 404);
    }

    /**
     * Properties → units (with the current tenant, to default the tenant picker) and every tenant.
     *
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'properties' => Property::query()->orderBy('name')
                ->with(['units' => fn ($q) => $q->orderBy('name')->select('id', 'property_id', 'name')->with('activeLease:id,unit_id,tenant_id')])
                ->get(['id', 'name']),
            'tenants' => Tenant::query()->with('user:id,name')->get(['id', 'user_id'])
                ->map(fn (Tenant $tenant) => ['id' => $tenant->id, 'name' => $tenant->user->name])
                ->sortBy('name')->values(),
        ];
    }

    /**
     * The tenant defaults to whoever currently leases the unit.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        if (! $request->filled('tenant_id') && $request->integer('unit_id')) {
            $request->merge(['tenant_id' => Unit::query()->find($request->integer('unit_id'))?->activeLease?->tenant_id]);
        }

        return Arr::except($request->validate([
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')],
            'tenant_id' => ['required', 'integer', Rule::exists('tenants', 'id')],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'status' => ['required', Rule::in(Agreement::STATUSES)],
            'terms' => ['required', 'string', 'max:20000'],
            'description' => ['nullable', 'string', 'max:5000'],
            'document' => Agreement::uploadRules(),
        ]), 'document');
    }
}
