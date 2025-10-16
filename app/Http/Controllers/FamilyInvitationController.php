<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\FamilyInvitation;
use App\Models\FamilyMember;
use Illuminate\Http\Request;
use App\Models\Family;
use App\Notifications\FamilyInvitationNotification;

class FamilyInvitationController extends Controller
{
    // Search parishioners
    public function search(Request $request)
    {
        $search = $request->query('search');
        
        $results = User::where(function($query) use ($search) {
            $query->where('name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
        })
        // Comment out these lines if you get an error, then add them back one by one
        ->where('is_admin', false)
        ->where('is_staff', false)
        ->where('is_priest', false)
        ->get(['id', 'name', 'email', 'is_admin', 'is_staff', 'is_priest', 'family_id']);
        
        return $results;
    }

    // Send invitation
    public function send(Request $request)
    {
        $request->validate([
            'invitee_id' => 'required|exists:users,id',
            'relationship' => 'required|string'
        ]);
        $inviter = auth()->user();
        $invitee = User::findOrFail($request->invitee_id);

        // Check if inviter is a family head
        if (!$inviter->is_family_head) {
            return response()->json([
                'success' => false,
                'message' => 'Only family heads can invite new members to the family.'
            ], 403);
        }

        // Family logic - user should already have a family from Profile.jsx creation
        if (!$inviter->family_id) {
            return response()->json([
                'success' => false,
                'message' => 'You must create a family first before inviting members. Please go to your profile and create a family.'
            ], 422);
        }
        
        $family = Family::find($inviter->family_id);
        if (!$family) {
            return response()->json([
                'success' => false,
                'message' => 'Family not found. Please create a family first.'
            ], 404);
        }

        // Check if invitee is already part of a family
        if ($invitee->family_id) {
            return response()->json([
                'success' => false,
                'message' => 'This person is already part of a family and cannot be invited to another family.'
            ], 422);
        }

        // Check if invitee is admin/staff/priest
        if ($invitee->is_admin || $invitee->is_staff || $invitee->is_priest) {
            return response()->json([
                'success' => false,
                'message' => 'Admin, staff, and priest accounts cannot be invited to families.'
            ], 422);
        }
        
        // Do NOT assign invitee to family here. Only do it when they accept.
        $invitation = FamilyInvitation::create([
            'inviter_id' => $inviter->id,
            'invitee_id' => $invitee->id,
            'relationship' => $request->relationship,
            'status' => 'pending'
        ]);
        // Send notification to invitee
        $invitee->notify(new FamilyInvitationNotification($inviter, $request->relationship, $invitation));
        return response()->json($invitation, 201);
    }

    // Get invitations for the authenticated user
    public function index()
    {
        $userId = auth()->id();
        $invitations = FamilyInvitation::where('inviter_id', $userId)
            ->orWhere('invitee_id', $userId)
            ->get();
        // Attach inviter_name to each invitation
        $invitations->transform(function ($invite) {
            $inviter = User::find($invite->inviter_id);
            $invite->inviter_name = $inviter ? $inviter->name : $invite->inviter_id;
            return $invite;
        });
        return $invitations;
    }

    // Accept or reject invitation
    public function respond(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:accepted,rejected']);
        $invitation = FamilyInvitation::findOrFail($id);
        if ($invitation->invitee_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $invitation->status = $request->status;
        $invitation->save();
        if ($request->status === 'accepted') {
            $inviter = User::find($invitation->inviter_id);
            $invitee = User::find($invitation->invitee_id);
            
            // Ensure inviter has a family
            if (!$inviter->family_id) {
                return response()->json(['error' => 'Inviter does not have a family'], 400);
            }
            
            // If invitee already has a family, they cannot accept
            if ($invitee->family_id && $invitee->family_id !== $inviter->family_id) {
                return response()->json(['error' => 'You are already part of another family'], 400);
            }
            
            // Add invitee to the family
            $invitee->update([
                'family_id' => $inviter->family_id,
                'family_role' => 'member', // Set as regular member, not head
                'relationship_to_head' => $invitation->relationship,
                'is_family_head' => false // Ensure they are not a family head
            ]);
            
            // Create family member relationships
            FamilyMember::create([
                'user_id' => $invitation->inviter_id,
                'family_member_id' => $invitation->invitee_id,
                'relationship' => $invitation->relationship
            ]);
            FamilyMember::create([
                'user_id' => $invitation->invitee_id,
                'family_member_id' => $invitation->inviter_id,
                'relationship' => $invitation->relationship
            ]);
            
            // Send notifications
            // Notification::create(['user_id' => $inviter->id, 'message' => $invitee->name.' has joined your family group.']);
            // Notification::create(['user_id' => $invitee->id, 'message' => 'You have joined a family group.']);
        }
        return response()->json($invitation);
    }

    // Get accepted family members
    public function familyMembers()
    {
        $user = auth()->user();
        if (!$user->family_id) {
            return response()->json([]);
        }
        $familyMembers = User::where('family_id', $user->family_id)
            ->select('id', 'name', 'email', 'profile_image')
            ->get();
        return response()->json($familyMembers);
    }
}
