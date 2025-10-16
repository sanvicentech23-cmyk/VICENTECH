<?php

namespace App\Http\Controllers;

use App\Models\MassSchedule;
use App\Models\User;
use App\Notifications\NewMassScheduleNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class MassScheduleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $schedules = MassSchedule::active()->ordered()->get();
        return response()->json($schedules);
    }

    /**
     * Display the specified resource.
     */
    public function show(MassSchedule $massSchedule)
    {
        return response()->json($massSchedule);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'day' => ['required', Rule::in(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])],
            'time' => 'nullable|date_format:H:i',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'type' => 'required|string|max:255',
            'celebrant' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);

        // Set time to start_time for backward compatibility if time is not provided
        if (!isset($validated['time'])) {
            $validated['time'] = $validated['start_time'];
        }

        $schedule = MassSchedule::create($validated);

        // Send immediate notifications to all users if email is properly configured
        $notificationMessage = '';
        if ($this->shouldSendNotifications()) {
            try {
                $this->notifyAllUsers($schedule);
                $notificationMessage = ' (immediate notifications sent)';
                \Log::info('Mass schedule created successfully with immediate notifications: ' . $schedule->type . ' on ' . $schedule->day);
            } catch (\Exception $e) {
                $notificationMessage = ' (immediate notifications failed)';
                \Log::error('Mass schedule created but immediate notifications failed: ' . $e->getMessage());
            }
        } else {
            $notificationMessage = ' (immediate notifications skipped - email not configured)';
            \Log::info('Mass schedule created successfully, immediate notifications skipped due to email configuration: ' . $schedule->type . ' on ' . $schedule->day);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mass schedule created successfully' . $notificationMessage . '. Daily reminders will also be sent automatically at 3:00 AM.',
            'data' => $schedule
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, MassSchedule $massSchedule)
    {
        $validated = $request->validate([
            'day' => ['required', Rule::in(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])],
            'time' => 'nullable|date_format:H:i',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'type' => 'required|string|max:255',
            'celebrant' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);

        // Set time to start_time for backward compatibility if time is not provided
        if (!isset($validated['time'])) {
            $validated['time'] = $validated['start_time'];
        }

        $massSchedule->update($validated);
        return response()->json($massSchedule);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(MassSchedule $massSchedule)
    {
        $massSchedule->delete();
        return response()->json(['message' => 'Mass schedule deleted successfully']);
    }

    /**
     * Get all schedules including inactive ones (for admin)
     */
    public function adminIndex()
    {
        $schedules = MassSchedule::ordered()->get();
        return response()->json($schedules);
    }

    /**
     * Toggle active status
     */
    public function toggleActive(MassSchedule $massSchedule)
    {
        $massSchedule->update(['is_active' => !$massSchedule->is_active]);
        return response()->json($massSchedule);
    }

    /**
     * Check if notifications should be sent based on email configuration
     */
    private function shouldSendNotifications()
    {
        // Check if mail is configured
        $mailDriver = config('mail.default');
        $mailHost = config('mail.mailers.smtp.host');
        
        // Skip notifications if using 'log' driver or if SMTP host is not configured
        if ($mailDriver === 'log' || empty($mailHost) || $mailHost === 'localhost') {
            \Log::info('Skipping notifications: Email not properly configured');
            return false;
        }
        
        return true;
    }

    /**
     * Send notifications to all users about the new mass schedule
     */
    private function notifyAllUsers(MassSchedule $schedule)
    {
        try {
            // Increase execution time limit for email sending
            set_time_limit(120);
            
            // Get all users with valid email addresses
            $users = User::whereNotNull('email')
                        ->where('email', '!=', '')
                        ->where('email', 'REGEXP', '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
                        ->get();
            
            if ($users->isEmpty()) {
                \Log::info('No users found to notify about mass schedule: ' . $schedule->type . ' on ' . $schedule->day);
                return;
            }
            
            \Log::info('Sending immediate notifications to ' . $users->count() . ' users for mass schedule: ' . $schedule->type . ' on ' . $schedule->day);
            
            // Send notifications in smaller batches to avoid timeout
            $batchSize = 3; // Send to 3 users at a time
            $batches = $users->chunk($batchSize);
            
            foreach ($batches as $batch) {
                Notification::send($batch, new NewMassScheduleNotification($schedule));
                \Log::info('Sent immediate mass schedule notification batch to ' . $batch->count() . ' users');
                
                // Small delay between batches to avoid overwhelming SMTP server
                usleep(500000); // 0.5 second delay
            }
            
            \Log::info('All immediate notifications sent successfully for mass schedule: ' . $schedule->type . ' on ' . $schedule->day);
            
        } catch (\Exception $e) {
            \Log::error('Failed to send immediate notifications for mass schedule: ' . $schedule->type . ' on ' . $schedule->day);
            \Log::error('Notification error: ' . $e->getMessage());
            \Log::error('Notification stack trace: ' . $e->getTraceAsString());
            throw $e; // Re-throw to be caught by the calling method
        }
    }
}