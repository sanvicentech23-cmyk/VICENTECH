<?php

namespace App\Http\Controllers;

use App\Models\DonationPurpose;
use Illuminate\Http\Request;

class DonationPurposeController extends Controller
{
    public function index()
    {
        return DonationPurpose::where('enabled', true)->get();
    }
}