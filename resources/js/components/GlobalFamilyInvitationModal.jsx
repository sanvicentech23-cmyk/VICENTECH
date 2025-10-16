import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../utils/axios';

const GlobalFamilyInvitationModal = () => {
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle accepting invitation
  const handleAcceptInvite = async (invite) => {
    setLoading(true);
    try {
      const invitationId = invite.invitation_id;
      if (!invitationId) {
        console.error("Failed to find invitation ID in notification payload:", invite);
        alert("Could not process invitation. ID is missing.");
        return;
      }
      await api.post(`/family-invitations/${invitationId}/respond`, { status: 'accepted' });
      setInvitationModalOpen(false);
      setSelectedInvite(null);
      // Refresh the page to update family information
      window.location.reload();
    } catch (err) {
      alert('Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  // Handle rejecting invitation
  const handleRejectInvite = async (invite) => {
    setLoading(true);
    try {
      const invitationId = invite.invitation_id;
      if (!invitationId) {
        console.error("Failed to find invitation ID in notification payload:", invite);
        alert("Could not process invitation. ID is missing.");
        return;
      }
      await api.post(`/family-invitations/${invitationId}/respond`, { status: 'rejected' });
      setInvitationModalOpen(false);
      setSelectedInvite(null);
    } catch (err) {
      alert('Failed to reject invitation');
    } finally {
      setLoading(false);
    }
  };

  // Listen for the global event to open the modal
  useEffect(() => {
    const handleOpenInviteModal = (event) => {
      const { detail: invite } = event;
      setSelectedInvite(invite);
      setInvitationModalOpen(true);
    };

    window.addEventListener('openFamilyInviteModal', handleOpenInviteModal);
    
    return () => {
      window.removeEventListener('openFamilyInviteModal', handleOpenInviteModal);
    };
  }, []);

  // Don't render anything if modal is not open
  if (!invitationModalOpen || !selectedInvite) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className="invite-modal-overlay" onClick={() => setInvitationModalOpen(false)}>
      <div className="invite-modal" style={{padding: '2rem'}} onClick={e => e.stopPropagation()}>
        <button 
          className="invite-modal-close" 
          onClick={() => {
            setInvitationModalOpen(false);
            setSelectedInvite(null);
          }}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-center mb-4 text-[#3F2E1E]">Family Invitation</h2>
        <p className="text-center mb-6 text-[#5C4B38]">
          You have received a <b>{selectedInvite.relationship}</b> invitation from <b>{selectedInvite.inviter_name || selectedInvite.inviter?.name}</b>.
        </p>
        <div className="flex justify-center gap-4">
          <button
            className="family-invite-accept-btn"
            onClick={() => handleAcceptInvite(selectedInvite)}
            disabled={loading}
            style={{
              background: loading ? '#ccc' : '#10b981',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="btn-icon" aria-hidden="true">✔</span> 
            {loading ? 'Processing...' : 'Accept'}
          </button>
          <button
            className="family-invite-reject-btn"
            onClick={() => handleRejectInvite(selectedInvite)}
            disabled={loading}
            style={{
              background: loading ? '#ccc' : '#ef4444',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="btn-icon" aria-hidden="true">✖</span> 
            {loading ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GlobalFamilyInvitationModal;

