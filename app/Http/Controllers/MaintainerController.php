<?php

namespace App\Http\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Models\Maintainer;
use App\Models\Property;
use App\Models\Type;
use App\Models\User;
use App\Support\Notify;
use App\Support\TableQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MaintainerController extends Controller
{
    use PasswordValidationRules;

    public function index(Request $request): Response
    {
        $query = Maintainer::query()
            ->with('user:id,name,email,phone,avatar_path', 'type:id,name', 'properties:id,name')
            ->when($request->integer('property_id'), fn (Builder $q, int $id) => $q->whereHas('properties', fn (Builder $p) => $p->whereKey($id)))
            ->when($request->integer('type_id'), fn (Builder $q, int $id) => $q->where('type_id', $id))
            ->when(trim($request->string('search')->toString()), fn (Builder $q, string $search) => $q->whereHas('user', fn (Builder $u) => $u->whereLike('name', "%{$search}%")->orWhereLike('email', "%{$search}%")));

        return Inertia::render('maintainers/index', [
            'maintainers' => TableQuery::paginate($query, $request->merge(['search' => null]), [], ['created_at']),
            ...$this->options(),
            'filters' => [...TableQuery::filters($request, ['property_id', 'type_id']), 'search' => $request->query('search')],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('maintainers/form', ['maintainer' => null, ...$this->options()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            ...$this->rules(),
            'email' => ['required', 'email', 'max:255', Rule::unique('users')],
            'password' => $this->passwordRules(),
        ]);

        $maintainer = DB::transaction(function () use ($request, $data) {
            $user = User::create([...Arr::only($data, ['name', 'email', 'phone', 'password']), 'status' => 'active']);
            $user->forceFill(['email_verified_at' => now()])->save();
            $user->assignRole('maintainer');
            $user->replaceAvatar($request->file('photo'));

            $maintainer = Maintainer::create(['user_id' => $user->id, 'type_id' => $data['type_id']]);
            $maintainer->properties()->sync($data['properties']);

            return $maintainer;
        });

        Notify::maintainerCreated($maintainer, $data['password']);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Maintainer created successfully.')]);

        return to_route('maintainers.show', $maintainer);
    }

    public function show(Maintainer $maintainer): Response
    {
        return Inertia::render('maintainers/show', [
            'maintainer' => $maintainer->load('user:id,name,email,phone,avatar_path,created_at', 'type:id,name', 'properties:id,name,type,address,city,state'),
            'requests' => $maintainer->requests()
                ->with('property:id,name', 'unit:id,name', 'issueType:id,name')
                ->latest('request_date')->latest('id')->get(),
        ]);
    }

    public function edit(Maintainer $maintainer): Response
    {
        return Inertia::render('maintainers/form', [
            'maintainer' => [
                ...$maintainer->load('user:id,name,email,phone,avatar_path')->toArray(),
                'properties' => $maintainer->properties()->pluck('properties.id'),
            ],
            ...$this->options(),
        ]);
    }

    public function update(Request $request, Maintainer $maintainer): RedirectResponse
    {
        $data = $request->validate([
            ...$this->rules(),
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($maintainer->user_id)],
        ]);

        DB::transaction(function () use ($request, $maintainer, $data) {
            $maintainer->user->update(Arr::only($data, ['name', 'email', 'phone']));
            $maintainer->user->replaceAvatar($request->file('photo'));
            $maintainer->update(['type_id' => $data['type_id']]);
            $maintainer->properties()->sync($data['properties']);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Maintainer updated successfully.')]);

        return to_route('maintainers.show', $maintainer);
    }

    public function destroy(Maintainer $maintainer): RedirectResponse
    {
        // The login account owns the profile (cascade); assigned requests become unassigned.
        $maintainer->user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Maintainer deleted successfully.')]);

        return to_route('maintainers.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'properties' => Property::query()->orderBy('name')->get(['id', 'name']),
            'types' => Type::query()->options('maintainer_type')->get(),
        ];
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
            'type_id' => ['required', 'integer', Rule::exists('types', 'id')->where('kind', 'maintainer_type')],
            'properties' => ['required', 'array', 'min:1'],
            'properties.*' => ['integer', Rule::exists('properties', 'id')],
        ];
    }
}
