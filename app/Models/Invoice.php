<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A tenant's bill for one month. `total` and `paid` cache the items and the approved
 * payments (refreshTotals); the status is derived from them and the due date.
 *
 * @property int $id
 * @property string|null $number
 * @property int|null $parent_id
 * @property int $property_id
 * @property int $unit_id
 * @property int $tenant_id
 * @property Carbon $invoice_month
 * @property Carbon $end_date
 * @property string|null $notes
 * @property bool $is_recurring
 * @property int|null $recurring_day
 * @property string $total
 * @property string $paid
 * @property-read string $status
 * @property-read Tenant $tenant
 */
#[Fillable(['parent_id', 'property_id', 'unit_id', 'tenant_id', 'invoice_month', 'end_date', 'notes', 'is_recurring', 'recurring_day'])]
class Invoice extends Model
{
    public const STATUSES = ['unpaid', 'partially_paid', 'paid', 'overdue'];

    /** @var list<string> */
    protected $appends = ['status'];

    protected static function booted(): void
    {
        static::created(fn (self $invoice) => $invoice->forceFill([
            'number' => Setting::get('invoicePrefix').str_pad((string) $invoice->id, 4, '0', STR_PAD_LEFT),
        ])->saveQuietly());
    }

    /**
     * Paid in full, otherwise overdue once the due date has passed, otherwise unpaid or partially paid.
     *
     * @return Attribute<string, never>
     */
    protected function status(): Attribute
    {
        return Attribute::get(fn () => match (true) {
            (float) $this->paid >= (float) $this->total => 'paid',
            $this->end_date->lt(today()) => 'overdue',
            (float) $this->paid > 0 => 'partially_paid',
            default => 'unpaid',
        });
    }

    /**
     * The same rules as the status attribute, in SQL.
     *
     * @param  Builder<self>  $query
     */
    public function scopeStatus(Builder $query, string $status): void
    {
        $today = today()->toDateString();

        match ($status) {
            'paid' => $query->whereColumn('paid', '>=', 'total'),
            'overdue' => $query->whereColumn('paid', '<', 'total')->where('end_date', '<', $today),
            'partially_paid' => $query->whereColumn('paid', '<', 'total')->where('paid', '>', 0)->where('end_date', '>=', $today),
            'unpaid' => $query->whereColumn('paid', '<', 'total')->where('paid', '<=', 0)->where('end_date', '>=', $today),
            default => null,
        };
    }

    /**
     * Tenants see only their own invoices; staff see all.
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
     * Recompute the cached totals from the items and the approved payments.
     */
    public function refreshTotals(): void
    {
        $this->forceFill([
            'total' => $this->items()->sum('amount'),
            'paid' => $this->payments()->where('status', 'approved')->sum('amount'),
        ])->save();
    }

    public function due(): float
    {
        return max(0, round((float) $this->total - (float) $this->paid, 2));
    }

    /**
     * @return HasMany<InvoiceItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /**
     * @return HasMany<InvoicePayment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class);
    }

    /**
     * Invoices generated from this one when it recurs.
     *
     * @return HasMany<Invoice, $this>
     */
    public function copies(): HasMany
    {
        return $this->hasMany(Invoice::class, 'parent_id');
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

    protected function casts(): array
    {
        return [
            'invoice_month' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'is_recurring' => 'boolean',
            'recurring_day' => 'integer',
            'total' => 'decimal:2',
            'paid' => 'decimal:2',
        ];
    }
}
