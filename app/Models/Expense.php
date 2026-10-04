<?php

namespace App\Models;

use App\Models\Concerns\StoresUploads;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $number
 * @property string $title
 * @property int|null $type_id
 * @property int $property_id
 * @property int|null $unit_id
 * @property Carbon $date
 * @property string $amount
 * @property string|null $notes
 * @property string|null $file_path
 * @property string|null $file_name
 */
#[Fillable(['title', 'type_id', 'property_id', 'unit_id', 'date', 'amount', 'notes', 'file_path', 'file_name', 'file_type', 'file_size'])]
class Expense extends Model
{
    use StoresUploads;

    public const UPLOAD_DIRECTORY = 'expense-receipts';

    /** @var list<string> */
    protected $hidden = ['file_path', 'file_type', 'file_size'];

    protected static function booted(): void
    {
        static::created(fn (self $expense) => $expense->forceFill([
            'number' => Setting::get('expensePrefix').str_pad((string) $expense->id, 4, '0', STR_PAD_LEFT),
        ])->saveQuietly());
    }

    /**
     * @return BelongsTo<Type, $this>
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(Type::class);
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

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'amount' => 'decimal:2',
        ];
    }
}
