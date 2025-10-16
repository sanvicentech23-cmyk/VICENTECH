<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MassAttendance extends Model
{
    protected $fillable = [
        'mass_schedule_id',
        'user_id',
        'name',
        'email',
        'address',
        'phone',
        'number_of_people',
        'special_requests',
        'is_confirmed',
        'attendance_date'
    ];

    protected $casts = [
        'is_confirmed' => 'boolean',
        'attendance_date' => 'datetime',
        'number_of_people' => 'integer'
    ];

    /**
     * Get the mass schedule that this attendance is for
     */
    public function massSchedule(): BelongsTo
    {
        return $this->belongsTo(MassSchedule::class);
    }

    /**
     * Get the user who registered for attendance
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to get confirmed attendances
     */
    public function scopeConfirmed($query)
    {
        return $query->where('is_confirmed', true);
    }

    /**
     * Scope to get attendances for a specific date range
     */
    public function scopeForDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('attendance_date', [$startDate, $endDate]);
    }
}