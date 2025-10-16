<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 0;
        }
        
        body { 
            font-family: DejaVu Sans, Arial, sans-serif; 
            color: #3F2E1E; 
            margin: 0;
            padding: 0;
            background: linear-gradient(to bottom, #ffffff 0%, #ffffff 30%, #FFF8E1 100%);
            min-height: 100vh;
            position: relative;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            opacity: 0.08;
            z-index: 1;
            width: 500px;
            height: 500px;
            background-image: url('{{ public_path("images/COA-DIOCESAN-SHRINE-SVF-MAMATID-SOLO.svg") }}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }
        
        .content {
            position: relative;
            z-index: 2;
            padding: 40px 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .main-title {
            font-size: 28px;
            font-weight: bold;
            color: #CD8B3E;
            margin-bottom: 8px;
        }
        
        .shrine-name {
            font-size: 16px;
            color: #3F2E1E;
            margin-bottom: 4px;
        }
        
        .address {
            font-size: 14px;
            color: #3F2E1E;
        }
        
        .receipt-box {
            background: white;
            border: 3px solid #CD8B3E;
            border-radius: 8px;
            padding: 30px;
            margin: 0 auto;
            max-width: 600px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            position: relative;
        }
        
        .receipt-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            color: #3F2E1E;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 2px solid #CD8B3E;
        }
        
        .info-section {
            margin-bottom: 25px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 12px;
            align-items: flex-start;
        }
        
        .info-label {
            font-weight: bold;
            color: #3F2E1E;
            font-size: 14px;
            width: 140px;
            flex-shrink: 0;
        }
        
        .info-value {
            color: #3F2E1E;
            font-size: 14px;
            flex: 1;
        }
        
        .amount-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #FFF6E5;
            border-radius: 5px;
        }
        
        .amount-value {
            font-size: 36px;
            font-weight: bold;
            color: #CD8B3E;
            margin-bottom: 5px;
        }
        
        .amount-label {
            font-size: 14px;
            color: #3F2E1E;
            font-weight: bold;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-verified {
            background: #E8F5E8;
            color: #2E7D32;
            border: 1px solid #4CAF50;
        }
        
        .status-pending {
            background: #FFF3E0;
            color: #F57C00;
            border: 1px solid #FF9800;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
        }
        
        .footer-text {
            font-size: 12px;
            color: #3F2E1E;
            line-height: 1.6;
            margin-bottom: 10px;
        }
        
        .blessing {
            font-size: 12px;
            color: #3F2E1E;
            font-weight: bold;
            font-style: italic;
        }
        
        .receipt-section {
            margin: 20px 0;
            padding: 15px;
            background: #FFF6E5;
            border-radius: 5px;
            border: 1px solid #FFEBC9;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #CD8B3E;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #FFEBC9;
        }
        
        .receipt-image {
            max-width: 100%;
            height: auto;
            border: 1px solid #FFEBC9;
            border-radius: 3px;
        }
        
        .attachment-info {
            padding: 10px;
            background: white;
            border: 1px solid #FFEBC9;
            text-align: center;
            color: #5C4B38;
            border-radius: 3px;
        }
    </style>
    <title>Donation Receipt - Diocesan Shrine of San Vicente Ferrer</title>
    </head>
    <body>
    <div class="watermark"></div>
    
    <div class="content">
        <div class="header">
            <div class="main-title">DONATION RECEIPT</div>
            <div class="shrine-name">Diocesan Shrine of San Vicente Ferrer</div>
            <div class="address">Brgy. Mamatid, Cabuyao, Laguna</div>
    </div>

        <div class="receipt-box">
            <div class="receipt-title">Official Receipt</div>
            
            <div class="info-section">
                <div class="info-row">
                    <div class="info-label">Donor Name:</div>
                    <div class="info-value">{{ $donation->name }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email Address:</div>
                    <div class="info-value">{{ $donation->email }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Reference Number:</div>
                    <div class="info-value">{{ $donation->reference ?? 'N/A' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Donation Purpose:</div>
                    <div class="info-value">{{ $donation->purpose_name ?? $donation->category ?? 'General Donation' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Date & Time:</div>
                    <div class="info-value">{{ optional($donation->created_at)->format('F j, Y \a\t g:i A') }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Status:</div>
                    <div class="info-value">
                        <span class="status-badge {{ $donation->verified ? 'status-verified' : 'status-pending' }}">
                            {{ $donation->verified ? 'Verified' : 'Pending Verification' }}
                        </span>
                    </div>
                </div>
    </div>

            <div class="amount-section">
                <div class="amount-value">₱{{ number_format((float)$donation->amount, 2) }}</div>
                <div class="amount-label">Donation Amount</div>
            </div>
        </div>

    <div class="footer">
            <div class="footer-text">
                Thank you for your generous donation to the Diocesan Shrine of San Vicente Ferrer.<br>
                Your contribution helps us continue our mission of faith, service, and community building.
            </div>
            <div class="blessing">May God bless you abundantly for your kindness and generosity.</div>
        </div>
    </div>

    @php
        $receiptWebPath = $donation->receipt_path ?? null;
        $receiptFsPath = $receiptWebPath ? public_path(ltrim($receiptWebPath, '/')) : null;
        // Normalize Windows backslashes for TCPDF
        if ($receiptFsPath) {
            $receiptFsPath = str_replace('\\', '/', $receiptFsPath);
        }
        $ext = $receiptFsPath ? strtolower(pathinfo($receiptFsPath, PATHINFO_EXTENSION)) : null;
        $isImage = in_array($ext, ['jpg','jpeg','png','gif','bmp','webp']);
    @endphp

    @if($receiptFsPath && file_exists($receiptFsPath))
        <div class="receipt-section">
            <div class="section-title">Uploaded Receipt</div>
            @if($isImage)
                <div style="text-align: center;">
                    <img src="{{ $receiptFsPath }}" class="receipt-image" alt="Receipt Image" />
                </div>
            @else
                <div class="attachment-info">
                    <strong>Attachment Provided</strong><br>
                    File Type: {{ strtoupper($ext) }}<br>
                    <em>Please refer to the original file for details.</em>
                </div>
            @endif
        </div>
    @endif
    </div>
    </body>
    </html>


