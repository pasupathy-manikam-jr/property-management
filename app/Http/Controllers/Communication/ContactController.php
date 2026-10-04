<?php

namespace App\Http\Controllers\Communication;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Support\TableQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Contact diary: each user keeps their own; the admin sees everyone's.
 */
class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Contact::query()->visibleTo($request->user());

        return Inertia::render('contacts/index', [
            'contacts' => TableQuery::paginate($query, $request, ['name', 'email', 'contact_number', 'subject'], ['name', 'created_at']),
            'filters' => TableQuery::filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Contact::create([...$request->validate($this->rules()), 'created_by' => $request->user()?->id]);

        return $this->done(__('Contact created successfully.'));
    }

    public function update(Request $request, Contact $contact): RedirectResponse
    {
        $this->ensureVisible($request, $contact);
        $contact->update($request->validate($this->rules()));

        return $this->done(__('Contact updated successfully.'));
    }

    public function destroy(Request $request, Contact $contact): RedirectResponse
    {
        $this->ensureVisible($request, $contact);
        $contact->delete();

        return $this->done(__('Contact deleted successfully.'));
    }

    private function ensureVisible(Request $request, Contact $contact): void
    {
        abort_unless(Contact::query()->visibleTo($request->user())->whereKey($contact->id)->exists(), 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
