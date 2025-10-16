import React, { useState, useEffect } from 'react';
import '../../../css/staffDashboard.css';
import { initialMortuaryData } from '../../data/mortuaryData';

const StaffDashboard = () => {
  const [summary, setSummary] = useState({
    mortuaryRacks: 0,
    availableRacks: 0,
    pendingCertificates: 0,
    processingCertificates: 0,
    completedCertificates: 0,
    rejectedCertificates: 0,
    pendingSacraments: 0,
    processingSacraments: 0,
    approvedSacraments: 0,
    rejectedSacraments: 0,
  });

  const recentRequests = [
    { id: 1, type: 'Certificate', detail: 'Baptismal Certificate - Juan Dela Cruz', status: 'Pending', date: '2024-03-15' },
    { id: 2, type: 'Sacrament', detail: 'Marriage - Maria Santos & Pedro Reyes', status: 'Approved', date: '2024-03-14' },
    { id: 3, type: 'Mortuary', detail: 'Rack B12 - Reserved', status: 'Active', date: '2024-03-13' },
    { id: 4, type: 'Certificate', detail: 'Marriage Certificate - Ana Garcia', status: 'Processing', date: '2024-03-12' },
  ];

  const loadDashboardSummary = () => {
    // Mortuary
    const mortuaryData = JSON.parse(localStorage.getItem('mortuaryData') || JSON.stringify(initialMortuaryData));
    const racks = mortuaryData.racks || [];
    const totalRacks = racks.length;
    const availableRacks = racks.filter(rack => rack.status === 'available').length;

    // Certificates
    const certificatesData = JSON.parse(localStorage.getItem('certificatesData') || '[]');
    const pendingCertificates = certificatesData.filter(cert => cert.status === 'pending').length;
    const processingCertificates = certificatesData.filter(cert => cert.status === 'processing').length;
    const completedCertificates = certificatesData.filter(cert => cert.status === 'completed').length;
    const rejectedCertificates = certificatesData.filter(cert => cert.status === 'rejected').length;

    // Sacraments
    const sacramentsData = JSON.parse(localStorage.getItem('sacramentsData') || '[]');
    const pendingSacraments = sacramentsData.filter(sac => sac.status === 'pending').length;
    const processingSacraments = sacramentsData.filter(sac => sac.status === 'processing').length;
    const approvedSacraments = sacramentsData.filter(sac => sac.status === 'approved').length;
    const rejectedSacraments = sacramentsData.filter(sac => sac.status === 'rejected').length;

    setSummary({
      mortuaryRacks: totalRacks,
      availableRacks: availableRacks,
      pendingCertificates,
      processingCertificates,
      completedCertificates,
      rejectedCertificates,
      pendingSacraments,
      processingSacraments,
      approvedSacraments,
      rejectedSacraments,
    });
  };

  useEffect(() => {
    loadDashboardSummary();
    window.addEventListener('mortuaryDataUpdated', loadDashboardSummary);
    window.addEventListener('certificatesDataUpdated', loadDashboardSummary);
    window.addEventListener('sacramentsDataUpdated', loadDashboardSummary);
    window.addEventListener('sacramentAppointmentUpdated', loadDashboardSummary);
    return () => {
      window.removeEventListener('mortuaryDataUpdated', loadDashboardSummary);
      window.removeEventListener('certificatesDataUpdated', loadDashboardSummary);
      window.removeEventListener('sacramentsDataUpdated', loadDashboardSummary);
      window.removeEventListener('sacramentAppointmentUpdated', loadDashboardSummary);
    };
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-badge pending';
      case 'processing': return 'status-badge processing';
      case 'approved': return 'status-badge approved';
      case 'completed': return 'status-badge completed';
      case 'rejected': return 'status-badge rejected';
      case 'active': return 'status-badge active';
      default: return 'status-badge';
    }
  };

  return (
    <div className="staff-dashboard-content">
      <div className="dashboard-header">
        <h1>Staff Dashboard</h1>
        <div className="dashboard-subtitle">
          Welcome back! Here's an overview of your parish management activities.
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card mortuary-card">
          <div className="card-icon">
            <svg width="24" height="24" fill="none" stroke="#CD8B3E" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.mortuaryRacks}</div>
            <div className="card-label">Total Racks</div>
            <div className="card-sublabel">{summary.availableRacks} Available</div>
          </div>
        </div>

        <div className="summary-card certificates-card">
          <div className="card-icon">
            <svg width="24" height="24" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.pendingCertificates}</div>
            <div className="card-label">Pending Certificates</div>
          </div>
        </div>

        <div className="summary-card certificates-processing-card">
          <div className="card-icon">
            <svg width="24" height="24" fill="none" stroke="#4F46E5" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.processingCertificates}</div>
            <div className="card-label">Processing Certificates</div>
          </div>
        </div>

        <div className="summary-card certificates-completed-card">
          <div className="card-icon">
            <svg width="24" height="24" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.completedCertificates}</div>
            <div className="card-label">Completed Certificates</div>
          </div>
        </div>

        <div className="summary-card sacraments-card">
          <div className="card-icon">
            <svg width="24" height="24" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v20"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              <circle cx="12" cy="8" r="2" fill="#FFF6E5" stroke="#CD8B3E"/>
              <path d="M8 16c0-2 2-3 4-3s4 1 4 3" stroke="#CD8B3E"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.pendingSacraments}</div>
            <div className="card-label">Pending Sacraments</div>
          </div>
        </div>

        <div className="summary-card sacraments-approved-card">
          <div className="card-icon">
            <svg width="24" height="24" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.approvedSacraments}</div>
            <div className="card-label">Approved Sacraments</div>
          </div>
        </div>
      </div>

      <div className="recent-requests">
        <div className="section-header">
          <h2>Recent Requests</h2>
          <div className="section-subtitle">Latest activities requiring your attention</div>
        </div>
        <div className="requests-table">
          <table>
            <thead>
              <tr>
                <th>TYPE</th>
                <th>DETAIL</th>
                <th>STATUS</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="request-type">
                      <span className="type-icon">
                        {request.type === 'Certificate' ? (
                          <svg width="16" height="16" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                        ) : request.type === 'Sacrament' ? (
                          <svg width="16" height="16" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M12 2v20"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" fill="none" stroke="#CD8B3E" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          </svg>
                        )}
                      </span>
                      {request.type}
                    </div>
                  </td>
                  <td className="request-detail">{request.detail}</td>
                  <td>
                    <span className={getStatusBadgeClass(request.status)}>
                      {request.status}
                    </span>
                  </td>
                  <td className="request-date">{request.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
