<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Donation;
use App\Models\DonationPurpose;
use App\Models\User;
use App\Notifications\NewEventNotification;
use App\Rules\NoEventConflict;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Auth;

class EventController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Event::all();
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            // Validate the request
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'date' => 'required|date',
                'time' => 'required|string',
                'location' => 'required|string|max:255',
                'description' => 'nullable|string',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
            ]);

            // Check for event conflicts (same date, time, AND location)
            $conflictingEvent = Event::where('date', $validated['date'])
                                   ->where('time', $validated['time'])
                                   ->where('location', $validated['location'])
                                   ->first();

            if ($conflictingEvent) {
                return response()->json([
                    'success' => false,
                    'message' => "An event '{$conflictingEvent->title}' already exists on {$validated['date']} at {$validated['time']} in {$validated['location']}. Please choose a different time or location.",
                    'errors' => [
                        'time' => ["An event '{$conflictingEvent->title}' already exists on {$validated['date']} at {$validated['time']} in {$validated['location']}. Please choose a different time or location."]
                    ]
                ], 422);
            }

            $event = new Event();
            $event->title = $validated['title'];
            $event->date = $validated['date'];
            $event->time = $validated['time'];
            $event->location = $validated['location'];
            $event->description = $validated['description'] ?? '';

            if ($request->hasFile('image')) {
                $file = $request->file('image');
                $event->image_data = base64_encode(file_get_contents($file->getRealPath()));
                $event->image_mime = $file->getMimeType();
            }

            $event->save();

            // Send notifications to all users if email is properly configured
            $notificationMessage = '';
            if ($this->shouldSendNotifications()) {
                try {
                    $this->notifyAllUsers($event);
                    $notificationMessage = ' (notifications sent)';
                    \Log::info('Event created successfully with notifications: ' . $event->title);
                } catch (\Exception $e) {
                    $notificationMessage = ' (notifications failed)';
                    \Log::error('Event created but notifications failed: ' . $e->getMessage());
                }
            } else {
                $notificationMessage = ' (notifications skipped - email not configured)';
                \Log::info('Event created successfully, notifications skipped due to email configuration: ' . $event->title);
            }

            return response()->json([
                'success' => true,
                'message' => 'Event created successfully' . $notificationMessage,
                'event' => $event->fresh() // Get fresh instance from database
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Event creation failed: ' . $e->getMessage());
            \Log::error('Event creation error stack trace: ' . $e->getTraceAsString());
            \Log::error('Event creation request data: ' . json_encode($request->all()));
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create event: ' . $e->getMessage(),
                'error_details' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
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
     * Send notifications to all users about the new event
     */
    private function notifyAllUsers(Event $event)
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
                \Log::info('No users found to notify about event: ' . $event->title);
                return;
            }
            
            \Log::info('Sending notifications to ' . $users->count() . ' users for event: ' . $event->title);
            
            // Send notifications in smaller batches to avoid timeout
            $batchSize = 3; // Send to 3 users at a time
            $batches = $users->chunk($batchSize);
            
            foreach ($batches as $batch) {
                Notification::send($batch, new NewEventNotification($event));
                \Log::info('Sent notification batch to ' . $batch->count() . ' users');
                
                // Small delay between batches to avoid overwhelming SMTP server
                usleep(500000); // 0.5 second delay
            }
            
            \Log::info('All notifications sent successfully for event: ' . $event->title);
            
        } catch (\Exception $e) {
            \Log::error('Failed to send notifications for event: ' . $event->title);
            \Log::error('Notification error: ' . $e->getMessage());
            \Log::error('Notification stack trace: ' . $e->getTraceAsString());
            throw $e; // Re-throw to be caught by the calling method
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Event $event)
    {
        return $event;
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            // Validate the request
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'date' => 'required|date',
                'time' => 'required|string',
                'location' => 'required|string|max:255',
                'description' => 'nullable|string',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
            ]);

            // Check for event conflicts (same date, time, AND location, excluding current event)
            $conflictingEvent = Event::where('date', $validated['date'])
                                   ->where('time', $validated['time'])
                                   ->where('location', $validated['location'])
                                   ->where('id', '!=', $id)
                                   ->first();

            if ($conflictingEvent) {
                return response()->json([
                    'success' => false,
                    'message' => "An event '{$conflictingEvent->title}' already exists on {$validated['date']} at {$validated['time']} in {$validated['location']}. Please choose a different time or location.",
                    'errors' => [
                        'time' => ["An event '{$conflictingEvent->title}' already exists on {$validated['date']} at {$validated['time']} in {$validated['location']}. Please choose a different time or location."]
                    ]
                ], 422);
            }

            $event = Event::findOrFail($id);
            $event->title = $validated['title'];
            $event->date = $validated['date'];
            $event->time = $validated['time'];
            $event->location = $validated['location'];
            $event->description = $validated['description'] ?? '';

            if ($request->hasFile('image')) {
                $file = $request->file('image');
                $event->image_data = base64_encode(file_get_contents($file->getRealPath()));
                $event->image_mime = $file->getMimeType();
            }

            $event->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Event updated successfully',
                'event' => $event->fresh()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Event update failed: ' . $e->getMessage());
            \Log::error('Event update error stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update event: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Event $event)
    {
        if ($event->image) {
            Storage::disk('public')->delete($event->image);
        }
        $event->delete();
        return response()->json(null, 204);
    }

    /**
     * Show the form for joining an event
     */
    public function showJoinForm(Event $event)
    {
        // Check if user is authenticated
        $user = Auth::user();
        
        if (!$user) {
            return redirect()->route('login')->with('message', 'Please log in to join events.');
        }

        // Check if user is already registered
        $existingRegistration = EventRegistration::where('event_id', $event->id)
            ->where('email', $user->email)
            ->first();

        if ($existingRegistration) {
            return redirect()->back()->with('message', 'You are already registered for this event.');
        }

        return view('events.join', compact('event'));
    }

    /**
     * Handle event registration (Public - no authentication required)
     */
    public function joinEvent(Request $request, Event $event)
    {
        try {
            // Validate the request
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'phone' => 'required|string|max:20',
                'address' => 'nullable|string|max:500',
                'terms_accepted' => 'required|accepted',
            ]);

            // Check if user is already registered with this email
            $existingRegistration = EventRegistration::where('event_id', $event->id)
                ->where('email', $validated['email'])
                ->first();

            if ($existingRegistration) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already registered for this event with this email address.'
                ], 422);
            }

            // Create the registration
            $registration = EventRegistration::create([
                'event_id' => $event->id,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'address' => $validated['address'] ?? null,
                'status' => 'approved', // Auto-approve guest registrations
                'registered_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Successfully registered for the event! You will receive a confirmation email shortly.',
                'registration' => $registration
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Please check your form data.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Event registration failed: ' . $e->getMessage());
            \Log::error('Event registration error stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your registration. Please try again.'
            ], 500);
        }
    }

    /**
     * Get analytics data for dashboard
     */
    public function getAnalytics()
    {
        try {
            // Get total users (parishioners)
            $totalParishioners = \App\Models\User::where('role', '!=', 'admin')->count();
            
            // Get total event participants
            $totalEventParticipants = \App\Models\EventRegistration::count();
            
            // Mock donations data (you can implement actual donations later)
            $totalDonations = Donation::sum('amount');

            // Get donation purpose distribution
            $donationPurposeDistribution = Donation::with('purpose')
                ->selectRaw('purpose_id, SUM(amount) as total')
                ->groupBy('purpose_id')
                ->get()
                ->map(function ($donation) {
                    return [
                        'purpose' => $donation->purpose->name ?? 'Unknown',
                        'total' => $donation->total,
                    ];
                });
            
            // Get monthly activity data (last 6 months)
            $monthlyActivity = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $participants = \App\Models\EventRegistration::whereYear('registered_at', $date->year)
                    ->whereMonth('registered_at', $date->month)
                    ->count();
                
                $monthlyActivity[] = [
                    'month' => $date->format('M'),
                    'participants' => $participants
                ];
            }
            
            // Get event participation data
            $eventParticipation = \App\Models\Event::withCount('registrations')
                ->orderBy('registrations_count', 'desc')
                ->take(5)
                ->get()
                ->map(function ($event, $index) {
                    $colors = ['#3F2E1E', '#CD8B3E', '#5C4B38', '#8B7355', '#A68B5B'];
                    return [
                        'event' => $event->title,
                        'participants' => $event->registrations_count,
                        'color' => $colors[$index % count($colors)]
                    ];
                });
            
            // Get past activities
            $pastActivities = \App\Models\Event::withCount('registrations')
                ->where('date', '<=', now())
                ->orderBy('date', 'desc')
                ->take(10)
                ->get()
                ->map(function ($event) {
                    return [
                        'date' => $event->date,
                        'activity' => $event->title,
                        'participants' => $event->registrations_count
                    ];
                });
            
            return response()->json([
                'totalParishioners' => $totalParishioners,
                'totalEventParticipants' => $totalEventParticipants,
                'totalDonations' => $totalDonations,
                'monthlyActivity' => $monthlyActivity,
                'eventParticipation' => $eventParticipation,
                'pastActivities' => $pastActivities
            ]);
            
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch analytics data'], 500);
        }
    }

    /**
     * Get calendar events including both events and mass schedules
     */
    public function getCalendarEvents()
    {
        try {
            $calendarEvents = [];
            
            // Get regular events
            $events = Event::all();
            foreach ($events as $event) {
                $calendarEvents[] = [
                    'id' => 'event_' . $event->id,
                    'type' => 'event',
                    'title' => $event->title,
                    'date' => $event->date,
                    'time' => $event->time,
                    'location' => $event->location,
                    'description' => $event->description,
                    'image_data' => $event->image_data,
                    'image_mime' => $event->image_mime,
                    'color' => '#CD8B3E' // Golden color for events
                ];
            }
            
            // Get mass schedules and convert them to calendar events
            $massSchedules = \App\Models\MassSchedule::active()->get();
            
            // Get current date to calculate upcoming mass dates
            $currentDate = now();
            $startOfWeek = $currentDate->copy()->startOfWeek(); // Monday
            
            // Generate mass schedule events for the next 8 weeks
            for ($week = 0; $week < 8; $week++) {
                foreach ($massSchedules as $schedule) {
                    $dayOfWeek = $this->getDayOfWeekNumber($schedule->day);
                    // Calculate the date for this mass
                    $massDate = $startOfWeek->copy()->addWeeks($week);
                    
                    // Adjust to the correct day of the week
                    $currentDayOfWeek = $massDate->dayOfWeek; // 0 = Sunday, 1 = Monday, etc.
                    $daysToAdd = ($dayOfWeek - $currentDayOfWeek + 7) % 7;
                    $massDate->addDays($daysToAdd);
                    
                    // Only include future dates or today
                    if ($massDate->gte($currentDate->copy()->startOfDay())) {
                        $calendarEvents[] = [
                            'id' => 'mass_' . $schedule->id . '_' . $massDate->format('Y-m-d'),
                            'type' => 'mass',
                            'title' => $schedule->type,
                            'date' => $massDate->format('Y-m-d'),
                            'time' => $schedule->time,
                            'start_time' => $schedule->start_time,
                            'end_time' => $schedule->end_time,
                            'location' => 'Church', // Default location for mass
                            'description' => 'Celebrant: ' . $schedule->celebrant,
                            'celebrant' => $schedule->celebrant,
                            'day' => $schedule->day,
                            'color' => '#5C4B38' // Brown color for mass schedules
                        ];
                    }
                }
            }
            
            // Sort events by date
            usort($calendarEvents, function($a, $b) {
                return strcmp($a['date'], $b['date']);
            });
            
            return response()->json($calendarEvents);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch calendar events: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch calendar events'], 500);
        }
    }
    
    /**
     * Convert day name to day of week number (0 = Sunday, 1 = Monday, etc.)
     */
    private function getDayOfWeekNumber($dayName)
    {
        $days = [
            'Sunday' => 0,
            'Monday' => 1,
            'Tuesday' => 2,
            'Wednesday' => 3,
            'Thursday' => 4,
            'Friday' => 5,
            'Saturday' => 6
        ];
        
        return $days[$dayName] ?? 0;
    }
}
