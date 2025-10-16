<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CertificateRequest extends Model
{
    protected $fillable = [
        'first_name', 'last_name', 'birthdate', 'email', 'phone', 'address',
        'certificate_type', 'purpose', 'date_needed', 'additional_info', 'status', 'rejection_reason'
    ];
} 