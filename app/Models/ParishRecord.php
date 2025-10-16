<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ParishRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'date',
        'priest',
        'status',
        'details',
        'notes',
        'certificate_number'
    ];

    protected $casts = [
        'date' => 'date',
        'details' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Scopes for filtering
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    public function scopeByMonth($query, $month, $year = null)
    {
        $year = $year ?? Carbon::now()->year;
        return $query->whereMonth('date', $month)->whereYear('date', $year);
    }

    public function scopeByYear($query, $year)
    {
        return $query->whereYear('date', $year);
    }

    public function scopeSearch($query, $searchTerm)
    {
        return $query->where(function ($q) use ($searchTerm) {
            $q->where('name', 'like', "%{$searchTerm}%")
              ->orWhere('priest', 'like', "%{$searchTerm}%")
              ->orWhere('certificate_number', 'like', "%{$searchTerm}%");
        });
    }

    // Accessors
    public function getFormattedDateAttribute()
    {
        return $this->date->format('F j, Y');
    }

    public function getTypeDisplayAttribute()
    {
        return ucfirst($this->type);
    }

    // Generate certificate number if not exists
    public function generateCertificateNumber()
    {
        if (!$this->certificate_number) {
            $year = $this->date->year;
            $typeCode = strtoupper(substr($this->type, 0, 3));
            $sequence = static::where('type', $this->type)
                             ->whereYear('date', $year)
                             ->count() + 1;
            
            $this->certificate_number = sprintf('%s-%d-%04d', $typeCode, $year, $sequence);
            $this->save();
        }
        
        return $this->certificate_number;
    }

    // Get default details structure based on type
    public static function getDefaultDetails($type)
    {
        switch ($type) {
            case 'baptism':
                return [
                    'parents' => '',
                    'godparents' => '',
                    'birth_date' => '',
                    'birth_place' => ''
                ];
            case 'confirmation':
                return [
                    'sponsor' => '',
                    'bishop' => '',
                    'confirmation_name' => '',
                    'baptism_date' => ''
                ];
            case 'marriage':
                return [
                    'spouse' => '',
                    'witnesses' => '',
                    'venue' => '',
                    'marriage_license' => ''
                ];
            case 'funeral':
                return [
                    'deceased' => '',
                    'date_of_death' => '',
                    'cause_of_death' => '',
                    'burial_place' => ''
                ];
            case 'mass':
                return [
                    'mass_type' => '',
                    'attendance' => '',
                    'offerings' => '',
                    'special_intention' => ''
                ];
            default:
                return [];
        }
    }
}