<?php

namespace App\Http\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Models\Lease;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\Notify;
use App\Support\TableQuery;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    use PasswordValidationRules;

    private const PROFILE = ['family_member', 'address', 'city', 'state', 'zip_code', 'country'];

    public function index(Request $request): Response
    {
        $status = in_array($request->input('status'), ['active', 'exited'], true) ? $request->input('status') : null;

        $query = Tenant::query()
            ->with('user:id,name,email,phone,avatar_path', 'activeLease.unit:id,name,property_id', 'activeLease.unit.property:id,name')
            ->when($status === 'active', fn (Builder $q) => $q->whereHas('activeLease'))
            ->when($status === 'exited', fn (Builder $q) => $q->whereDoesntHave('activeLease'))
            ->when($request->integer('property_id'), fn (Builder $q, int $id) => $q->whereHas('activeLease.unit', fn (Builder $u) => $u->where('property_id', $id)))
            ->when(trim($request->string('search')->toString()), fn (Builder $q, string $search) => $q->whereHas('user', fn (Builder $u) => $u->whereLike('name', "%{$search}%")->orWhereLike('email', "%{$search}%")));

        return Inertia::render('tenants/index', [
            'tenants' => TableQuery::paginate($query, $request->merge(['search' => null]), [], ['created_at']),
            'counts' => [
                'all' => Tenant::query()->count(),
                'active' => Tenant::query()->whereHas('activeLease')->count(),
                'exited' => Tenant::query()->whereDoesntHave('activeLease')->count(),
            ],
            'properties' => $this->propertyOptions(),
            'filters' => [...TableQuery::filters($request, ['property_id', 'status']), 'search' => $request->query('search')],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('tenants/form', ['tenant' => null, 'properties' => $this->propertyOptions()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            ...$this->rules(),
            'email' => ['required', 'email', 'max:255', Rule::unique('users')],
            'password' => $this->passwordRules(),
            ...$this->leaseRules(),
        ]);

        $tenant = DB::transaction(function () use ($request, $data) {
            $user = User::create([...Arr::only($data, ['name', 'email', 'phone', 'password']), 'status' => 'active']);
            $user->forceFill(['email_verified_at' => now()])->save();
            $user->assignRole('tenant');
            $user->replaceAvatar($request->file('photo'));

            $tenant = $user->tenant()->create(Arr::only($data, self::PROFILE));
            $tenant->leases()->create(Arr::only($data, ['unit_id', 'start_date', 'end_date']));

            return $tenant;
        });

        Notify::tenantCreated($tenant, $data['password']);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tenant created successfully.')]);

        return to_route('tenants.show', $tenant);
    }

    public function show(Tenant $tenant): Response
    {
        return Inertia::render('tenants/show', [
            'tenant' => $tenant->load('user:id,name,email,phone,avatar_path,status', 'activeLease.unit.property:id,name'),
            'leases' => $tenant->leases()->with('unit:id,name,property_id', 'unit.property:id,name')->latest('start_date')->latest('id')->get(),
            'properties' => $this->propertyOptions(),
        ]);
    }

    public function edit(Tenant $tenant): Response
    {
        return Inertia::render('tenants/form', [
            'tenant' => $tenant->load('user:id,name,email,phone,avatar_path'),
            'properties' => [],
        ]);
    }

    public function update(Request $request, Tenant $tenant): RedirectResponse
    {
        $data = $request->validate([
            ...$this->rules(),
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($tenant->user_id)],
        ]);

        DB::transaction(function () use ($request, $tenant, $data) {
            $tenant->user->update(Arr::only($data, ['name', 'email', 'phone']));
            $tenant->user->replaceAvatar($request->file('photo'));
            $tenant->update(Arr::only($data, self::PROFILE));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tenant updated successfully.')]);

        return to_route('tenants.show', $tenant);
    }

    /**
     * Close the current tenancy as renewed and open the next one (same or another unit).
     */
    public function renew(Request $request, Tenant $tenant): RedirectResponse
    {
        $data = $request->validate($this->leaseRules($tenant));

        DB::transaction(function () use ($tenant, $data) {
            $tenant->activeLease?->update(['status' => 'renewed']);
            $tenant->leases()->create(Arr::only($data, ['unit_id', 'start_date', 'end_date']));
        });

        return $this->done(__('Lease renewed successfully.'));
    }

    /**
     * Move the tenant out: the unit becomes vacant and the settlement is recorded.
     */
    public function exit(Request $request, Tenant $tenant): RedirectResponse
    {
        $lease = $tenant->activeLease;

        if (! $lease) {
            return $this->toast('error', __('This tenant has no active lease.'));
        }

        $lease->update([...$request->validate([
            'exit_date' => ['required', 'date', 'after_or_equal:'.$lease->start_date->toDateString()],
            'exit_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'extra_charge' => ['nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'exit_reason' => ['nullable', 'string', 'max:1000'],
        ]), 'status' => 'exited']);

        return $this->done(__('Tenant moved out successfully.'));
    }

    public function destroy(Tenant $tenant): RedirectResponse
    {
        // The login account owns the profile and its leases (cascade).
        $tenant->user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tenant deleted successfully.')]);

        return to_route('tenants.index');
    }

    /**
     * Properties with their units and whether each is free, for the lease pickers.
     *
     * @return Collection<int, Property>
     */
    private function propertyOptions(): Collection
    {
        return Property::query()->orderBy('name')
            ->with(['units' => fn ($q) => $q->orderBy('name')->select('id', 'property_id', 'name')->withExists('activeLease as occupied')])
            ->get(['id', 'name']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'family_member' => ['required', 'integer', 'min:1', 'max:99'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'state' => ['required', 'string', 'max:255'],
            'zip_code' => ['required', 'string', 'max:20'],
            'country' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * The unit must be free; on renewal the tenant's own current unit counts as free.
     *
     * @return array<string, mixed>
     */
    private function leaseRules(?Tenant $tenant = null): array
    {
        return [
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id'), function (string $attribute, mixed $value, Closure $fail) use ($tenant) {
                $taken = Lease::query()->where('unit_id', $value)->where('status', 'active')
                    ->when($tenant, fn ($q) => $q->where('tenant_id', '!=', $tenant->id))
                    ->exists();

                if ($taken) {
                    $fail(__('This unit is already occupied.'));
                }
            }],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
        ];
    }
}
