<?php

namespace App\Models;

use App\Models\Concerns\StoresUploads;
use App\Support\Notify;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A repair request for a unit, optionally assigned to a maintainer of its property.
 *
 * @property int $id
 * @property int $property_id
 * @property int $unit_id
 * @property int|null $tenant_id
 * @property int|null $maintainer_id
 * @property int|null $issue_type_id
 * @property Carbon $request_date
 * @property string $status
 * @property Carbon|null $fixed_date
 * @property string|null $notes
 * @property string|null $file_path
 * @property string|null $file_name
 * @property-read string|null $preview
 * @property-read Property $property
 * @property-read Unit $unit
 */
#[Fillable(['property_id', 'unit_id', 'tenant_id', 'maintainer_id', 'issue_type_id', 'request_date', 'status', 'fixed_date', 'notes', 'file_path', 'file_name', 'file_type', 'file_size'])]
class MaintenanceRequest extends Model
{
    use StoresUploads;

    public const STATUSES = ['pending', 'in_progress', 'completed'];

    protected static function booted(): void
    {
        // Completion can come from the edit form, the assign dialog or the maintainer's status
        // update, so the tenant is told here, once, whichever path completed it.
        static::updated(function (self $request) {
            if ($request->wasChanged('status') && $request->status === 'completed') {
                Notify::maintenanceCompleted($request);
            }
        });
    }

    public const UPLOAD_DIRECTORY = 'maintenance-requests';

    /** @var list<string> */
    protected $hidden = ['file_path', 'file_type', 'file_size'];

    /** @var list<string> */
    protected $appends = ['preview'];

    /**
     * Tenants see their own requests, maintainers the ones assigned to them, staff everything.
     *
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if ($user->hasRole('tenant')) {
            $query->where('tenant_id', $user->tenant()->value('id') ?? 0);
        } elseif ($user->hasRole('maintainer')) {
            $query->whereHas('maintainer', fn (Builder $q) => $q->where('user_id', $user->id));
        }
    }

    /**
     * Inline URL of an image attachment (null for other files).
     *
     * @return Attribute<string|null, never>
     */
    protected function preview(): Attribute
    {
        return Attribute::get(fn () => $this->hasPreview()
            ? route('maintenance-requests.preview', ['maintenanceRequest' => $this->id, 'v' => substr(md5((string) $this->file_path), 0, 8)])
            : null);
    }

    /**
     * Stamp the fixed date when the request is completed; clear it otherwise.
     */
    public function setStatus(string $status, ?string $fixedDate = null): static
    {
        return $this->fill([
            'status' => $status,
            'fixed_date' => $status === 'completed' ? ($fixedDate ?? $this->fixed_date ?? today()) : null,
        ]);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * @return BelongsTo<Maintainer, $this>
     */
    public function maintainer(): BelongsTo
    {
        return $this->belongsTo(Maintainer::class);
    }

    /**
     * @return BelongsTo<Type, $this>
     */
    public function issueType(): BelongsTo
    {
        return $this->belongsTo(Type::class, 'issue_type_id');
    }

    /**
     * @return HasMany<MaintenanceRequestComment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(MaintenanceRequestComment::class);
    }

    protected function casts(): array
    {
        return [
            'request_date' => 'date:Y-m-d',
            'fixed_date' => 'date:Y-m-d',
        ];
    }
}
