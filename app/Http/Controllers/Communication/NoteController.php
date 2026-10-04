<?php

namespace App\Http\Controllers\Communication;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Support\TableQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Notice board: everyone with manage-notes reads every notice.
 */
class NoteController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('notes/index', [
            'notes' => TableQuery::paginate(Note::query(), $request, ['title', 'description'], ['title', 'created_at']),
            'filters' => TableQuery::filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        (new Note($this->validated($request)))->attachUploadFrom($request)->save();

        return $this->done(__('Notice created successfully.'));
    }

    public function update(Request $request, Note $note): RedirectResponse
    {
        $note->fill($this->validated($request))->attachUploadFrom($request)->save();

        return $this->done(__('Notice updated successfully.'));
    }

    public function destroy(Note $note): RedirectResponse
    {
        $note->delete();

        return $this->done(__('Notice deleted successfully.'));
    }

    public function document(Note $note): StreamedResponse
    {
        return $note->downloadUpload();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return Arr::except($request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'document' => Note::uploadRules(),
        ]), 'document');
    }
}
