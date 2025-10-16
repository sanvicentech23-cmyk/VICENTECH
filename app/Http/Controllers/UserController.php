<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function me(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json($user);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $user->name = $request->input('name');
        $user->phone = $request->input('phone');
        $user->gender = $request->input('gender');
        $user->birthdate = $request->input('birthdate');
        $user->address = $request->input('address');

        // Handle profile image upload as base64
        if ($request->hasFile('profile_image')) {
            $file = $request->file('profile_image');
            $user->profile_image = base64_encode(file_get_contents($file->getRealPath()));
            $user->profile_image_mime = $file->getMimeType();
        }

        $user->save();

        return response()->json([
            'user' => $user,
            'message' => 'Profile updated successfully'
        ]);
    }

    public function show($id)
    {
        $user = \App\Models\User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        $user = \App\Models\User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Validate the request
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $id,
            'phone' => 'sometimes|string|max:20',
            'gender' => 'sometimes|string|in:male,female',
            'birthdate' => 'sometimes|date',
            'address' => 'sometimes|string|max:500',
            'password' => 'sometimes|string|min:8|confirmed',
            'is_admin' => 'sometimes|boolean',
            'is_staff' => 'sometimes|boolean',
            'is_priest' => 'sometimes|boolean',
            'status' => 'sometimes|string|in:active,inactive',
            'deactivate' => 'sometimes|boolean',
        ]);

        // Update user fields
        $user->name = $request->input('name', $user->name);
        $user->email = $request->input('email', $user->email);
        $user->phone = $request->input('phone', $user->phone);
        $user->gender = $request->input('gender', $user->gender);
        $user->birthdate = $request->input('birthdate', $user->birthdate);
        $user->address = $request->input('address', $user->address);

        // Handle role changes
        if ($request->has('is_admin')) {
            $user->is_admin = $request->input('is_admin');
        }
        if ($request->has('is_staff')) {
            $user->is_staff = $request->input('is_staff');
        }
        if ($request->has('is_priest')) {
            $user->is_priest = $request->input('is_priest');
        }

        // Handle password update
        if ($request->has('password') && $request->input('password')) {
            $user->password = bcrypt($request->input('password'));
        }

        // Handle status update (for deactivation/activation)
        if ($request->has('status')) {
            $oldStatus = $user->status;
            $user->status = $request->input('status');
            
            // If user is being deactivated, invalidate all their sessions
            if ($oldStatus !== 'inactive' && $user->status === 'inactive') {
                // Delete all sessions for this user from the sessions table
                \DB::table('sessions')->where('user_id', $user->id)->delete();
                
                // Store deactivation timestamp for immediate logout detection
                $user->deactivated_at = now();
                
                // Log the deactivation for audit purposes
                \Log::info('User account deactivated', [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_email' => $user->email,
                    'deactivated_by' => $request->user()->id ?? 'unknown',
                    'deactivated_at' => now()
                ]);
            } else if ($oldStatus === 'inactive' && $user->status === 'active') {
                // User is being reactivated, clear deactivation timestamp
                $user->deactivated_at = null;
                
                // Log the reactivation for audit purposes
                \Log::info('User account reactivated', [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_email' => $user->email,
                    'reactivated_by' => $request->user()->id ?? 'unknown',
                    'reactivated_at' => now()
                ]);
            }
        }

        $user->save();

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user
        ]);
    }

    public function destroy($id)
    {
        $user = \App\Models\User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }

    public function leave(Request $request)
    {
        $user = $request->user();

        if (!$user->family_id) {
            return response()->json(['error' => 'You are not part of any family group.'], 400);
        }

        // Get all members in the family
        $familyMembers = \App\Models\User::where('family_id', $user->family_id)->orderBy('id')->get();
        $head = $familyMembers->first();

        // Prevent head from leaving if there are other members
        if ($user->id === $head->id && $familyMembers->count() > 1) {
            return response()->json(['error' => 'Family head cannot leave while there are other members.'], 403);
        }

        // Remove user from family
        $user->family_id = null;
        $user->save();

        return response()->json(['message' => 'You have left the family group.']);
    }

    public function removeFamilyMember($id, Request $request)
    {
        $head = $request->user();
        $member = \App\Models\User::find($id);

        if (!$member || !$head->family_id || $member->family_id !== $head->family_id) {
            return response()->json(['error' => 'Member not found in your family group.'], 404);
        }

        // Get all members in the family
        $familyMembers = \App\Models\User::where('family_id', $head->family_id)->orderBy('id')->get();
        $actualHead = $familyMembers->first();

        // Only the head can remove others, and cannot remove themselves
        if ($head->id !== $actualHead->id) {
            return response()->json(['error' => 'Only the family head can remove members.'], 403);
        }
        if ($member->id === $head->id) {
            return response()->json(['error' => 'Head cannot remove themselves. Use leave instead.'], 403);
        }

        // Remove member from family
        $member->family_id = null;
        $member->save();

        return response()->json(['message' => 'Member removed from family group.']);
    }

    public function viewFamilyMembers(Request $request)
    {
        $user = $request->user();

        if (!$user->family_id) {
            return response()->json(['error' => 'You are not part of any family group.'], 400);
        }

        $familyMembers = \App\Models\User::where('family_id', $user->family_id)->orderBy('id')->get();

        return response()->json($familyMembers);
    }

    /**
     * Get family head management dashboard data
     */
    public function getFamilyHeadDashboard(Request $request)
    {
        $user = $request->user();

        if (!$user->family_id || !$user->is_family_head) {
            return response()->json(['error' => 'Only family heads can access this dashboard.'], 403);
        }

        $familyMembers = \App\Models\User::where('family_id', $user->family_id)
            ->orderBy('is_family_head', 'desc')
            ->orderBy('name')
            ->get();

        $family = \App\Models\Family::find($user->family_id);

        return response()->json([
            'family' => $family,
            'members' => $familyMembers,
            'total_members' => $familyMembers->count(),
            'is_family_head' => true
        ]);
    }

    /**
     * Update family member profile (family head only)
     */
    public function updateFamilyMemberProfile(Request $request, $memberId)
    {
        $head = $request->user();
        $member = \App\Models\User::find($memberId);

        // Verify family head and member relationship
        if (!$head->is_family_head || !$member || $member->family_id !== $head->family_id) {
            return response()->json(['error' => 'Unauthorized to update this member.'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'gender' => 'sometimes|string|in:male,female,other',
            'birthdate' => 'sometimes|date',
            'address' => 'sometimes|string|max:500',
            'family_role' => 'sometimes|string|in:head,spouse,child,parent,sibling,other',
            'relationship_to_head' => 'sometimes|string|max:100'
        ]);

        // Prevent updating admin/staff/priest accounts
        if ($member->is_admin || $member->is_staff || $member->is_priest) {
            return response()->json(['error' => 'Cannot update admin, staff, or priest accounts.'], 403);
        }

        $member->update($request->only([
            'name', 'phone', 'gender', 'birthdate', 'address', 
            'family_role', 'relationship_to_head'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Family member profile updated successfully.',
            'member' => $member->fresh()
        ]);
    }

    /**
     * Update family information (family head only)
     */
    public function updateFamilyInfo(Request $request)
    {
        $head = $request->user();

        if (!$head->is_family_head || !$head->family_id) {
            return response()->json(['error' => 'Only family heads can update family information.'], 403);
        }

        $request->validate([
            'family_name' => 'sometimes|string|max:255',
            'address' => 'sometimes|string|max:500',
            'phone' => 'sometimes|string|max:20',
            'email' => 'sometimes|email|max:255'
        ]);

        $family = \App\Models\Family::find($head->family_id);
        $family->update($request->only([
            'family_name', 'address', 'phone', 'email'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Family information updated successfully.',
            'family' => $family->fresh()
        ]);
    }

    /**
     * Transfer family head status to another member
     */
    public function transferFamilyHead(Request $request, $newHeadId)
    {
        $currentHead = $request->user();
        $newHead = \App\Models\User::find($newHeadId);

        // Verify current head and new head relationship
        if (!$currentHead->is_family_head || !$newHead || $newHead->family_id !== $currentHead->family_id) {
            return response()->json(['error' => 'Unauthorized to transfer head status.'], 403);
        }

        // Prevent transferring to admin/staff/priest accounts
        if ($newHead->is_admin || $newHead->is_staff || $newHead->is_priest) {
            return response()->json(['error' => 'Cannot transfer head status to admin, staff, or priest accounts.'], 403);
        }

        // Transfer head status
        $currentHead->update(['is_family_head' => false, 'family_role' => 'former_head']);
        $newHead->update(['is_family_head' => true, 'family_role' => 'head']);

        return response()->json([
            'success' => true,
            'message' => 'Family head status transferred successfully.',
            'new_head' => $newHead->fresh(),
            'former_head' => $currentHead->fresh()
        ]);
    }
} 