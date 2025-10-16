import React, { useState, useEffect } from 'react';

const TimeSlotsManager = ({ onBack, setError }) => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);

  const [editingSlot, setEditingSlot] = useState(null);
  const [editSlotData, setEditSlotData] = useState({ date: '', time: '', status: 'available', sacrament_type_id: '' });
  
  // Sacrament types state
  const [sacramentTypes, setSacramentTypes] = useState([]);
  const [sacramentTypesLoading, setSacramentTypesLoading] = useState(false);
  
  // Bulk month generation states
  const [showBulkGeneration, setShowBulkGeneration] = useState(false);
  const [bulkGenerationData, setBulkGenerationData] = useState({
    month: new Date().toISOString().slice(0, 7), // Current month in YYYY-MM format
    sacramentTypeId: '', // Selected sacrament type ID
    timeSlots: [
      { time: '08:00 AM - 09:30 AM', enabled: true },
      { time: '10:00 AM - 11:30 AM', enabled: true },
      { time: '02:00 PM - 03:30 PM', enabled: true },
      { time: '04:00 PM - 05:30 PM', enabled: true }
    ],
    selectedDays: [], // Array of selected day numbers
    daySelectionMode: 'all' // 'all', 'weekdays', 'weekends', 'custom'
  });
  const [bulkGenerationLoading, setBulkGenerationLoading] = useState(false);
  const [editingTimeSlotIndex, setEditingTimeSlotIndex] = useState(null);
  const [editingTimeSlotValue, setEditingTimeSlotValue] = useState('');
  const [showGenerationPopup, setShowGenerationPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSacramentType, setFilterSacramentType] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'time', 'status'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  const fetchTimeSlots = async () => {
    setTimeSlotsLoading(true);
    try {
      const response = await fetch('/api/staff/sacrament-time-slots', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch time slots');
      const data = await response.json();
      setTimeSlots(data);
    } catch (err) {
      setError && setError(err.message);
    } finally {
      setTimeSlotsLoading(false);
    }
  };

  const fetchSacramentTypes = async () => {
    setSacramentTypesLoading(true);
    try {
      const response = await fetch('/api/staff/sacrament-types', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch sacrament types');
      const data = await response.json();
      setSacramentTypes(data);
      // Set default sacrament type if available
      if (data.length > 0 && !bulkGenerationData.sacramentTypeId) {
        setBulkGenerationData(prev => ({ ...prev, sacramentTypeId: data[0].id }));
      }
    } catch (err) {
      setError && setError(err.message);
    } finally {
      setSacramentTypesLoading(false);
    }
  };

  useEffect(() => { 
    fetchTimeSlots(); 
    fetchSacramentTypes();
  }, []);

  const handleEditTimeSlot = async (id) => {
    if (!editSlotData.date || !editSlotData.time) return;
    try {
      const response = await fetch(`/api/staff/sacrament-time-slots/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSlotData),
      });
      if (!response.ok) throw new Error('Failed to update time slot');
      setEditingSlot(null);
      setEditSlotData({ date: '', time: '', status: 'available' });
      await fetchTimeSlots();
    } catch (err) {
      setError && setError(err.message);
    }
  };

  const handleToggleTimeSlot = async (id, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'disabled' : 'available';
    try {
      const response = await fetch(`/api/staff/sacrament-time-slots/${id}/${newStatus === 'available' ? 'enable' : 'disable'}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to update time slot status');
      await fetchTimeSlots();
    } catch (err) {
      setError && setError(err.message);
    }
  };

  // Bulk generation functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  const handleBulkGeneration = async () => {
    setBulkGenerationLoading(true);
    setShowGenerationPopup(true);
    try {
      const [year, month] = bulkGenerationData.month.split('-').map(Number);
      const enabledTimeSlots = bulkGenerationData.timeSlots.filter(slot => slot.enabled);
      
      if (enabledTimeSlots.length === 0) {
        setError && setError('Please enable at least one time slot to generate');
        return;
      }

      if (!bulkGenerationData.sacramentTypeId) {
        setError && setError('Please select a sacrament type for the time slots');
        return;
      }

      const daysToGenerate = getSelectedDays();
      if (daysToGenerate.length === 0) {
        setError && setError('Please select at least one day to generate time slots for');
        return;
      }

      const slotsToCreate = [];
      
      daysToGenerate.forEach(day => {
        const currentDate = new Date(year, month - 1, day);
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Create time slots for this selected day
        enabledTimeSlots.forEach(timeSlot => {
          slotsToCreate.push({
            date: dateString,
            time: timeSlot.time,
            status: 'available',
            sacrament_type_id: bulkGenerationData.sacramentTypeId
          });
        });
      });

      // Send bulk creation request
      const response = await fetch('/api/staff/sacrament-time-slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotsToCreate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate time slots');
      }

      const result = await response.json();
      await fetchTimeSlots();
      setShowBulkGeneration(false);
      setError && setError(null);
      
      // Show detailed success message
      const enabledSlotsCount = bulkGenerationData.timeSlots.filter(s => s.enabled).length;
      const generatedDays = getSelectedDays();
      const selectedSacramentType = sacramentTypes.find(type => type.id == bulkGenerationData.sacramentTypeId);
      let message = `Time slots generated for ${bulkGenerationData.month}:\n`;
      message += `✅ Created: ${result.created_count} time slots\n`;
      message += `📅 Generated for ${generatedDays.length} selected days\n`;
      message += `⏰ Each day has ${enabledSlotsCount} time slots\n`;
      message += `🙏 Sacrament Type: ${selectedSacramentType ? selectedSacramentType.name : 'Unknown'}\n`;
      if (result.skipped_count > 0) {
        message += `⚠️ Skipped: ${result.skipped_count} time slots (already exist)`;
      }
      setSuccessMessage(message);
      setShowSuccessPopup(true);
      
    } catch (err) {
      setError && setError(err.message);
    } finally {
      setBulkGenerationLoading(false);
      setShowGenerationPopup(false);
    }
  };

  const handleTimeSlotToggle = (index) => {
    const updatedTimeSlots = [...bulkGenerationData.timeSlots];
    updatedTimeSlots[index].enabled = !updatedTimeSlots[index].enabled;
    setBulkGenerationData({ ...bulkGenerationData, timeSlots: updatedTimeSlots });
  };

  const handleAddCustomTimeSlot = () => {
    const newTime = prompt('Enter time slot (e.g., "06:00 PM - 07:30 PM"):');
    if (newTime && newTime.trim()) {
      setBulkGenerationData({
        ...bulkGenerationData,
        timeSlots: [...bulkGenerationData.timeSlots, { time: newTime.trim(), enabled: true }]
      });
    }
  };

  const startEditingTimeSlot = (index) => {
    setEditingTimeSlotIndex(index);
    setEditingTimeSlotValue(bulkGenerationData.timeSlots[index].time);
  };

  const saveEditingTimeSlot = () => {
    if (editingTimeSlotValue && editingTimeSlotValue.trim()) {
      const updatedTimeSlots = [...bulkGenerationData.timeSlots];
      updatedTimeSlots[editingTimeSlotIndex] = { 
        ...updatedTimeSlots[editingTimeSlotIndex], 
        time: editingTimeSlotValue.trim() 
      };
      setBulkGenerationData({ ...bulkGenerationData, timeSlots: updatedTimeSlots });
    }
    setEditingTimeSlotIndex(null);
    setEditingTimeSlotValue('');
  };

  const cancelEditingTimeSlot = () => {
    setEditingTimeSlotIndex(null);
    setEditingTimeSlotValue('');
  };

  const handleRemoveCustomTimeSlot = (index) => {
    if (bulkGenerationData.timeSlots.length <= 1) {
      alert('Cannot remove time slot. At least one time slot is required.');
      return;
    }
    const updatedTimeSlots = bulkGenerationData.timeSlots.filter((_, i) => i !== index);
    setBulkGenerationData({ ...bulkGenerationData, timeSlots: updatedTimeSlots });
  };

  // Day selection functions
  const getSelectedDays = () => {
    const [year, month] = bulkGenerationData.month.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    
    switch (bulkGenerationData.daySelectionMode) {
      case 'all':
        return Array.from({ length: daysInMonth }, (_, i) => i + 1);
      case 'weekdays':
        return Array.from({ length: daysInMonth }, (_, i) => i + 1)
          .filter(day => {
            const date = new Date(year, month - 1, day);
            return !isWeekend(date);
          });
      case 'weekends':
        return Array.from({ length: daysInMonth }, (_, i) => i + 1)
          .filter(day => {
            const date = new Date(year, month - 1, day);
            return isWeekend(date);
          });
      case 'custom':
        return bulkGenerationData.selectedDays;
      default:
        return [];
    }
  };

  const handleDaySelectionModeChange = (mode) => {
    setBulkGenerationData({ 
      ...bulkGenerationData, 
      daySelectionMode: mode,
      selectedDays: mode === 'custom' ? bulkGenerationData.selectedDays : []
    });
  };

  const handleCustomDayToggle = (day) => {
    const updatedSelectedDays = bulkGenerationData.selectedDays.includes(day)
      ? bulkGenerationData.selectedDays.filter(d => d !== day)
      : [...bulkGenerationData.selectedDays, day].sort((a, b) => a - b);
    
    setBulkGenerationData({ ...bulkGenerationData, selectedDays: updatedSelectedDays });
  };

  const selectAllDays = () => {
    const [year, month] = bulkGenerationData.month.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    setBulkGenerationData({ ...bulkGenerationData, selectedDays: allDays });
  };

  const clearAllDays = () => {
    setBulkGenerationData({ ...bulkGenerationData, selectedDays: [] });
  };

  // Filter and sort functions
  const getFilteredAndSortedTimeSlots = () => {
    let filtered = timeSlots.filter(slot => {
      // Date filtering - match year-month format
      const matchesDate = !filterDate || slot.date.startsWith(filterDate);
      
      // Status filtering
      const matchesStatus = filterStatus === 'all' || slot.status === filterStatus;
      
      // Sacrament type filtering
      const matchesSacramentType = filterSacramentType === 'all' || 
        (slot.sacrament_type && slot.sacrament_type.id == filterSacramentType);
      
      return matchesDate && matchesStatus && matchesSacramentType;
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'time':
          aValue = a.time;
          bValue = b.time;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="bg-white rounded-lg shadow border border-[#f2e4ce] p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#3F2E1E]">Manage Time Slots</h2>
          <p className="text-[#5C4B38]">Add, edit, or remove available time slots</p>
        </div>
        <button
          onClick={() => setShowBulkGeneration(!showBulkGeneration)}
          className="px-4 py-2 bg-[#CD8B3E] text-white rounded-lg font-semibold hover:bg-[#B67A35] transition-colors duration-200 shadow-sm"
        >
          {showBulkGeneration ? 'Hide Bulk Generation' : 'Generate Monthly Slots'}
        </button>
      </div>

      {/* Bulk Generation Section */}
      {showBulkGeneration && (
        <div className="mb-6 p-4 bg-[#FFF6E5] rounded-lg border border-[#f2e4ce]">
          <h3 className="text-lg font-semibold text-[#3F2E1E] mb-4">Generate Time Slots for Selected Days</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Month Selection */}
            <div>
              <label className="block text-sm font-medium text-[#3F2E1E] mb-2">Select Month</label>
              <input
                type="month"
                value={bulkGenerationData.month}
                onChange={(e) => setBulkGenerationData({ 
                  ...bulkGenerationData, 
                  month: e.target.value,
                  selectedDays: [] // Reset custom selection when month changes
                })}
                className="w-full px-4 py-2 border border-[#f2e4ce] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD8B3E] focus:border-transparent"
              />
            </div>

            {/* Sacrament Type Selection */}
            <div>
              <label className="block text-sm font-medium text-[#3F2E1E] mb-2">Sacrament Type</label>
              <select
                value={bulkGenerationData.sacramentTypeId}
                onChange={(e) => setBulkGenerationData({ 
                  ...bulkGenerationData, 
                  sacramentTypeId: e.target.value
                })}
                className="w-full px-4 py-2 border border-[#f2e4ce] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD8B3E] focus:border-transparent"
                disabled={sacramentTypesLoading}
              >
                <option value="">Select Sacrament Type</option>
                {sacramentTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {sacramentTypesLoading && (
                <p className="text-xs text-[#5C4B38] mt-1">Loading sacrament types...</p>
              )}
            </div>

            {/* Day Selection Mode */}
            <div>
              <label className="block text-sm font-medium text-[#3F2E1E] mb-2">Days to Generate</label>
              <select
                value={bulkGenerationData.daySelectionMode}
                onChange={(e) => handleDaySelectionModeChange(e.target.value)}
                className="w-full px-4 py-2 border border-[#f2e4ce] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD8B3E] focus:border-transparent"
              >
                <option value="all">All Days</option>
                <option value="weekdays">Weekdays Only</option>
                <option value="weekends">Weekends Only</option>
                <option value="custom">Custom Selection</option>
              </select>
            </div>
          </div>

          {/* Custom Day Selection */}
          {bulkGenerationData.daySelectionMode === 'custom' && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-[#3F2E1E]">
                  Select Specific Days ({bulkGenerationData.selectedDays.length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllDays}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllDays}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 p-4 bg-gray-50 rounded-lg border border-[#f2e4ce]">
                {Array.from({ length: getDaysInMonth(...bulkGenerationData.month.split('-').map(Number)) }, (_, i) => i + 1).map(day => {
                  const [year, month] = bulkGenerationData.month.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isSelected = bulkGenerationData.selectedDays.includes(day);
                  
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleCustomDayToggle(day)}
                      className={`p-2 text-sm rounded border transition-colors ${
                        isSelected 
                          ? 'bg-[#CD8B3E] text-white border-[#CD8B3E]' 
                          : isWeekend 
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                            : 'bg-white text-[#3F2E1E] border-[#f2e4ce] hover:bg-[#f9f6f1]'
                      }`}
                    >
                      <div className="font-medium">{day}</div>
                      <div className="text-xs opacity-75">{dayName}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-sm text-[#5C4B38]">
                <span className="inline-block w-3 h-3 bg-red-50 border border-red-200 rounded mr-1"></span>
                Weekend days are highlighted in red
              </div>
            </div>
          )}

          {/* Summary of Selected Days */}
          {bulkGenerationData.daySelectionMode !== 'custom' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected Days:</strong> {getSelectedDays().length} days will have time slots generated
                {bulkGenerationData.daySelectionMode === 'weekdays' && ' (Monday to Friday)'}
                {bulkGenerationData.daySelectionMode === 'weekends' && ' (Saturday and Sunday)'}
                {bulkGenerationData.daySelectionMode === 'all' && ' (All days of the month)'}
              </p>
            </div>
          )}

          {/* Time Slots Configuration */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-[#3F2E1E]">Time Slots Configuration (Minimum 4 required)</label>
              <button
                type="button"
                onClick={handleAddCustomTimeSlot}
                className="px-3 py-1 text-sm bg-[#CD8B3E] text-white rounded hover:bg-[#B67A35] transition-colors"
              >
                Add Custom Time
              </button>
            </div>
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Every day will have exactly the enabled time slots below. 
                Ensure at least 4 slots are enabled to meet the minimum requirement.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {bulkGenerationData.timeSlots.map((slot, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-[#f2e4ce]">
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={() => handleTimeSlotToggle(index)}
                      className="rounded border-[#f2e4ce] text-[#CD8B3E] focus:ring-[#CD8B3E]"
                    />
                    {editingTimeSlotIndex === index ? (
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type="text"
                          value={editingTimeSlotValue}
                          onChange={(e) => setEditingTimeSlotValue(e.target.value)}
                          className="flex-1 px-3 py-1 text-sm border border-[#f2e4ce] rounded focus:outline-none focus:ring-2 focus:ring-[#CD8B3E]"
                          placeholder="e.g., 08:00 AM - 09:30 AM"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveEditingTimeSlot();
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEditingTimeSlot();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={saveEditingTimeSlot}
                          className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingTimeSlot}
                          className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-[#3F2E1E] flex-1">{slot.time}</span>
                    )}
                  </div>
                  
                  {editingTimeSlotIndex !== index && (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => startEditingTimeSlot(index)}
                        className="px-2 py-1 text-sm text-[#CD8B3E] hover:text-[#B67A35] border border-[#CD8B3E] rounded hover:bg-[#CD8B3E] hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      {bulkGenerationData.timeSlots.length > 4 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomTimeSlot(index)}
                          className="px-2 py-1 text-sm text-red-600 hover:text-white border border-red-600 rounded hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between items-center">
              <div className="text-sm text-[#5C4B38]">
                <span className="font-medium">Enabled slots: {bulkGenerationData.timeSlots.filter(s => s.enabled).length}</span>
                {bulkGenerationData.timeSlots.filter(s => s.enabled).length < 4 ? (
                  <span className="text-red-600 font-medium"> (Need at least 4)</span>
                ) : (
                  <span className="text-green-600 font-medium"> ✓ Minimum met</span>
                )}
              </div>
              <div className="text-sm text-[#5C4B38]">
                Total slots: {bulkGenerationData.timeSlots.length}
                {bulkGenerationData.timeSlots.length === 4 && (
                  <span className="text-orange-600 ml-1">(Cannot remove - minimum required)</span>
                )}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleBulkGeneration}
              disabled={
                bulkGenerationLoading || 
                bulkGenerationData.timeSlots.filter(s => s.enabled).length < 4 ||
                getSelectedDays().length === 0
              }
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkGenerationLoading ? 'Generating...' : `Generate Time Slots (${getSelectedDays().length} days)`}
            </button>
          </div>
        </div>
      )}



      {/* Time Slots Table */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#3F2E1E]">Existing Time Slots</h3>
          <div className="text-sm text-[#5C4B38]">
            Total: {timeSlots.length} | Showing: {getFilteredAndSortedTimeSlots().length}
          </div>
        </div>


        

        
        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#3F2E1E] mb-1">Filter by Date</label>
            <input
              type="month"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#f2e4ce] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD8B3E] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3F2E1E] mb-1">Filter by Sacrament Type</label>
            <select
              value={filterSacramentType}
              onChange={(e) => setFilterSacramentType(e.target.value)}
              className="w-full px-3 py-2 border border-[#f2e4ce] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD8B3E] focus:border-transparent"
            >
              <option value="all">All Types</option>
              {sacramentTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3F2E1E] mb-1">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-[#f2e4ce] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD8B3E] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="disabled">Disabled</option>
              <option value="booked">Booked</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterDate('');
                setFilterSacramentType('all');
                setFilterStatus('all');
                setSortBy('date');
                setSortOrder('asc');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {timeSlotsLoading ? (
          <div className="text-center py-8"><p className="text-[#5C4B38]">Loading time slots...</p></div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#f2e4ce]">
            <thead className="bg-[#FFF6E5]">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[#3F2E1E] uppercase tracking-wider cursor-pointer hover:bg-[#f2e4ce] transition-colors"
                  onClick={() => handleSort('date')}
                >
                  Date {getSortIcon('date')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[#3F2E1E] uppercase tracking-wider cursor-pointer hover:bg-[#f2e4ce] transition-colors"
                  onClick={() => handleSort('time')}
                >
                  Time {getSortIcon('time')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#3F2E1E] uppercase tracking-wider">
                  Sacrament Type
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[#3F2E1E] uppercase tracking-wider cursor-pointer hover:bg-[#f2e4ce] transition-colors"
                  onClick={() => handleSort('status')}
                >
                  Status {getSortIcon('status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#3F2E1E] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#f2e4ce]">
              {getFilteredAndSortedTimeSlots().length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-[#5C4B38]">
                    {timeSlots.length === 0 ? 'No time slots found. Use "Generate Monthly Slots" to create time slots for an entire month.' : 'No time slots match your current filters.'}
                  </td>
                </tr>
              ) : (
                getFilteredAndSortedTimeSlots().map(slot => (
                <tr key={slot.id} className="hover:bg-[#f9f6f1] transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3F2E1E]">
                    {editingSlot === slot.id ? (
                      <input type="date" value={editSlotData.date} onChange={e => setEditSlotData({ ...editSlotData, date: e.target.value })} className="w-full px-3 py-1 border border-[#f2e4ce] rounded focus:outline-none focus:ring-2 focus:ring-[#CD8B3E]" />
                    ) : new Date(slot.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3F2E1E]">
                    {editingSlot === slot.id ? (
                      <input type="text" value={editSlotData.time} onChange={e => setEditSlotData({ ...editSlotData, time: e.target.value })} className="w-full px-3 py-1 border border-[#f2e4ce] rounded focus:outline-none focus:ring-2 focus:ring-[#CD8B3E]" />
                    ) : slot.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3F2E1E]">
                    {editingSlot === slot.id ? (
                      <select 
                        value={editSlotData.sacrament_type_id} 
                        onChange={e => setEditSlotData({ ...editSlotData, sacrament_type_id: e.target.value })} 
                        className="w-full px-3 py-1 border border-[#f2e4ce] rounded focus:outline-none focus:ring-2 focus:ring-[#CD8B3E]"
                      >
                        <option value="">Select Type</option>
                        {sacramentTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    ) : (slot.sacrament_type ? slot.sacrament_type.name : 'No Type Assigned')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingSlot === slot.id ? (
                      <select value={editSlotData.status} onChange={e => setEditSlotData({ ...editSlotData, status: e.target.value })} className="px-3 py-1 border border-[#f2e4ce] rounded focus:outline-none focus:ring-2 focus:ring-[#CD8B3E]">
                        <option value="available">Available</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${slot.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingSlot === slot.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleEditTimeSlot(slot.id)} className="text-green-600 hover:text-green-800 font-semibold">Save</button>
                        <button onClick={() => { setEditingSlot(null); setEditSlotData({ date: '', time: '', status: 'available', sacrament_type_id: '' }); }} className="text-gray-600 hover:text-gray-800 font-semibold">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingSlot(slot.id); setEditSlotData({ date: slot.date, time: slot.time, status: slot.status, sacrament_type_id: slot.sacrament_type ? slot.sacrament_type.id : '' }); }} className="text-[#CD8B3E] hover:text-[#B67A35] font-semibold">Edit</button>
                        <button onClick={() => handleToggleTimeSlot(slot.id, slot.status)} className={`font-semibold ${slot.status === 'available' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>{slot.status === 'available' ? 'Disable' : 'Enable'}</button>
                      </div>
                    )}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

       {/* Generation Popup - Same design as profile upload/edit popup */}
       {showGenerationPopup && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           width: '100vw',
           height: '100vh',
           background: 'rgba(255,255,255,0.6)',
           zIndex: 9999,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           backdropFilter: 'blur(6px)',
           WebkitBackdropFilter: 'blur(6px)',
         }}>
           <div style={{
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'center',
             gap: 16,
           }}>
             <svg style={{ width: 64, height: 64, color: '#CD8B3E', marginBottom: 12 }} viewBox="0 0 50 50">
               <circle cx="25" cy="25" r="20" fill="none" stroke="#CD8B3E" strokeWidth="6" strokeDasharray="31.4 31.4" strokeLinecap="round">
                 <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
               </circle>
             </svg>
             <div style={{ color: '#3F2E1E', fontWeight: 600, fontSize: 20, letterSpacing: 1 }}>
               Generating time slots...
             </div>
           </div>
         </div>
       )}

       {/* Success Popup - Same design as profile edit popup */}
       {showSuccessPopup && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           width: '100vw',
           height: '100vh',
           background: 'rgba(0,0,0,0.4)',
           zIndex: 10000,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           backdropFilter: 'blur(6px)',
           WebkitBackdropFilter: 'blur(6px)',
         }}>
           <div style={{
             width: 560,
             maxWidth: '94%',
             background: '#fff',
             borderRadius: 12,
             padding: 20,
             boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
             position: 'relative'
           }}>
             <button 
               onClick={() => setShowSuccessPopup(false)}
               style={{
                 position: 'absolute',
                 top: 12,
                 right: 12,
                 background: 'none',
                 border: 'none',
                 fontSize: '24px',
                 cursor: 'pointer',
                 color: '#666',
                 width: '32px',
                 height: '32px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 borderRadius: '50%',
                 transition: 'background-color 0.2s'
               }}
               onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
               onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
             >
               ×
             </button>
             
             <div style={{
               background: 'linear-gradient(135deg, #CD8B3E 0%, #B77B35 100%)',
               borderRadius: '12px 12px 0 0',
               padding: '20px',
               margin: '-20px -20px 20px -20px',
               color: 'white',
               textAlign: 'center',
               position: 'relative',
               overflow: 'hidden'
             }}>
               <div style={{
                 position: 'absolute',
                 top: '-50%',
                 right: '-20%',
                 width: '100px',
                 height: '100px',
                 background: 'rgba(255, 255, 255, 0.1)',
                 borderRadius: '50%',
                 transform: 'rotate(45deg)'
               }}></div>
               <div style={{
                 position: 'absolute',
                 bottom: '-30%',
                 left: '-10%',
                 width: '80px',
                 height: '80px',
                 background: 'rgba(255, 255, 255, 0.08)',
                 borderRadius: '50%',
                 transform: 'rotate(-30deg)'
               }}></div>
               
               <div style={{
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: 12,
                 marginBottom: 8,
                 position: 'relative',
                 zIndex: 1
               }}>
                 <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 <h3 style={{ 
                   fontSize: '1.5rem', 
                   fontWeight: '800', 
                   margin: '0',
                   textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                 }}>
                   Time Slots Generated Successfully!
                 </h3>
               </div>
               <p style={{ 
                 fontSize: '0.9rem', 
                 margin: '0', 
                 opacity: 0.9,
                 position: 'relative',
                 zIndex: 1
               }}>
                 Your time slots have been created successfully
               </p>
             </div>

             <div style={{
               padding: '0 0 20px 0',
               maxHeight: '300px',
               overflowY: 'auto'
             }}>
               <pre style={{
                 whiteSpace: 'pre-wrap',
                 fontFamily: 'inherit',
                 fontSize: '14px',
                 lineHeight: '1.5',
                 color: '#3F2E1E',
                 margin: 0,
                 padding: '16px',
                 background: '#f8f9fa',
                 borderRadius: '8px',
                 border: '1px solid #e9ecef'
               }}>
                 {successMessage}
               </pre>
             </div>

             <div style={{ 
               display: 'flex', 
               justifyContent: 'center', 
               marginTop: '20px' 
             }}>
               <button 
                 onClick={() => setShowSuccessPopup(false)}
                 style={{ 
                   background: '#CD8B3E', 
                   color: '#fff', 
                   border: 'none', 
                   padding: '12px 24px', 
                   borderRadius: '8px',
                   fontSize: '16px',
                   fontWeight: '600',
                   cursor: 'pointer',
                   transition: 'background-color 0.2s',
                   boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                 }}
                 onMouseEnter={(e) => e.target.style.backgroundColor = '#B77B35'}
                 onMouseLeave={(e) => e.target.style.backgroundColor = '#CD8B3E'}
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default TimeSlotsManager; 