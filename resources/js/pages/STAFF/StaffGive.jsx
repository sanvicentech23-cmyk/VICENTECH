 import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../utils/axios';
import AnalyticsComparison from '../../components/AnalyticsComparison';
import PeriodSelector from '../../components/PeriodSelector';
import '../../../css/AdminMinistryApplicants.css';

const showToast = (msg, type = 'success') => {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.className = `toast toast-${type}`;
    Object.assign(toast.style, {
        position: 'fixed',
        top: '24px',
        right: '24px',
        background: type === 'success' ? '#22c55e' : '#ef4444',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 'bold',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        fontSize: '1rem',
        opacity: 0.95,
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
};

const StaffGive = () => {
  const [donations, setDonations] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPurposeManagement, setShowPurposeManagement] = useState(false);
  const [donationPurposes, setDonationPurposes] = useState([]);
  const [donationPurposesLoading, setDonationPurposesLoading] = useState(true);
  const [donationPurposesError, setDonationPurposesError] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [addPurposeLoading, setAddPurposeLoading] = useState(false);
  const [purposeSaving, setPurposeSaving] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [verifyingId, setVerifyingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isRejectingDonation, setIsRejectingDonation] = useState(false);
  
  // Donation Picture Management state
  const [showDonationPictureManagement, setShowDonationPictureManagement] = useState(false);
  const [donationPictures, setDonationPictures] = useState([]);
  const [donationPicturesLoading, setDonationPicturesLoading] = useState(false);
  const [donationPicturesError, setDonationPicturesError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // GCash Account Management state
  const [gcashAccounts, setGcashAccounts] = useState([]);
  const [gcashAccountsLoading, setGcashAccountsLoading] = useState(false);
  const [gcashAccountsError, setGcashAccountsError] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  
  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  
  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    totalDonations: 0,
    monthlyDonations: [],
    recentDonations: [],
    donationComparisons: { current: 0, previous: 0 }
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedPeriods, setSelectedPeriods] = useState({
    current: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, label: `${new Date().toLocaleString('default', { month: 'short' })} ${new Date().getFullYear()}` },
    compare: { year: new Date().getFullYear(), month: new Date().getMonth(), label: `${new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleString('default', { month: 'short' })} ${new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()}` }
  });

  const handlePeriodChange = (periods) => {
    setSelectedPeriods(periods);
    calculateDonationComparisons(periods);
  };

  const calculateDonationComparisons = (periods) => {
    if (!periods) return;

    setAnalyticsData(prev => {
      if (!prev.monthlyDonations || prev.monthlyDonations.length === 0) {
        return prev; // Don't update if no data available
      }

      const { current, compare } = periods;
      
      // Find donation data for current period
      const currentDonationData = prev.monthlyDonations.find(item => {
        const itemMonth = new Date(item.month + ' 1').getMonth() + 1;
        return itemMonth === current.month;
      });

      // Find donation data for compare period
      const compareDonationData = prev.monthlyDonations.find(item => {
        const itemMonth = new Date(item.month + ' 1').getMonth() + 1;
        return itemMonth === compare.month;
      });

      // Only update if the values are different to prevent unnecessary re-renders
      const newCurrent = currentDonationData?.total || 0;
      const newPrevious = compareDonationData?.total || 0;
      
      if (prev.donationComparisons.current === newCurrent && prev.donationComparisons.previous === newPrevious) {
        return prev; // No change needed
      }

      return {
        ...prev,
        donationComparisons: {
          current: newCurrent,
          previous: newPrevious
        }
      };
    });
  };

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/donations');
      const list = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.data) ? res.data.data : []);
      console.log('Donations fetched:', list);
      setDonations(list);
    } catch (err) {
      console.error('Failed to fetch donations', err);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonationPurposes = useCallback(async () => {
    setDonationPurposesLoading(true);
    try {
        const response = await api.get('/donation-purposes');
        setDonationPurposes(Array.isArray(response.data) ? response.data : []);
        setDonationPurposesError('');
    } catch (err) {
        setDonationPurposesError('Failed to fetch donation purposes.');
    } finally {
        setDonationPurposesLoading(false);
    }
  }, []);

  const fetchDonationPictures = useCallback(async () => {
    setDonationPicturesLoading(true);
    try {
        const response = await api.get('/admin/donation-pictures');
        setDonationPictures(Array.isArray(response.data) ? response.data : []);
        setDonationPicturesError('');
    } catch (err) {
        console.error('Failed to fetch donation pictures:', err);
        setDonationPicturesError('Failed to fetch donation pictures.');
        showToast('Failed to fetch donation pictures', 'error');
    } finally {
        setDonationPicturesLoading(false);
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setDonationPicturesError('Please select a valid image file');
      showToast('Please select a valid image file', 'error');
      setSelectedFile(null);
      e.target.value = ''; // Clear the input
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setDonationPicturesError('Image size must be less than 5MB');
      showToast('Image size must be less than 5MB', 'error');
      setSelectedFile(null);
      e.target.value = ''; // Clear the input
      return;
    }

    setSelectedFile(file);
    setDonationPicturesError('');
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setDonationPicturesError('Please select an image file first');
      showToast('Please select an image file first', 'error');
      return;
    }

    setUploadingImage(true);
    setDonationPicturesError('');
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const response = await api.post('/admin/donation-pictures', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('Image uploaded successfully', 'success');
      fetchDonationPictures();
      setSelectedFile(null);
      setSelectedImage(null);
      
      // Clear the file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      setDonationPicturesError('Failed to upload image');
      showToast('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleToggleImageStatus = async (imageId, currentStatus) => {
    try {
      await api.put(`/admin/donation-pictures/${imageId}/toggle`, {
        enabled: !currentStatus
      });
      showToast(`Image ${!currentStatus ? 'enabled' : 'disabled'} successfully`, 'success');
      fetchDonationPictures();
    } catch (err) {
      console.error('Failed to toggle image status:', err);
      showToast('Failed to update image status', 'error');
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await api.delete(`/admin/donation-pictures/${imageId}`);
      showToast('Image deleted successfully', 'success');
      fetchDonationPictures();
    } catch (err) {
      console.error('Failed to delete image:', err);
      showToast('Failed to delete image', 'error');
    }
  };

  // GCash Account Management functions
  const fetchGcashAccounts = useCallback(async () => {
    setGcashAccountsLoading(true);
    try {
        const response = await api.get('/admin/gcash-accounts');
        setGcashAccounts(Array.isArray(response.data) ? response.data : []);
        setGcashAccountsError('');
    } catch (err) {
        console.error('Failed to fetch GCash accounts:', err);
        setGcashAccountsError('Failed to fetch GCash accounts.');
        showToast('Failed to fetch GCash accounts', 'error');
    } finally {
        setGcashAccountsLoading(false);
    }
  }, []);

  const handleAddGcashAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim() || !newAccountNumber.trim()) return;
    
    setAddingAccount(true);
    try {
        await api.post('/admin/gcash-accounts', {
            account_name: newAccountName,
            account_number: newAccountNumber
        });
        setNewAccountName('');
        setNewAccountNumber('');
        fetchGcashAccounts();
        showToast('GCash account added successfully', 'success');
    } catch (err) {
        console.error('Failed to add GCash account:', err);
        setGcashAccountsError('Failed to add GCash account.');
        showToast('Failed to add GCash account', 'error');
    } finally {
        setAddingAccount(false);
    }
  };

  const handleEditGcashAccount = (account) => {
    setEditingAccount(account);
    setEditAccountName(account.account_name);
    setEditAccountNumber(account.account_number);
  };

  const handleUpdateGcashAccount = async (e) => {
    e.preventDefault();
    if (!editingAccount || !editAccountName.trim() || !editAccountNumber.trim()) return;

    try {
        await api.put(`/admin/gcash-accounts/${editingAccount.id}`, {
            account_name: editAccountName,
            account_number: editAccountNumber
        });
        setEditingAccount(null);
        setEditAccountName('');
        setEditAccountNumber('');
        fetchGcashAccounts();
        showToast('GCash account updated successfully', 'success');
    } catch (err) {
        console.error('Failed to update GCash account:', err);
        showToast('Failed to update GCash account', 'error');
    }
  };

  const handleToggleGcashAccount = async (accountId, currentStatus) => {
    try {
      await api.put(`/admin/gcash-accounts/${accountId}/toggle`);
      showToast(`GCash account ${!currentStatus ? 'enabled' : 'disabled'} successfully`, 'success');
      fetchGcashAccounts();
    } catch (err) {
      console.error('Failed to toggle GCash account status:', err);
      showToast('Failed to update GCash account status', 'error');
    }
  };

  const handleDeleteGcashAccount = async (accountId) => {
    try {
      await api.delete(`/admin/gcash-accounts/${accountId}`);
      showToast('GCash account deleted successfully', 'success');
      fetchGcashAccounts();
    } catch (err) {
      console.error('Failed to delete GCash account:', err);
      showToast('Failed to delete GCash account', 'error');
    }
  };

  // Confirmation Modal functions
  const showConfirmation = (action, data) => {
    setConfirmAction(action);
    setConfirmData(data);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || !confirmData) return;

    try {
      switch (confirmAction) {
        case 'deleteImage':
          await handleDeleteImage(confirmData.id);
          break;
        case 'toggleImage':
          await handleToggleImageStatus(confirmData.id, confirmData.enabled);
          break;
        case 'deleteAccount':
          await handleDeleteGcashAccount(confirmData.id);
          break;
        case 'toggleAccount':
          await handleToggleGcashAccount(confirmData.id, confirmData.enabled);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
      setConfirmData(null);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmData(null);
  };

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      // Fetch donations data directly like admin does
      const donationsRes = await api.get('/donations');
      
      // Process donations to derive summaries (exact same logic as admin)
      const donations = Array.isArray(donationsRes.data) ? donationsRes.data : [];
      // Only consider verified donations for reporting
      const verifiedDonations = donations.filter(d => d && (d.verified === true || d.verified === 1 || d.verified === '1'));

      const totalDonations = verifiedDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

      // Build last 12 months buckets (month label: e.g., "Aug 2025") and sum amounts
      const months = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = dt.toLocaleString(undefined, { month: 'short', year: 'numeric' });
        months.push({ key: `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`, month: label, total: 0, count: 0 });
      }

      const monthIndexMap = Object.fromEntries(months.map((m, idx) => [m.key, idx]));
      verifiedDonations.forEach(d => {
        const created = d.created_at || d.createdAt || d.date || d.timestamp;
        if (!created) return;
        const dt = new Date(created);
        if (isNaN(dt)) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
        const idx = monthIndexMap[key];
        if (typeof idx === 'number') {
          months[idx].total += Number(d.amount || 0);
          months[idx].count += 1;
        }
      });

      const monthlyDonations = months.map(m => ({ month: m.month, total: m.total, count: m.count }));

      // Calculate month-over-month comparison
      const currentMonthDonations = monthlyDonations[monthlyDonations.length - 1]?.total || 0;
      const previousMonthDonations = monthlyDonations[monthlyDonations.length - 2]?.total || 0;

      const recentDonations = verifiedDonations
        .slice()
        .sort((a,b) => new Date(b.created_at || b.createdAt || b.date || b.timestamp) - new Date(a.created_at || a.createdAt || a.date || a.timestamp))
        .slice(0, 10)
        .map(d => ({
          name: d.name,
          email: d.email,
          amount: Number(d.amount || 0),
          purpose_name: d.purpose_name,
          category: d.category,
          date: d.created_at || d.createdAt || d.date || d.timestamp
        }));

      setAnalyticsData({
        totalDonations: totalDonations,
        monthlyDonations: monthlyDonations,
        recentDonations: recentDonations,
        donationComparisons: { 
          current: currentMonthDonations, 
          previous: previousMonthDonations 
        }
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      showToast('Failed to load analytics data', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDonations();
    fetchDonationPurposes();
    if (showAnalytics) {
      fetchAnalytics();
    }
    if (showDonationPictureManagement) {
      fetchDonationPictures();
      fetchGcashAccounts();
    }
    window.addEventListener('donationsUpdated', fetchDonations);
    return () => window.removeEventListener('donationsUpdated', fetchDonations);
  }, [fetchDonationPurposes, fetchAnalytics, showAnalytics, fetchDonationPictures, fetchGcashAccounts, showDonationPictureManagement]);

  // Trigger period calculation when analytics data is loaded
  useEffect(() => {
    if (analyticsData.monthlyDonations && analyticsData.monthlyDonations.length > 0) {
      // Use setTimeout to ensure the state has been updated
      setTimeout(() => {
        calculateDonationComparisons(selectedPeriods);
      }, 100);
    }
  }, [analyticsData.monthlyDonations]);

  const handleVerify = async (donation) => {
    const id = donation._id || donation.id;
    if (!id) return alert('Invalid donation id');
    setVerifyingId(id);
    try {
      await api.post(`/donations/${id}/verify`);
      fetchDonations();
      window.dispatchEvent(new Event('donationVerified'));
      showToast(`Donation from ${donation.name} verified and user notified.`, 'success');
    } catch (err) {
      console.error('Verification failed', err);
      showToast('Verification failed.', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAddDonationPurpose = async (e) => {
    e.preventDefault();
    if (!newPurpose.trim()) return;
    setAddPurposeLoading(true);
    try {
        await api.post('/admin/donation-purposes', { name: newPurpose });
        setNewPurpose('');
        fetchDonationPurposes();
        showToast('Donation purpose added', 'success');
    } catch (err) {
        setDonationPurposesError('Failed to add donation purpose.');
        showToast('Failed to add donation purpose', 'error');
    } finally {
        setAddPurposeLoading(false);
    }
  };

  const handleDeleteDonationPurpose = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    setPurposeSaving(true);
    try {
        await api.delete(`/admin/donation-purposes/${id}`);
        fetchDonationPurposes();
        showToast('Donation purpose deleted', 'success');
    } catch (err) {
        setDonationPurposesError('Failed to delete donation purpose.');
        showToast('Failed to delete donation purpose', 'error');
    } finally {
        setPurposeSaving(false);
    }
  };

  const openRejectModal = (donation) => {
    const id = donation._id || donation.id;
    setRejectingId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    setIsRejectingDonation(true);
    try {
      await api.post(`/donations/${rejectingId}/reject`, { reason: rejectReason });
      fetchDonations();
      window.dispatchEvent(new Event('donationRejected'));
      showToast('Donation rejected and donor notified.', 'success');
    } catch (err) {
      console.error('Reject failed', err);
      showToast('Failed to reject donation.', 'error');
    } finally {
      setIsRejectingDonation(false);
      setShowRejectModal(false);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  const handleToggleDonationPurpose = async (id, enabled, name) => {
    const action = enabled ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} "${name}"?`)) return;
    setPurposeSaving(true);
    try {
        await api.patch(`/admin/donation-purposes/${id}`, { enabled: !enabled });
        fetchDonationPurposes();
        showToast(`Donation purpose ${action}d`, 'success');
    } catch (err) {
        setDonationPurposesError(`Failed to ${action} donation purpose.`);
        showToast(`Failed to ${action} donation purpose`, 'error');
    } finally {
        setPurposeSaving(false);
    }
  };

  // Analytics Dashboard Component - Exact copy from admin DonationSummary
  const AnalyticsDashboard = () => {
    if (analyticsLoading) {
      return (
        <div className="text-center p-8 text-[#5C4B38]">
          <div className="loading-dots" style={{ margin: '0 auto 1rem' }}>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          Loading analytics...
        </div>
      );
    }

    // DonationAmountChart component - exact copy from admin
    const DonationAmountChart = ({ monthlyData, color = '#FFD700' }) => {
      // monthlyData: [{ month, total, count }]
      const maxValue = Math.max(...monthlyData.map(m => m.total)) || 10;
      return (
        <div className="w-full h-36 sm:h-48">
          <h3 className="text-xs sm:text-sm font-medium text-[#5C4B38] mb-3 sm:mb-4">Monthly Donations (₱)</h3>
          <div className="flex items-end justify-between h-24 sm:h-32 px-1 sm:px-2 overflow-x-auto">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex flex-col items-center flex-1 mx-1 min-w-0">
                <div
                  className="w-full rounded-t-md transition-all duration-1000 ease-out"
                  style={{
                    height: `${(m.total / maxValue) * 100}%`,
                    background: `linear-gradient(135deg, ${color}, ${color}bb)`,
                    minHeight: m.total > 0 ? '4px' : '0px',
                    transitionDelay: `${i * 100}ms`
                  }}
                ></div>
                <span className="text-xs text-[#5C4B38] mt-2 text-center break-words">{m.month}</span>
                <span className="text-xs font-semibold text-[#3F2E1E]">₱{m.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      );
    };

    // DonationSummary component - exact copy from admin
    const DonationSummary = ({ data }) => {
      const monthly = data.monthlyDonations || [];
      const total = Number(data.totalDonations || 0);
      const count = monthly.reduce((s, m) => s + (m.count || 0), 0);
      const avg = count > 0 ? Math.round(total / count) : 0;

      // Month filter state
      const [selectedMonth, setSelectedMonth] = React.useState('');

      // Download handler
      const handleDownloadExcel = async () => {
        const XLSX = await import('xlsx');
        // Get all donations for the selected month
        let donations = data.recentDonations || [];
        if (selectedMonth) {
          donations = donations.filter(d => {
            const dt = new Date(d.date);
            const monthLabel = dt.toLocaleString(undefined, { month: 'short', year: 'numeric' });
            return monthLabel === selectedMonth;
          });
        }
        // Fetch donation purposes from API
        let donationPurposes = [];
        try {
          const res = await fetch('/donation-purposes');
          donationPurposes = await res.json();
        } catch (err) {
          donationPurposes = [];
        }
        // Prepare worksheet data
        const wsData = [
          ['Donation Summaries for', selectedMonth || 'All Months'],
          [],
          ['Donor Name', 'Email', 'Amount', 'Purpose', 'Date'],
          ...donations.map(d => {
            // Prefer purpose_name if available
            let purposeName = d.purpose_name;
            if (!purposeName) {
              let pid = d.category;
              let found = donationPurposes.find(p => String(p.id) === String(pid));
              if (!found) {
                found = donationPurposes.find(p => Number(p.id) === Number(pid));
              }
              purposeName = found ? found.name : `Unknown (${pid})`;
            }
            return [
              d.name,
              d.email,
              d.amount,
              purposeName,
              new Date(d.date).toLocaleDateString()
            ];
          }),
          [],
          ['Total Amount', donations.reduce((sum, d) => sum + Number(d.amount || 0), 0)],
          ['Month', selectedMonth || 'All Months']
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        // Professional formatting: bold header
        ws['A1'].s = { font: { bold: true, sz: 14 } };
        ws['A3'].s = ws['B3'].s = ws['C3'].s = ws['D3'].s = ws['E3'].s = { font: { bold: true } };
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Donations');
        // File name
        const fileName = `${selectedMonth || 'AllMonths'}_donationSummaries.xlsx`;
        XLSX.writeFile(wb, fileName);
      };

      // Get unique months for filter dropdown
      const monthOptions = monthly.map(m => m.month);

      return (
        <div className="mt-4 sm:mt-6 bg-white rounded-xl shadow border border-[#f2e4ce] p-4 sm:p-6 analytics-card">
          <h3 className="text-base sm:text-lg font-semibold text-[#3F2E1E] mb-3 sm:mb-4">Donation Summaries</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-[#FFF6E5] rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xs sm:text-sm text-[#5C4B38]">Total (verified)</div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#3F2E1E]">₱{total.toLocaleString()}</div>
            </div>
            <div className="bg-[#FFF6E5] rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xs sm:text-sm text-[#5C4B38]">Number of Donations (12mo)</div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#3F2E1E]">{count}</div>
            </div>
            <div className="bg-[#FFF6E5] rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xs sm:text-sm text-[#5C4B38]">Average Donation</div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#3F2E1E]">₱{avg.toLocaleString()}</div>
            </div>
          </div>

          {/* Month filter and download button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
            <label className="text-xs sm:text-sm text-[#5C4B38]">Filter by Month:</label>
            <select
              className="border rounded px-2 py-1 text-[#3F2E1E] text-xs sm:text-sm w-full sm:w-40"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {monthOptions.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <button
              className="px-3 sm:px-4 py-2 bg-[#3E88CD] text-white rounded-lg hover:bg-[#2C6BA0] transition-colors text-xs sm:text-sm w-full sm:w-auto"
              onClick={handleDownloadExcel}
            >
              Download as Excel
            </button>
          </div>

          <DonationAmountChart monthlyData={monthly} />
        </div>
      );
    };

    return (
      <div>
        <DonationSummary data={analyticsData} />
        
        {/* Period Selector */}
        <PeriodSelector 
          onPeriodChange={handlePeriodChange}
          defaultCurrentPeriod="current-month"
          defaultComparePeriod="previous-month"
          showYearSelector={true}
          showMonthSelector={true}
        />
        
        {/* Month-over-Month Comparison Section */}
        <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#3F2E1E', fontSize: '1.25rem', fontWeight: '600' }}>📊 Month-over-Month Analysis</h3>
            <button 
              onClick={fetchAnalytics}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#CD8B3E',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              🔄 Refresh
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <AnalyticsComparison
              currentValue={analyticsData.donationComparisons.current}
              previousValue={analyticsData.donationComparisons.previous}
              label="Donations"
              format="currency"
              icon="💰"
              color="#10b981"
              currentPeriod={selectedPeriods.current.label}
              comparePeriod={selectedPeriods.compare.label}
              showPeriodLabels={true}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="staff-main-content">
      {/* Donor Details Modal */}
      {showDonorModal && selectedDonor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 340, maxWidth: '95%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => setShowDonorModal(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#CD8B3E' }}>&times;</button>
            <h2 style={{ color: '#3F2E1E', marginBottom: 16 }}>Donor Details</h2>
            <div style={{ marginBottom: 8 }}><strong>Name:</strong> {selectedDonor.name}</div>
            <div style={{ marginBottom: 8 }}><strong>Email:</strong> {selectedDonor.email}</div>
            <div style={{ marginBottom: 8 }}><strong>Amount:</strong> ₱{Number(selectedDonor.amount).toLocaleString()}</div>
            <div style={{ marginBottom: 8 }}><strong>Reference:</strong> {selectedDonor.reference}</div>
            <div style={{ marginBottom: 8 }}><strong>Status:</strong> {selectedDonor.rejection_reason ? 'Rejected' : selectedDonor.verified ? 'Verified' : 'Pending'}</div>
            {selectedDonor.purpose && <div style={{ marginBottom: 8 }}><strong>Purpose:</strong> {selectedDonor.purpose}</div>}
            {selectedDonor.receipt_path && (() => {
              const modalUrl = /^https?:\/\//i.test(selectedDonor.receipt_path)
                ? selectedDonor.receipt_path
                : (selectedDonor.receipt_path.startsWith('/')
                    ? `${window.location.origin}${selectedDonor.receipt_path}`
                    : `${window.location.origin}/${selectedDonor.receipt_path.replace(/^\./, '')}`);
              
              
              return (
                <div style={{ marginBottom: 8 }}>
                  <strong>Receipt:</strong> {/\.pdf$/i.test(modalUrl) ? (
                    <a href={modalUrl} target="_blank" rel="noreferrer" style={{ color: '#CD8B3E', textDecoration: 'underline' }}>View PDF</a>
                  ) : (
                    <img 
                      src={modalUrl} 
                      alt="Receipt" 
                      style={{ 
                        width: 120, 
                        height: 120, 
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #f2e4ce',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                        display: 'block',
                        marginTop: 8
                      }}
                      onError={(e) => {
                        console.log('Modal image failed to load:', modalUrl, '— trying fallback');
                        const id = selectedDonor._id || selectedDonor.id;
                        if (id) {
                          const fb = `${window.location.origin}/api/donations/${id}/receipt`;
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fb;
                          return;
                        }
                        e.target.style.display = 'none';
                        const fallback = document.createElement('span');
                        fallback.textContent = 'Image Error';
                        fallback.style.cssText = 'color: #ef4444; font-size: 0.875rem; padding: 8px; border: 1px solid #fecaca; border-radius: 6px; background: #fef2f2; margin-top: 8px;';
                        e.target.parentNode.appendChild(fallback);
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(modalUrl, '_blank', 'noopener,noreferrer');
                      }}
                    />
                  )}
                </div>
              );
            })()}
            {selectedDonor.rejection_reason && (
              <div style={{ color: '#ef4444', marginTop: 8 }}><strong>Rejection Reason:</strong> {selectedDonor.rejection_reason}</div>
            )}
          </div>
        </div>
      )}
      <style>{`
        .requests-table tbody tr {
          border-bottom: 1px solid #f2e4ce;
          transition: background 0.15s;
        }
        .requests-table tbody td {
          border-bottom: none;
        }
        .requests-table tbody tr:hover {
          background: #f9f6f1;
        }
        
        .loading-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2px;
          width: 18px;
          height: 18px;
        }
        
        .loading-dots .dot {
          width: 3px;
          height: 3px;
          background-color: white;
          border-radius: 50%;
          animation: pulse 1.4s ease-in-out infinite both;
        }
        
        .loading-dots .dot:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots .dot:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots .dot:nth-child(3) { animation-delay: 0s; }
        
        @keyframes pulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .status-rejected {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        /* Enhanced Responsive Styles */
        .staff-main-content {
          padding: 1rem;
          max-width: 100%;
          overflow-x: hidden;
        }

        .recent-activities {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          padding: 2rem;
          min-height: 300px;
          border: 1px solid #f2e4ce;
          overflow: hidden;
        }

        .header-controls {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-controls h2 {
          color: #3F2E1E;
          font-weight: 700;
          font-size: 1.75rem;
          margin: 0;
          flex-shrink: 0;
        }

        .filter-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .filter-buttons button,
        .filter-buttons select {
          background: #f9f5ef;
          border: 1px solid #e0d8cc;
          color: #5C4B38;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        .filter-buttons button:hover {
          background: #f2e4ce;
        }

        .filter-buttons button.active {
          background: #CD8B3E;
          color: #fff;
          border-color: #CD8B3E;
          font-weight: 600;
        }

        /* Responsive table container */
        .requests-table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          border: 1px solid #f2e4ce;
          background: #fff;
        }

        .requests-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          min-width: 800px; /* Ensure minimum width for proper layout */
        }

        .requests-table th,
        .requests-table td {
          padding: 1rem;
          border-bottom: 1px solid #f2e4ce;
          vertical-align: middle;
        }

        .requests-table th {
          color: #3F2E1E;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background-color: #fcf9f4;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .action-buttons button {
          border: none;
          border-radius: 6px;
          font-weight: 600;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 44px; /* Minimum touch target size */
          min-height: 44px;
        }

        .btn-approve {
          background-color: #28a745;
          color: white;
        }

        .btn-approve:hover:not(:disabled) {
          background-color: #218838;
        }

        .btn-reject {
          background-color: #dc3545;
          color: white;
        }

        .btn-reject:hover:not(:disabled) {
          background-color: #c82333;
        }

        /* Mobile-first responsive design */
        @media (max-width: 1200px) {
          .staff-main-content {
            padding: 1rem 0.5rem;
          }
          
          .recent-activities {
            padding: 1.5rem;
          }
          
          .header-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .header-controls h2 {
            font-size: 1.5rem;
            text-align: center;
            margin-bottom: 1rem;
          }
          
          .filter-buttons {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .staff-main-content {
            padding: 0.5rem;
          }
          
          .recent-activities {
            padding: 1rem;
            border-radius: 12px;
          }
          
          .header-controls h2 {
            font-size: 1.25rem;
          }
          
          .filter-buttons button,
          .filter-buttons select {
            font-size: 0.75rem;
            padding: 0.4rem 0.8rem;
          }
          
          .requests-table {
            font-size: 0.875rem;
            min-width: 700px;
          }
          
          .requests-table th,
          .requests-table td {
            padding: 0.75rem 0.5rem;
          }
          
          .action-buttons {
            flex-direction: column;
            gap: 0.25rem;
            align-items: stretch;
          }
          
          .action-buttons button {
            font-size: 0.75rem;
            padding: 0.5rem;
            min-width: auto;
            min-height: 36px;
          }
        }

        @media (max-width: 640px) {
          .staff-main-content {
            padding: 0.25rem;
          }
          
          .recent-activities {
            padding: 0.75rem;
            border-radius: 8px;
          }
          
          .header-controls h2 {
            font-size: 1.125rem;
          }
          
          .filter-buttons {
            gap: 0.25rem;
          }
          
          .filter-buttons button,
          .filter-buttons select {
            font-size: 0.7rem;
            padding: 0.3rem 0.6rem;
          }
          
          /* Hide less critical columns on very small screens */
          .requests-table th:nth-child(4),
          .requests-table td:nth-child(4) {
            display: none; /* Hide Reference column */
          }
          
          .requests-table {
            min-width: 600px;
            font-size: 0.8rem;
          }
          
          .requests-table th,
          .requests-table td {
            padding: 0.5rem 0.25rem;
          }
          
          /* Responsive modal */
          .reject-modal {
            width: 95% !important;
            max-width: 95% !important;
            margin: 10px;
            padding: 1rem !important;
          }
          
          .reject-modal h3 {
            font-size: 1.125rem;
          }
          
          .reject-modal textarea {
            min-height: 80px;
            font-size: 0.875rem;
          }
        }

        @media (max-width: 480px) {
          .header-controls h2 {
            font-size: 1rem;
          }
          
          .filter-buttons button,
          .filter-buttons select {
            font-size: 0.65rem;
            padding: 0.25rem 0.5rem;
          }
          
          /* Hide additional columns on extra small screens */
          .requests-table th:nth-child(5),
          .requests-table td:nth-child(5) {
            display: none; /* Hide Receipt column */
          }
          
          .requests-table {
            min-width: 400px;
            font-size: 0.75rem;
          }
          
          .requests-table th,
          .requests-table td {
            padding: 0.4rem 0.2rem;
          }
          
          .action-buttons button {
            font-size: 0.65rem;
            padding: 0.4rem;
            min-height: 32px;
          }
        }

        /* Landscape orientation adjustments */
        @media (max-height: 500px) and (orientation: landscape) {
          .recent-activities {
            padding: 1rem;
          }
          
          .header-controls {
            margin-bottom: 1rem;
          }
          
          .header-controls h2 {
            font-size: 1.25rem;
          }
        }

        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .requests-table {
            border-collapse: separate;
            border-spacing: 0;
          }
          
          .requests-table th,
          .requests-table td {
            border-bottom: 0.5px solid #f2e4ce;
          }
        }

        /* Dark mode support (if needed in future) */
        @media (prefers-color-scheme: dark) {
          /* Dark mode styles can be added here if needed */
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .requests-table tbody tr,
          .filter-buttons button,
          .action-buttons button {
            transition: none;
          }
          
          .loading-dots .dot {
            animation: none;
          }
        }

        /* Receipt Image Styles */
        .receipt-image {
          transition: all 0.2s ease;
          border: 1px solid #f2e4ce;
          border-radius: 6px;
          cursor: pointer;
        }

        .receipt-image:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(205, 139, 62, 0.2);
        }

        /* Print styles */
        @media print {
          .filter-buttons,
          .action-buttons {
            display: none;
          }
          
          .requests-table {
            font-size: 0.8rem;
          }
          
          .staff-main-content {
            padding: 0;
          }
        }

        /* Purpose Management Styles */
        .purpose-management-container {
          width: 100%;
          max-width: 100%;
        }

        .purpose-management-content {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .purpose-management-title {
          margin-bottom: 1.5rem;
          text-align: center;
          font-size: 2rem;
          color: #3F2E1E;
          font-weight: 700;
        }

        .purpose-form {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          align-items: stretch;
        }

        .purpose-input {
          flex: 1;
          padding: 0.75rem;
          border-radius: 8px;
          border: 1.5px solid #f2e4ce;
          font-size: 1rem;
          background: #FFF6E5;
          color: #3F2E1E;
          transition: border-color 0.2s;
        }

        .purpose-input:focus {
          outline: none;
          border-color: #CD8B3E;
        }

        .purpose-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .purpose-add-btn {
          background: #CD8B3E;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 2rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .purpose-add-btn:hover:not(:disabled) {
          background: #B77B35;
        }

        .purpose-add-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .purpose-error {
          color: #dc3545;
          text-align: center;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
        }

        .purpose-loading {
          text-align: center;
          padding: 2rem;
          color: #5C4B38;
          font-size: 1.1rem;
        }

        .purpose-table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          border: 1px solid #f2e4ce;
          background: #fff;
        }

        .purpose-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }

        .purpose-table th {
          background: #FFF6E5;
          color: #3F2E1E;
          font-weight: 700;
          font-size: 1rem;
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #f2e4ce;
        }

        .purpose-table th:nth-child(2) {
          text-align: center;
        }

        .purpose-table th:nth-child(3) {
          text-align: right;
        }

        .purpose-table td {
          padding: 1rem;
          border-bottom: 1px solid #f2e4ce;
          vertical-align: middle;
        }

        .purpose-name {
          font-weight: 500;
          color: #3F2E1E;
        }

        .purpose-status {
          text-align: center;
        }

        .status-enabled {
          background: #22c55e;
          color: white;
        }

        .status-disabled {
          background: #ef4444;
          color: white;
        }

        .purpose-actions {
          text-align: right;
        }

        .purpose-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .purpose-btn {
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
          min-width: 80px;
        }

        .btn-enable {
          background: #10b981;
          color: white;
        }

        .btn-enable:hover:not(:disabled) {
          background: #059669;
        }

        .btn-disable {
          background: #f59e0b;
          color: white;
        }

        .btn-disable:hover:not(:disabled) {
          background: #d97706;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .btn-delete:hover:not(:disabled) {
          background: #dc2626;
        }

        .purpose-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Purpose Management Responsive Styles */
        @media (max-width: 1200px) {
          .purpose-management-content {
            padding: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .purpose-management-content {
            padding: 1rem;
          }

          .purpose-management-title {
            font-size: 1.5rem;
          }

          .purpose-form {
            flex-direction: column;
            gap: 0.75rem;
          }

          .purpose-input {
            font-size: 0.9rem;
            padding: 0.6rem;
          }

          .purpose-add-btn {
            font-size: 0.9rem;
            padding: 0.6rem 1.5rem;
          }

          .purpose-table {
            min-width: 500px;
            font-size: 0.875rem;
          }

          .purpose-table th,
          .purpose-table td {
            padding: 0.75rem 0.5rem;
          }

          .purpose-actions {
            flex-direction: column;
            gap: 0.25rem;
            align-items: stretch;
          }

          .purpose-btn {
            font-size: 0.75rem;
            padding: 0.4rem 0.8rem;
            min-width: auto;
          }
        }

        @media (max-width: 640px) {
          .purpose-management-content {
            padding: 0.75rem;
          }

          .purpose-management-title {
            font-size: 1.25rem;
          }

          .purpose-table {
            min-width: 400px;
            font-size: 0.8rem;
          }

          .purpose-table th,
          .purpose-table td {
            padding: 0.5rem 0.25rem;
          }

          .purpose-btn {
            font-size: 0.7rem;
            padding: 0.35rem 0.6rem;
          }
        }

        @media (max-width: 480px) {
          .purpose-management-content {
            padding: 0.5rem;
          }

          .purpose-management-title {
            font-size: 1.125rem;
          }

          .purpose-input {
            font-size: 0.85rem;
            padding: 0.5rem;
          }

          .purpose-add-btn {
            font-size: 0.85rem;
            padding: 0.5rem 1rem;
          }

          /* Hide status column on very small screens */
          .purpose-table th:nth-child(2),
          .purpose-table td:nth-child(2) {
            display: none;
          }

          .purpose-table {
            min-width: 300px;
            font-size: 0.75rem;
          }

          .purpose-table th,
          .purpose-table td {
            padding: 0.4rem 0.2rem;
          }
        }
      `}</style>
      {showPurposeManagement && (
        <button
          onClick={() => setShowPurposeManagement(false)}
          style={{
            position: 'relative',
            left: 0,
            marginBottom: 16,
            background: '#fff',
            color: '#CD8B3E',
            border: '2px solid #CD8B3E',
            borderRadius: 8,
            padding: '8px 24px',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 2px 8px rgba(205,139,62,0.06)',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            display: 'inline-block',
          }}
          onMouseOver={e => { e.target.style.background = '#CD8B3E'; e.target.style.color = '#fff'; }}
          onMouseOut={e => { e.target.style.background = '#fff'; e.target.style.color = '#CD8B3E'; }}
        >
          ← Back to Donations
        </button>
      )}


      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="reject-modal" style={{ width: 560, maxWidth: '94%', background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#3F2E1E' }}>Reject Donation</h3>
            <p style={{ color: '#5C4B38' }}>Provide a reason for rejecting this donation. The donor will receive an email with this message.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
              style={{ width: '100%', minHeight: 120, padding: 12, borderRadius: 8, border: '1px solid #f2e4ce', marginTop: 12 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => { setShowRejectModal(false); setRejectingId(null); setRejectReason(''); }} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: 8 }}>Cancel</button>
              <button 
                onClick={handleRejectConfirm} 
                disabled={isRejectingDonation || !rejectReason.trim()} 
                style={{ 
                  background: isRejectingDonation ? '#ef4444aa' : '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 14px', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isRejectingDonation ? 'not-allowed' : 'pointer'
                }}
              >
                {isRejectingDonation ? (
                  <>
                    <div className="loading-dots">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                    Sending...
                  </>
                ) : (
                  'Send Rejection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="recent-activities">
        {showPurposeManagement ? (
          <div className="purpose-management-container">
          <div className="purpose-management-content">
              <h1 className="purpose-management-title">Manage Donation Purposes</h1>
              <form onSubmit={handleAddDonationPurpose} className="purpose-form">
                  <input
                      type="text"
                      value={newPurpose}
                      onChange={e => setNewPurpose(e.target.value)}
                      placeholder="Add new donation purpose"
                      className="purpose-input"
                      disabled={addPurposeLoading}
                  />
                  <button
                      type="submit"
                      disabled={addPurposeLoading || !newPurpose.trim()}
                      className="purpose-add-btn"
                  >
                      {addPurposeLoading ? 'Adding...' : 'Add'}
                  </button>
              </form>
              {donationPurposesError && <div className="purpose-error">{donationPurposesError}</div>}
              {donationPurposesLoading ? (
                  <div className="purpose-loading">Loading purposes...</div>
              ) : (
                  <div className="purpose-table-container">
                      <table className="purpose-table">
                          <thead>
                              <tr>
                                  <th>Purpose Name</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {donationPurposes.map(purpose => (
                                  <tr key={purpose.id}>
                                      <td className="purpose-name">{purpose.name}</td>
                                      <td className="purpose-status">
                                          <span className={`status-badge ${purpose.enabled ? 'status-enabled' : 'status-disabled'}`}>
                                              {purpose.enabled ? 'Enabled' : 'Disabled'}
                                          </span>
                                      </td>
                                      <td className="purpose-actions">
                                          <button
                                              onClick={() => handleToggleDonationPurpose(purpose.id, purpose.enabled, purpose.name)}
                                              disabled={purposeSaving}
                                              className={`purpose-btn ${purpose.enabled ? 'btn-disable' : 'btn-enable'}`}
                                          >
                                              {purpose.enabled ? 'Disable' : 'Enable'}
                                          </button>
                                          <button
                                              onClick={() => handleDeleteDonationPurpose(purpose.id, purpose.name)}
                                              disabled={purposeSaving}
                                              className="purpose-btn btn-delete"
                                          >
                                              Delete
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
        </div>
        ) : showDonationPictureManagement ? (
          <>
            <div className="header-controls">
              <h2>Donation Management</h2>
            </div>
            
            <button
              onClick={() => setShowDonationPictureManagement(false)}
              style={{
                position: 'relative',
                left: 0,
                marginBottom: 16,
                background: '#fff',
                color: '#CD8B3E',
                border: '2px solid #CD8B3E',
                borderRadius: 8,
                padding: '8px 24px',
                fontWeight: 700,
                fontSize: 16,
                boxShadow: '0 2px 8px rgba(205,139,62,0.06)',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
                display: 'inline-block',
              }}
              onMouseOver={e => { e.target.style.background = '#CD8B3E'; e.target.style.color = '#fff'; }}
              onMouseOut={e => { e.target.style.background = '#fff'; e.target.style.color = '#CD8B3E'; }}
            >
              ← Back to Donations
            </button>
            
            <div className="purpose-management-container">
              <div className="purpose-management-content">
                <h1 className="purpose-management-title">Manage Donation Pictures & GCash Accounts</h1>
                
                {/* Upload Form Section */}
                <form className="purpose-form" onSubmit={handleImageUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploadingImage}
                    className="purpose-input"
                    style={{ padding: '0.75rem', cursor: 'pointer' }}
                    placeholder="Select image file"
                  />
                  <button
                    type="submit"
                    disabled={uploadingImage || !selectedFile}
                    className="purpose-add-btn"
                    style={{ opacity: (uploadingImage || !selectedFile) ? 0.6 : 1 }}
                  >
                    {uploadingImage ? 'Uploading...' : 'Add'}
                  </button>
                </form>
                
                {selectedFile && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px 12px', 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #0ea5e9', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#0369a1'
                  }}>
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                
                {donationPicturesError && <div className="purpose-error">{donationPicturesError}</div>}
                
                {donationPicturesLoading ? (
                  <div className="purpose-loading">Loading images...</div>
                ) : (
                  <div className="purpose-table-container">
                    <table className="purpose-table">
                      <thead>
                        <tr>
                          <th>Image Preview</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {donationPictures.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#5C4B38' }}>
                              No images uploaded yet.
                            </td>
                          </tr>
                        ) : (
                          donationPictures.map((image) => (
                            <tr key={image.id}>
                              <td className="purpose-name">
                                <div style={{ 
                                  width: '80px', 
                                  height: '80px', 
                                  border: '2px solid #f2e4ce', 
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: '#faf9f7'
                                }}>
                                  <img 
                                    src={`${window.location.origin}${image.image_path}`} 
                                    alt={`Donation Image ${image.id}`}
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover',
                                      cursor: 'pointer'
                                    }}
                                    onError={(e) => {
                                      console.error('Failed to load donation image:', image.image_path);
                                      e.target.style.display = 'none';
                                      e.target.parentNode.innerHTML = '<div style="color: #5C4B38; font-size: 12px; text-align: center;">Image Error</div>';
                                    }}
                                    onClick={() => {
                                      // Open image in new tab for full view
                                      window.open(`${window.location.origin}${image.image_path}`, '_blank');
                                    }}
                                    title="Click to view full size"
                                  />
                                </div>
                              </td>
                              <td className="purpose-status">
                                <span className={`status-badge ${image.enabled ? 'status-enabled' : 'status-disabled'}`}>
                                  {image.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </td>
                              <td className="purpose-actions">
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => showConfirmation('toggleImage', { id: image.id, enabled: image.enabled })}
                                    disabled={uploadingImage}
                                    className={`purpose-btn ${image.enabled ? 'btn-disable' : 'btn-enable'}`}
                                  >
                                    {image.enabled ? 'Disable' : 'Enable'}
                                  </button>
                                  <button
                                    onClick={() => showConfirmation('deleteImage', { id: image.id })}
                                    disabled={uploadingImage}
                                    className="purpose-btn btn-delete"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* GCash Account Management Section */}
                <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #f2e4ce', borderRadius: '12px', backgroundColor: '#faf9f7' }}>
                  <h2 style={{ color: '#3F2E1E', fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>GCash Account Details</h2>
                  
                  {/* Add New Account Form */}
                  <form onSubmit={handleAddGcashAccount} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#3F2E1E', fontWeight: '600' }}>Account Name</label>
                      <input
                        type="text"
                        value={newAccountName}
                        onChange={e => setNewAccountName(e.target.value)}
                        placeholder="Enter GCash account name"
                        className="purpose-input"
                        disabled={addingAccount}
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#3F2E1E', fontWeight: '600' }}>Account Number</label>
                      <input
                        type="text"
                        value={newAccountNumber}
                        onChange={e => setNewAccountNumber(e.target.value)}
                        placeholder="Enter GCash account number"
                        className="purpose-input"
                        disabled={addingAccount}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addingAccount || !newAccountName.trim() || !newAccountNumber.trim()}
                      className="purpose-add-btn"
                      style={{ opacity: (addingAccount || !newAccountName.trim() || !newAccountNumber.trim()) ? 0.6 : 1 }}
                    >
                      {addingAccount ? 'Adding...' : 'Add Account'}
                    </button>
                  </form>
                  
                  {gcashAccountsError && <div className="purpose-error">{gcashAccountsError}</div>}
                  
                  {/* GCash Accounts Table */}
                  {gcashAccountsLoading ? (
                    <div className="purpose-loading">Loading GCash accounts...</div>
                  ) : (
                    <div className="purpose-table-container">
                      <table className="purpose-table">
                        <thead>
                          <tr>
                            <th>Account Name</th>
                            <th>Account Number</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gcashAccounts.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#5C4B38' }}>
                                No GCash accounts added yet.
                              </td>
                            </tr>
                          ) : (
                            gcashAccounts.map((account) => (
                              <tr key={account.id}>
                                <td className="purpose-name">
                                  {editingAccount && editingAccount.id === account.id ? (
                                    <input
                                      type="text"
                                      value={editAccountName}
                                      onChange={e => setEditAccountName(e.target.value)}
                                      className="purpose-input"
                                      style={{ width: '100%', padding: '0.5rem' }}
                                    />
                                  ) : (
                                    account.account_name
                                  )}
                                </td>
                                <td className="purpose-name">
                                  {editingAccount && editingAccount.id === account.id ? (
                                    <input
                                      type="text"
                                      value={editAccountNumber}
                                      onChange={e => setEditAccountNumber(e.target.value)}
                                      className="purpose-input"
                                      style={{ width: '100%', padding: '0.5rem' }}
                                    />
                                  ) : (
                                    account.account_number
                                  )}
                                </td>
                                <td className="purpose-status">
                                  <span className={`status-badge ${account.enabled ? 'status-enabled' : 'status-disabled'}`}>
                                    {account.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </td>
                                <td className="purpose-actions">
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {editingAccount && editingAccount.id === account.id ? (
                                      <>
                                        <button
                                          onClick={handleUpdateGcashAccount}
                                          className="purpose-btn btn-enable"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingAccount(null);
                                            setEditAccountName('');
                                            setEditAccountNumber('');
                                          }}
                                          className="purpose-btn btn-disable"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleEditGcashAccount(account)}
                                          className="purpose-btn btn-enable"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => showConfirmation('toggleAccount', { id: account.id, enabled: account.enabled })}
                                          className={`purpose-btn ${account.enabled ? 'btn-disable' : 'btn-enable'}`}
                                        >
                                          {account.enabled ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                          onClick={() => showConfirmation('deleteAccount', { id: account.id })}
                                          className="purpose-btn btn-delete"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="header-controls">
              <h2>Donation Verification</h2>
              <div className="filter-buttons">
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className={showAnalytics ? 'active' : ''}
                  style={{ 
                    background: showAnalytics ? '#CD8B3E' : '#f9f5ef',
                    color: showAnalytics ? '#fff' : '#5C4B38',
                    marginRight: '12px'
                  }}
                >
                  {showAnalytics ? 'Hide Analytics' : 'View Analytics'}
                </button>
                <button
                  onClick={() => setShowPurposeManagement(true)}
                  className="filter-button"
                  style={{ marginRight: '12px' }}
                >
                  Manage Donation Purposes
                </button>
                <button
                  onClick={() => setShowDonationPictureManagement(true)}
                  className="filter-button"
                  style={{ marginRight: '12px' }}
                >
                  Manage Donation Details
                </button>
                <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>All</button>
                <button onClick={() => setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>Pending</button>
                <button onClick={() => setFilter('verified')} className={filter === 'verified' ? 'active' : ''}>Verified</button>
                <button onClick={() => setFilter('rejected')} className={filter === 'rejected' ? 'active' : ''}>Rejected</button>
                <select
                  value={purposeFilter}
                  onChange={e => setPurposeFilter(e.target.value)}
                  style={{ marginLeft: 12, padding: '8px 10px', borderRadius: 8, border: '1px solid #f2e4ce' }}
                >
                  <option value="all">All Purposes</option>
                  {donationPurposes.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {showAnalytics ? (
              <AnalyticsDashboard />
            ) : loading ? (
              <p>Loading donations...</p>
            ) : (
              <div className="requests-table-container">
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Receipt</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredDonations = filter === 'all' 
                        ? donations 
                        : filter === 'pending' 
                          ? donations.filter(d => !d.verified && !d.rejection_reason)
                          : filter === 'verified'
                            ? donations.filter(d => d.verified)
                            : filter === 'rejected'
                              ? donations.filter(d => d.rejection_reason)
                              : donations;
                      
            // apply purpose filter
            const purposeFiltered = purposeFilter === 'all' ? filteredDonations : filteredDonations.filter(d => (d.purpose_id || d.category || d.purpose) == purposeFilter);

            return purposeFiltered.length === 0 ? (
                        <tr>
              <td colSpan={7} className="no-requests">No donations found.</td>
                        </tr>
            ) : purposeFiltered.map(donation => (
                      <tr key={donation.id || donation._id}>
                        <td>{donation.email}</td>
                        <td>
                          <span style={{ cursor: 'pointer', color: '#CD8B3E', textDecoration: 'underline' }}
                            onClick={() => { setSelectedDonor(donation); setShowDonorModal(true); }}
                            title="View donor details"
                          >
                            {donation.name}
                          </span>
                        </td>
                        <td>₱{Number(donation.amount).toLocaleString()}</td>
                        <td>{donation.reference}</td>
                        <td>
                          {donation.receipt_path ? (() => {
                            const url = /^https?:\/\//i.test(donation.receipt_path)
                              ? donation.receipt_path
                              : (donation.receipt_path.startsWith('/')
                                  ? `${window.location.origin}${donation.receipt_path}`
                                  : `${window.location.origin}/${donation.receipt_path.replace(/^\./, '')}`);
                            
                            
                            return /\.pdf$/i.test(url) ? (
                              <a href={url} target="_blank" rel="noreferrer" className="text-[#CD8B3E] underline">View PDF</a>
                            ) : (
                              <img 
                                src={url} 
                                alt="Receipt" 
                                style={{ 
                                  width: 56, 
                                  height: 56, 
                                  objectFit: 'cover',
                                  borderRadius: 6,
                                  border: '1px solid #f2e4ce',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s ease',
                                  display: 'block'
                                }}
                                onError={(e) => {
                                  console.log('Image failed to load:', url, '— trying fallback');
                                  const id = donation._id || donation.id;
                                  if (id) {
                                    const fallbackUrl = `${window.location.origin}/api/donations/${id}/receipt`;
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = fallbackUrl;
                                    return;
                                  }
                                  e.target.style.display = 'none';
                                  const fallback = document.createElement('span');
                                  fallback.textContent = 'Image Error';
                                  fallback.style.cssText = 'color: #ef4444; font-size: 0.75rem; padding: 4px; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2;';
                                  e.target.parentNode.appendChild(fallback);
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.transform = 'scale(1)';
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                              />
                            );
                          })() : (
                            <span className="text-[#5C4B38] text-sm">None</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${
                            donation.rejection_reason ? 'status-rejected' : 
                            donation.verified ? 'status-approved' : 'status-pending'
                          }`}>
                            {donation.rejection_reason ? 'Rejected' : 
                             donation.verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="action-buttons">
                          {!donation.verified && !donation.rejection_reason && (
                            <button
                              className="btn-approve"
                              onClick={() => handleVerify(donation)}
                              title="Verify Donation"
                              disabled={verifyingId === (donation._id || donation.id)}
                            >
                              {verifyingId === (donation._id || donation.id) ? (
                                <div className="loading-dots">
                                  <div className="dot"></div>
                                  <div className="dot"></div>
                                  <div className="dot"></div>
                                </div>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M5 10.5L9 14.5L15 7.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                          )}
                          {!donation.verified && !donation.rejection_reason && (
                            <button
                              className="btn-reject"
                              onClick={() => openRejectModal(donation)}
                              title="Reject Donation"
                              disabled={purposeSaving || rejectingId === (donation._id || donation.id)}
                              style={{ marginLeft: 8, background: '#ef4444', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          )}
                          {donation.rejection_reason && (
                            <span style={{ color: '#ef4444', fontSize: '0.875rem', fontStyle: 'italic' }}>
                              Rejected: {donation.rejection_reason.length > 50 ? 
                                `${donation.rejection_reason.substring(0, 50)}...` : 
                                donation.rejection_reason}
                            </span>
                          )}
                        </td>
                      </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: '2rem',
            maxWidth: 400,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ color: '#3F2E1E', marginBottom: '1rem', fontSize: '1.25rem' }}>
              {confirmAction?.includes('delete') ? 'Confirm Delete' : 'Confirm Action'}
            </h3>
            <p style={{ color: '#5C4B38', marginBottom: '2rem', lineHeight: 1.5 }}>
              {(() => {
                switch (confirmAction) {
                  case 'deleteImage':
                    return 'Are you sure you want to delete this donation image? This action cannot be undone.';
                  case 'toggleImage':
                    return `Are you sure you want to ${confirmData?.enabled ? 'disable' : 'enable'} this donation image?`;
                  case 'deleteAccount':
                    return 'Are you sure you want to delete this GCash account? This action cannot be undone.';
                  case 'toggleAccount':
                    return `Are you sure you want to ${confirmData?.enabled ? 'disable' : 'enable'} this GCash account?`;
                  default:
                    return 'Are you sure you want to proceed with this action?';
                }
              })()}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={cancelConfirmation}
                style={{
                  background: '#f8f9fa',
                  color: '#6c757d',
                  border: '1px solid #dee2e6',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                style={{
                  background: confirmAction?.includes('delete') ? '#e74c3c' : '#CD8B3E',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {confirmAction?.includes('delete') ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffGive;