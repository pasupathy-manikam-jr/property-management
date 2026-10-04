<?php

namespace App\Models;

use App\Models\Concerns\StoresUploads;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Staff record payments as approved; a tenant's bank-transfer submission stays pending
 * until staff approve it. Only approved payments count toward the invoice.
 *
 * @property int $id
 * @property int $invoice_id
 * @property int|null $user_id
 * @property string $amount
 * @property Carbon $payment_date
 * @property string $method
 * @property string $status
 * @property string|null $notes
 * @property string|null $file_path
 * @property string|null $file_name
 */
#[Fillable(['user_id', 'amount', 'payment_date', 'method', 'status', 'notes', 'file_path', 'file_name', 'file_type', 'file_size'])]
class InvoicePayment extends Model
{
    use StoresUploads;

    public const METHODS = ['bank_transfer', 'cash', 'online'];

    public const STATUSES = ['pending', 'approved', 'rejected'];

    public const UPLOAD_DIRECTORY = 'invoice-receipts';

    /** @var list<string> */
    protected $hidden = ['file_path', 'file_type', 'file_size'];

    /**
     * @return BelongsTo<Invoice, $this>
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date:Y-m-d',
        ];
    }
}
