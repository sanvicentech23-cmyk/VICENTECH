<?php

namespace App\Services;

use App\Models\Donation;
use TCPDF;

class DonationReceiptPdfService
{
    public function renderDonationReceipt(Donation $donation): string
    {
        $pdf = new TCPDF();
        $pdf->SetCreator('DS-San Vicente Ferrer');
        $pdf->SetAuthor('Diocesan Shrine of San Vicente Ferrer');
        $pdf->SetTitle('Donation Receipt');
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false);
        
        // Add page
        $pdf->AddPage();
        
        // Create gradient background effect
        $this->createGradientBackground($pdf);
        
        // Add watermark
        $this->addWatermark($pdf);
        
        // Add header
        $this->addHeader($pdf);
        
        // Add receipt content
        $this->addReceiptContent($pdf, $donation);
        
        // Add uploaded receipt image if exists
        $this->addReceiptImage($pdf, $donation);
        
        // Add footer
        $this->addFooter($pdf, $donation);

        return $pdf->Output('receipt.pdf', 'S');
    }
    
    private function createGradientBackground($pdf)
    {
        $pageWidth = $pdf->getPageWidth();
        $pageHeight = $pdf->getPageHeight();
        
        // Create gradient effect by drawing multiple rectangles
        $steps = 50;
        $stepHeight = $pageHeight / $steps;
        
        for ($i = 0; $i < $steps; $i++) {
            $y = $i * $stepHeight;
            
            // Calculate color interpolation
            $ratio = $i / ($steps - 1);
            if ($ratio <= 0.3) {
                // White section (first 30%)
                $r = 255; $g = 255; $b = 255;
            } else {
                // Gradient from white to cream
                $r = 255;
                $g = 255 - (255 - 248) * (($ratio - 0.3) / 0.7);
                $b = 255 - (255 - 225) * (($ratio - 0.3) / 0.7);
            }
            
            $pdf->SetFillColor($r, $g, $b);
            $pdf->Rect(0, $y, $pageWidth, $stepHeight, 'F');
        }
    }
    
    private function addWatermark($pdf)
    {
        $logoPath = public_path('images/COA-DIOCESAN-SHRINE-SVF-MAMATID-SOLO.svg');
        
        if (file_exists($logoPath)) {
            $pageWidth = $pdf->getPageWidth();
            $pageHeight = $pdf->getPageHeight();
            
            // Center the watermark
            $logoSize = 300;
            $x = ($pageWidth - $logoSize) / 2;
            $y = ($pageHeight - $logoSize) / 2;
            
            // Add rotated watermark
            $pdf->StartTransform();
            $pdf->Rotate(-45, $pageWidth/2, $pageHeight/2);
            $pdf->Image($logoPath, $x, $y, $logoSize, $logoSize, '', '', '', true, 300, '', false, false, 0, false, false, true);
            $pdf->StopTransform();
        }
    }
    
    private function addHeader($pdf)
    {
        $pdf->SetFont('helvetica', 'B', 24);
        $pdf->SetTextColor(205, 139, 62); // #CD8B3E
        $pdf->SetXY(0, 40);
        $pdf->Cell(0, 10, 'DONATION RECEIPT', 0, 1, 'C');
        
        $pdf->SetFont('helvetica', '', 14);
        $pdf->SetTextColor(63, 46, 30); // #3F2E1E
        $pdf->SetXY(0, 55);
        $pdf->Cell(0, 8, 'Diocesan Shrine of San Vicente Ferrer', 0, 1, 'C');
        
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetXY(0, 65);
        $pdf->Cell(0, 8, 'Brgy. Mamatid, Cabuyao, Laguna', 0, 1, 'C');
    }
    
    private function addReceiptContent($pdf, $donation)
    {
        $pageWidth = $pdf->getPageWidth();
        $boxWidth = 400;
        $boxX = ($pageWidth - $boxWidth) / 2;
        $boxY = 90;
        
        // Draw receipt box
        $pdf->SetDrawColor(205, 139, 62); // #CD8B3E
        $pdf->SetFillColor(255, 255, 255); // White
        $pdf->SetLineWidth(3);
        $pdf->RoundedRect($boxX, $boxY, $boxWidth, 200, 5, '1111', 'FD');
        
        // Add "Official Receipt" title
        $pdf->SetFont('helvetica', 'B', 18);
        $pdf->SetTextColor(63, 46, 30); // #3F2E1E
        $pdf->SetXY($boxX, $boxY + 15);
        $pdf->Cell($boxWidth, 10, 'Official Receipt', 0, 1, 'C');
        
        // Add line under title
        $pdf->SetDrawColor(205, 139, 62); // #CD8B3E
        $pdf->SetLineWidth(2);
        $pdf->Line($boxX + 50, $boxY + 30, $boxX + $boxWidth - 50, $boxY + 30);
        
        // Add donation information
        $infoY = $boxY + 40;
        $labelWidth = 120;
        $valueWidth = $boxWidth - $labelWidth - 40;
        
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(63, 46, 30); // #3F2E1E
        
        $infoItems = [
            'Donor Name:' => $donation->name,
            'Email Address:' => $donation->email,
            'Reference Number:' => $donation->reference ?? 'N/A',
            'Donation Purpose:' => $donation->purpose_name ?? $donation->category ?? 'General Donation',
            'Date & Time:' => optional($donation->created_at)->format('F j, Y \a\t g:i A'),
            'Status:' => $donation->verified ? 'Verified' : 'Pending Verification'
        ];
        
        foreach ($infoItems as $label => $value) {
            $pdf->SetXY($boxX + 20, $infoY);
            $pdf->Cell($labelWidth, 8, $label, 0, 0, 'L');
            
            if ($label === 'Status:') {
                // Add status badge
                $pdf->SetFillColor($donation->verified ? 232 : 255, $donation->verified ? 245 : 243, $donation->verified ? 232 : 224);
                $pdf->SetTextColor($donation->verified ? 46 : 245, $donation->verified ? 125 : 124, $donation->verified ? 50 : 0);
                $pdf->RoundedRect($boxX + $labelWidth + 20, $infoY - 2, 80, 12, 6, '1111', 'F');
                $pdf->SetXY($boxX + $labelWidth + 20, $infoY);
                $pdf->Cell(80, 8, $value, 0, 0, 'C');
            } else {
                $pdf->SetTextColor(63, 46, 30); // #3F2E1E
                $pdf->SetXY($boxX + $labelWidth + 20, $infoY);
                $pdf->Cell($valueWidth, 8, $value, 0, 0, 'L');
            }
            
            $infoY += 15;
        }
        
        // Add amount section
        $amountY = $boxY + 140;
        $pdf->SetFillColor(255, 246, 229); // #FFF6E5
        $pdf->RoundedRect($boxX + 20, $amountY, $boxWidth - 40, 40, 5, '1111', 'F');
        
        $pdf->SetFont('helvetica', 'B', 28);
        $pdf->SetTextColor(205, 139, 62); // #CD8B3E
        $pdf->SetXY($boxX + 20, $amountY + 8);
        $pdf->Cell($boxWidth - 40, 12, '₱' . number_format((float)$donation->amount, 2), 0, 1, 'C');
        
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(63, 46, 30); // #3F2E1E
        $pdf->SetXY($boxX + 20, $amountY + 20);
        $pdf->Cell($boxWidth - 40, 8, 'Donation Amount', 0, 1, 'C');
    }
    
    private function addReceiptImage($pdf, $donation)
    {
        // Check if donation has an uploaded receipt
        if (empty($donation->receipt_path)) {
            return;
        }

        $receiptWebPath = $donation->receipt_path;
        $receiptFsPath = public_path(ltrim($receiptWebPath, '/'));
        
        // Normalize Windows backslashes for TCPDF
        $receiptFsPath = str_replace('\\', '/', $receiptFsPath);
        
        // Check if file exists
        if (!file_exists($receiptFsPath)) {
            return;
        }

        $ext = strtolower(pathinfo($receiptFsPath, PATHINFO_EXTENSION));
        $isImage = in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']);
        
        if (!$isImage) {
            return;
        }

        $pageWidth = $pdf->getPageWidth();
        $pageHeight = $pdf->getPageHeight();
        
        // Position the receipt image section below the main receipt box
        $imageY = 320; // Move it down a bit more to ensure it's visible
        
        // Add background for receipt image section
        $pdf->SetFillColor(255, 246, 229); // #FFF6E5
        $pdf->RoundedRect(40, $imageY, $pageWidth - 80, 140, 5, '1111', 'F');
        
        // Add border
        $pdf->SetDrawColor(255, 235, 201); // #FFEBC9
        $pdf->SetLineWidth(1);
        $pdf->RoundedRect(40, $imageY, $pageWidth - 80, 140, 5, '1111', 'D');
        
        // Add section title
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(205, 139, 62); // #CD8B3E
        $pdf->SetXY(40, $imageY + 10);
        $pdf->Cell($pageWidth - 80, 8, 'Uploaded Receipt', 0, 1, 'C');
        
        // Add line under title
        $pdf->SetDrawColor(255, 235, 201); // #FFEBC9
        $pdf->SetLineWidth(1);
        $pdf->Line(60, $imageY + 25, $pageWidth - 60, $imageY + 25);
        
        // Calculate image dimensions to fit in the available space
        $maxWidth = $pageWidth - 100; // Leave margins
        $maxHeight = 100; // Increased height for better visibility
        
        // Get image dimensions
        $imageInfo = getimagesize($receiptFsPath);
        if (!$imageInfo) {
            return;
        }
        
        $originalWidth = $imageInfo[0];
        $originalHeight = $imageInfo[1];
        
        // Calculate scaling to fit within bounds while maintaining aspect ratio
        $scaleX = $maxWidth / $originalWidth;
        $scaleY = $maxHeight / $originalHeight;
        $scale = min($scaleX, $scaleY);
        
        $scaledWidth = $originalWidth * $scale;
        $scaledHeight = $originalHeight * $scale;
        
        // Center the image
        $imageX = ($pageWidth - $scaledWidth) / 2;
        $imageY += 35; // Position below title
        
        // Add the image
        try {
            // Use TCPDF Image method with file path
            $pdf->Image($receiptFsPath, $imageX, $imageY, $scaledWidth, $scaledHeight, '', '', '', true, 300, '', false, false, 0, false, false, true);
            
        } catch (\Exception $e) {
            // If image fails to load, show a message
            $pdf->SetFont('helvetica', '', 10);
            $pdf->SetTextColor(200, 0, 0);
            $pdf->SetXY(40, $imageY + 20);
            $pdf->Cell($pageWidth - 80, 8, 'Receipt image could not be displayed: ' . $e->getMessage(), 0, 1, 'C');
        }
    }
    
    private function addFooter($pdf, $donation)
    {
        $pageWidth = $pdf->getPageWidth();
        $pageHeight = $pdf->getPageHeight();
        
        // Adjust footer position based on whether receipt image was added
        $footerY = $pageHeight - 60;
        if (!empty($donation->receipt_path)) {
            $footerY = $pageHeight - 40; // Move footer up if image was added
        }
        
        $pdf->SetFont('helvetica', '', 10);
        $pdf->SetTextColor(63, 46, 30); // #3F2E1E
        $pdf->SetXY(0, $footerY);
        $pdf->Cell(0, 8, 'Thank you for your generous donation to the Diocesan Shrine of San Vicente Ferrer.', 0, 1, 'C');
        $pdf->SetXY(0, $footerY + 10);
        $pdf->Cell(0, 8, 'Your contribution helps us continue our mission of faith, service, and community building.', 0, 1, 'C');
        
        $pdf->SetFont('helvetica', 'BI', 10);
        $pdf->SetXY(0, $footerY + 25);
        $pdf->Cell(0, 8, 'May God bless you abundantly for your kindness and generosity.', 0, 1, 'C');
    }
}


