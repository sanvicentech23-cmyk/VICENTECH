import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import '../../../css/profile.css';
import Navbar from '../../components/Navbar';
import SuccessPopup from '../../components/SuccessPopup';
import api from '../../utils/axios';

const FamilyHeadManagement = () => {
  const [user, setUser] = useState(null);
  const [familyHeadData, setFamilyHeadData] = useState(null);
  const [loadingFamilyHead, setLoadingFamilyHead] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingFamilyInfo, setEditingFamilyInfo] = useState(false);
  const [memberEditForm, setMemberEditForm] = useState({});
  const [familyInfoForm, setFamilyInfoForm] = useState({});
  
  // Family sacrament management states
  const [familySacramentHistory, setFamilySacramentHistory] = useState([]);
  const [loadingFamilySacraments, setLoadingFamilySacraments] = useState(false);
  const [showSacramentModal, setShowSacramentModal] = useState(false);
  const [editingSacrament, setEditingSacrament] = useState(null);
  const [sacramentForm, setSacramentForm] = useState({ user_id: '', type: '', date: '', parish: '' });
  const [submittingSacrament, setSubmittingSacrament] = useState(false);
  
  // Success popup states
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sacramentToDelete, setSacramentToDelete] = useState(null);

  const navigate = useNavigate();

  // Helper function to show success popup
  const showSuccess = (title, message) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setShowSuccessPopup(true);
  };

  const hideSuccess = () => {
    setShowSuccessPopup(false);
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Check if user is logged in and is family head
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      
      if (!userData.is_family_head) {
        alert('You are not authorized to access this page. Only family heads can manage family information.');
        navigate('/profile');
        return;
      }
      
      // Fetch family head dashboard data
      fetchFamilyHeadDashboard();
      fetchFamilySacramentHistory();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Family Head Management Functions
  const fetchFamilyHeadDashboard = async () => {
    setLoadingFamilyHead(true);
    try {
      const res = await api.get('/family-head/dashboard');
      setFamilyHeadData(res.data);
    } catch (err) {
      console.error('Failed to load family head dashboard:', err);
      alert('Failed to load family management data');
    } finally {
      setLoadingFamilyHead(false);
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setMemberEditForm({
      name: member.name || '',
      phone: member.phone || '',
      gender: member.gender || '',
      birthdate: member.birthdate ? member.birthdate.split('T')[0] : '',
      address: member.address || '',
      family_role: member.family_role || '',
      relationship_to_head: member.relationship_to_head || ''
    });
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    
    setLoadingFamilyHead(true);
    try {
      const res = await api.put(`/family-head/member/${editingMember.id}`, memberEditForm);
      if (res.data.success) {
        showSuccess('Success', 'Family member profile updated successfully!');
        setEditingMember(null);
        fetchFamilyHeadDashboard();
      } else {
        alert('Failed to update member: ' + (res.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating member:', err);
      alert('Failed to update member: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingFamilyHead(false);
    }
  };

  const handleEditFamilyInfo = () => {
    if (!familyHeadData?.family) return;
    
    setEditingFamilyInfo(true);
    setFamilyInfoForm({
      family_name: familyHeadData.family.family_name || '',
      address: familyHeadData.family.address || '',
      phone: familyHeadData.family.phone || '',
      email: familyHeadData.family.email || ''
    });
  };

  const handleUpdateFamilyInfo = async () => {
    setLoadingFamilyHead(true);
    try {
      const res = await api.put('/family-head/family-info', familyInfoForm);
      if (res.data.success) {
        showSuccess('Success', 'Family information updated successfully!');
        setEditingFamilyInfo(false);
        fetchFamilyHeadDashboard();
      } else {
        alert('Failed to update family info: ' + (res.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating family info:', err);
      alert('Failed to update family info: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingFamilyHead(false);
    }
  };

  const handleTransferHead = async (newHeadId) => {
    if (!confirm('Are you sure you want to transfer family head status? You will no longer be able to manage family profiles.')) {
      return;
    }
    
    setLoadingFamilyHead(true);
    try {
      const res = await api.post(`/family-head/transfer/${newHeadId}`);
      if (res.data.success) {
        showSuccess('Success', 'Family head status transferred successfully!');
        // Update user data
        const updatedUserData = {
          ...user,
          is_family_head: false,
          family_role: 'former_head'
        };
        setUser(updatedUserData);
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        navigate('/profile');
      } else {
        alert('Failed to transfer head status: ' + (res.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error transferring head status:', err);
      alert('Failed to transfer head status: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingFamilyHead(false);
    }
  };

  // Family Sacrament Management Functions
  const fetchFamilySacramentHistory = async () => {
    setLoadingFamilySacraments(true);
    try {
      const res = await api.get('/family-sacrament-history');
      setFamilySacramentHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load family sacrament history:', err);
      alert('Failed to load family sacrament history');
    } finally {
      setLoadingFamilySacraments(false);
    }
  };

  const handleAddSacrament = () => {
    setSacramentForm({ user_id: '', type: '', date: '', parish: '' });
    setEditingSacrament(null);
    setShowSacramentModal(true);
  };

  const handleEditSacrament = (sacrament) => {
    setSacramentForm({
      user_id: sacrament.user_id,
      type: sacrament.type,
      date: sacrament.date,
      parish: sacrament.parish
    });
    setEditingSacrament(sacrament);
    setShowSacramentModal(true);
  };

  const handleSaveSacrament = async (e) => {
    e.preventDefault();
    setSubmittingSacrament(true);
    
    try {
      if (editingSacrament) {
        // Update existing sacrament
        const res = await api.put(`/family-sacrament-history/${editingSacrament.id}`, {
          type: sacramentForm.type,
          date: sacramentForm.date,
          parish: sacramentForm.parish
        });
        
        setFamilySacramentHistory(prev => prev.map(s => 
          s.id === editingSacrament.id ? res.data : s
        ));
        showSuccess('Success', 'Sacrament record updated successfully!');
      } else {
        // Add new sacrament
        const res = await api.post('/family-sacrament-history', sacramentForm);
        
        setFamilySacramentHistory(prev => [res.data, ...prev]);
        showSuccess('Success', 'Sacrament record added successfully!');
      }
      
      setShowSacramentModal(false);
      setSacramentForm({ user_id: '', type: '', date: '', parish: '' });
      setEditingSacrament(null);
      
      // Dispatch event to update individual profiles
      window.dispatchEvent(new Event('sacramentHistoryUpdated'));
    } catch (err) {
      console.error('Error saving sacrament:', err);
      alert('Failed to save sacrament record: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingSacrament(false);
    }
  };

  const handleDeleteSacrament = async (sacramentId) => {
    const sacrament = familySacramentHistory.find(s => s.id === sacramentId);
    setSacramentToDelete(sacrament);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSacrament = async () => {
    if (!sacramentToDelete) return;
    
    setSubmittingSacrament(true);
    try {
      await api.delete(`/family-sacrament-history/${sacramentToDelete.id}`);
      
      setFamilySacramentHistory(prev => prev.filter(s => s.id !== sacramentToDelete.id));
      showSuccess('Success', 'Sacrament record deleted successfully!');
      
      // Dispatch event to update individual profiles
      window.dispatchEvent(new Event('sacramentHistoryUpdated'));
    } catch (err) {
      console.error('Error deleting sacrament:', err);
      alert('Failed to delete sacrament record: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingSacrament(false);
      setShowDeleteConfirm(false);
      setSacramentToDelete(null);
    }
  };

  if (!user) {
    return (
      <div className="profile-bg">
        <div className="profile-card" style={{textAlign: 'center', fontSize: '1.2rem', color: '#CD8B3E'}}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <Navbar />
      <div className="profile-bg-container">
        <div className="profile-bg">
          <div className="profile-grid-layout responsive-profile-grid">
            <div className="family-grouping-fullwidth">
              <div className="profile-section family-head-management-section" style={{
                background: '#ffffff',
                borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 25px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                overflow: 'hidden'
              }}>
                <div className="profile-section-header gold" style={{
                  background: '#CD8B3E',
                  color: 'white',
                  padding: '2rem 2.5rem',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  letterSpacing: '-0.5px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  textAlign: 'center'
                }}>
                  <span> Family Head Management</span>
                </div>
                
                <div className="family-head-dashboard" style={{ 
                  padding: '3rem 2.5rem',
                  background: '#ffffff',
                  minHeight: '600px'
                }}>
                  {loadingFamilyHead ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4rem 2rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #CD8B3E 0%, #B67A35 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '2rem',
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '40px', height: '40px', color: 'white' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10,9 9,9 8,9"/>
                        </svg>
                      </div>
                      <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1f2937',
                        marginBottom: '0.5rem',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Loading Family Management Data...</h3>
                      <p style={{
                        fontSize: '1rem',
                        color: '#6b7280',
                        margin: 0
                      }}>Please wait while we fetch your family information</p>
                    </div>
                  ) : familyHeadData ? (
                    <div>
                      {/* Family Information Section */}
                      <div id="family-info-section" className="family-info-section" style={{ 
                        marginBottom: '3rem',
                        textAlign: 'center',
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '3rem',
                        border: '2px solid #CD8B3E',
                        boxShadow: '0 16px 48px rgba(205, 139, 62, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '6px',
                          background: 'linear-gradient(90deg, #CD8B3E 0%, #B67A35 50%, #CD8B3E 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'gradientShift 3s ease-in-out infinite'
                        }}></div>
                        <div style={{
                          fontSize: '2.2rem',
                          fontWeight: '900',
                          color: '#1f2937',
                          marginBottom: '2.5rem',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          letterSpacing: '-0.8px',
                          position: 'relative',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            position: 'absolute',
                            bottom: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '80px',
                            height: '6px',
                            background: 'linear-gradient(90deg, #CD8B3E 0%, #B67A35 100%)',
                            borderRadius: '3px',
                            boxShadow: '0 2px 8px rgba(205, 139, 62, 0.3)'
                          }}></div>
                          Family Information
                        </div>
                        {editingFamilyInfo ? (
                          <div>
                            <div className="history-cards-grid">
                              <div className="history-card">
                                <div className="history-card-header">
                                  <div className="history-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                      <polyline points="9,22 9,12 15,12 15,22"/>
                                    </svg>
                                  </div>
                                  <div className="history-card-title">Family Details</div>
                                </div>
                                <div className="history-card-content">
                                  <div className="history-card-item">
                                    <span className="history-label">Family Name:</span>
                                    <input
                                      type="text"
                                      name="family_name"
                                      value={familyInfoForm.family_name}
                                      onChange={(e) => setFamilyInfoForm({...familyInfoForm, family_name: e.target.value})}
                                      className="input-edit"
                                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Address:</span>
                                    <input
                                      type="text"
                                      name="address"
                                      value={familyInfoForm.address}
                                      onChange={(e) => setFamilyInfoForm({...familyInfoForm, address: e.target.value})}
                                      className="input-edit"
                                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Phone:</span>
                                    <input
                                      type="tel"
                                      name="phone"
                                      value={familyInfoForm.phone}
                                      onChange={(e) => setFamilyInfoForm({...familyInfoForm, phone: e.target.value})}
                                      className="input-edit"
                                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Email:</span>
                                    <input
                                      type="email"
                                      name="email"
                                      value={familyInfoForm.email}
                                      onChange={(e) => setFamilyInfoForm({...familyInfoForm, email: e.target.value})}
                                      className="input-edit"
                                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                  </div>
                                </div>
                              </div>
                              
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                              <button
                                onClick={handleUpdateFamilyInfo}
                                disabled={loadingFamilyHead}
                                className="profile-save-btn profile-action-btn"
                              >
                                {loadingFamilyHead ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                onClick={() => setEditingFamilyInfo(false)}
                                className="profile-cancel-btn profile-action-btn"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="history-cards-grid">
                              <div className="history-card">
                                <div className="history-card-header">
                                  <div className="history-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                      <polyline points="9,22 9,12 15,12 15,22"/>
                                    </svg>
                                  </div>
                                  <div className="history-card-title">Family Details</div>
                                </div>
                                <div className="history-card-content">
                                  <div className="history-card-item">
                                    <span className="history-label">Family Name:</span>
                                    <span className="history-value">{familyHeadData.family.family_name}</span>
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Family Code:</span>
                                    <span className="history-value" style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{familyHeadData.family.family_code}</span>
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Address:</span>
                                    <span className="history-value">{familyHeadData.family.address || 'Not set'}</span>
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Phone:</span>
                                    <span className="history-value">{familyHeadData.family.phone || 'Not set'}</span>
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Email:</span>
                                    <span className="history-value">{familyHeadData.family.email || 'Not set'}</span>
                                  </div>
                                </div>
                              </div>
                              
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                              <button
                                onClick={handleEditFamilyInfo}
                                className="profile-update-btn"
                              >
                                Edit Family Information
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Family Members Management */}
                      <div id="family-members-section" className="family-members-management">
                        <div className="profile-details-title" style={{ marginBottom: '1.5rem' }}>Manage Family Members ({familyHeadData.total_members})</div>
                        <div className="history-cards-grid">
                          {familyHeadData.members.map((member) => (
                            <div key={member.id} className="history-card">
                              <div className="history-card-header">
                                <div className="history-card-icon">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                  </svg>
                                </div>
                                <div className="history-card-title">{member.name}</div>
                              </div>
                              <div className="history-card-content">
                                <div className="history-card-item">
                                  <span className="history-label">Email:</span>
                                  <span className="history-value">{member.email}</span>
                                </div>
                                <div className="history-card-item">
                                  <span className="history-label">Role:</span>
                                  <span className="history-value">{member.family_role || 'Not set'}</span>
                                </div>
                                <div className="history-card-item">
                                  <span className="history-label">Relationship:</span>
                                  <span className="history-value">{member.relationship_to_head || 'Not set'}</span>
                                </div>
                                <div className="history-card-item">
                                  <span className="history-label">Phone:</span>
                                  <span className="history-value">{member.phone || 'Not set'}</span>
                                </div>
                                <div className="history-card-item">
                                  <span className="history-label">Gender:</span>
                                  <span className="history-value">{member.gender || 'Not set'}</span>
                                </div>
                                <div className="history-card-item">
                                  <span className="history-label">Birthdate:</span>
                                  <span className="history-value">{member.birthdate ? new Date(member.birthdate).toLocaleDateString() : 'Not set'}</span>
                                </div>
                                {member.is_family_head && (
                                  <div className="history-card-item">
                                    <span className="history-label">Status:</span>
                                    <span className="history-value" style={{ color: '#f59e0b', fontWeight: '600' }}> Family Head</span>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleEditMember(member)}
                                  className="profile-update-btn"
                                  style={{ 
                                    padding: '0.5rem 1rem', 
                                    fontSize: '0.85rem',
                                    background: '#CD8B3E',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    transition: 'all 0.3s ease'
                                  }}
                                  title="Edit Member"
                                >
                                  Edit
                                </button>
                                {!member.is_family_head && (
                                  <button
                                    onClick={() => handleTransferHead(member.id)}
                                    className="profile-update-btn"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#f59e0b' }}
                                    title="Transfer Head Status"
                                  >
                                    👑 Transfer
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Family Sacrament History Management */}
                      <div id="sacrament-history-section" className="family-sacrament-management" style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                          <div className="profile-details-title" style={{ margin: 0 }}>Family Sacrament History</div>
                          <button
                            onClick={handleAddSacrament}
                            className="profile-update-btn"
                            style={{
                              background: '#CD8B3E',
                              color: 'white',
                              border: 'none',
                              borderRadius: '25px',
                              padding: '0.7rem 1.8rem',
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            + Add Sacrament Record
                          </button>
                        </div>
                        
                        {loadingFamilySacraments ? (
                          <div className="history-empty-state">
                            <div className="history-empty-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                              </svg>
                            </div>
                            <h3>Loading Sacrament History...</h3>
                            <p>Please wait while we fetch the records</p>
                          </div>
                        ) : familySacramentHistory.length === 0 ? (
                          <div className="history-empty-state">
                            <div className="history-empty-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                              </svg>
                            </div>
                            <h3>No Sacrament Records</h3>
                            <p>No sacrament records found for family members</p>
                          </div>
                        ) : (
                          <div className="history-cards-grid">
                            {familySacramentHistory.map((sacrament) => (
                              <div key={sacrament.id} className="history-card sacrament-card">
                                <div className="history-card-header">
                                  <div className="history-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                      <path d="M2 17l10 5 10-5"/>
                                      <path d="M2 12l10 5 10-5"/>
                                    </svg>
                                  </div>
                                  <div className="history-card-title">{sacrament.type}</div>
                                </div>
                                <div className="history-card-content">
                                  <div className="history-card-item">
                                    <span className="history-label">Date:</span>
                                    <span className="history-value">{formatDate(sacrament.date)}</span>
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Member:</span>
                                    <span className="history-value">{sacrament.user_name}</span>
                                  </div>
                                  <div className="history-card-item">
                                    <span className="history-label">Parish:</span>
                                    <span className="history-value">{sacrament.parish}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleEditSacrament(sacrament)}
                                    style={{ 
                                      padding: '0.5rem 1rem', 
                                      fontSize: '0.85rem',
                                      background: '#CD8B3E',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease'
                                    }}
                                    title="Edit Sacrament"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSacrament(sacrament.id)}
                                    style={{ 
                                      padding: '0.5rem 1rem', 
                                      fontSize: '0.85rem', 
                                      background: '#dc2626', 
                                      color: 'white', 
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease'
                                    }}
                                    title="Delete Sacrament"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="history-empty-state">
                      <div className="history-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </div>
                      <h3>Failed to Load Data</h3>
                      <p>Unable to load family management data. Please try again.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Edit Modal */}
      {editingMember && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px',
          overflowY: 'auto',
        }}>
          <div style={{
            background: 'white',
            border: '1.5px solid #f2e4ce',
            borderRadius: '1rem',
            boxShadow: '0 8px 24px rgba(60, 47, 30, 0.12)',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
            margin: '20px 0',
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #CD8B3E 0%, #B77B35 100%)', 
              borderRadius: '1rem 1rem 0 0', 
              padding: '1.5rem 2rem', 
              margin: '-2rem -2rem 1.5rem -2rem',
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
              <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '800', 
                margin: '0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                zIndex: 1
              }}>
                Edit Family Member
              </h2>
              <p style={{ 
                fontSize: '0.9rem', 
                margin: '0.5rem 0 0 0', 
                opacity: 0.9,
                position: 'relative',
                zIndex: 1
              }}>
                Update {editingMember.name}'s information
              </p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateMember(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 500, margin: '0 auto', paddingBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={memberEditForm.name}
                  onChange={(e) => setMemberEditForm({...memberEditForm, name: e.target.value})}
                  placeholder="Enter member name"
                  required
                  disabled={loadingFamilyHead}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={memberEditForm.phone}
                  onChange={(e) => setMemberEditForm({...memberEditForm, phone: e.target.value})}
                  placeholder="Enter phone number"
                  disabled={loadingFamilyHead}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Gender</label>
                  <select
                    name="gender"
                    value={memberEditForm.gender}
                    onChange={(e) => setMemberEditForm({...memberEditForm, gender: e.target.value})}
                    disabled={loadingFamilyHead}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', minWidth: 120 }}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Birthdate</label>
                  <input
                    type="date"
                    name="birthdate"
                    value={memberEditForm.birthdate}
                    onChange={(e) => setMemberEditForm({...memberEditForm, birthdate: e.target.value})}
                    disabled={loadingFamilyHead}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Address</label>
                <input
                  type="text"
                  name="address"
                  value={memberEditForm.address}
                  onChange={(e) => setMemberEditForm({...memberEditForm, address: e.target.value})}
                  placeholder="Enter address"
                  disabled={loadingFamilyHead}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Family Role</label>
                  <select
                    name="family_role"
                    value={memberEditForm.family_role}
                    onChange={(e) => setMemberEditForm({...memberEditForm, family_role: e.target.value})}
                    disabled={loadingFamilyHead}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', minWidth: 120 }}
                  >
                    <option value="">Select Role</option>
                    <option value="head">Head</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Relationship to Head</label>
                  <input
                    type="text"
                    name="relationship_to_head"
                    value={memberEditForm.relationship_to_head}
                    onChange={(e) => setMemberEditForm({...memberEditForm, relationship_to_head: e.target.value})}
                    placeholder="e.g., Father, Mother, Son"
                    disabled={loadingFamilyHead}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                <button 
                  type="submit" 
                  className="primary" 
                  style={{ background: '#CD8B3E', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} 
                  disabled={loadingFamilyHead}
                >
                  {loadingFamilyHead ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                      <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #fff', borderTop: '3px solid #CD8B3E', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingMember(null)} 
                  style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} 
                  disabled={loadingFamilyHead}
                >
                  Cancel
                </button>
              </div>
            </form>
            {/* Spinner animation style */}
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>,
        document.body
      )}

      {/* Family Sacrament Management Modal */}
      {showSacramentModal && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px',
          overflowY: 'auto',
        }}>
          <div style={{
            background: 'white',
            border: '1.5px solid #f2e4ce',
            borderRadius: '1rem',
            boxShadow: '0 8px 24px rgba(60, 47, 30, 0.12)',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
            margin: '20px 0',
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #CD8B3E 0%, #B77B35 100%)', 
              borderRadius: '1rem 1rem 0 0', 
              padding: '1.5rem 2rem', 
              margin: '-2rem -2rem 1.5rem -2rem',
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
              <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '800', 
                margin: '0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                zIndex: 1
              }}>
                {editingSacrament ? 'Edit Sacrament Record' : 'Add Sacrament Record'}
              </h2>
              <p style={{ 
                fontSize: '0.9rem', 
                margin: '0.5rem 0 0 0', 
                opacity: 0.9,
                position: 'relative',
                zIndex: 1
              }}>
                {editingSacrament ? 'Update sacrament information' : 'Record a new sacrament for family member'}
              </p>
            </div>
            <form onSubmit={handleSaveSacrament} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {!editingSacrament && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Family Member *</label>
                  <select
                    name="user_id"
                    value={sacramentForm.user_id}
                    onChange={(e) => setSacramentForm({...sacramentForm, user_id: e.target.value})}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="">Select Family Member</option>
                    {familyHeadData?.members?.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Sacrament Type *</label>
                <select
                  name="type"
                  value={sacramentForm.type}
                  onChange={(e) => setSacramentForm({...sacramentForm, type: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">Select Sacrament Type</option>
                  <option value="Baptism">Baptism</option>
                  <option value="Confirmation">Confirmation</option>
                  <option value="Eucharist">Eucharist</option>
                  <option value="Reconciliation">Reconciliation</option>
                  <option value="Anointing of the Sick">Anointing of the Sick</option>
                  <option value="Holy Orders">Holy Orders</option>
                  <option value="Matrimony">Matrimony</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={sacramentForm.date}
                  onChange={(e) => setSacramentForm({...sacramentForm, date: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Parish *</label>
                <input
                  type="text"
                  name="parish"
                  value={sacramentForm.parish}
                  onChange={(e) => setSacramentForm({...sacramentForm, parish: e.target.value})}
                  placeholder="Enter parish name"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexDirection: 'column' }}>
                <button 
                  type="submit" 
                  disabled={submittingSacrament}
                  style={{ background: '#10b981', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  {submittingSacrament ? 'Saving...' : (editingSacrament ? 'Update Record' : 'Add Record')}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowSacramentModal(false)} 
                  style={{ background: '#6b7280', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
            {/* Spinner animation style */}
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>,
        document.body
      )}

      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={hideSuccess}
        title={successTitle}
        message={successMessage}
        duration={4000}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '2px solid #dc2626',
            boxShadow: '0 20px 40px rgba(220, 38, 38, 0.3), 0 0 0 1px rgba(220, 38, 38, 0.1)',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Warning Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              border: '3px solid #dc2626'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ width: '40px', height: '40px' }}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#dc2626',
              margin: '0 0 1rem 0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Delete Sacrament Record
            </h2>

            {/* Message */}
            <p style={{
              fontSize: '1rem',
              color: '#374151',
              margin: '0 0 1.5rem 0',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete this sacrament record? This action cannot be undone.
            </p>

            {/* Sacrament Details */}
            {sacramentToDelete && (
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                margin: '0 0 1.5rem 0',
                textAlign: 'left'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#374151' }}>Type:</strong> {sacramentToDelete.type}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#374151' }}>Date:</strong> {formatDate(sacramentToDelete.date)}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#374151' }}>Member:</strong> {sacramentToDelete.user_name}
                </div>
                <div>
                  <strong style={{ color: '#374151' }}>Parish:</strong> {sacramentToDelete.parish}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSacramentToDelete(null);
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '100px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#4b5563';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#6b7280';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSacrament}
                disabled={submittingSacrament}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: submittingSacrament ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '100px',
                  opacity: submittingSacrament ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!submittingSacrament) {
                    e.target.style.background = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!submittingSacrament) {
                    e.target.style.background = '#dc2626';
                  }
                }}
              >
                {submittingSacrament ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FamilyHeadManagement;
