<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * A rentable unit inside a property, with its rent, deposit and late-fee terms.
 *
 * @property int $id
 * @property int $property_id
 * @property string $name
 * @property int $bedroom
 * @property int $kitchen
 * @property int $baths
 * @property string $rent
 * @property string $rent_type
 * @property int|null $rent_duration
 * @property Carbon|null $start_date
 * @property Carbon|null $end_date
 * @property Carbon|null $payment_due_date
 * @property string $deposit_type
 * @property string $deposit_amount
 * @property string $late_fee_type
 * @property string $late_fee_amount
 * @property string $incident_receipt_amount
 * @property string|null $notes
 */
#[Fillable(['property_id', 'name', 'bedroom', 'kitchen', 'baths', 'rent', 'rent_type', 'rent_duration', 'start_date', 'end_date', 'payment_due_date', 'deposit_type', 'deposit_amount', 'late_fee_type', 'late_fee_amount', 'incident_receipt_amount', 'notes'])]
class Unit extends Model
{
    public const RENT_TYPES = ['monthly', 'yearly', 'custom'];

    public const AMOUNT_TYPES = ['fixed', 'percentage'];

    /**
     * Validation for the unit's own fields; the property form prefixes them with "unit.".
     *
     * @return array<string, mixed>
     */
    public static function rules(string $prefix = ''): array
    {
        $money = ['required', 'numeric', 'min:0', 'max:9999999999999'];

        return [
            "{$prefix}name" => ['required', 'string', 'max:255'],
            "{$prefix}bedroom" => ['required', 'integer', 'min:0', 'max:50'],
            "{$prefix}kitchen" => ['required', 'integer', 'min:0', 'max:50'],
            "{$prefix}baths" => ['required', 'integer', 'min:0', 'max:50'],
            "{$prefix}rent" => $money,
            "{$prefix}rent_type" => ['required', Rule::in(self::RENT_TYPES)],
            "{$prefix}rent_duration" => ["required_if:{$prefix}rent_type,custom", 'nullable', 'integer', 'min:1', 'max:3650'],
            "{$prefix}start_date" => ["required_if:{$prefix}rent_type,custom", 'nullable', 'date'],
            "{$prefix}end_date" => ["required_if:{$prefix}rent_type,custom", 'nullable', 'date', "after_or_equal:{$prefix}start_date"],
            "{$prefix}payment_due_date" => ['nullable', 'date'],
            "{$prefix}deposit_type" => ['required', Rule::in(self::AMOUNT_TYPES)],
            "{$prefix}deposit_amount" => $money,
            "{$prefix}late_fee_type" => ['required', Rule::in(self::AMOUNT_TYPES)],
            "{$prefix}late_fee_amount" => $money,
            "{$prefix}incident_receipt_amount" => $money,
            "{$prefix}notes" => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * The tenancy occupying the unit, if any.
     *
     * @return HasOne<Lease, $this>
     */
    public function activeLease(): HasOne
    {
        return $this->hasOne(Lease::class)->where('status', 'active');
    }

    /**
     * @return HasMany<Lease, $this>
     */
    public function leases(): HasMany
    {
        return $this->hasMany(Lease::class);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    protected function casts(): array
    {
        return [
            'rent' => 'decimal:2',
            'deposit_amount' => 'decimal:2',
            'late_fee_amount' => 'decimal:2',
            'incident_receipt_amount' => 'decimal:2',
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'payment_due_date' => 'date:Y-m-d',
        ];
    }
}
