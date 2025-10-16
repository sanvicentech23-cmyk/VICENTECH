<?php

namespace App\Notifications;

use App\Models\Donation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Services\DonationReceiptPdfService;

class DonationVerifiedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public Donation $donation;

    public function __construct(Donation $donation)
    {
        $this->donation = $donation;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Your Donation Has Been Verified')
            ->greeting('Hello ' . ($this->donation->name ?: 'Donor') . ',')
            ->line('Thank you for your generosity. Your donation has been verified successfully.')
            ->line('Amount: ₱' . number_format((float)$this->donation->amount, 2))
            ->line('Reference: ' . ($this->donation->reference ?: 'N/A'))
            ->line('Purpose: ' . ($this->donation->category ?: 'Donation'))
            ->line('Date: ' . optional($this->donation->created_at)->toDateTimeString())
            ->line('We truly appreciate your support for our parish.')
            ->salutation('— Diocesan Shrine of San Vicente Ferrer');

        try {
            $pdfService = app(DonationReceiptPdfService::class);
            $pdf = $pdfService->renderDonationReceipt($this->donation);
            $mail->attachData($pdf, 'donation-receipt-'.$this->donation->id.'.pdf', [
                'mime' => 'application/pdf',
            ]);
        } catch (\Throwable $e) {
            \Log::warning('Failed to attach donation receipt PDF: ' . $e->getMessage());
        }

        return $mail;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'donation_verified',
            'message' => 'Your donation of ₱' . number_format((float)$this->donation->amount, 2) . ' has been verified. Thank you!',
            'amount' => $this->donation->amount,
            'reference' => $this->donation->reference,
            'category' => $this->donation->category,
            'donation_id' => $this->donation->id,
            'verified_at' => now()->toDateTimeString(),
        ];
    }
}