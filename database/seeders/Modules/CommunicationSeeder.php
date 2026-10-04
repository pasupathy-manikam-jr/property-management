<?php

namespace Database\Seeders\Modules;

use App\Models\Contact;
use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;

/**
 * Notice board posts and a few contact diary entries per account.
 */
class CommunicationSeeder extends Seeder
{
    public function run(): void
    {
        $data = File::json(database_path('demo/communication.json'));

        foreach ($data['notes'] as $note) {
            Note::query()->firstOrCreate(['title' => $note['title']], $note);
        }

        foreach ($data['contacts'] as $contact) {
            $owner = User::query()->where('email', $contact['owner'])->first();

            if ($owner) {
                Contact::query()->firstOrCreate(
                    ['created_by' => $owner->id, 'name' => $contact['name']],
                    Arr::except($contact, ['owner', 'name']),
                );
            }
        }
    }
}
