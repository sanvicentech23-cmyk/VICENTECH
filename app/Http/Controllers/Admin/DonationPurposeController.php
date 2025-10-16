<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DonationPurpose;
use Illuminate\Http\Request;

class DonationPurposeController extends Controller
{
    public function store(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255']);
        $purpose = DonationPurpose::create($request->all());
        return response()->json($purpose, 201);
    }

    public function update(Request $request, $id)
    {
        $purpose = DonationPurpose::findOrFail($id);
        $purpose->update($request->all());
        return response()->json($purpose);
    }

    public function destroy($id)
    {
        DonationPurpose::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}