<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * An entry in a user's own contact diary.
 *
 * @property int $id
 * @property int $created_by
 * @property string $name
 * @property string|null $email
 * @property string|null $contact_number
 * @property string|null $subject
 * @property string|null $message
 */
#[Fillable(['created_by', 'name', 'email', 'contact_number', 'subject', 'message'])]
class Contact extends Model
{
    /**
     * Everyone keeps their own diary; the admin sees all of them.
     *
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if (! $user->hasRole('admin')) {
            $query->where('created_by', $user->id);
        }
    }
}
