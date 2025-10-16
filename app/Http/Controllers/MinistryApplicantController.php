<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MinistryApplicant;

class MinistryApplicantController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'birthdate' => 'required|date',
            'gender' => 'required|string',
            'email' => 'required|email',
            'phone' => 'required|string',
            'address' => 'required|string',
            'server_type' => 'required|string',
            'motivation' => 'required|string',
            'commitment' => 'required|boolean',
        ]);

        $validated['status'] = 'pending';

        $applicant = MinistryApplicant::create($validated);

        return response()->json($applicant, 201);
    }
}
