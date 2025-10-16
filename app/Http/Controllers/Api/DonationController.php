<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Donation;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Mail;
use App\Notifications\DonationVerifiedNotification;
use App\Notifications\DonationRejectedNotification;
use App\Models\User;
use Illuminate\Support\Str;

class DonationController extends Controller
{
    public function index()
    {
        return response()->json(Donation::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'amount' => 'required|numeric',
            'reference' => 'nullable|string',
            'category' => 'nullable|string',
            'purpose_name' => 'nullable|string',
            'receipt' => 'nullable|file|mimes:jpg,png,jpeg,webp,gif,pdf|max:5120'
        ]);

        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $guessedExt = $file->guessExtension();
            $originalExt = $file->getClientOriginalExtension();
            $ext = $guessedExt ?: $originalExt ?: 'png';
            $filename = (string) Str::uuid() . '.' . strtolower($ext);
            $path = $file->storeAs('donation_receipts', $filename, 'public');
            $data['receipt_path'] = '/storage/' . $path;
        }

        // If purpose_name is not provided, try to look it up
        if (empty($data['purpose_name']) && !empty($data['category'])) {
            $purpose = \App\Models\DonationPurpose::find($data['category']);
            $data['purpose_name'] = $purpose ? $purpose->name : null;
        }

        $donation = Donation::create($data);

        // Optional: initial acknowledgment could be sent here

        return response()->json(['success' => true, 'donation' => $donation]);
    }

    public function verify($id)
    {
        $donation = Donation::find($id);
        if (!$donation) return response()->json(['error' => 'Not found'], 404);

        $donation->verified = true;
        $donation->save();

        // Send web + email notification to the donor (by email lookup if user exists, otherwise route notification to email)
        try {
            // If you have users table with matching email
            $user = User::where('email', $donation->email)->first();
            if ($user) {
                $user->notify(new DonationVerifiedNotification($donation));
            } else {
                // Send mail directly using a notifiable route
                Notification::route('mail', $donation->email)
                    ->notify(new DonationVerifiedNotification($donation));
            }
        } catch (\Throwable $e) {
            \Log::warning('Donation verified notification failed: ' . $e->getMessage());
        }

        return response()->json(['success' => true, 'donation' => $donation]);
    }

    public function reject(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);

        $donation = Donation::find($id);
        if (!$donation) return response()->json(['error' => 'Not found'], 404);

        // Mark rejected - we'll use 'verified' = false and store reason in a new column 'rejection_reason'
        $donation->rejection_reason = $request->reason;
        $donation->verified = false;
        $donation->save();

        try {
            $user = User::where('email', $donation->email)->first();
            if ($user) {
                $user->notify(new DonationRejectedNotification($donation));
            } else {
                Notification::route('mail', $donation->email)
                    ->notify(new DonationRejectedNotification($donation));
            }
        } catch (\Throwable $e) {
            \Log::warning('Donation rejected notification failed: ' . $e->getMessage());
        }

        return response()->json(['success' => true, 'donation' => $donation]);
    }

    public function receipt($id)
    {
        $donation = Donation::find($id);
        if (!$donation || empty($donation->receipt_path)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $publicPrefix = '/storage/';
        $receiptPath = $donation->receipt_path;
        if (!str_starts_with($receiptPath, $publicPrefix)) {
            return response()->json(['error' => 'Invalid path'], 404);
        }

        $diskRelative = substr($receiptPath, strlen($publicPrefix)); // donation_receipts/...
        if (!Storage::disk('public')->exists($diskRelative)) {
            return response()->json(['error' => 'File missing'], 404);
        }

        $absolute = Storage::disk('public')->path($diskRelative);
        $mime = mime_content_type($absolute) ?: 'application/octet-stream';
        return response()->file($absolute, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=31536000',
        ]);
    }

    public function destroy($id)
    {
        $donation = Donation::find($id);
        if (!$donation) return response()->json(['error' => 'Not found'], 404);

        // Delete receipt file if it exists
        if ($donation->receipt_path) {
            $filePath = str_replace('/storage/', '', $donation->receipt_path);
            Storage::disk('public')->delete($filePath);
        }

        $donation->delete();

        return response()->json(['success' => true, 'message' => 'Donation deleted successfully']);
    }
}
