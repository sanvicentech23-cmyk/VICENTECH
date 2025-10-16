<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Donation;
use App\Models\User;
use App\Models\Family;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Get event registration analytics
     */
    public function eventRegistrations(): JsonResponse
    {
        try {
            // Get total registrations
            $totalRegistrations = EventRegistration::count();
            
            // Get active events
            $activeEvents = Event::where('date', '>=', now())->count();
            
            // Get total participants (unique emails)
            $totalParticipants = EventRegistration::distinct('email')->count('email');
            
            // Get monthly registrations for last 12 months
            $monthlyRegistrations = [];
            for ($i = 11; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $monthKey = $date->format('Y-m');
                $monthLabel = $date->format('M Y');
                
                $count = EventRegistration::whereYear('created_at', $date->year)
                    ->whereMonth('created_at', $date->month)
                    ->count();
                
                $monthlyRegistrations[] = [
                    'month' => $monthLabel,
                    'count' => $count
                ];
            }
            
            // Get event popularity (top 10 events by registrations)
            $eventPopularity = Event::withCount('registrations')
                ->orderBy('registrations_count', 'desc')
                ->limit(10)
                ->get()
                ->map(function($event) {
                    return [
                        'event' => $event->title,
                        'registrations' => $event->registrations_count
                    ];
                });
            
            // Get recent registrations (last 20)
            $recentRegistrations = EventRegistration::with('event')
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get()
                ->map(function($registration) {
                    return [
                        'date' => $registration->created_at->toISOString(),
                        'event' => $registration->event->title ?? 'Unknown Event',
                        'participant' => $registration->first_name . ' ' . $registration->last_name,
                        'email' => $registration->email,
                        'status' => ucfirst($registration->status)
                    ];
                });
            
            return response()->json([
                'success' => true,
                'data' => [
                    'totalRegistrations' => $totalRegistrations,
                    'activeEvents' => $activeEvents,
                    'totalParticipants' => $totalParticipants,
                    'monthlyRegistrations' => $monthlyRegistrations,
                    'eventPopularity' => $eventPopularity,
                    'recentRegistrations' => $recentRegistrations
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch event analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get parishioner attendance analytics
     */
    public function parishionerAttendanceMonthly(): JsonResponse
    {
        try {
            $monthlyAttendance = [];
            
            for ($i = 11; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $monthLabel = $date->format('M Y');
                
                // Count unique parishioners who registered for events in this month
                $count = EventRegistration::whereYear('created_at', $date->year)
                    ->whereMonth('created_at', $date->month)
                    ->distinct('email')
                    ->count('email');
                
                $monthlyAttendance[] = [
                    'month' => $monthLabel,
                    'count' => $count
                ];
            }
            
            return response()->json([
                'success' => true,
                'data' => $monthlyAttendance
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get activity involvement analytics
     */
    public function activityInvolvement(): JsonResponse
    {
        try {
            // Get ministry involvement from users
            $activityData = User::whereNotNull('ministry_involvements')
                ->where('is_admin', 0)
                ->where('is_staff', 0)
                ->where('is_priest', 0)
                ->get()
                ->flatMap(function($user) {
                    $ministries = is_array($user->ministry_involvements) 
                        ? $user->ministry_involvements 
                        : json_decode($user->ministry_involvements, true) ?? [];
                    
                    return array_map(function($ministry) {
                        return ['ministry' => $ministry, 'user_id' => $user->id];
                    }, $ministries);
                })
                ->groupBy('ministry')
                ->map(function($group) {
                    return [
                        'label' => $group->first()['ministry'],
                        'count' => $group->count()
                    ];
                })
                ->values()
                ->sortByDesc('count')
                ->take(10);
            
            // If no ministry data, provide default activities
            if ($activityData->isEmpty()) {
                $activityData = collect([
                    ['label' => 'Choir', 'count' => 0],
                    ['label' => 'Ushers', 'count' => 0],
                    ['label' => 'Catechists', 'count' => 0],
                    ['label' => 'Youth Ministry', 'count' => 0],
                    ['label' => 'Lectors', 'count' => 0]
                ]);
            }
            
            return response()->json([
                'success' => true,
                'data' => $activityData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch activity involvement',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get family analytics
     */
    public function familyAnalytics(): JsonResponse
    {
        try {
            $totalFamilies = Family::count();
            $activeFamilies = Family::where('family_status', 'active')->count();
            $totalFamilyMembers = User::whereNotNull('family_id')
                ->where('is_admin', 0)
                ->where('is_staff', 0)
                ->where('is_priest', 0)
                ->count();
            $unassignedMembers = User::whereNull('family_id')
                ->where('is_admin', 0)
                ->where('is_staff', 0)
                ->where('is_priest', 0)
                ->count();
            
            $averageFamilySize = $totalFamilies > 0 ? round($totalFamilyMembers / $totalFamilies, 1) : 0;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_families' => $totalFamilies,
                    'active_families' => $activeFamilies,
                    'total_members' => $totalFamilyMembers,
                    'unassigned_members' => $unassignedMembers,
                    'average_family_size' => $averageFamilySize
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch family analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get comprehensive analytics dashboard data
     */
    public function dashboard(): JsonResponse
    {
        try {
            // Event analytics
            $totalRegistrations = EventRegistration::count();
            $activeEvents = Event::where('date', '>=', now())->count();
            $totalParticipants = EventRegistration::distinct('email')->count('email');
            
            // Donation analytics
            $totalDonations = Donation::where('verified', true)->sum('amount');
            $donationCount = Donation::where('verified', true)->count();
            $averageDonation = $donationCount > 0 ? round($totalDonations / $donationCount, 2) : 0;
            
            // Parishioner analytics
            $totalParishioners = User::where('is_admin', 0)
                ->where('is_staff', 0)
                ->where('is_priest', 0)
                ->count();
            
            $activeMembers = User::where('membership_status', 'active')
                ->where('is_admin', 0)
                ->where('is_staff', 0)
                ->where('is_priest', 0)
                ->count();
            
            $newMembersThisMonth = User::whereYear('membership_date', now()->year)
                ->whereMonth('membership_date', now()->month)
                ->where('is_admin', 0)
                ->where('is_staff', 0)
                ->where('is_priest', 0)
                ->count();
            
            // Family analytics
            $totalFamilies = Family::count();
            $activeFamilies = Family::where('family_status', 'active')->count();
            
            // Monthly trends for last 12 months
            $monthlyData = [];
            for ($i = 11; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $monthLabel = $date->format('M Y');
                
                $eventRegistrations = EventRegistration::whereYear('created_at', $date->year)
                    ->whereMonth('created_at', $date->month)
                    ->count();
                
                $donations = Donation::where('verified', true)
                    ->whereYear('created_at', $date->year)
                    ->whereMonth('created_at', $date->month)
                    ->sum('amount');
                
                $monthlyData[] = [
                    'month' => $monthLabel,
                    'event_registrations' => $eventRegistrations,
                    'donations' => $donations,
                    'attendance' => EventRegistration::whereYear('created_at', $date->year)
                        ->whereMonth('created_at', $date->month)
                        ->distinct('email')
                        ->count('email')
                ];
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'events' => [
                        'total_registrations' => $totalRegistrations,
                        'active_events' => $activeEvents,
                        'total_participants' => $totalParticipants
                    ],
                    'donations' => [
                        'total_amount' => $totalDonations,
                        'total_count' => $donationCount,
                        'average_amount' => $averageDonation
                    ],
                    'parishioners' => [
                        'total' => $totalParishioners,
                        'active' => $activeMembers,
                        'new_this_month' => $newMembersThisMonth,
                        'active_rate' => $totalParishioners > 0 ? round(($activeMembers / $totalParishioners) * 100, 1) : 0
                    ],
                    'families' => [
                        'total' => $totalFamilies,
                        'active' => $activeFamilies
                    ],
                    'monthly_trends' => $monthlyData
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}