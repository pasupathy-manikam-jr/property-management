<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * A rendered notification template. The body is plain text, so it is escaped before line breaks become <br>.
 */
class NotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $mailSubject, public string $body) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->mailSubject);
    }

    public function content(): Content
    {
        return new Content(
            htmlString: '<div style="font-family:sans-serif;font-size:14px;line-height:1.6">'.nl2br(e($this->body)).'</div>',
            text: null,
        );
    }
}
