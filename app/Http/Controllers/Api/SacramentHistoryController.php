<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SacramentHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SacramentHistoryController extends Controller
{
    /**
     * Get user's sacrament history
     */
    public function index()
    {
        try {
            $user = Auth::user();
            $history = SacramentHistory::where('user_id', $user->id)
                ->orderBy('date', 'desc')
                ->get()
                ->map(function ($record) {
                    return [
                        'id' => $record->id,
                        'type' => $record->type,
                        'date' => $record->date->format('Y-m-d'), // Format as YYYY-MM-DD
                        'parish' => $record->parish,
                        'created_at' => $record->created_at,
                        'updated_at' => $record->updated_at,
                    ];
                });
            
            return response()->json($history);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch sacrament history',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new sacrament record
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type' => 'required|string|max:255',
                'date' => 'required|date',
                'parish' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validation failed',
                    'messages' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            $sacrament = SacramentHistory::create([
                'user_id' => $user->id,
                'type' => $request->type,
                'date' => $request->date,
                'parish' => $request->parish,
            ]);

            // Format the response
            $formattedSacrament = [
                'id' => $sacrament->id,
                'type' => $sacrament->type,
                'date' => $sacrament->date->format('Y-m-d'),
                'parish' => $sacrament->parish,
                'created_at' => $sacrament->created_at,
                'updated_at' => $sacrament->updated_at,
            ];

            return response()->json($formattedSacrament, 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create sacrament record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a sacrament record
     */
    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type' => 'required|string|max:255',
                'date' => 'required|date',
                'parish' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validation failed',
                    'messages' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            $sacrament = SacramentHistory::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$sacrament) {
                return response()->json([
                    'error' => 'Sacrament record not found'
                ], 404);
            }

            $sacrament->update([
                'type' => $request->type,
                'date' => $request->date,
                'parish' => $request->parish,
            ]);

            // Format the response
            $formattedSacrament = [
                'id' => $sacrament->id,
                'type' => $sacrament->type,
                'date' => $sacrament->date->format('Y-m-d'),
                'parish' => $sacrament->parish,
                'created_at' => $sacrament->created_at,
                'updated_at' => $sacrament->updated_at,
            ];

            return response()->json($formattedSacrament);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update sacrament record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a sacrament record
     */
    public function destroy($id)
    {
        try {
            $user = Auth::user();
            $sacrament = SacramentHistory::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$sacrament) {
                return response()->json([
                    'error' => 'Sacrament record not found'
                ], 404);
            }

            $sacrament->delete();

            return response()->json([
                'message' => 'Sacrament record deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete sacrament record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sacrament history for family members (Family Head only)
     */
    public function getFamilySacramentHistory()
    {
        try {
            $user = Auth::user();
            
            // Check if user is a family head
            if (!$user->is_family_head) {
                return response()->json([
                    'error' => 'Only family heads can access family sacrament history'
                ], 403);
            }

            // Get all family members
            $familyMembers = \App\Models\User::where('family_id', $user->family_id)->get();
            $familyMemberIds = $familyMembers->pluck('id');

            // Get sacrament history for all family members
            $sacramentHistory = SacramentHistory::whereIn('user_id', $familyMemberIds)
                ->with('user:id,name,email')
                ->orderBy('date', 'desc')
                ->get()
                ->map(function ($record) {
                    return [
                        'id' => $record->id,
                        'user_id' => $record->user_id,
                        'user_name' => $record->user->name,
                        'user_email' => $record->user->email,
                        'type' => $record->type,
                        'date' => $record->date->format('Y-m-d'),
                        'parish' => $record->parish,
                        'created_at' => $record->created_at,
                        'updated_at' => $record->updated_at,
                    ];
                });

            return response()->json($sacramentHistory);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch family sacrament history',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add sacrament record for family member (Family Head only)
     */
    public function addFamilyMemberSacrament(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Check if user is a family head
            if (!$user->is_family_head) {
                return response()->json([
                    'error' => 'Only family heads can add sacrament records for family members'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'user_id' => 'required|exists:users,id',
                'type' => 'required|string|max:255',
                'date' => 'required|date',
                'parish' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validation failed',
                    'messages' => $validator->errors()
                ], 422);
            }

            // Verify the target user is in the same family
            $targetUser = \App\Models\User::where('id', $request->user_id)
                ->where('family_id', $user->family_id)
                ->first();

            if (!$targetUser) {
                return response()->json([
                    'error' => 'User not found in your family'
                ], 404);
            }

            $sacrament = SacramentHistory::create([
                'user_id' => $request->user_id,
                'type' => $request->type,
                'date' => $request->date,
                'parish' => $request->parish,
            ]);

            // Format the response
            $formattedSacrament = [
                'id' => $sacrament->id,
                'user_id' => $sacrament->user_id,
                'user_name' => $targetUser->name,
                'user_email' => $targetUser->email,
                'type' => $sacrament->type,
                'date' => $sacrament->date->format('Y-m-d'),
                'parish' => $sacrament->parish,
                'created_at' => $sacrament->created_at,
                'updated_at' => $sacrament->updated_at,
            ];

            return response()->json($formattedSacrament, 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create sacrament record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update sacrament record for family member (Family Head only)
     */
    public function updateFamilyMemberSacrament(Request $request, $id)
    {
        try {
            $user = Auth::user();
            
            // Check if user is a family head
            if (!$user->is_family_head) {
                return response()->json([
                    'error' => 'Only family heads can update sacrament records for family members'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'type' => 'required|string|max:255',
                'date' => 'required|date',
                'parish' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validation failed',
                    'messages' => $validator->errors()
                ], 422);
            }

            // Find the sacrament record
            $sacrament = SacramentHistory::findOrFail($id);
            
            // Verify the sacrament belongs to a family member
            $sacramentOwner = \App\Models\User::where('id', $sacrament->user_id)
                ->where('family_id', $user->family_id)
                ->first();

            if (!$sacramentOwner) {
                return response()->json([
                    'error' => 'Sacrament record not found in your family'
                ], 404);
            }

            $sacrament->update([
                'type' => $request->type,
                'date' => $request->date,
                'parish' => $request->parish,
            ]);

            // Format the response
            $formattedSacrament = [
                'id' => $sacrament->id,
                'user_id' => $sacrament->user_id,
                'user_name' => $sacramentOwner->name,
                'user_email' => $sacramentOwner->email,
                'type' => $sacrament->type,
                'date' => $sacrament->date->format('Y-m-d'),
                'parish' => $sacrament->parish,
                'created_at' => $sacrament->created_at,
                'updated_at' => $sacrament->updated_at,
            ];

            return response()->json($formattedSacrament);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update sacrament record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete sacrament record for family member (Family Head only)
     */
    public function deleteFamilyMemberSacrament($id)
    {
        try {
            $user = Auth::user();
            
            // Check if user is a family head
            if (!$user->is_family_head) {
                return response()->json([
                    'error' => 'Only family heads can delete sacrament records for family members'
                ], 403);
            }

            // Find the sacrament record
            $sacrament = SacramentHistory::findOrFail($id);
            
            // Verify the sacrament belongs to a family member
            $sacramentOwner = \App\Models\User::where('id', $sacrament->user_id)
                ->where('family_id', $user->family_id)
                ->first();

            if (!$sacramentOwner) {
                return response()->json([
                    'error' => 'Sacrament record not found in your family'
                ], 404);
            }

            $sacrament->delete();

            return response()->json([
                'message' => 'Sacrament record deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete sacrament record',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
