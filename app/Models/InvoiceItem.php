<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $invoice_id
 * @property int|null $type_id
 * @property string $amount
 * @property string|null $description
 */
#[Fillable(['type_id', 'amount', 'description'])]
class InvoiceItem extends Model
{
    /**
     * @return BelongsTo<Type, $this>
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(Type::class);
    }

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }
}
