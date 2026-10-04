<?php

namespace App\Models;

use App\Models\Concerns\StoresUploads;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A rental agreement between the company and a tenant for one unit. The number
 * (Settings agreementPrefix + zero-padded sequence) is assigned on creation.
 *
 * @property int $id
 * @property int $sequence
 * @property string $number
 * @property int $unit_id
 * @property int $tenant_id
 * @property Carbon $start_date
 * @property Carbon $end_date
 * @property string $status
 * @property string $terms
 * @property string|null $description
 * @property string|null $file_path
 * @property string|null $file_name
 * @property string|null $file_type
 * @property int|null $file_size
 * @property-read Unit $unit
 * @property-read Tenant $tenant
 */
#[Fillable(['unit_id', 'tenant_id', 'start_date', 'end_date', 'status', 'terms', 'description', 'file_path', 'file_name', 'file_type', 'file_size'])]
class Agreement extends Model
{
    use StoresUploads;

    public const UPLOAD_DIRECTORY = 'agreements';

    public const STATUSES = ['draft', 'pending', 'active', 'confirmed', 'completed', 'cancelled'];

    protected $hidden = ['file_path'];

    protected static function booted(): void
    {
        static::creating(function (self $agreement) {
            $agreement->sequence = (int) static::query()->max('sequence') + 1;
            $agreement->number = Setting::get('agreementPrefix').str_pad((string) $agreement->sequence, 4, '0', STR_PAD_LEFT);
        });
    }

    /**
     * Tenants see only their own agreements; staff see all.
     *
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if ($user->hasRole('tenant')) {
            $query->where('tenant_id', $user->tenant->id ?? 0);
        }
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

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
        ];
    }
}
