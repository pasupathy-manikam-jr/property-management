<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\Unit;
use App\Support\TableQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Unit::query()->with('property:id,name', 'activeLease:id,unit_id,tenant_id,end_date', 'activeLease.tenant:id,user_id', 'activeLease.tenant.user:id,name')
            ->when($request->integer('property_id'), fn ($q, $id) => $q->where('property_id', $id))
            ->when($request->input('status') === 'occupied', fn ($q) => $q->whereHas('activeLease'))
            ->when($request->input('status') === 'vacant', fn ($q) => $q->whereDoesntHave('activeLease'));

        return Inertia::render('units/index', [
            'units' => TableQuery::paginate($query, $request, ['name'], ['name', 'rent', 'created_at']),
            'properties' => Property::query()->orderBy('name')->get(['id', 'name']),
            'filters' => TableQuery::filters($request, ['property_id', 'status']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Unit::create($request->validate([
            'property_id' => ['required', Rule::exists('properties', 'id')],
            ...Unit::rules(),
        ]));

        return $this->done(__('Unit created successfully.'));
    }

    public function update(Request $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validate(Unit::rules()));

        return $this->done(__('Unit updated successfully.'));
    }

    public function destroy(Unit $unit): RedirectResponse
    {
        if ($unit->leases()->exists()) {
            return $this->toast('error', __('This unit has tenancy records and cannot be deleted.'));
        }

        $unit->delete();

        return $this->done(__('Unit deleted successfully.'));
    }
}
