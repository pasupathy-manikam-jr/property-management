<?php

namespace App\Http\Controllers;

use App\Models\Advantage;
use App\Models\Amenity;
use App\Models\Expense;
use App\Models\Lease;
use App\Models\Property;
use App\Models\Unit;
use App\Support\TableQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PropertyController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Property::query()->withCount(['units', 'units as occupied_units_count' => fn ($q) => $q->whereHas('activeLease')]);

        return Inertia::render('properties/index', [
            'properties' => TableQuery::paginate(
                (clone $query)->when(in_array($request->input('type'), Property::TYPES, true), fn ($q) => $q->where('type', $request->input('type'))),
                $request, ['name', 'address', 'city', 'state'], ['name', 'created_at'],
            ),
            'counts' => ['all' => Property::query()->count(), ...TableQuery::countBy(Property::query(), 'type')->all()],
            'filters' => TableQuery::filters($request, ['type']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('properties/form', ['property' => null, ...$this->options()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([...$this->rules(), ...Unit::rules('unit.')]);

        $property = DB::transaction(function () use ($request, $data) {
            $property = Property::create(Arr::except($data, ['thumbnail', 'amenities', 'advantages', 'unit']));
            $property->attachUploadFrom($request, 'thumbnail')->save();
            $property->amenities()->sync($data['amenities'] ?? []);
            $property->advantages()->sync($data['advantages'] ?? []);
            $property->units()->create($data['unit']);

            return $property;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Property created successfully.')]);

        return to_route('properties.show', $property);
    }

    public function show(Request $request, Property $property): Response
    {
        return Inertia::render('properties/show', [
            'property' => $property->load('amenities:id,name,description', 'advantages:id,name,description'),
            'units' => $property->units()->orderBy('name')->with('activeLease:id,unit_id,tenant_id,end_date', 'activeLease.tenant:id,user_id', 'activeLease.tenant.user:id,name')->get(),
            'expenses' => $request->user()?->can('manage-expenses')
                ? Expense::query()->where('property_id', $property->id)->with('type:id,name', 'unit:id,name')->latest('date')->get(['id', 'number', 'title', 'type_id', 'unit_id', 'date', 'amount'])
                : [],
        ]);
    }

    public function edit(Property $property): Response
    {
        return Inertia::render('properties/form', [
            'property' => [
                ...$property->toArray(),
                'amenities' => $property->amenities()->pluck('amenities.id'),
                'advantages' => $property->advantages()->pluck('advantages.id'),
            ],
            ...$this->options(),
        ]);
    }

    public function update(Request $request, Property $property): RedirectResponse
    {
        $data = $request->validate($this->rules());

        DB::transaction(function () use ($request, $property, $data) {
            $property->fill(Arr::except($data, ['thumbnail', 'amenities', 'advantages']));
            $property->attachUploadFrom($request, 'thumbnail')->save();
            $property->amenities()->sync($data['amenities'] ?? []);
            $property->advantages()->sync($data['advantages'] ?? []);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Property updated successfully.')]);

        return to_route('properties.show', $property);
    }

    public function destroy(Property $property): RedirectResponse
    {
        if (Lease::query()->whereIn('unit_id', $property->units()->select('id'))->exists()) {
            return $this->toast('error', __('This property has tenancy records. Move tenants out and keep it, or delete the tenants first.'));
        }

        $property->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Property deleted successfully.')]);

        return to_route('properties.index');
    }

    public function thumbnail(Property $property): StreamedResponse
    {
        return $property->previewUpload();
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'amenities' => Amenity::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'advantages' => Advantage::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'type' => ['required', Rule::in(Property::TYPES)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'state' => ['required', 'string', 'max:255'],
            'zip_code' => ['required', 'string', 'max:20'],
            'country' => ['required', 'string', 'max:255'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.Property::UPLOAD_MAX_KB],
            'amenities' => ['array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
            'advantages' => ['array'],
            'advantages.*' => ['integer', 'exists:advantages,id'],
            'display_in_listing' => ['boolean'],
            'listing_type' => ['required_if_accepted:display_in_listing', 'nullable', Rule::in(Property::LISTING_TYPES)],
            'listing_price' => ['required_if_accepted:display_in_listing', 'nullable', 'numeric', 'min:0', 'max:9999999999999'],
        ];
    }
}
