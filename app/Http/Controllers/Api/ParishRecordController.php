<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParishRecord;
use App\Exports\ParishRecordsExport;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class ParishRecordController extends Controller
{
    /**
     * Get all records with optional filtering
     */
    public function index(Request $request)
    {
        $query = ParishRecord::query();

        // Filter by type
        if ($request->has('type') && $request->type) {
            $query->byType($request->type);
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->byStatus($request->status);
        }

        // Search by name, priest, or certificate number
        if ($request->has('search') && $request->search) {
            $query->search($request->search);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->where('date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->where('date', '<=', $request->date_to);
        }

        // Filter by month (YYYY-MM format)
        if ($request->has('month') && $request->month) {
            $monthYear = explode('-', $request->month);
            if (count($monthYear) === 2) {
                $query->byMonth($monthYear[1], $monthYear[0]);
            }
        }

        // Order by date (newest first by default)
        $query->orderBy('date', 'desc');

        $records = $query->get();

        return response()->json($records);
    }

    /**
     * Get records statistics
     */
    public function statistics(Request $request)
    {
        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;

        $stats = [
            'total_records' => ParishRecord::count(),
            'completed_records' => ParishRecord::byStatus('completed')->count(),
            'pending_records' => ParishRecord::byStatus('pending')->count(),
            'this_month_records' => ParishRecord::byMonth($currentMonth, $currentYear)->count(),
            'this_year_records' => ParishRecord::byYear($currentYear)->count(),
            'by_type' => [
                'baptism' => ParishRecord::byType('baptism')->count(),
                'confirmation' => ParishRecord::byType('confirmation')->count(),
                'marriage' => ParishRecord::byType('marriage')->count(),
                'funeral' => ParishRecord::byType('funeral')->count(),
                'mass' => ParishRecord::byType('mass')->count(),
            ]
        ];

        // If type filter is provided, get stats for that type only
        if ($request->has('type') && $request->type) {
            $type = $request->type;
            $stats['filtered_stats'] = [
                'total' => ParishRecord::byType($type)->count(),
                'completed' => ParishRecord::byType($type)->byStatus('completed')->count(),
                'pending' => ParishRecord::byType($type)->byStatus('pending')->count(),
                'this_month' => ParishRecord::byType($type)->byMonth($currentMonth, $currentYear)->count(),
                'this_year' => ParishRecord::byType($type)->byYear($currentYear)->count(),
            ];
        }

        return response()->json($stats);
    }

    /**
     * Store a new record
     */
    public function store(Request $request)
    {
        $request->validate([
            'type' => ['required', Rule::in(['baptism', 'confirmation', 'marriage', 'funeral', 'mass'])],
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'priest' => 'required|string|max:255',
            'status' => ['nullable', Rule::in(['completed', 'pending', 'cancelled'])],
            'details' => 'nullable|array',
            'notes' => 'nullable|string',
            'certificate_number' => 'nullable|string|max:255|unique:parish_records,certificate_number'
        ]);

        try {
            \DB::beginTransaction();

            // Merge default details with provided details
            $defaultDetails = ParishRecord::getDefaultDetails($request->type);
            $details = array_merge($defaultDetails, $request->details ?? []);

            $record = ParishRecord::create([
                'type' => $request->type,
                'name' => $request->name,
                'date' => $request->date,
                'priest' => $request->priest,
                'status' => $request->status ?? 'completed',
                'details' => $details,
                'notes' => $request->notes,
                'certificate_number' => $request->certificate_number
            ]);

            // Generate certificate number if not provided
            if (!$request->certificate_number) {
                $record->generateCertificateNumber();
            }

            \DB::commit();

            return response()->json([
                'message' => 'Parish record created successfully',
                'record' => $record
            ], 201);

        } catch (\Exception $e) {
            \DB::rollback();
            return response()->json([
                'message' => 'Failed to create parish record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show a specific record
     */
    public function show($id)
    {
        $record = ParishRecord::findOrFail($id);
        return response()->json($record);
    }

    /**
     * Update a record
     */
    public function update(Request $request, $id)
    {
        $record = ParishRecord::findOrFail($id);

        $request->validate([
            'type' => ['sometimes', Rule::in(['baptism', 'confirmation', 'marriage', 'funeral', 'mass'])],
            'name' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'priest' => 'sometimes|string|max:255',
            'status' => ['sometimes', Rule::in(['completed', 'pending', 'cancelled'])],
            'details' => 'sometimes|array',
            'notes' => 'nullable|string',
            'certificate_number' => 'sometimes|string|max:255|unique:parish_records,certificate_number,' . $id
        ]);

        try {
            \DB::beginTransaction();

            // If type is being changed, merge with new default details
            if ($request->has('type') && $request->type !== $record->type) {
                $defaultDetails = ParishRecord::getDefaultDetails($request->type);
                $existingDetails = $record->details ?? [];
                $details = array_merge($defaultDetails, $existingDetails, $request->details ?? []);
                $request->merge(['details' => $details]);
            } elseif ($request->has('details')) {
                // Merge with existing details
                $existingDetails = $record->details ?? [];
                $details = array_merge($existingDetails, $request->details);
                $request->merge(['details' => $details]);
            }

            $record->update($request->only([
                'type', 'name', 'date', 'priest', 'status', 'details', 'notes', 'certificate_number'
            ]));

            \DB::commit();

            return response()->json([
                'message' => 'Parish record updated successfully',
                'record' => $record
            ]);

        } catch (\Exception $e) {
            \DB::rollback();
            return response()->json([
                'message' => 'Failed to update parish record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a record
     */
    public function destroy($id)
    {
        try {
            $record = ParishRecord::findOrFail($id);
            $record->delete();

            return response()->json([
                'message' => 'Parish record deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete parish record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get default details structure for a record type
     */
    public function getDefaultDetails($type)
    {
        $validTypes = ['baptism', 'confirmation', 'marriage', 'funeral', 'mass'];
        
        if (!in_array($type, $validTypes)) {
            return response()->json([
                'message' => 'Invalid record type'
            ], 400);
        }

        $details = ParishRecord::getDefaultDetails($type);
        
        return response()->json([
            'type' => $type,
            'default_details' => $details
        ]);
    }

    /**
     * Export records to CSV
     */
    public function export(Request $request)
    {
        try {
            // Get filters from request
            $filters = [
                'status' => $request->status,
                'search' => $request->search,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'month' => $request->month
            ];

            // Create export instance
            $export = new ParishRecordsExport($request->type, $filters);
            $csvData = $export->toCsv();

            // Generate filename
            $type = $request->type ?? 'all';
            $filename = $type . '_records_' . date('Y-m-d_H-i-s') . '.csv';

            // Create CSV content
            $csvContent = '';
            foreach ($csvData as $row) {
                $csvContent .= '"' . implode('","', array_map(function($field) {
                    return str_replace('"', '""', $field); // Escape quotes
                }, $row)) . '"' . "\n";
            }

            // Return CSV file download
            return response($csvContent)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0');

        } catch (\Exception $e) {
            \Log::error('Parish Records Export Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to export records: ' . $e->getMessage()
            ], 500);
        }
    }
}