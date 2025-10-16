<?php

namespace App\Services;

use App\Models\CertificateRelease;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;

class CertificatePdfService
{
    /**
     * Generate PDF for certificate release
     */
    public function generatePdf(CertificateRelease $certificateRelease)
    {
        $html = $this->generateHtml($certificateRelease);
        
        // Generate PDF using DomPDF
        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'landscape');
        
        // Store the PDF file
        $pdfPath = 'certificates/' . $certificateRelease->unique_reference . '.pdf';
        Storage::put($pdfPath, $pdf->output());
        
        return $pdfPath;
    }
    
    /**
     * Generate HTML representation of the certificate
     */
    private function generateHtml(CertificateRelease $certificateRelease)
    {
        $certificateData = $certificateRelease->certificate_data;
        $templateElements = $certificateData['template_elements'] ?? [];
        $formData = $certificateData['form_data'] ?? [];
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Certificate - ' . $certificateRelease->unique_reference . '</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: "Times New Roman", serif;
            background-color: #f5f5f5;
        }
        .certificate {
            position: relative;
            width: 800px;
            height: 600px;
            background-color: #ffffff;
            border: 3px solid #333;
            margin: 0 auto;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }';
        
        foreach ($templateElements as $element) {
            $style = $element['style'] ?? [];
            $position = $element['position'] ?? ['x' => 0, 'y' => 0];
            
            $css = '';
            if (isset($style['fontSize'])) $css .= 'font-size: ' . $style['fontSize'] . 'px; ';
            if (isset($style['fontWeight'])) $css .= 'font-weight: ' . $style['fontWeight'] . '; ';
            if (isset($style['textAlign'])) $css .= 'text-align: ' . $style['textAlign'] . '; ';
            if (isset($style['color'])) $css .= 'color: ' . $style['color'] . '; ';
            if (isset($style['width'])) $css .= 'width: ' . $style['width'] . 'px; ';
            if (isset($style['height'])) $css .= 'height: ' . $style['height'] . 'px; ';
            
            $html .= '
        .element-' . $element['id'] . ' {
            position: absolute;
            left: ' . $position['x'] . 'px;
            top: ' . $position['y'] . 'px;
            ' . $css . '
        }';
        }
        
        $html .= '
    </style>
</head>
<body>
    <div class="certificate">';
        
        foreach ($templateElements as $element) {
            if ($element['type'] === 'text') {
                $content = $element['content'] ?? '';
                // Replace placeholders with actual data
                $content = str_replace('{{recipient_name}}', $formData['recipient_name'] ?? '', $content);
                $content = str_replace('{{groom_name}}', $formData['groom_name'] ?? '', $content);
                $content = str_replace('{{bride_name}}', $formData['bride_name'] ?? '', $content);
                $content = str_replace('{{certificate_date}}', $formData['certificate_date'] ?? '', $content);
                $content = str_replace('{{priest_name}}', $formData['priest_name'] ?? '', $content);
                
                $html .= '<div class="element-' . $element['id'] . '">' . htmlspecialchars($content) . '</div>';
            } elseif ($element['type'] === 'image') {
                $imageSrc = $element['content'] ?? '';
                if ($imageSrc) {
                    $html .= '<div class="element-' . $element['id'] . '">
                        <img src="' . htmlspecialchars($imageSrc) . '" alt="Certificate Image" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                    </div>';
                }
            }
        }
        
        $html .= '
    </div>
</body>
</html>';
        
        return $html;
    }
    
    /**
     * Get certificate PDF URL
     */
    public function getPdfUrl(CertificateRelease $certificateRelease)
    {
        if (!$certificateRelease->pdf_path) {
            return null;
        }
        
        return Storage::url($certificateRelease->pdf_path);
    }
    
    /**
     * Download certificate PDF
     */
    public function downloadPdf(CertificateRelease $certificateRelease)
    {
        if (!$certificateRelease->pdf_path || !Storage::exists($certificateRelease->pdf_path)) {
            throw new \Exception('PDF file not found');
        }
        
        return Storage::download($certificateRelease->pdf_path, $certificateRelease->unique_reference . '.pdf');
    }
}
