import React, { useState, useEffect, useRef, useCallback } from 'react';

const PeriodSelector = ({ 
  onPeriodChange, 
  defaultCurrentPeriod = 'current-month',
  defaultComparePeriod = 'previous-month',
  showYearSelector = true,
  showMonthSelector = true,
  className = ''
}) => {
  const [currentPeriod, setCurrentPeriod] = useState(defaultCurrentPeriod === 'current-month' ? `month-${new Date().getMonth() + 1}` : defaultCurrentPeriod);
  const [comparePeriod, setComparePeriod] = useState(defaultComparePeriod === 'previous-month' ? `month-${new Date().getMonth() === 0 ? 12 : new Date().getMonth()}` : defaultComparePeriod);
  const [customCurrentYear, setCustomCurrentYear] = useState(new Date().getFullYear());
  const [customCurrentMonth, setCustomCurrentMonth] = useState(new Date().getMonth() + 1);
  const [customCompareYear, setCustomCompareYear] = useState(new Date().getFullYear() - 1);
  const [customCompareMonth, setCustomCompareMonth] = useState(new Date().getMonth() + 1);

  const months = [
    { value: 1, label: 'January', short: 'Jan' },
    { value: 2, label: 'February', short: 'Feb' },
    { value: 3, label: 'March', short: 'Mar' },
    { value: 4, label: 'April', short: 'Apr' },
    { value: 5, label: 'May', short: 'May' },
    { value: 6, label: 'June', short: 'Jun' },
    { value: 7, label: 'July', short: 'Jul' },
    { value: 8, label: 'August', short: 'Aug' },
    { value: 9, label: 'September', short: 'Sep' },
    { value: 10, label: 'October', short: 'Oct' },
    { value: 11, label: 'November', short: 'Nov' },
    { value: 12, label: 'December', short: 'Dec' }
  ];

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
      years.push(year);
    }
    return years;
  };

  const getPeriodInfo = (period, customYear, customMonth) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Handle month-specific periods (month-1, month-2, etc.)
    if (period.startsWith('month-')) {
      const monthValue = parseInt(period.split('-')[1]);
      const monthName = months[monthValue - 1]?.short || 'Unknown';
      return { year: customYear, month: monthValue, label: `${monthName} ${customYear}` };
    }

    switch (period) {
      case 'current-month':
        const currentMonthName = months[currentMonth - 1]?.short || 'Unknown';
        return { year: currentYear, month: currentMonth, label: `${currentMonthName} ${currentYear}` };
      case 'previous-month':
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const prevMonthName = months[prevMonth - 1]?.short || 'Unknown';
        return { year: prevYear, month: prevMonth, label: `${prevMonthName} ${prevYear}` };
      case 'current-year':
        return { year: currentYear, month: null, label: `Year ${currentYear}` };
      case 'previous-year':
        return { year: currentYear - 1, month: null, label: `Year ${currentYear - 1}` };
      case 'custom':
        return { 
          year: customYear, 
          month: customMonth, 
          label: `${months[customMonth - 1]?.short || 'Unknown'} ${customYear}` 
        };
      default:
        const defaultMonthName = months[currentMonth - 1]?.short || 'Unknown';
        return { year: currentYear, month: currentMonth, label: `${defaultMonthName} ${currentYear}` };
    }
  };

  const notifyPeriodChange = useCallback(() => {
    const currentInfo = getPeriodInfo(currentPeriod, customCurrentYear, customCurrentMonth);
    const compareInfo = getPeriodInfo(comparePeriod, customCompareYear, customCompareMonth);
    
    onPeriodChange({
      current: currentInfo,
      compare: compareInfo
    });
  }, [currentPeriod, comparePeriod, customCurrentYear, customCurrentMonth, customCompareYear, customCompareMonth, onPeriodChange]);

  return (
    <div className={`period-selector ${className}`} style={{
      backgroundColor: '#fff',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #f2e4ce',
      marginBottom: '1.5rem'
    }}>
      <h4 style={{ 
        color: '#3F2E1E', 
        fontSize: '1.125rem', 
        fontWeight: '600', 
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        📅 Compare Periods
      </h4>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {/* Current Period */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            color: '#3F2E1E', 
            marginBottom: '0.5rem' 
          }}>
            Current Period
          </label>
          <input
            type="month"
            value={`${customCurrentYear}-${String(customCurrentMonth).padStart(2, '0')}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-');
              setCustomCurrentYear(parseInt(year));
              setCustomCurrentMonth(parseInt(month));
              setCurrentPeriod(`month-${parseInt(month)}`);
              notifyPeriodChange();
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #f2e4ce',
              borderRadius: '0.5rem',
              backgroundColor: '#FFF6E5',
              color: '#3F2E1E',
              fontSize: '0.875rem',
              marginBottom: '0.75rem'
            }}
          />
        </div>

        {/* Compare Period */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            color: '#3F2E1E', 
            marginBottom: '0.5rem' 
          }}>
            Compare To
          </label>
          <input
            type="month"
            value={`${customCompareYear}-${String(customCompareMonth).padStart(2, '0')}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-');
              setCustomCompareYear(parseInt(year));
              setCustomCompareMonth(parseInt(month));
              setComparePeriod(`month-${parseInt(month)}`);
              notifyPeriodChange();
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #f2e4ce',
              borderRadius: '0.5rem',
              backgroundColor: '#FFF6E5',
              color: '#3F2E1E',
              fontSize: '0.875rem',
              marginBottom: '0.75rem'
            }}
          />
        </div>
      </div>

      {/* Period Summary */}
      <div style={{ 
        marginTop: '1rem', 
        padding: '0.75rem', 
        backgroundColor: '#f9f5ef', 
        borderRadius: '0.5rem',
        border: '1px solid #f2e4ce'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#5C4B38' }}>
          <strong>Comparing:</strong> {months[customCurrentMonth - 1]?.short} {customCurrentYear}
          <span style={{ margin: '0 0.5rem', color: '#CD8B3E' }}>vs</span>
          {months[customCompareMonth - 1]?.short} {customCompareYear}
        </div>
      </div>
    </div>
  );
};

export default PeriodSelector;
