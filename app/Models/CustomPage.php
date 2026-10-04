<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * A public page (privacy policy, terms...) shown at /page/{slug} and linked from the site footer.
 * Content is plain text; the page renders it as text, never as HTML.
 *
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string $content
 * @property bool $enabled
 */
#[Fillable(['title', 'slug', 'content', 'enabled'])]
class CustomPage extends Model
{
    protected function casts(): array
    {
        return ['enabled' => 'boolean'];
    }
}
