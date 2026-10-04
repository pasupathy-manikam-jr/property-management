<?php

namespace App\Models;

use App\Models\Concerns\StoresUploads;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * A notice on the board, readable by every role with manage-notes.
 *
 * @property int $id
 * @property string $title
 * @property string|null $description
 * @property string|null $file_path
 * @property string|null $file_name
 * @property string|null $file_type
 * @property int|null $file_size
 */
#[Fillable(['title', 'description', 'file_path', 'file_name', 'file_type', 'file_size'])]
class Note extends Model
{
    use StoresUploads;

    public const UPLOAD_DIRECTORY = 'notes';

    protected $hidden = ['file_path'];
}
