<?php

namespace App\Http\Controllers;

use App\Models\CertificateRequest;
use Illuminate\Http\Request;
use App\Notifications\CertificateRequestStatusNotification;
use Illuminate\Support\Facades\Notification;
use App\Models\User;

class CertificateRequestController extends Controller
{
    // For parishioner: submit request
    public function store(Request $request)
    {
        $validated = $request->validate([
            'firstName' => 'required|string|max:255',
            'lastName' => 'required|string|max:255',
            'birthdate' => 'required|date',
            'email' => 'required|email',
            'phone' => 'required|string|max:20',
            'address' => 'required|string',
            'certificateType' => 'required|string',
            'purpose' => 'required|string',
            'dateNeeded' => 'required|date',
            'additionalInfo' => 'nullable|string',
        ]);

        $cert = CertificateRequest::create([
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'birthdate' => $validated['birthdate'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'address' => $validated['address'],
            'certificate_type' => $validated['certificateType'],
            'purpose' => $validated['purpose'],
            'date_needed' => $validated['dateNeeded'],
            'additional_info' => $validated['additionalInfo'] ?? null,
        ]);

        return response()->json($cert, 201);
    }

    // For staff: list all requests
    public function index()
    {
        return CertificateRequest::orderBy('created_at', 'desc')->get();
    }

    // For staff: update status
    public function update(Request $request, $id)
    {
        $cert = CertificateRequest::findOrFail($id);
        $cert->status = $request->input('status');
        
        // Handle rejection reason
        if ($request->has('rejection_reason')) {
            $cert->rejection_reason = $request->input('rejection_reason');
        }
        
        $cert->save();

        // Send notification if status is approved or rejected
        if (in_array($cert->status, ['approved', 'rejected'])) {
            // Email notification
            Notification::route('mail', $cert->email)
                ->notify(new CertificateRequestStatusNotification($cert, $cert->status));
            // In-app notification if user exists
            $user = User::where('email', $cert->email)->first();
            if ($user) {
                $user->notify(new CertificateRequestStatusNotification($cert, $cert->status));
            }
        }

        return response()->json($cert);
    }
} 