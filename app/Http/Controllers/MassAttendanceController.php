<?php

namespace App\Http\Controllers;

use App\Models\MassAttendance;
use App\Models\MassSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class MassAttendanceController extends Controller
{
    /**
     * Show the mass attendance form
     */
    public function showForm($massScheduleId)
    {
        $massSchedule = MassSchedule::findOrFail($massScheduleId);
        $user = Auth::user();
        
        return view('mass-attendance.form', compact('massSchedule', 'user'));
    }

    /**
     * Store mass attendance registration
     */
    public function store(Request $request)
    {
        // Require authentication
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'You must be logged in to register for mass attendance.'
            ], 401);
        }

        $validated = $request->validate([
            'mass_schedule_id' => 'required|exists:mass_schedules,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'address' => 'required|string|max:500',
        ]);

        // Verify that the logged-in user's email matches the submitted email
        if (Auth::user()->email !== $validated['email']) {
            return response()->json([
                'success' => false,
                'message' => 'Email address does not match your account.'
            ], 400);
        }

        // Check if user is already registered for this mass
        $existingAttendance = MassAttendance::where('mass_schedule_id', $validated['mass_schedule_id'])
            ->where('user_id', Auth::id())
            ->first();

        if ($existingAttendance) {
            return response()->json([
                'success' => false,
                'message' => 'You have already registered for this mass.'
            ], 400);
        }

        // Create attendance record with default values
        $attendance = MassAttendance::create([
            'mass_schedule_id' => $validated['mass_schedule_id'],
            'user_id' => Auth::id(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'address' => $validated['address'],
            'phone' => Auth::user()->phone ?? null,
            'number_of_people' => 1, // Default to 1 person
            'special_requests' => null,
            'attendance_date' => now(),
            'is_confirmed' => true
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thank you for registering! We look forward to seeing you at mass.',
            'data' => $attendance
        ]);
    }

    /**
     * Get attendance statistics for admin
     */
    public function getStatistics(Request $request)
    {
        $query = MassAttendance::with(['massSchedule', 'user']);

        // Filter by date range if provided
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->forDateRange($request->start_date, $request->end_date);
        }

        // Filter by mass schedule if provided
        if ($request->has('mass_schedule_id')) {
            $query->where('mass_schedule_id', $request->mass_schedule_id);
        }

        $attendances = $query->orderBy('created_at', 'desc')->get();

        // Calculate statistics
        $totalAttendances = $attendances->count();
        $totalPeople = $attendances->sum('number_of_people');
        $uniqueUsers = $attendances->whereNotNull('user_id')->unique('user_id')->count();
        $guestAttendances = $attendances->whereNull('user_id')->count();

        // Group by mass schedule
        $attendancesByMass = $attendances->groupBy('mass_schedule_id')->map(function($group) {
            $massSchedule = $group->first()->massSchedule;
            return [
                'mass_schedule' => $massSchedule,
                'attendances' => $group->count(),
                'total_people' => $group->sum('number_of_people'),
                'registered_users' => $group->whereNotNull('user_id')->count(),
                'guests' => $group->whereNull('user_id')->count()
            ];
        });

        // Calculate monthly attendance data for the last 12 months
        $monthlyAttendance = [];
        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthKey = $date->format('Y-m');
            $monthLabel = $date->format('M Y');
            
            $monthlyCount = $attendances->filter(function($attendance) use ($monthKey) {
                return $attendance->created_at->format('Y-m') === $monthKey;
            })->sum('number_of_people');
            
            $monthlyAttendance[] = [
                'month' => $monthLabel,
                'count' => $monthlyCount
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_attendances' => $totalAttendances,
                'total_people' => $totalPeople,
                'unique_users' => $uniqueUsers,
                'guest_attendances' => $guestAttendances,
                'attendances_by_mass' => $attendancesByMass,
                'monthly_attendance' => $monthlyAttendance,
                'recent_attendances' => $attendances->take(20)
            ]
        ]);
    }

    /**
     * Get all attendances for admin
     */
    public function index(Request $request)
    {
        $query = MassAttendance::with(['massSchedule', 'user']);

        // Filter by date range if provided
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->forDateRange($request->start_date, $request->end_date);
        }

        // Filter by mass schedule if provided
        if ($request->has('mass_schedule_id')) {
            $query->where('mass_schedule_id', $request->mass_schedule_id);
        }

        $attendances = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $attendances
        ]);
    }

    /**
     * Update attendance status
     */
    public function update(Request $request, MassAttendance $attendance)
    {
        $validated = $request->validate([
            'is_confirmed' => 'boolean',
            'special_requests' => 'nullable|string|max:1000'
        ]);

        $attendance->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Attendance updated successfully',
            'data' => $attendance
        ]);
    }

    /**
     * Delete attendance
     */
    public function destroy(MassAttendance $attendance)
    {
        $attendance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Attendance record deleted successfully'
        ]);
    }
}