<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A tenancy of one unit. "active" occupies the unit; a renewal closes it as "renewed"
 * and opens a new one; moving out closes it as "exited" with the settlement.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $unit_id
 * @property Carbon $start_date
 * @property Carbon $end_date
 * @property string $status
 * @property Carbon|null $exit_date
 * @property string|null $exit_amount
 * @property string|null $extra_charge
 * @property string|null $exit_reason
 */
#[Fillable(['tenant_id', 'unit_id', 'start_date', 'end_date', 'status', 'exit_date', 'exit_amount', 'extra_charge', 'exit_reason'])]
class Lease extends Model
{
    public const STATUSES = ['active', 'renewed', 'exited'];

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'exit_date' => 'date:Y-m-d',
            'exit_amount' => 'decimal:2',
            'extra_charge' => 'decimal:2',
        ];
    }
}
