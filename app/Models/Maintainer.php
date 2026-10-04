<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A maintainer's profile; name, email, phone and photo live on the login account.
 *
 * @property int $id
 * @property int $user_id
 * @property int|null $type_id
 * @property-read User $user
 * @property-read Type|null $type
 */
#[Fillable(['user_id', 'type_id'])]
class Maintainer extends Model
{
    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Type, $this>
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(Type::class);
    }

    /**
     * The properties this maintainer may be assigned requests for.
     *
     * @return BelongsToMany<Property, $this>
     */
    public function properties(): BelongsToMany
    {
        return $this->belongsToMany(Property::class);
    }

    /**
     * @return HasMany<MaintenanceRequest, $this>
     */
    public function requests(): HasMany
    {
        return $this->hasMany(MaintenanceRequest::class);
    }
}
