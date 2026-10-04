<?php

namespace App\Http\Controllers;

use App\Models\Lease;
use App\Models\Maintainer;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Type;
use App\Models\User;
use App\Support\Notify;
use App\Support\TableQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MaintenanceRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $this->user($request);
        $status = in_array($request->input('status'), MaintenanceRequest::STATUSES, true) ? $request->input('status') : null;
        $staff = $this->scope($user) === 'staff';

        $query = MaintenanceRequest::query()
            ->visibleTo($user)
            ->when($request->integer('property_id'), fn (Builder $q, int $id) => $q->where('property_id', $id))
            ->when($request->integer('maintainer_id'), fn (Builder $q, int $id) => $q->where('maintainer_id', $id))
            ->when(trim($request->string('search')->toString()), fn (Builder $q, string $search) => $q->where(fn (Builder $w) => $w
                ->whereHas('property', fn (Builder $p) => $p->whereLike('name', "%{$search}%"))
                ->orWhereHas('unit', fn (Builder $u) => $u->whereLike('name', "%{$search}%"))
                ->orWhereHas('issueType', fn (Builder $t) => $t->whereLike('name', "%{$search}%"))));

        $counts = TableQuery::countBy($query, 'status');

        $query->with('property:id,name', 'unit:id,name', 'tenant:id,user_id', 'tenant.user:id,name', 'maintainer:id,user_id', 'maintainer.user:id,name', 'issueType:id,name')
            ->when($status, fn (Builder $q, string $s) => $q->where('status', $s));

        return Inertia::render('maintenance-requests/index', [
            'requests' => TableQuery::paginate($query, $request->merge(['search' => null]), [], ['request_date', 'created_at'], 'request_date'),
            'counts' => ['all' => $counts->sum(), ...collect(MaintenanceRequest::STATUSES)->mapWithKeys(fn (string $s) => [$s => $counts[$s] ?? 0])->all()],
            'scope' => $this->scope($user),
            'issueTypes' => Type::query()->options('maintenance_issue')->get(),
            'properties' => $staff ? $this->propertyOptions() : [],
            'tenants' => $staff ? $this->tenantOptions() : [],
            'maintainers' => $staff ? $this->maintainerOptions() : [],
            'filters' => [...TableQuery::filters($request, ['status', 'property_id', 'maintainer_id']), 'search' => $request->query('search')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->user($request);

        if ($user->hasRole('tenant')) {
            $lease = $user->tenant?->activeLease()->with('unit:id,property_id')->first();

            if (! $lease) {
                return $this->toast('error', __('You have no active lease to report an issue for.'));
            }

            $data = [...$request->validate($this->tenantRules()), 'property_id' => $lease->unit->property_id, 'unit_id' => $lease->unit_id, 'tenant_id' => $lease->tenant_id, 'request_date' => today(), 'status' => 'pending'];
        } else {
            $data = $request->validate($this->rules($request), $this->messages());
            $data['tenant_id'] ??= Lease::query()->where('unit_id', $data['unit_id'])->where('status', 'active')->value('tenant_id');
        }

        $maintenanceRequest = new MaintenanceRequest(Arr::except($data, ['attachment', 'fixed_date', 'status']));
        $maintenanceRequest->setStatus($data['status'], $data['fixed_date'] ?? null)->attachUploadFrom($request, 'attachment')->save();
        Notify::maintenanceCreated($maintenanceRequest);

        return $this->done(__('Maintenance request created successfully.'));
    }

    public function show(Request $request, MaintenanceRequest $maintenanceRequest): Response
    {
        $user = $this->visible($request, $maintenanceRequest);

        return Inertia::render('maintenance-requests/show', [
            'request' => $maintenanceRequest->load(
                'property:id,name,address,city,state', 'unit:id,name', 'issueType:id,name',
                'tenant:id,user_id', 'tenant.user:id,name,email,phone,avatar_path',
                'maintainer:id,user_id,type_id', 'maintainer.user:id,name,email,phone,avatar_path', 'maintainer.type:id,name',
            ),
            'comments' => $maintenanceRequest->comments()->with('user:id,name,avatar_path')->oldest()->oldest('id')->get(),
            'maintainers' => $user->can('assign-maintainers') ? $this->maintainerOptions($maintenanceRequest->property_id) : [],
            'canChangeStatus' => $user->hasRole('maintainer'),
        ]);
    }

    public function update(Request $request, MaintenanceRequest $maintenanceRequest): RedirectResponse
    {
        $user = $this->visible($request, $maintenanceRequest);

        if ($user->hasRole('tenant')) {
            $maintenanceRequest->fill(Arr::except($request->validate($this->tenantRules()), ['attachment']));
        } else {
            $data = $request->validate($this->rules($request), $this->messages());
            $maintenanceRequest->fill(Arr::except($data, ['attachment', 'fixed_date', 'status']))->setStatus($data['status'], $data['fixed_date'] ?? null);
        }

        $maintenanceRequest->attachUploadFrom($request, 'attachment')->save();

        return $this->done(__('Maintenance request updated successfully.'));
    }

    public function destroy(Request $request, MaintenanceRequest $maintenanceRequest): RedirectResponse
    {
        $this->visible($request, $maintenanceRequest);
        $maintenanceRequest->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Maintenance request deleted successfully.')]);

        return to_route('maintenance-requests.index');
    }

    /**
     * Assign one of the property's maintainers and set the progress.
     */
    public function assign(Request $request, MaintenanceRequest $maintenanceRequest): RedirectResponse
    {
        $this->visible($request, $maintenanceRequest);

        $data = $request->validate([
            'maintainer_id' => ['required', 'integer', $this->assignedToProperty($maintenanceRequest->property_id)],
            'status' => ['required', Rule::in(MaintenanceRequest::STATUSES)],
        ], $this->messages());

        $maintenanceRequest->fill(['maintainer_id' => $data['maintainer_id']])->setStatus($data['status'])->save();

        return $this->done(__('Maintainer assigned successfully.'));
    }

    /**
     * The assigned maintainer reports progress.
     */
    public function status(Request $request, MaintenanceRequest $maintenanceRequest): RedirectResponse
    {
        $this->visible($request, $maintenanceRequest);

        $data = $request->validate(['status' => ['required', Rule::in(MaintenanceRequest::STATUSES)]]);
        $maintenanceRequest->setStatus($data['status'])->save();

        return $this->done(__('Status updated successfully.'));
    }

    public function comment(Request $request, MaintenanceRequest $maintenanceRequest): RedirectResponse
    {
        $user = $this->visible($request, $maintenanceRequest);

        $data = $request->validate(['comment' => ['required', 'string', 'max:2000']]);
        $maintenanceRequest->comments()->create([...$data, 'user_id' => $user->id]);

        return $this->done(__('Comment added.'));
    }

    public function attachment(Request $request, MaintenanceRequest $maintenanceRequest): StreamedResponse
    {
        $this->visible($request, $maintenanceRequest);

        return $maintenanceRequest->downloadUpload();
    }

    public function preview(Request $request, MaintenanceRequest $maintenanceRequest): StreamedResponse
    {
        $this->visible($request, $maintenanceRequest);

        return $maintenanceRequest->previewUpload();
    }

    private function user(Request $request): User
    {
        /** @var User */
        return $request->user();
    }

    /**
     * 404 for requests outside the user's scope (another tenant's, another maintainer's).
     */
    private function visible(Request $request, MaintenanceRequest $maintenanceRequest): User
    {
        $user = $this->user($request);
        abort_unless(MaintenanceRequest::query()->visibleTo($user)->whereKey($maintenanceRequest->id)->exists(), 404);

        return $user;
    }

    private function scope(User $user): string
    {
        return $user->hasRole('tenant') ? 'tenant' : ($user->hasRole('maintainer') ? 'maintainer' : 'staff');
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(Request $request): array
    {
        $propertyId = $request->integer('property_id');

        return [
            'property_id' => ['required', 'integer', Rule::exists('properties', 'id')],
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('property_id', $propertyId)],
            'tenant_id' => ['nullable', 'integer', Rule::exists('leases', 'tenant_id')->where('unit_id', $request->integer('unit_id'))],
            'request_date' => ['required', 'date'],
            'maintainer_id' => ['nullable', 'integer', $this->assignedToProperty($propertyId)],
            'status' => ['required', Rule::in(MaintenanceRequest::STATUSES)],
            'fixed_date' => ['nullable', 'date', 'after_or_equal:request_date'],
            ...$this->tenantRules(),
        ];
    }

    /**
     * The only fields a tenant fills in; the rest comes from their lease.
     *
     * @return array<string, mixed>
     */
    private function tenantRules(): array
    {
        return [
            'issue_type_id' => ['required', 'integer', Rule::exists('types', 'id')->where('kind', 'maintenance_issue')],
            'notes' => ['nullable', 'string', 'max:2000'],
            'attachment' => MaintenanceRequest::uploadRules(),
        ];
    }

    private function assignedToProperty(int $propertyId): Exists
    {
        return Rule::exists('maintainer_property', 'maintainer_id')->where('property_id', $propertyId);
    }

    /**
     * @return array<string, string>
     */
    private function messages(): array
    {
        return [
            'maintainer_id.exists' => __('This maintainer is not assigned to the property.'),
            'tenant_id.exists' => __('This tenant has never rented the unit.'),
        ];
    }

    /**
     * @return Collection<int, Property>
     */
    private function propertyOptions(): Collection
    {
        return Property::query()->orderBy('name')
            ->with(['units' => fn ($q) => $q->orderBy('name')->select('id', 'property_id', 'name')])
            ->get(['id', 'name']);
    }

    /**
     * Everyone who has rented each unit, current tenant first (the default choice).
     *
     * @return array<int, array{unit_id: int, id: int, name: string, current: bool}>
     */
    private function tenantOptions(): array
    {
        return Lease::query()->with('tenant:id,user_id', 'tenant.user:id,name')
            ->orderByRaw("status = 'active' desc")->latest('start_date')
            ->get(['unit_id', 'tenant_id', 'status', 'start_date'])
            ->unique(fn (Lease $lease) => "{$lease->unit_id}-{$lease->tenant_id}")
            ->map(fn (Lease $lease) => [
                'unit_id' => $lease->unit_id,
                'id' => $lease->tenant_id,
                'name' => $lease->tenant->user->name,
                'current' => $lease->status === 'active',
            ])->values()->all();
    }

    /**
     * Maintainers with their trade and the properties they cover.
     *
     * @return array<int, array{id: int, name: string, type: string|null, properties: array<mixed>}>
     */
    private function maintainerOptions(?int $propertyId = null): array
    {
        return Maintainer::query()
            ->with('user:id,name', 'type:id,name', 'properties:id')
            ->when($propertyId, fn (Builder $q, int $id) => $q->whereHas('properties', fn (Builder $p) => $p->whereKey($id)))
            ->get()
            ->sortBy('user.name')
            ->map(fn (Maintainer $m) => [
                'id' => $m->id,
                'name' => $m->user->name,
                'type' => $m->type?->name,
                'properties' => $m->properties->pluck('id')->all(),
            ])->values()->all();
    }
}
