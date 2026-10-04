<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property string $status
 */
#[Fillable(['name', 'description', 'status'])]
class Advantage extends Model
{
    public const STATUSES = ['active', 'inactive'];
}
