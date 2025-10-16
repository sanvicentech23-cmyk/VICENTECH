<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CertificateRequest;
use App\Models\CertificateTemplate;
use App\Models\CertificateRelease;
use App\Models\User;
use App\Services\CertificatePdfService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class CertificateGenerationController extends Controller
{
    // Get certificate request data for generation
    public function getCertificateData($id)
    {
        $certificateRequest = CertificateRequest::findOrFail($id);
        
        // Get default template for this certificate type
        $template = CertificateTemplate::getDefaultTemplateForType($certificateRequest->certificate_type);
        
        if (!$template) {
            // Create default template if none exists
            $template = $this->createDefaultTemplate($certificateRequest->certificate_type);
        }
        
        return response()->json([
            'certificate_request' => $certificateRequest,
            'template' => $template,
            'priests' => User::where('is_priest', true)->get(['id', 'name', 'esignature_path', 'esignature_data'])
        ]);
    }

    // Save certificate template
    public function saveTemplate(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'certificate_type' => 'required|string',
            'description' => 'nullable|string',
            'template_data' => 'required|array',
            'default_data' => 'nullable|array',
            'is_default' => 'boolean'
        ]);

        // If this is set as default, unset other defaults for this type
        if ($validated['is_default']) {
            CertificateTemplate::where('certificate_type', $validated['certificate_type'])
                              ->where('is_default', true)
                              ->update(['is_default' => false]);
        }

        $template = CertificateTemplate::create($validated);

        return response()->json($template);
    }

    // Generate certificate release
    public function generateCertificate(Request $request)
    {
        $validated = $request->validate([
            'certificate_request_id' => 'required|exists:certificate_requests,id',
            'certificate_template_id' => 'required|exists:certificate_templates,id',
            'certificate_data' => 'required|array',
            'priest_id' => 'required|exists:users,id',
            'certificate_date' => 'required|date',
            'notes' => 'nullable|string'
        ]);

        $certificateRequest = CertificateRequest::findOrFail($validated['certificate_request_id']);
        $template = CertificateTemplate::findOrFail($validated['certificate_template_id']);
        $priest = User::findOrFail($validated['priest_id']);

        // Generate unique reference first
        $uniqueReference = 'REF-' . time() . '-' . Str::random(6);
        
        // Create certificate release
        $certificateRelease = CertificateRelease::create([
            'certificate_request_id' => $certificateRequest->id,
            'certificate_template_id' => $template->id,
            'unique_reference' => $uniqueReference,
            'certificate_type' => $certificateRequest->certificate_type,
            'recipient_name' => $certificateRequest->first_name . ' ' . $certificateRequest->last_name,
            'recipient_email' => $certificateRequest->email,
            'certificate_date' => $validated['certificate_date'],
            'priest_name' => $priest->name,
            'priest_signature_path' => $priest->esignature_path,
            'certificate_data' => $validated['certificate_data'],
            'status' => 'generated',
            'notes' => $validated['notes']
        ]);

        // Generate PDF immediately
        $pdfService = new CertificatePdfService();
        $pdfPath = $pdfService->generatePdf($certificateRelease);
        
        // Update the certificate release with PDF path
        $certificateRelease->update(['pdf_path' => $pdfPath]);

        // Send email notification to parishioner
        try {
            Mail::to($certificateRequest->email)->send(new \App\Mail\CertificateReadyMail($certificateRelease));
            $certificateRelease->update(['emailed_at' => now(), 'status' => 'emailed']);
        } catch (\Exception $e) {
            \Log::error('Failed to send certificate email: ' . $e->getMessage());
        }

        return response()->json([
            'certificate_release' => $certificateRelease,
            'pdf_path' => $pdfPath,
            'download_url' => url('/api/certificate-generation/download/' . $certificateRelease->id)
        ]);
    }

    // Generate PDF for certificate
    public function generatePDF($id)
    {
        $certificateRelease = CertificateRelease::findOrFail($id);
        
        $pdfService = new CertificatePdfService();
        $pdfPath = $pdfService->generatePdf($certificateRelease);
        
        // Update the certificate release with PDF path
        $certificateRelease->update(['pdf_path' => $pdfPath]);
        
        return response()->json([
            'message' => 'PDF generated successfully',
            'pdf_path' => $pdfPath,
            'certificate' => $certificateRelease
        ]);
    }

    // Print certificate (mark as printed and send email)
    public function printCertificate($id)
    {
        $certificateRelease = CertificateRelease::findOrFail($id);
        
        // Mark as printed
        $certificateRelease->markAsPrinted();
        
        // Send email notification
        $this->sendCertificateEmail($certificateRelease);
        
        return response()->json([
            'message' => 'Certificate printed and email sent',
            'certificate' => $certificateRelease
        ]);
    }

    // Send certificate email to parishioner
    private function sendCertificateEmail($certificateRelease)
    {
        try {
            Mail::send('emails.certificate_ready', [
                'certificate' => $certificateRelease,
                'recipient_name' => $certificateRelease->recipient_name
            ], function ($message) use ($certificateRelease) {
                $message->to($certificateRelease->recipient_email)
                        ->subject('Your Certificate is Ready - ' . $certificateRelease->certificate_type);
                
                // Attach PDF if exists
                if ($certificateRelease->pdf_path && Storage::exists($certificateRelease->pdf_path)) {
                    $message->attach(Storage::path($certificateRelease->pdf_path));
                }
            });
            
            $certificateRelease->markAsEmailed();
            
        } catch (\Exception $e) {
            \Log::error('Failed to send certificate email: ' . $e->getMessage());
            throw $e;
        }
    }

    // Get all certificate releases
    public function getCertificateReleases()
    {
        $releases = CertificateRelease::with(['certificateRequest', 'certificateTemplate'])
                                    ->orderBy('created_at', 'desc')
                                    ->get();
        
        return response()->json($releases);
    }

    // Get certificate release by ID
    public function getCertificateRelease($id)
    {
        $release = CertificateRelease::with(['certificateRequest', 'certificateTemplate'])
                                   ->findOrFail($id);
        
        return response()->json($release);
    }

    // Update certificate release
    public function updateCertificateRelease(Request $request, $id)
    {
        $certificateRelease = CertificateRelease::findOrFail($id);
        
        $validated = $request->validate([
            'certificate_data' => 'sometimes|array',
            'status' => 'sometimes|string|in:draft,generated,printed,emailed,completed',
            'notes' => 'sometimes|string'
        ]);
        
        $certificateRelease->update($validated);
        
        return response()->json($certificateRelease);
    }

    // Create default template for certificate type
    private function createDefaultTemplate($type)
    {
        return CertificateTemplate::createDefaultTemplate($type);
    }

    // Upload priest signature
    public function uploadPriestSignature(Request $request)
    {
        $validated = $request->validate([
            'priest_id' => 'required|exists:users,id',
            'signature' => 'required|string', // Base64 encoded signature
            'signature_type' => 'required|string|in:image,svg'
        ]);

        $priest = User::findOrFail($validated['priest_id']);
        
        if ($validated['signature_type'] === 'image') {
            // Handle image signature
            $imageData = $validated['signature'];
            $imageData = str_replace('data:image/png;base64,', '', $imageData);
            $imageData = str_replace(' ', '+', $imageData);
            
            $fileName = 'signatures/priest_' . $priest->id . '_' . time() . '.png';
            Storage::put($fileName, base64_decode($imageData));
            
            $priest->esignature_path = $fileName;
        } else {
            // Handle SVG signature
            $priest->esignature_data = $validated['signature'];
        }
        
        $priest->save();
        
        return response()->json([
            'message' => 'Signature uploaded successfully',
            'priest' => $priest
        ]);
    }

    // Upload image for certificate template
    public function uploadImage(Request $request)
    {
        $validated = $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'element_id' => 'required|string',
            'certificate_id' => 'required|exists:certificate_requests,id'
        ]);

        try {
            $file = $request->file('image');
            $fileName = time() . '_' . $validated['element_id'] . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('certificate-images', $fileName, 'public');

            return response()->json([
                'success' => true,
                'image_path' => Storage::url($path),
                'image_url' => asset('storage/' . $path),
                'file_name' => $fileName
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload image: ' . $e->getMessage()
            ], 500);
        }
    }

    // Download certificate PDF
    public function downloadCertificate($id)
    {
        $certificateRelease = CertificateRelease::findOrFail($id);
        
        $pdfService = new CertificatePdfService();
        
        try {
            return $pdfService->downloadPdf($certificateRelease);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Certificate not found or not generated yet'
            ], 404);
        }
    }

    // Validate certificate by reference number
    public function validateCertificate($referenceNumber)
    {
        try {
            $certificateRelease = CertificateRelease::where('unique_reference', $referenceNumber)->first();
            
            if (!$certificateRelease) {
                return response()->json(['error' => 'Certificate not found'], 404);
            }
            
            // Return certificate details for validation
            return response()->json([
                'unique_reference' => $certificateRelease->unique_reference,
                'certificate_type' => $certificateRelease->certificate_type,
                'recipient_name' => $certificateRelease->recipient_name,
                'certificate_date' => $certificateRelease->certificate_date,
                'priest_name' => $certificateRelease->priest_name,
                'status' => $certificateRelease->status,
                'created_at' => $certificateRelease->created_at,
                'updated_at' => $certificateRelease->updated_at,
                'emailed_at' => $certificateRelease->emailed_at,
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Certificate validation error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to validate certificate'], 500);
        }
    }
}
