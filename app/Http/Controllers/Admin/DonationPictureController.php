<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DonationPicture;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DonationPictureController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $pictures = DonationPicture::orderBy('created_at', 'desc')->get();
        return response()->json($pictures);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required|file|mimes:jpg,jpeg,png,gif,webp|max:5120' // 5MB max
        ]);

        try {
            $file = $request->file('image');
            $guessedExt = $file->guessExtension();
            $originalExt = $file->getClientOriginalExtension();
            $ext = $guessedExt ?: $originalExt ?: 'png';
            $filename = (string) Str::uuid() . '.' . strtolower($ext);
            $path = $file->storeAs('donation_pictures', $filename, 'public');
            
            $donationPicture = DonationPicture::create([
                'image_path' => '/storage/' . $path,
                'original_name' => $file->getClientOriginalName(),
                'enabled' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Image uploaded successfully',
                'data' => $donationPicture
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload image: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $picture = DonationPicture::find($id);
        if (!$picture) {
            return response()->json(['error' => 'Image not found'], 404);
        }
        return response()->json($picture);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $picture = DonationPicture::find($id);
        if (!$picture) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        $request->validate([
            'enabled' => 'boolean'
        ]);

        $picture->update($request->only(['enabled']));

        return response()->json([
            'success' => true,
            'message' => 'Image updated successfully',
            'data' => $picture
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $picture = DonationPicture::find($id);
        if (!$picture) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        try {
            // Delete the file from storage
            if ($picture->image_path) {
                $filePath = str_replace('/storage/', '', $picture->image_path);
                Storage::disk('public')->delete($filePath);
            }

            $picture->delete();

            return response()->json([
                'success' => true,
                'message' => 'Image deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete image: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle the enabled status of a donation picture
     */
    public function toggle(Request $request, string $id)
    {
        $picture = DonationPicture::find($id);
        if (!$picture) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        $request->validate([
            'enabled' => 'required|boolean'
        ]);

        $picture->enabled = $request->enabled;
        $picture->save();

        return response()->json([
            'success' => true,
            'message' => 'Image status updated successfully',
            'data' => $picture
        ]);
    }
}
