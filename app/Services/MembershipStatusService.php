<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class MembershipStatusService
{
    /**
     * Automatically update membership status based on user activity
     */
    public function updateMembershipStatuses()
    {
        Log::info('Starting automatic membership status update');
        
        // Only update parishioners (not admin, staff, or priest)
        $users = User::whereNotNull('membership_status')
                    ->where('is_admin', 0)
                    ->where('is_staff', 0)
                    ->where('is_priest', 0)
                    ->get();
        $updatedCount = 0;
        
        foreach ($users as $user) {
            $oldStatus = $user->membership_status;
            $newStatus = $this->calculateMembershipStatus($user);
            
            if ($oldStatus !== $newStatus) {
                $user->update(['membership_status' => $newStatus]);
                $updatedCount++;
                
                Log::info("Updated user {$user->id} ({$user->name}) from {$oldStatus} to {$newStatus}");
            }
        }
        
        Log::info("Automatic membership status update completed. Updated {$updatedCount} users.");
        return $updatedCount;
    }
    
    /**
     * Calculate the appropriate membership status for a user
     */
    public function calculateMembershipStatus(User $user)
    {
        // Calculate days since last activity
        $lastActivity = $this->getLastActivityDate($user);
        $daysSinceActivity = $lastActivity ? Carbon::now()->diffInDays($lastActivity) : 999;
        
        // Calculate days since membership
        $membershipDate = $user->membership_date ? Carbon::parse($user->membership_date) : null;
        $daysSinceMembership = $membershipDate ? Carbon::now()->diffInDays($membershipDate) : 0;
        
        // Get attendance frequency
        $attendanceFrequency = $this->calculateAttendanceFrequency($user);
        
        // Determine status based on rules
        return $this->determineStatus($daysSinceActivity, $daysSinceMembership, $attendanceFrequency, $user);
    }
    
    /**
     * Get the last activity date for a user
     */
    private function getLastActivityDate(User $user)
    {
        $dates = [];
        
        // Check last attendance
        if ($user->last_attendance) {
            $dates[] = Carbon::parse($user->last_attendance);
        }
        
        // Check recent donations
        $recentDonation = $user->donations()
            ->where('created_at', '>=', Carbon::now()->subMonths(3))
            ->latest()
            ->first();
        if ($recentDonation) {
            $dates[] = $recentDonation->created_at;
        }
        
        // Check recent event registrations
        $recentRegistration = $user->eventRegistrations()
            ->where('created_at', '>=', Carbon::now()->subMonths(3))
            ->latest()
            ->first();
        if ($recentRegistration) {
            $dates[] = $recentRegistration->created_at;
        }
        
        // Check recent prayer requests
        $recentPrayerRequest = $user->prayerRequests()
            ->where('created_at', '>=', Carbon::now()->subMonths(3))
            ->latest()
            ->first();
        if ($recentPrayerRequest) {
            $dates[] = $recentPrayerRequest->created_at;
        }
        
        return !empty($dates) ? max($dates) : null;
    }
    
    /**
     * Calculate attendance frequency (attendance per month)
     */
    private function calculateAttendanceFrequency(User $user)
    {
        if (!$user->last_attendance) {
            return 0;
        }
        
        $membershipDate = $user->membership_date ? Carbon::parse($user->membership_date) : Carbon::now()->subYear();
        $monthsSinceMembership = max(1, Carbon::now()->diffInMonths($membershipDate));
        
        // Estimate attendance based on last_attendance and membership duration
        $estimatedAttendances = $this->estimateAttendances($user);
        
        return $estimatedAttendances / $monthsSinceMembership;
    }
    
    /**
     * Estimate number of attendances based on available data
     */
    private function estimateAttendances(User $user)
    {
        $attendances = 0;
        
        // If they have recent attendance, estimate based on frequency
        if ($user->last_attendance) {
            $lastAttendance = Carbon::parse($user->last_attendance);
            $daysSinceLastAttendance = Carbon::now()->diffInDays($lastAttendance);
            
            // If they attended recently (within 30 days), estimate higher frequency
            if ($daysSinceLastAttendance <= 30) {
                $attendances = 8; // Assume 2x per month
            } elseif ($daysSinceLastAttendance <= 90) {
                $attendances = 4; // Assume 1x per month
            } else {
                $attendances = 1; // Assume occasional attendance
            }
        }
        
        return $attendances;
    }
    
    /**
     * Determine membership status based on activity patterns
     */
    private function determineStatus($daysSinceActivity, $daysSinceMembership, $attendanceFrequency, User $user)
    {
        // New members (less than 3 months)
        if ($daysSinceMembership < 90) {
            if ($daysSinceActivity <= 30) {
                return 'active'; // Active new member
            } elseif ($daysSinceActivity <= 60) {
                return 'new_member'; // Still new, some activity
            } else {
                return 'visitor'; // New but not engaged
            }
        }
        
        // Established members (more than 3 months)
        if ($attendanceFrequency >= 1.5) {
            // Regular attenders (1.5+ times per month)
            if ($daysSinceActivity <= 30) {
                return 'active';
            } elseif ($daysSinceActivity <= 60) {
                return 'active'; // Still active, just missed recent attendance
            } else {
                return 'inactive'; // Regular attender gone inactive
            }
        } elseif ($attendanceFrequency >= 0.5) {
            // Occasional attenders (0.5-1.5 times per month)
            if ($daysSinceActivity <= 60) {
                return 'active';
            } elseif ($daysSinceActivity <= 120) {
                return 'inactive';
            } else {
                return 'visitor';
            }
        } else {
            // Rare attenders (less than 0.5 times per month)
            if ($daysSinceActivity <= 30) {
                return 'visitor';
            } elseif ($daysSinceActivity <= 90) {
                return 'inactive';
            } else {
                return 'visitor';
            }
        }
    }
    
    /**
     * Update a single user's status
     */
    public function updateUserStatus(User $user)
    {
        $oldStatus = $user->membership_status;
        $newStatus = $this->calculateMembershipStatus($user);
        
        if ($oldStatus !== $newStatus) {
            $user->update(['membership_status' => $newStatus]);
            Log::info("Updated user {$user->id} ({$user->name}) from {$oldStatus} to {$newStatus}");
            return true;
        }
        
        return false;
    }
    
    /**
     * Get membership status statistics
     */
    public function getMembershipStatistics()
    {
        // Only count parishioners (not admin, staff, or priest)
        $parishionersQuery = User::where('is_admin', 0)
                                ->where('is_staff', 0)
                                ->where('is_priest', 0);
        
        return [
            'total' => $parishionersQuery->count(),
            'active' => $parishionersQuery->where('membership_status', 'active')->count(),
            'inactive' => $parishionersQuery->where('membership_status', 'inactive')->count(),
            'visitor' => $parishionersQuery->where('membership_status', 'visitor')->count(),
            'new_member' => $parishionersQuery->where('membership_status', 'new_member')->count(),
        ];
    }
}
