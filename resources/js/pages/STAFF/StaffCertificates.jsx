import React, { useState, useEffect } from 'react';
import '../../../css/staffCertificates.css';
import { api } from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

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

const StaffCertificates = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // { [id]: 'approve' | 'reject' | null }
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isRejectingCertificate, setIsRejectingCertificate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCertificateId, setDeleteCertificateId] = useState(null);

  useEffect(() => {
    api.get('/certificate-requests')
      .then(res => setCertificates(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCertificates([]));
  }, []);

  const handleApprove = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'approve' }));
    try {
      const res = await api.patch(`/certificate-requests/${id}`, { status: 'approved' });
      setCertificates(certs => certs.map(cert => cert.id === id ? res.data : cert));
      setPopup({ show: true, message: 'Certificate request approved!', type: 'success' });
    } catch (error) {
      setPopup({ show: true, message: 'Failed to approve request.', type: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleRelease = (certificate) => {
    // Navigate to certificate generation page with certificate data
    navigate('/staff/certificate-generator', { 
      state: { 
        certificate: certificate,
        mode: 'release'
      } 
    });
  };

  const openRejectModal = (certificate) => {
    setRejectingId(certificate.id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    setIsRejectingCertificate(true);
    try {
      const res = await api.patch(`/certificate-requests/${rejectingId}`, { 
        status: 'rejected', 
        rejection_reason: rejectReason 
      });
      setCertificates(certs => certs.map(cert => cert.id === rejectingId ? res.data : cert));
      showToast('Certificate request rejected and applicant notified.', 'error');
    } catch (error) {
      showToast('Failed to reject request.', 'error');
    } finally {
      setIsRejectingCertificate(false);
      setShowRejectModal(false);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  const handleDelete = (id) => {
    setDeleteCertificateId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteCertificateId) return;
    try {
      await api.delete(`/certificate-requests/${deleteCertificateId}`);
      setCertificates(certs => certs.filter(cert => cert.id !== deleteCertificateId));
      showToast('Certificate request deleted!', 'error');
    } catch (error) {
      alert('Failed to delete request.');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteCertificateId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteCertificateId(null);
  };

  const handleViewDetails = (certificate) => {
    setSelectedCertificate(certificate);
  };

  const closeModal = () => {
    setSelectedCertificate(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="certificates-container">
      {/* Popup Modal Notification */}
      {popup.show && (
        <div className="popup-modal">
          <div className="popup-content">
            <h2 className="popup-title">{popup.type === 'success' ? 'Success' : 'Notification'}</h2>
            <p className="popup-message">{popup.message}</p>
            <button className="popup-close" onClick={() => setPopup({ ...popup, show: false })}>Close</button>
          </div>
        </div>
      )}

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
            <h3 style={{ marginTop: 0, color: '#3F2E1E' }}>Reject Certificate Request</h3>
            <p style={{ color: '#5C4B38' }}>
              Provide a reason for rejecting this certificate request. The applicant will receive an email with this message.
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
                disabled={isRejectingCertificate || !rejectReason.trim()} 
                style={{ 
                  background: isRejectingCertificate ? '#ef4444aa' : '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 14px', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isRejectingCertificate || !rejectReason.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {isRejectingCertificate ? (
                  <>
                    <span className="btn-spinner"></span>
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
      <div className="certificates-header">
        <h1 className="certificates-title">Certificate Requests</h1>
        <button
          onClick={() => navigate('/staff/parish-records')}
          className="records-btn"
          style={{
            background: '#CD8B3E',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            padding: '0.7rem 1.8rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(205, 139, 62, 0.2)'
          }}
        >
          📋 Parish Records
        </button>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3 className="stat-label">Total Requests</h3>
          <p className="stat-value total">{certificates.length}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-label">Pending</h3>
          <p className="stat-value pending">
            {certificates.filter(cert => cert.status === 'pending').length}
          </p>
        </div>
        <div className="stat-card">
          <h3 className="stat-label">Approved</h3>
          <p className="stat-value completed">
            {certificates.filter(cert => cert.status === 'approved').length}
          </p>
        </div>
        <div className="stat-card">
          <h3 className="stat-label">Completed</h3>
          <p className="stat-value completed">
            {certificates.filter(cert => cert.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="certificates-table-container">
        <div className="table-wrapper">
          <table className="certificates-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Requestor</th>
                <th className="hide-mobile">Date Requested</th>
                <th className="hide-tablet">Purpose</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.length > 0 ? (
                certificates.map((certificate) => (
                  <tr key={certificate.id}
                    className="certificate-row"
                    onClick={e => {
                      if (e.target.closest('.action-btn')) return;
                      handleViewDetails(certificate);
                    }}
                  >
                    <td>
                      <div className="certificate-type">{certificate.certificate_type}</div>
                    </td>
                    <td>
                      <div className="requestor-info">
                        <div className="requestor-name">
                          {certificate.first_name} {certificate.last_name}
                        </div>
                        <div className="show-mobile date-requested">
                          Req: {certificate.created_at ? new Date(certificate.created_at).toLocaleDateString() : ''}
                        </div>
                        <div className="show-tablet purpose-mobile">
                          Purpose: {certificate.purpose}
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">
                      {certificate.created_at ? new Date(certificate.created_at).toLocaleDateString() : ''}
                    </td>
                    <td className="hide-tablet">{certificate.purpose}</td>
                    <td>
                      <span className={`status-badge ${certificate.status}`}>
                        {certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="action-btn approve-btn"
                          title="Approve"
                          onClick={e => { e.stopPropagation(); handleApprove(certificate.id); }}
                          disabled={certificate.status !== 'pending' || actionLoading[certificate.id]}
                          aria-label="Approve"
                        >
                          {actionLoading[certificate.id] === 'approve' ? (
                            <span className="btn-spinner"></span>
                          ) : (
                            <>
                              <span className="action-text-full">Approve</span>
                              <span className="action-text-short">✓</span>
                            </>
                          )}
                        </button>
                        <button
                          className="action-btn release-btn"
                          title="Release Certificate"
                          onClick={e => { e.stopPropagation(); handleRelease(certificate); }}
                          disabled={certificate.status === 'rejected' || certificate.status === 'completed'}
                          aria-label="Release Certificate"
                        >
                          <span className="action-text-full">Release</span>
                          <span className="action-text-short">📄</span>
                        </button>
                        <button
                          className="action-btn reject-btn"
                          title="Reject"
                          onClick={e => { e.stopPropagation(); openRejectModal(certificate); }}
                          disabled={certificate.status === 'rejected' || actionLoading[certificate.id]}
                          aria-label="Reject"
                        >
                          <span className="action-text-full">Reject</span>
                          <span className="action-text-short">✗</span>
                        </button>
                        <button
                          className="action-btn delete-btn"
                          title="Delete"
                          onClick={e => { e.stopPropagation(); handleDelete(certificate.id); }}
                          aria-label="Delete"
                          disabled={certificate.status === 'completed'}
                        >
                          <span className="action-text-full">Delete</span>
                          <span className="action-text-short">🗑</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <p className="empty-title">No certificate requests found</p>
                      <p className="empty-subtitle">New requests will appear here when submitted</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
              Confirm Delete
            </h3>
            <p style={{ color: '#5C4B38', marginBottom: '2rem', lineHeight: 1.5 }}>
              Are you sure you want to delete this certificate request? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={cancelDelete}
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
                onClick={confirmDelete}
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for certificate details */}
      {selectedCertificate && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button 
              onClick={closeModal} 
              className="modal-close"
            >
              &times;
            </button>
            <h2 className="modal-title">Certificate Request Details</h2>
            <div className="modal-divider" />
            <div className="modal-details">
              <div className="detail-row">
                <strong>Type:</strong> {selectedCertificate.certificate_type}
              </div>
              <div className="detail-row">
                <strong>Requestor:</strong> {selectedCertificate.first_name} {selectedCertificate.last_name}
              </div>
              <div className="detail-row">
                <strong>Date Requested:</strong> {selectedCertificate.created_at ? new Date(selectedCertificate.created_at).toLocaleDateString() : ''}
              </div>
              <div className="detail-row">
                <strong>Status:</strong> 
                <span className={`status-badge ${selectedCertificate.status}`} style={{ marginLeft: '8px' }}>
                  {selectedCertificate.status.charAt(0).toUpperCase() + selectedCertificate.status.slice(1)}
                </span>
              </div>
              <div className="detail-row">
                <strong>Email:</strong> {selectedCertificate.email}
              </div>
              <div className="detail-row">
                <strong>Phone:</strong> {selectedCertificate.phone}
              </div>
              <div className="detail-row">
                <strong>Address:</strong> {selectedCertificate.address}
              </div>
              <div className="detail-row">
                <strong>Purpose:</strong> {selectedCertificate.purpose}
              </div>
              <div className="detail-row">
                <strong>Date Needed:</strong> {selectedCertificate.dateNeeded}
              </div>
              <div className="detail-row">
                <strong>Additional Info:</strong> {selectedCertificate.additionalInfo}
              </div>
            </div>
            <div className="modal-divider" />
            <div className="modal-actions">
              <button 
                onClick={closeModal} 
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

export default StaffCertificates; 