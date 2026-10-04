<?php

namespace Tests\Feature\Communication;

use App\Models\Note;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_manages_notices_with_attachments(): void
    {
        Storage::fake('local');
        $this->actingAs($this->userWithRole());

        $this->post(route('notes.store'), ['document' => UploadedFile::fake()->create('virus.exe', 10)])->assertSessionHasErrors(['title', 'document']);
        $this->post(route('notes.store'), ['title' => 'Water cut', 'description' => 'Saturday', 'document' => UploadedFile::fake()->create('notice.pdf', 10, 'application/pdf')])
            ->assertSessionHasNoErrors();
        $note = Note::query()->sole();
        $this->get(route('notes.document', $note))->assertDownload('notice.pdf');

        $this->put(route('notes.update', $note), ['title' => 'Water cut (updated)'])->assertSessionHasNoErrors();
        $this->assertSame('Water cut (updated)', $note->fresh()?->title);
        $this->assertSame('notice.pdf', $note->fresh()?->file_name);

        $path = $note->fresh()?->file_path;
        $this->delete(route('notes.destroy', $note))->assertSessionHasNoErrors();
        $this->assertModelMissing($note);
        Storage::disk('local')->assertMissing((string) $path);
    }

    public function test_every_role_reads_notices_but_only_admin_manages_them(): void
    {
        $note = Note::query()->create(['title' => 'Fire drill']);

        foreach (['tenant', 'maintainer', 'manager'] as $role) {
            $this->actingAs($this->userWithRole($role));
            $this->get(route('notes.index'))->assertInertia(fn ($page) => $page->component('notes/index')->has('notes.data', 1));
            $this->post(route('notes.store'), ['title' => 'Mine'])->assertForbidden();
            $this->put(route('notes.update', $note), ['title' => 'Changed'])->assertForbidden();
            $this->delete(route('notes.destroy', $note))->assertForbidden();
        }

        $this->get(route('notes.document', $note))->assertNotFound();
    }
}
