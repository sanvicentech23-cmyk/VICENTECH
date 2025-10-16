<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class FamilyController extends Controller
{
    /**
     * Get all families with their members.
     */
    public function index(): JsonResponse
    {
        try {
            $families = Family::with(['members' => function($query) {
                $query->where('is_admin', 0)
                      ->where('is_staff', 0)
                      ->where('is_priest', 0)
                      ->orderBy('is_family_head', 'desc')
                      ->orderBy('name');
            }])->orderByRaw('COALESCE(family_name, family_code, id)')->get();

            // Transform the data to include member details
            $familiesWithMembers = $families->map(function($family) {
                return [
                    'id' => $family->id,
                    'family_name' => $family->family_name,
                    'family_code' => $family->family_code,
                    'address' => $family->address,
                    'phone' => $family->phone,
                    'email' => $family->email,
                    'family_ministries' => $family->family_ministries,
                    'newsletter_subscribed' => $family->newsletter_subscribed,
                    'volunteer_family' => $family->volunteer_family,
                    'family_status' => $family->family_status,
                    'created_at' => $family->created_at,
                    'updated_at' => $family->updated_at,
                    'members' => $family->members->map(function($member) {
                        return [
                            'id' => $member->id,
                            'name' => $member->name,
                            'email' => $member->email,
                            'family_role' => $member->family_role,
                            'relationship_to_head' => $member->relationship_to_head,
                            'is_family_head' => $member->is_family_head,
                            'membership_status' => $member->membership_status,
                            'last_attendance' => $member->last_attendance,
                        ];
                    })
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $familiesWithMembers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch families',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new family.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Check if user is already part of a family
            if ($user->family_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already part of a family. Only family heads can create new families or you must leave your current family first.'
                ], 422);
            }
            
            $request->validate([
                'family_name' => 'required|string|max:255',
                'address' => 'nullable|string|max:500',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'newsletter_subscribed' => 'boolean',
                'volunteer_family' => 'boolean',
            ]);

            // Generate unique family code
            $familyCode = 'FAM-' . strtoupper(Str::random(6));
            while (Family::where('family_code', $familyCode)->exists()) {
                $familyCode = 'FAM-' . strtoupper(Str::random(6));
            }

            $family = Family::create([
                'family_name' => $request->family_name,
                'family_code' => $familyCode,
                'address' => $request->address,
                'phone' => $request->phone,
                'email' => $request->email,
                'family_ministries' => $request->family_ministries ?? [],
                'newsletter_subscribed' => $request->newsletter_subscribed ?? true,
                'volunteer_family' => $request->volunteer_family ?? false,
                'family_status' => 'active',
                'head_user_id' => $user->id // Set the creator as family head
            ]);

            // Update the creator's user record to be family head
            $user->update([
                'family_id' => $family->id,
                'is_family_head' => true,
                'family_role' => 'head'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Family created successfully',
                'data' => $family
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create family',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a family.
     */
    public function update(Request $request, Family $family): JsonResponse
    {
        try {
            $request->validate([
                'family_name' => 'required|string|max:255',
                'address' => 'nullable|string|max:500',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'newsletter_subscribed' => 'boolean',
                'volunteer_family' => 'boolean',
                'family_status' => 'in:active,inactive,transferred'
            ]);

            $family->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Family updated successfully',
                'data' => $family->fresh()
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update family',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a family.
     */
    public function destroy(Family $family): JsonResponse
    {
        try {
            // Remove family association from all members
            $family->members()->update([
                'family_id' => null,
                'family_role' => null,
                'relationship_to_head' => null,
                'is_family_head' => false
            ]);

            $family->delete();

            return response()->json([
                'success' => true,
                'message' => 'Family deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete family',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add member to family.
     */
    public function addMember(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'family_id' => 'required|exists:families,id',
                'user_id' => 'required|exists:users,id',
                'family_role' => 'required|in:head,spouse,child,parent,sibling,other',
                'relationship_to_head' => 'nullable|string|max:100',
                'is_family_head' => 'boolean'
            ]);

            $user = User::find($request->user_id);
            
            // Only allow parishioners to be added to families
            if ($user->is_admin || $user->is_staff || $user->is_priest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Admin, staff, and priest accounts cannot be added to families'
                ], 422);
            }

            // If setting as family head, remove head status from other members
            if ($request->is_family_head) {
                User::where('family_id', $request->family_id)
                    ->update(['is_family_head' => false]);
            }

            $user->update([
                'family_id' => $request->family_id,
                'family_role' => $request->family_role,
                'relationship_to_head' => $request->relationship_to_head,
                'is_family_head' => $request->is_family_head ?? false
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Member added to family successfully',
                'data' => $user->fresh()
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add member to family',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove member from family.
     */
    public function removeMember(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'user_id' => 'required|exists:users,id'
            ]);

            $user = User::find($request->user_id);
            $user->update([
                'family_id' => null,
                'family_role' => null,
                'relationship_to_head' => null,
                'is_family_head' => false
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Member removed from family successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove member from family',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get family statistics.
     */
    public function statistics(): JsonResponse
    {
        try {
            $totalFamilies = Family::count();
            $activeFamilies = Family::where('family_status', 'active')->count();
            $inactiveFamilies = Family::where('family_status', 'inactive')->count();
            $transferredFamilies = Family::where('family_status', 'transferred')->count();
            
            $totalMembers = User::whereNotNull('family_id')
                ->where('is_admin', 0)
                ->where('is_staff', 0)
                ->where('is_priest', 0)
                ->count();
            
            $unassignedMembers = User::whereNull('family_id')
                ->where('is_admin', 0)
                ->where('is_staff', 0)
                ->where('is_priest', 0)
                ->count();

            $averageFamilySize = $totalFamilies > 0 ? round($totalMembers / $totalFamilies, 1) : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'total_families' => $totalFamilies,
                    'active_families' => $activeFamilies,
                    'inactive_families' => $inactiveFamilies,
                    'transferred_families' => $transferredFamilies,
                    'total_members' => $totalMembers,
                    'unassigned_members' => $unassignedMembers,
                    'average_family_size' => $averageFamilySize
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch family statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}