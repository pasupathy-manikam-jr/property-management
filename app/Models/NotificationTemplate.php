<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * The email sent for an event, with subject and body per language (en/ms/zh). See App\Support\Notifier.
 *
 * @property int $id
 * @property string $event
 * @property array<string, string> $subject
 * @property array<string, string> $body
 * @property bool $enabled
 */
#[Fillable(['event', 'subject', 'body', 'enabled'])]
class NotificationTemplate extends Model
{
    /** Placeholders every template can use (filled by Notifier). */
    public const COMMON_PLACEHOLDERS = ['user_name', 'company_name', 'company_email', 'company_phone', 'app_url'];

    /**
     * Events and the extra placeholders their callers pass to Notifier::send().
     *
     * @var array<string, array{label: string, placeholders: list<string>}>
     */
    public const EVENTS = [
        'tenant_created' => ['label' => 'Tenant Created', 'placeholders' => ['tenant_name', 'email', 'password', 'login_url']],
        'maintainer_created' => ['label' => 'Maintainer Created', 'placeholders' => ['maintainer_name', 'email', 'password', 'login_url']],
        'maintenance_request_created' => ['label' => 'Maintenance Request Created', 'placeholders' => ['tenant_name', 'maintainer_name', 'property_name', 'unit_name', 'issue_type', 'request_date']],
        'maintenance_completed' => ['label' => 'Maintenance Request Completed', 'placeholders' => ['tenant_name', 'maintainer_name', 'property_name', 'unit_name', 'issue_type', 'request_date']],
        'invoice_created' => ['label' => 'Invoice Created', 'placeholders' => ['tenant_name', 'invoice_number', 'invoice_month', 'amount', 'due_date', 'property_name', 'unit_name']],
        'payment_reminder' => ['label' => 'Payment Reminder', 'placeholders' => ['tenant_name', 'invoice_number', 'amount', 'due_date', 'property_name', 'unit_name']],
        'payment_received' => ['label' => 'Payment Received', 'placeholders' => ['tenant_name', 'invoice_number', 'amount', 'payment_date', 'property_name', 'unit_name']],
    ];

    /**
     * @return list<string>
     */
    public function placeholders(): array
    {
        return [...self::EVENTS[$this->event]['placeholders'], ...self::COMMON_PLACEHOLDERS];
    }

    protected function casts(): array
    {
        return [
            'subject' => 'array',
            'body' => 'array',
            'enabled' => 'boolean',
        ];
    }
}
