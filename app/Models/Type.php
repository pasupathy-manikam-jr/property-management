<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A configurable category: invoice line types, expense types, maintenance issues and maintainer trades.
 *
 * @property int $id
 * @property string $kind
 * @property string $name
 * @property string|null $description
 * @property string $status
 */
#[Fillable(['kind', 'name', 'description', 'status'])]
class Type extends Model
{
    public const STATUSES = ['active', 'inactive'];

    public const KINDS = ['invoice', 'expense', 'maintenance_issue', 'maintainer_type'];

    /**
     * Active types of one kind, for form dropdowns.
     *
     * @param  Builder<self>  $query
     */
    public function scopeOptions(Builder $query, string $kind): void
    {
        $query->where('kind', $kind)->where('status', 'active')->orderBy('name')->select('id', 'name');
    }
}
