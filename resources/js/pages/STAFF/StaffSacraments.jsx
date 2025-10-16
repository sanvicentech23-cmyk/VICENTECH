import React, { useState, useEffect } from 'react';
import SacramentTypesManager from './SacramentTypesManager';
import TimeSlotsManager from './TimeSlotsManager';
import '../../../css/staffSacraments.css';

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

const StaffSacraments = () => {
  const [sacraments, setSacraments] = useState([]);
  const [selectedSacrament, setSelectedSacrament] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSacramentTypes, setShowSacramentTypes] = useState(false);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isRejectingSacrament, setIsRejectingSacrament] = useState(false);
  
  // Remove sacrament types and time slots management state and functions

  const fetchSacraments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/staff/sacrament-appointments', {
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if needed, e.g. Authorization: `Bearer ${token}`
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sacrament appointments');
      }
      const data = await response.json();
      setSacraments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSacraments();
  }, []);

  const updateSacraments = (newSacs) => {
    setSacraments(newSacs);
  };

  const handleProcess = async (id) => {
    try {
      const response = await fetch(`/api/staff/sacrament-appointments/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if needed
        },
      });
      if (!response.ok) {
        throw new Error('Failed to approve appointment');
      }
      await fetchSacraments();
      // Dispatch event to update sidebar notification
      window.dispatchEvent(new Event('sacramentAppointmentUpdated'));
    } catch (err) {
      setError(err.message);
    }
  };

  const openRejectModal = (sacrament) => {
    setRejectingId(sacrament.id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    setIsRejectingSacrament(true);
    try {
      const response = await fetch(`/api/staff/sacrament-appointments/${rejectingId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if needed
        },
        body: JSON.stringify({ rejection_reason: rejectReason })
      });
      if (!response.ok) {
        throw new Error('Failed to reject appointment');
      }
      await fetchSacraments();
      // Dispatch event to update sidebar notification
      window.dispatchEvent(new Event('sacramentAppointmentUpdated'));
      showToast('Sacrament appointment rejected and applicant notified.', 'error');
    } catch (err) {
      setError(err.message);
      showToast('Failed to reject appointment.', 'error');
    } finally {
      setIsRejectingSacrament(false);
      setShowRejectModal(false);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Remove sacrament types and time slots management functions

  // Load data when switching to management views
  useEffect(() => {
    if (showSacramentTypes) {
      // fetchSacramentTypes(); // No longer needed
    }
  }, [showSacramentTypes]);

  useEffect(() => {
    if (showTimeSlots) {
      // fetchTimeSlots(); // No longer needed
    }
  }, [showTimeSlots]);

  return (
    <div className="sacraments-container">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="sacraments-header">
        <h1 className="sacraments-title">Appointments</h1>
        <p className="sacraments-subtitle">Manage and process sacrament appointments</p>
        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading-message">Loading...</div>}
        
        {/* Management Buttons */}
        {!showSacramentTypes && !showTimeSlots && (
          <div className="management-buttons">
            <button
              onClick={() => setShowSacramentTypes(true)}
              className="management-btn primary"
            >
              <span className="btn-text-full">Manage Sacrament Types</span>
              <span className="btn-text-short">Types</span>
            </button>
            <button
              onClick={() => setShowTimeSlots(true)}
              className="management-btn primary"
            >
              <span className="btn-text-full">Manage Time Slots</span>
              <span className="btn-text-short">Slots</span>
            </button>
          </div>
        )}
        
        {/* Back Button for Management Views */}
        {(showSacramentTypes || showTimeSlots) && (
          <button
            onClick={() => {
              setShowSacramentTypes(false);
              setShowTimeSlots(false);
            }}
            className="back-btn"
          >
            <span className="back-arrow">←</span>
            <span className="back-text-full">Back to Sacrament Requests</span>
            <span className="back-text-short">Back</span>
          </button>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.4)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 2000 
        }}>
          <div style={{ 
            width: 560, 
            maxWidth: '94%', 
            background: '#fff', 
            borderRadius: 12, 
            padding: 20, 
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)' 
          }}>
            <h3 style={{ marginTop: 0, color: '#3F2E1E' }}>Reject Sacrament Appointment</h3>
            <p style={{ color: '#5C4B38' }}>
              Provide a reason for rejecting this sacrament appointment. The applicant will receive an email with this message.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
              style={{ 
                width: '100%', 
                minHeight: 120, 
                padding: 12, 
                borderRadius: 8, 
                border: '1px solid #f2e4ce', 
                marginTop: 12,
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button 
                onClick={() => { 
                  setShowRejectModal(false); 
                  setRejectingId(null); 
                  setRejectReason(''); 
                }} 
                style={{ 
                  background: '#fff', 
                  border: '1px solid #d1d5db', 
                  padding: '8px 14px', 
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectConfirm} 
                disabled={isRejectingSacrament || !rejectReason.trim()} 
                style={{ 
                  background: isRejectingSacrament ? '#ef4444aa' : '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 14px', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isRejectingSacrament || !rejectReason.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {isRejectingSacrament ? (
                  <>
                    <span style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #ffffff', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }}></span>
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

      {/* Main Sacrament Requests View */}
      {!showSacramentTypes && !showTimeSlots && (
        <>
          {/* Stats Summary */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3 className="stat-label">Total Requests</h3>
              <p className="stat-value total">{sacraments.length}</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-label">Pending</h3>
              <p className="stat-value pending">
                {sacraments.filter(s => s.status === 'pending').length}
              </p>
            </div>
            <div className="stat-card">
              <h3 className="stat-label">Processing</h3>
              <p className="stat-value processing">
                {sacraments.filter(s => s.status === 'processing').length}
              </p>
            </div>
            <div className="stat-card">
              <h3 className="stat-label">Approved</h3>
              <p className="stat-value approved">
                {sacraments.filter(s => s.status === 'approved').length}
              </p>
            </div>
          </div>
          {/* Sacraments Table */}
          <div className="sacraments-table-container">
            <div className="table-wrapper">
              <table className="sacraments-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Requestor</th>
                    <th className="hide-mobile">Date Requested</th>
                    <th>Preferred Date</th>
                    <th className="hide-tablet">Requirements</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sacraments.length > 0 ? (
                    sacraments.map((sacrament) => (
                      <tr key={sacrament.id}
                        className="sacrament-row"
                        onClick={e => {
                          if (e.target.closest('.action-btn')) return;
                          setSelectedSacrament(sacrament);
                        }}
                      >
                        <td>
                          <div className="sacrament-type">{sacrament.type}</div>
                        </td>
                        <td>
                          <div className="requestor-info">
                            <div className="requestor-name">{sacrament.requestor}</div>
                            <div className="show-mobile date-requested">
                              Req: {sacrament.dateRequested}
                            </div>
                          </div>
                        </td>
                        <td className="hide-mobile">{sacrament.dateRequested}</td>
                        <td>{sacrament.preferredDate}</td>
                        <td className="hide-tablet">
                          <ul className="requirements-list">
                            {sacrament.requirements.map((req, index) => (
                              <li key={index}>{req}</li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          <span className={`status-badge ${sacrament.status}`}>
                            {sacrament.status.charAt(0).toUpperCase() + sacrament.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button 
                              className="action-button process action-btn" 
                              onClick={e => { e.stopPropagation(); handleProcess(sacrament.id); }} 
                              disabled={sacrament.status !== 'pending'}
                            >
                              <span className="action-text-full">Process</span>
                              <span className="action-text-short">✓</span>
                            </button>
                            <button 
                              className="action-button reject action-btn" 
                              onClick={e => { e.stopPropagation(); openRejectModal(sacrament); }} 
                              disabled={sacrament.status === 'rejected'}
                            >
                              <span className="action-text-full">Reject</span>
                              <span className="action-text-short">✗</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">
                          <div className="empty-icon">📋</div>
                          <p className="empty-title">No sacrament requests found</p>
                          <p className="empty-subtitle">New requests will appear here when submitted</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {/* Sacrament Types Management Section */}
      {showSacramentTypes && (
        <SacramentTypesManager onBack={() => setShowSacramentTypes(false)} setError={setError} />
      )}
      {/* Time Slots Management Section */}
      {showTimeSlots && (
        <TimeSlotsManager onBack={() => setShowTimeSlots(false)} setError={setError} />
      )}
      
      {selectedSacrament && (
        <div className="modal-overlay" onClick={() => setSelectedSacrament(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedSacrament(null)} 
              className="modal-close"
            >
              &times;
            </button>
            <h2 className="modal-title">Sacrament Request Details</h2>
            <div className="modal-divider" />
            <div className="modal-details">
              <div className="detail-row">
                <strong>Type:</strong> {selectedSacrament.type}
              </div>
              <div className="detail-row">
                <strong>Requestor:</strong> {selectedSacrament.requestor}
              </div>
              <div className="detail-row">
                <strong>Date Requested:</strong> {selectedSacrament.dateRequested}
              </div>
              <div className="detail-row">
                <strong>Preferred Date:</strong> {selectedSacrament.preferredDate}
              </div>
              <div className="detail-row">
                <strong>Status:</strong> 
                <span className={`status-badge ${selectedSacrament.status}`} style={{ marginLeft: '8px' }}>
                  {selectedSacrament.status.charAt(0).toUpperCase() + selectedSacrament.status.slice(1)}
                </span>
              </div>
              <div className="detail-row">
                <strong>Requirements:</strong>
                <ul className="requirements-list" style={{ marginTop: '8px' }}>
                  {selectedSacrament.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal-divider" />
            <div className="modal-actions">
              <button 
                onClick={() => setSelectedSacrament(null)} 
                className="modal-btn primary"
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

export default StaffSacraments;
