<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MembershipStatusService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MembershipController extends Controller
{
    protected $membershipService;

    public function __construct(MembershipStatusService $membershipService)
    {
        $this->membershipService = $membershipService;
    }

    /**
     * Get membership statistics
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = $this->membershipService->getMembershipStatistics();
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch membership statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update all membership statuses
     */
    public function updateAll(): JsonResponse
    {
        try {
            $updatedCount = $this->membershipService->updateMembershipStatuses();
            
            return response()->json([
                'success' => true,
                'message' => "Updated {$updatedCount} users' membership statuses",
                'updated_count' => $updatedCount
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update membership statuses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update specific user's membership status
     */
    public function updateUser(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'user_id' => 'required|integer|exists:users,id'
            ]);

            $user = \App\Models\User::findOrFail($request->user_id);
            $updated = $this->membershipService->updateUserStatus($user);
            
            return response()->json([
                'success' => true,
                'message' => $updated ? 
                    "Updated user {$user->name}'s membership status" : 
                    "No status change needed for user {$user->name}",
                'updated' => $updated,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'membership_status' => $user->membership_status
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user membership status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get membership status rules/explanation
     */
    public function rules(): JsonResponse
    {
        $rules = [
            'new_member' => [
                'description' => 'Recently joined members (less than 3 months)',
                'criteria' => [
                    'Membership duration < 90 days',
                    'Some activity within 60 days = new_member',
                    'No activity > 60 days = visitor'
                ]
            ],
            'active' => [
                'description' => 'Regular attending members',
                'criteria' => [
                    'Attendance frequency >= 1.5 times per month',
                    'Activity within 30 days = active',
                    'Activity within 60 days = active (missed recent attendance)',
                    'No activity > 60 days = inactive'
                ]
            ],
            'inactive' => [
                'description' => 'Members who don\'t attend regularly',
                'criteria' => [
                    'Regular attender with no activity > 60 days',
                    'Occasional attender with no activity > 120 days'
                ]
            ],
            'visitor' => [
                'description' => 'Occasional attendees or new members not engaged',
                'criteria' => [
                    'New member with no activity > 60 days',
                    'Occasional attender with no activity > 120 days',
                    'Rare attender with activity within 30 days'
                ]
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => $rules
        ]);
    }
}
