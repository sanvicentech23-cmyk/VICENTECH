<?php

namespace App\Notifications;

use App\Models\Donation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DonationRejectedNotification extends Notification implements ShouldQueue
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
        return (new MailMessage)
            ->subject('Your Donation Has Been Rejected')
            ->greeting('Hello ' . ($this->donation->name ?: 'Donor') . ',')
            ->line('We are sorry to inform you that your donation could not be accepted.')
            ->line('Reason: ' . ($this->donation->rejection_reason ?? 'No reason provided'))
            ->line('Amount: ₱' . number_format((float)$this->donation->amount, 2))
            ->line('Reference: ' . ($this->donation->reference ?: 'N/A'))
            ->line('If you believe this is a mistake, please contact us at donations@sanvicenteferrer.com')
            ->salutation('— Diocesan Shrine of San Vicente Ferrer');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'donation_rejected',
            'message' => 'Your donation of ₱' . number_format((float)$this->donation->amount, 2) . ' was rejected: ' . ($this->donation->rejection_reason ?? ''),
            'amount' => $this->donation->amount,
            'reference' => $this->donation->reference,
            'category' => $this->donation->category,
            'donation_id' => $this->donation->id,
            'rejected_at' => now()->toDateTimeString(),
        ];
    }
}
