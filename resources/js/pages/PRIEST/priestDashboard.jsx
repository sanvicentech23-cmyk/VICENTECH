import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function getEventsForDate(date, schedules) {
  // Format date without timezone conversion to avoid date shifts
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const d = `${year}-${month}-${day}`;
  
  console.log('getEventsForDate:', { 
    selectedDate: date, 
    formattedDate: d, 
    oldISOMethod: date.toISOString().split('T')[0],
    scheduleCount: schedules.length 
  });
  
  const events = schedules.filter(s => {
    const scheduleDatePart = s.date.includes('T') ? s.date.split('T')[0] : s.date;
    const matches = scheduleDatePart === d;
    if (matches) {
      console.log('Found matching event:', { scheduleDatePart, formattedDate: d, event: s });
    }
    return matches;
  });
  
  console.log('getEventsForDate result:', { eventsFound: events.length });
  return events;
}

function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const matrix = [];
  let week = [];
  let dayOfWeek = firstDay.getDay();
  // Fill initial empty days
  for (let i = 0; i < dayOfWeek; i++) week.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

const PriestDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [priestSchedule, setPriestSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const events = getEventsForDate(selectedDate, priestSchedule);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user || !(user.is_priest === 1 || user.is_priest === true || user.is_priest === "1")) {
        navigate('/');
      } else {
        // Fetch priest's schedule when user is confirmed as priest
        fetchPriestSchedule();
      }
    }
  }, [user, loading, navigate]);

  // Fetch schedule when month changes
  useEffect(() => {
    if (user && user.is_priest) {
      fetchPriestSchedule();
    }
  }, [currentMonth]);

  const fetchPriestSchedule = async () => {
    if (!user) return;
    
    setScheduleLoading(true);
    try {
      const token = localStorage.getItem('token');
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Fix: Calculate last day of month correctly
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      
      const response = await axios.get('/api/priest/my-schedule', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          start_date: `${year}-${month.toString().padStart(2, '0')}-01`,
          end_date: endDate
        }
      });

      if (response.data.success) {
        // Transform the schedule data to match the expected format
        const transformedSchedule = response.data.data.schedule.map(entry => ({
          date: entry.date.includes('T') ? entry.date.split('T')[0] : entry.date, // Extract just the date part
          event: `${entry.duty} - ${entry.time.substring(0, 5)}`,
          id: entry.id,
          notes: entry.notes,
          status: entry.status
        }));
        setPriestSchedule(transformedSchedule);
      }
    } catch (error) {
      console.error('Error fetching priest schedule:', error);
      // If there's an authentication error, redirect to login
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  if (loading) return null; // or a spinner

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthMatrix = getMonthMatrix(year, month);
  const today = new Date();

  // Get all event dates for the month
  const eventDates = priestSchedule
    .filter(e => {
      // Parse date without timezone conversion
      const datePart = e.date.includes('T') ? e.date.split('T')[0] : e.date;
      const [dateYear, dateMonth, dateDay] = datePart.split('-').map(Number);
      return dateYear === year && (dateMonth - 1) === month;
    })
    .map(e => e.date.includes('T') ? e.date.split('T')[0] : e.date); // Return just the date part

  const isSameDay = (d1, d2) =>
    d1 && d2 &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const formatDateForDisplay = (date) => {
    if (!date) return '';
    // Format date without timezone conversion to avoid date shifts
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const result = `${month}/${day}/${year}`;
    console.log('Priest Dashboard formatDateForDisplay:', { 
      input: date, 
      month, 
      day, 
      year, 
      output: result,
      oldMethod: date.toLocaleDateString()
    });
    return result;
  };

  const formatDateForComparison = (date) => {
    if (!date) return '';
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#DED0B6] py-0">
      <div className="bg-white border border-[#f2e4ce] shadow-lg p-8 rounded-2xl w-full max-w-6xl mt-32 min-h-[700px]">
        <h1 className="text-4xl font-extrabold text-[#3F2E1E] mb-2 text-center font-['Times_New_Roman']">Liturgical Schedule</h1>
        <p className="text-[#5C4B38] text-center mb-6">View your assigned Masses and Church Duties</p>
        
        {scheduleLoading && (
          <div className="text-center mb-4">
            <span className="text-[#CD8B3E]">Loading schedule...</span>
          </div>
        )}
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-2">
          <button
            className="text-[#CD8B3E] px-3 py-1 rounded hover:bg-[#FFF6E5]"
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          >
            &lt;
          </button>
          <div className="text-xl font-bold text-[#3F2E1E]">
            {monthNames[month]} {year}
          </div>
          <button
            className="text-[#CD8B3E] px-3 py-1 rounded hover:bg-[#FFF6E5]"
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          >
            &gt;
          </button>
        </div>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 bg-[#FFF6E5] rounded-lg p-2 mb-6 border border-[#f2e4ce]">
          {dayNames.map(day => (
            <div key={day} className="text-center text-[#CD8B3E] font-bold py-1">{day}</div>
          ))}
          {monthMatrix.map((week, i) =>
            week.map((date, j) => {
              const dateStr = date ? formatDateForComparison(date) : '';
              const hasEvent = eventDates.includes(dateStr);
              const isToday = date && isSameDay(date, today);
              const isSelected = date && isSameDay(date, selectedDate);
              return (
                <button
                  key={i + '-' + j}
                  className={`h-16 w-full flex flex-col items-center justify-center rounded-lg border transition
                    ${date ? 'bg-white hover:bg-[#DED0B6] border-[#f2e4ce]' : 'bg-transparent border-transparent'}
                    ${isToday ? 'ring-2 ring-[#CD8B3E]' : ''}
                    ${isSelected ? 'bg-[#CD8B3E] text-white font-bold' : ''}
                  `}
                  disabled={!date}
                  onClick={() => date && setSelectedDate(date)}
                  style={{ cursor: date ? 'pointer' : 'default', position: 'relative' }}
                >
                  <span>{date ? date.getDate() : ''}</span>
                  {hasEvent && date && (
                    <span className={`mt-1 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-[#CD8B3E]'}`}></span>
                  )}
                </button>
              );
            })
          )}
        </div>
        {/* Events for selected day */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-[#3F2E1E] mb-2 text-center">Schedule for {formatDateForDisplay(selectedDate)}</h2>
          {events.length > 0 ? (
            <ul className="space-y-2">
              {events.map((event, idx) => (
                <li key={idx} className="bg-[#FFF6E5] border border-[#f3ddbe] p-4 rounded-lg text-center">
                  <div className="text-[#6B4E2E] font-semibold mb-1">{event.event}</div>
                  {event.notes && (
                    <div className="text-[#8B7355] text-sm italic">{event.notes}</div>
                  )}
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      event.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                      event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-400 italic">No liturgical schedule for this date.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriestDashboard;
