<?php

namespace App\Http\Controllers\Lookups;

use App\Http\Controllers\Controller;
use App\Support\TableQuery;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Name / description / status lists edited beside the table (amenities, advantages, types).
 *
 * @template TModel of Model
 */
abstract class LookupController extends Controller
{
    /** @var class-string<TModel> */
    protected string $model;

    /** Inertia page, which is also the props key, e.g. "amenities". */
    protected string $page;

    /** "Amenity", used in toasts. */
    protected string $singular;

    public function index(Request $request): Response
    {
        $query = $this->model::query()
            ->when(in_array($request->input('status'), ['active', 'inactive'], true), fn ($q) => $q->where('status', $request->input('status')))
            ->when($this->extraFilter(), fn ($q, $column) => $q->when($request->input($column), fn ($q, $value) => $q->where($column, $value)));

        return Inertia::render("{$this->page}/index", [
            $this->page => TableQuery::paginate($query, $request, ['name', 'description'], ['name', 'created_at']),
            'filters' => TableQuery::filters($request, array_filter(['status', $this->extraFilter()])),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->model::create($this->validated($request));

        return $this->done(__(':item created successfully.', ['item' => __($this->singular)]));
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $this->model::findOrFail($id)->update($this->validated($request));

        return $this->done(__(':item updated successfully.', ['item' => __($this->singular)]));
    }

    public function destroy(int $id): RedirectResponse
    {
        $this->model::findOrFail($id)->delete();

        return $this->done(__(':item deleted successfully.', ['item' => __($this->singular)]));
    }

    /**
     * A second column the list can be filtered by (e.g. a type's kind).
     */
    protected function extraFilter(): ?string
    {
        return null;
    }

    /**
     * @return array<string, mixed>
     */
    protected function rules(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            ...$this->rules(),
        ]);
    }
}
