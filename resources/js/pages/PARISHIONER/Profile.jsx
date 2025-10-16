import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/profile.css';
import Navbar from '../../components/Navbar';
import SuccessPopup from '../../components/SuccessPopup';
import api from '../../utils/axios';
import ReactDOM from 'react-dom';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [familyForm, setFamilyForm] = useState({ family_name: '', address: '', phone: '', email: '', family_notes: '' });
  const [familyMembers, setFamilyMembers] = useState([]);
  
  const navigate = useNavigate();
  const familySectionRef = useRef(null);
  
  // Success popup states
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  
  // Deactivate account states
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

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
      return dateString; // Return original if formatting fails
    }
  };

  // Sacrament history state
  const [sacramentHistory, setSacramentHistory] = useState([]);
  const [loadingSacraments, setLoadingSacraments] = useState(false);
  const [errorSacraments, setErrorSacraments] = useState('');

  // Donation history for profile card (fetched from API, verified only)
  const [donationHistory, setDonationHistory] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [errorDonations, setErrorDonations] = useState('');

  const fetchDonationHistory = async () => {
    if (!user || !user.email) {
      setDonationHistory([]);
      return;
    }
    setLoadingDonations(true);
    setErrorDonations('');
    try {
      const res = await api.get('/donations');
      const list = Array.isArray(res.data) ? res.data : [];
      const filtered = list.filter(d => d.email === user.email && (d.verified === true || d.verified === 1))
        .map(d => ({
          date: d.created_at ? d.created_at.split('T')[0] : (d.date || ''),
          amount: d.amount,
          purpose: d.category || d.purpose || 'Donation',
          raw: d
        }));
      setDonationHistory(filtered);
    } catch (err) {
      console.error('Failed to load donation history', err);
      setErrorDonations('Failed to load donations');
      setDonationHistory([]);
    } finally {
      setLoadingDonations(false);
    }
  };

  // Fetch sacrament history from API
  const fetchSacramentHistory = async () => {
    if (!user) {
      setSacramentHistory([]);
      return;
    }
    setLoadingSacraments(true);
    setErrorSacraments('');
    try {
      console.log('Profile.jsx: Fetching sacrament history for user:', user.id);
      const res = await api.get('/sacrament-history');
      console.log('Profile.jsx: Sacrament history response:', res.data);
      setSacramentHistory(res.data || []);
    } catch (err) {
      console.error('Profile.jsx: Failed to load sacrament history:', err);
      console.error('Profile.jsx: Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });
      setErrorSacraments(`Failed to load sacrament history: ${err.response?.data?.message || err.message}`);
      setSacramentHistory([]);
    } finally {
      setLoadingSacraments(false);
    }
  };


  // Family Grouping state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingSentInvites, setPendingSentInvites] = useState([]); // invitations sent by me
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [errorFamily, setErrorFamily] = useState('');
  const [errorInvites, setErrorInvites] = useState('');
  const [errorSearch, setErrorSearch] = useState('');
  

  // Search logic (API)
  useEffect(() => {
    let active = true;
    if (searchTerm.length > 0) {
      setLoadingSearch(true);
      setErrorSearch('');
      api.get('/parishioners', { params: { search: searchTerm } })
        .then(res => {
          if (!active) return;
          // Filter to only parishioners (in case backend returns more)
          const filtered = res.data.filter(p =>
            (!p.is_admin && !p.is_staff && !p.is_priest) &&
            p.id !== user?.id && // Prevent searching own account
            !familyMembers.some(f => f.family_member_id === p.id || f.id === p.id) &&
            !pendingSentInvites.some(i => i.invitee_id === p.id && i.status === 'pending')
          );
          setSearchResults(filtered);
        })
        .catch(err => { 
          if (active) {
            setErrorSearch('Search failed');
          }
        })
        .finally(() => { if (active) setLoadingSearch(false); });
    } else {
      setSearchResults([]);
    }
    return () => { active = false; };
  }, [searchTerm, familyMembers, pendingSentInvites, user]);

  // Accept/Reject invitation (API)

  // Send invitation (API)
  const handleSendInvite = async (parishioner, relationship) => {
    try {
      const response = await api.post('/family-invitations', {
        invitee_id: parishioner.id,
        relationship
      });
      setSearchTerm('');
      setSearchResults([]);
      fetchInvitations();
      setShowInviteForm(false);
      showSuccess('Invitation Sent!', `Successfully sent ${relationship} invitation to ${parishioner.name}.`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send invitation';
      alert(errorMessage);
      
      // If the error is about needing to create a family first, show the create family modal
      if (errorMessage.includes('create a family first')) {
        setShowFamilyForm(false);
        setShowFamilyForm(true); // Show the family form to create a family
      }
      
      // If the error is about not being a family head, close the invite form
      if (errorMessage.includes('Only family heads can invite')) {
        setShowInviteForm(false);
      }
    }
  };

  // Add relationship selection for invite
  const [inviteRelationship, setInviteRelationship] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setEditForm({
        name: userData.name || '',
        phone: userData.phone || '',
        gender: userData.gender || '',
        birthdate: userData.birthdate ? userData.birthdate.split('T')[0] : '',
        address: userData.address || '',
        profileImageFile: null,
        profileImagePreview: null
      });
      // Fetch family members and invitations from API
      fetchFamilyMembers();
      fetchInvitations();
      // fetch donation history for profile card
      fetchDonationHistory();
      // fetch sacrament history for profile card
      fetchSacramentHistory();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Refresh donation history when user changes or when staff verifies a donation
  useEffect(() => {
    if (user && user.email) fetchDonationHistory();

    const handler = () => fetchDonationHistory();
    window.addEventListener('donationVerified', handler);
    return () => window.removeEventListener('donationVerified', handler);
  }, [user]);

  // Refresh sacrament history when user changes
  useEffect(() => {
    if (user && user.id) {
      console.log('Profile.jsx: User changed, fetching sacrament history for:', user.id);
      fetchSacramentHistory();
    }

    // Listen for sacrament history updates
    const handler = () => {
      console.log('Profile.jsx: Sacrament history updated event received');
      fetchSacramentHistory();
    };
    window.addEventListener('sacramentHistoryUpdated', handler);
    return () => window.removeEventListener('sacramentHistoryUpdated', handler);
  }, [user]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing && user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
        gender: user.gender || '',
        birthdate: user.birthdate ? user.birthdate.split('T')[0] : '',
        address: user.address || '',
        profileImageFile: null,
        profileImagePreview: null
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For phone field, only allow numbers and limit to 11 digits
    if (name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 11);
      setEditForm(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const csrfResponse = await fetch('/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrf_token;

      // Create FormData object to handle file upload
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('phone', editForm.phone);
      formData.append('gender', editForm.gender);
      formData.append('birthdate', editForm.birthdate);
      formData.append('address', editForm.address);
      
      // Append profile image if it exists
      if (editForm.profileImageFile) {
        console.log('Uploading profile image:', editForm.profileImageFile.name);
        formData.append('profile_image', editForm.profileImageFile);
      }

      console.log('Sending profile update request...');
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData
      });

      const data = await response.json();
      console.log('Profile update response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update the user data with the new profile image URL
      const newUserData = {
        ...user,
        ...data.user,
        family_members: familyMembers
      };
      
      console.log('Updating user data:', newUserData);
      setUser(newUserData);
      localStorage.setItem('user', JSON.stringify(newUserData));
      setIsEditing(false);
      setEditForm(prev => ({ ...prev, profileImageFile: null, profileImagePreview: null }));
      
      // Show success popup
      const hasImageUpdate = editForm.profileImageFile;
      const hasDetailsUpdate = editForm.name !== user?.name || 
                              editForm.phone !== user?.phone || 
                              editForm.gender !== user?.gender || 
                              editForm.birthdate !== (user?.birthdate ? user.birthdate.split('T')[0] : '') || 
                              editForm.address !== user?.address;
      
      if (hasImageUpdate && hasDetailsUpdate) {
        showSuccess('Profile Updated!', 'Your profile photo and personal details have been updated successfully.');
      } else if (hasImageUpdate) {
        showSuccess('Photo Updated!', 'Your profile photo has been updated successfully.');
      } else if (hasDetailsUpdate) {
        showSuccess('Details Updated!', 'Your personal details have been updated successfully.');
      } else {
        showSuccess('Profile Updated!', 'Your profile has been updated successfully.');
      }
    } catch (err) {
      console.error('Profile update failed:', err);
      alert(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
        gender: user.gender || '',
        birthdate: user.birthdate ? user.birthdate.split('T')[0] : '',
        address: user.address || '',
        profileImageFile: null,
        profileImagePreview: null
      });
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const csrfResponse = await fetch('/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrf_token;

      const response = await fetch('/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed with status ' + response.status);
      }

      localStorage.removeItem('user');
      window.dispatchEvent(new Event('userLogout'));
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setDeactivating(true);
    try {
      const csrfResponse = await fetch('/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrf_token;

      console.log('Deactivating user account:', user); // Debug log
      
      const requestBody = {
        status: 'inactive',
        deactivate: true
      };
      console.log('Sending deactivation request:', requestBody); // Debug log

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Deactivation response status:', response.status); // Debug log
      const data = await response.json();
      console.log('Deactivation response data:', data); // Debug log

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to deactivate account');
      }

      // Show success message
      showSuccess('Account Deactivated', 'Your account has been successfully deactivated. You will be logged out.');
      
      // Close modal
      setShowDeactivateModal(false);
      
      // Logout after a short delay
      setTimeout(() => {
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('userLogout'));
        navigate('/');
      }, 2000);
      
    } catch (err) {
      console.error('Deactivate account failed:', err);
      alert(err.message || 'Failed to deactivate account. Please try again.');
    } finally {
      setDeactivating(false);
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Show appropriate form based on user's family status
  const handleAddFamily = () => {
    if (user?.family_id) {
      if (user?.is_family_head) {
        // User is family head, show invite form
        setShowInviteForm(true);
      } else {
        // User is a family member (not head), show message
        alert('Only the family head can invite new members to the family. Please contact your family head if you need to add someone.');
      }
    } else {
      // User doesn't have a family, show create family form
      setShowFamilyForm(true);
    }
  };


  const handleFamilyInput = (e) => {
    const { name, value } = e.target;
    setFamilyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFamilySave = async (e) => {
    e.preventDefault();
    
    try {
      // Create family in database
      const response = await api.post('/families', {
        family_name: familyForm.name || `${user.name}'s Family`,
        address: user.address || '',
        phone: user.phone || '',
        email: user.email || '',
        family_notes: `Family created by ${user.name}`,
        family_status: 'active'
      });

      if (response.data.success) {
        // Update user data with family_id
        const updatedUserData = {
          ...user,
          family_id: response.data.data.id,
          is_family_head: true,
          family_role: 'head'
        };
        
        setUser(updatedUserData);
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        
        // Refresh family members
        fetchFamilyMembers();
        
        setShowFamilyForm(false);
        setFamilyForm({ family_name: '', address: '', phone: '', email: '', family_notes: '' });
        
        alert('Family created successfully! You can now invite other parishioners to join your family.');
      } else {
        alert('Failed to create family: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating family:', error);
      const errorMessage = error.response?.data?.message || error.message;
      alert('Failed to create family: ' + errorMessage);
      
      // If the error is about already being part of a family, close the form
      if (errorMessage.includes('already part of a family')) {
        setShowFamilyForm(false);
      }
    }
  };

  const handleFamilyCancel = () => {
    setShowFamilyForm(false);
    setFamilyForm({ family_name: '', address: '', phone: '', email: '', family_notes: '' });
  };

  const getProfileImageUrl = (imageUrl, memberName) => {
    if (!imageUrl) return `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName || 'User')}&background=F9E4C8&color=333&size=256`;
    if (imageUrl.startsWith('data:')) return imageUrl; // For preview images
    if (imageUrl.startsWith('http')) return imageUrl; // Already absolute URL
    
    // Handle relative paths from Laravel storage
    if (imageUrl.startsWith('storage/')) {
      return `${window.location.origin}/${imageUrl}`;
    }
    
    // Handle other relative paths
    if (imageUrl.startsWith('/')) {
      return `${window.location.origin}${imageUrl}`;
    }
    
    // Default fallback
    return imageUrl;
  };

  // Fetch family members from API (now returns all in family group)
  const fetchFamilyMembers = async () => {
    setLoadingFamily(true);
    setErrorFamily('');
    try {
      const res = await api.get('/family-members');
      setFamilyMembers(res.data);
    } catch (err) {
      setErrorFamily('Failed to load family members');
    } finally {
      setLoadingFamily(false);
    }
  };

  // Fetch invitations from API
  const fetchInvitations = async () => {
    setLoadingInvites(true);
    setErrorInvites('');
    try {
      const res = await api.get('/family-invitations');
      if (user && user.id) {
        setPendingSentInvites(res.data.filter(i => i.inviter_id === user.id && i.status === 'pending'));
      }
    } catch (err) {
      setErrorInvites('Failed to load invitations');
    } finally {
      setLoadingInvites(false);
    }
  };


  useEffect(() => {
    if (user && user.id) {
      fetchFamilyMembers();
      fetchInvitations();
    }
  }, [user]);


  // Scroll to family grouping if triggered by notification
  useEffect(() => {
    const handleFamilyNotification = () => {
      if (familySectionRef.current) {
        familySectionRef.current.scrollIntoView({ behavior: 'smooth' });
        // Optionally highlight
        familySectionRef.current.classList.add('highlight-family-group');
        setTimeout(() => {
          familySectionRef.current.classList.remove('highlight-family-group');
        }, 2000);
      }
    };
    window.addEventListener('goToFamilyGrouping', handleFamilyNotification);
    return () => {
      window.removeEventListener('goToFamilyGrouping', handleFamilyNotification);
    };
  }, []);

  // Helper: Determine if current user is family head
  const isFamilyHead = familyMembers.length > 0 && familyMembers[0].id === user?.id;

  // Remove a family member (head only)
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from your family group?')) return;
    try {
      // Placeholder API call - adjust endpoint as needed
      await api.delete(`/family-members/${memberId}`);
      fetchFamilyMembers();
    } catch (err) {
      alert('Failed to remove member.');
    }
  };

  // Leave the family group (member only)
  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this family group?')) return;
    try {
      await api.post('/family-members/leave');
      fetchFamilyMembers();
      alert('You have left the family group.');
      window.location.reload();
    } catch (err) {
      alert('Failed to leave the group. Please contact your administrator.');
    }
  };

  if (!user) {
    return (
      <div className="profile-bg">
        <div className="profile-card" style={{textAlign: 'center', fontSize: '1.2rem', color: '#CD8B3E'}}>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="profile-bg-container">
        <div className="profile-bg">
          <div className="profile-grid-layout responsive-profile-grid">
            {/* Left Column: Profile Card */}
            <div className="profile-left-col responsive-profile-left-col">
              <div className="profile-main-card">
                <div className="profile-header-gold">
                  <div className="profile-header-img">
                    {isEditing ? (
                      <>
                        <div className="profile-img-upload">
                          <img
                            src={getProfileImageUrl(editForm.profileImagePreview || user?.profile_image)}
                            alt="Profile"
                            className="profile-img-large"
                            onError={(e) => {
                              console.error('Profile image failed to load:', e.target.src);
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=F9E4C8&color=333&size=256`;
                            }}
                          />
                        </div>
                        <label htmlFor="profile-image-input" className="profile-img-edit-btn">
                          Insert Photo
                        </label>
                        <input
                          type="file"
                          id="profile-image-input"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) {
                              console.log('Selected file:', file.name);
                              setEditForm(prev => ({ ...prev, profileImageFile: file }));
                              const reader = new FileReader();
                              reader.onload = ev => {
                                console.log('File preview loaded');
                                setEditForm(prev => ({ ...prev, profileImagePreview: ev.target.result }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </>
                    ) : (
                      <img
                        src={getProfileImageUrl(user?.profile_image)}
                        alt="Profile"
                        className="profile-img-large"
                        onError={(e) => {
                          console.error('Profile image failed to load:', e.target.src);
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=F9E4C8&color=333&size=256`;
                        }}
                      />
                    )}
                  </div>
                  <div className="profile-header-info">
                    <div className="profile-header-name">{user?.name || 'User Name'}</div>
                    <div className="profile-header-role">Parishioner</div>
                    <div className="profile-header-status">
                      <span className="profile-status-badge" style={{background: user?.status === 'Inactive' ? '#f87171' : '#4ade80'}}>
                        {user?.status ? user.status : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="profile-header-actions" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start'}}>
                    <button onClick={handleEditToggle} className="profile-update-btn">Update Profile</button>
                    <button 
                      onClick={() => setShowDeactivateModal(true)} 
                      className="profile-deactivate-btn"
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px',
                        padding: '0.3rem 0.8rem',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#b91c1c';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#dc2626';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      Deactivate Account
                    </button>
                  </div>
                </div>
                <div className="profile-details-section">
                  <div className="profile-details-title">Personal details</div>
                  <div className="profile-details-container">
                    <div className="profile-details-list">
                      <div className="profile-detail-card"><b>Email:</b> {user?.email}</div>
                      {isEditing ? (
                        <>
                          <div className="profile-detail-card"><b>Name:</b> <input className="input-edit" type="text" name="name" value={editForm.name} onChange={handleInputChange} /></div>
                          <div className="profile-detail-card"><b>Phone:</b> <input className="input-edit" type="tel" name="phone" value={editForm.phone} onChange={handleInputChange} pattern="[0-9]{11}" inputMode="numeric" maxLength="11" /></div>
                          <div className="profile-detail-card"><b>Gender:</b> <select className="input-edit" name="gender" value={editForm.gender} onChange={handleInputChange}>
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select></div>
                          <div className="profile-detail-card"><b>Birthdate:</b> <input className="input-edit" type="date" name="birthdate" value={editForm.birthdate} onChange={handleInputChange} /></div>
                          <div className="profile-detail-card"><b>Address:</b> <input className="input-edit" type="text" name="address" value={editForm.address} onChange={handleInputChange} /></div>
                        </>
                      ) : (
                        <>
                          <div className="profile-detail-card"><b>Name:</b> {user?.name}</div>
                          <div className="profile-detail-card"><b>Phone:</b> {user?.phone}</div>
                          <div className="profile-detail-card"><b>Gender:</b> {user?.gender}</div>
                          <div className="profile-detail-card"><b>Birthdate:</b> {user?.birthdate?.split('T')[0]}</div>
                          <div className="profile-detail-card"><b>Address:</b> {user?.address}</div>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                      <button onClick={handleSaveProfile} disabled={isSaving} className="profile-save-btn profile-action-btn">
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={handleCancelEdit} className="profile-cancel-btn profile-action-btn">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Sacrament and Donation History */}
            <div className="profile-right-col responsive-profile-right-col">
              <div className="profile-section">
                <div className="profile-section-header gold">Sacrament History</div>
                <div className="history-modern-container">
                  {loadingSacraments ? (
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
                      <h3>Loading...</h3>
                      <p>Fetching your sacrament records</p>
                    </div>
                  ) : errorSacraments ? (
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
                      <h3>Error Loading Sacraments</h3>
                      <p>{errorSacraments}</p>
                    </div>
                  ) : sacramentHistory.length === 0 ? (
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
                      <h3>No Sacraments Yet</h3>
                      <p>Your sacrament records will appear here</p>
                    </div>
                  ) : (
                    <div className="history-cards-grid">
                      {sacramentHistory.slice(0, 2).map((s, idx) => (
                        <div className="history-card sacrament-card" key={idx}>
                          <div className="history-card-header">
                            <div className="history-card-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                <path d="M2 17l10 5 10-5"/>
                                <path d="M2 12l10 5 10-5"/>
                              </svg>
                            </div>
                            <div className="history-card-title">{s.type}</div>
                          </div>
                          <div className="history-card-content">
                            <div className="history-card-item">
                              <span className="history-label">Date:</span>
                              <span className="history-value">{formatDate(s.date)}</span>
                            </div>
                            <div className="history-card-item">
                              <span className="history-label">Parish:</span>
                              <span className="history-value">{s.parish}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="profile-section-footer">
                  <button className="profile-viewall-btn" onClick={() => navigate('/sacrament-history')}>View All</button>
                </div>
              </div>

              <div className="profile-section">
                <div className="profile-section-header gold">Donation History</div>
                <div className="history-modern-container">
                  {donationHistory.length === 0 ? (
                    <div className="history-empty-state">
                      <div className="history-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                      </div>
                      <h3>No Donations Yet</h3>
                      <p>Your donation records will appear here</p>
                    </div>
                  ) : (
                    <div className="history-cards-grid">
                      {donationHistory.slice(0, 2).map((d, idx) => (
                        <div className="history-card donation-card" key={idx}>
                          <div className="history-card-header">
                            <div className="history-card-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                              </svg>
                            </div>
                            <div className="history-card-title">₱{d.amount}</div>
                          </div>
                          <div className="history-card-content">
                            <div className="history-card-item">
                              <span className="history-label">Date:</span>
                              <span className="history-value">{d.date}</span>
                            </div>
                            <div className="history-card-item">
                              <span className="history-label">Purpose:</span>
                              <span className="history-value">{d.purpose}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="profile-section-footer">
                  <button className="profile-viewall-btn" onClick={() => navigate('/donation-history')}>View All</button>
                </div>
              </div>
            </div>

            {/* Family Grouping Section - now full width below both columns */}
            <div className="family-grouping-fullwidth" ref={familySectionRef}>
              <div className="profile-section family-grouping-section">
                <div className="profile-section-header gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.3px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Family Grouping</span>
                  {user?.is_family_head && (
                    <button 
                      onClick={() => navigate('/family-head-management')}
                      className="profile-update-btn"
                      style={{
                        background: '#F5F5DC',
                        color: 'black',
                        border: 'none',
                        borderRadius: '25px',
                        padding: '0.7rem 1.8rem',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Family Head Management
                    </button>
                  )}
                </div>
                <div className="family-grouping-content one-col-grouping">
                  {loadingFamily ? (
                    <div className="text-center py-2">Loading...</div>
                  ) : errorFamily ? (
                    <div className="text-center py-2 text-red-500">{errorFamily}</div>
                  ) : (
                    <div>
                      <div className="family-members-row">
                        {familyMembers.map((member, idx) => {
                          const imgUrl = getProfileImageUrl(member.profile_image, member.name);
                          const name = member.name;
                          
                          return (
                            <div className="family-member-card" key={idx}>
                              <div className="family-member-avatar">
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={name}
                                    className="family-member-img"
                                    onError={e => {
                                      e.target.onerror = null;
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=F9E4C8&color=333&size=128`;
                                    }}
                                  />
                                ) : (
                                  <div style={{ fontSize: '2.7rem', fontWeight: '800', color: '#CD8B3E' }}>
                                    {name ? name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() : '?'}
                                  </div>
                                )}
                              </div>
                              <div className="family-member-name">{name}</div>
                              {/* Action buttons */}
                              {isFamilyHead && member.id !== user?.id && (
                                <button className="family-remove-btn" onClick={() => handleRemoveMember(member.id)} style={{marginTop: 8, color: '#b91c1c', border: '1px solid #b91c1c', background: 'white', borderRadius: 4, padding: '2px 8px', cursor: 'pointer'}}>Remove</button>
                              )}
                            </div>
                          );
                        })}
                        {/* Add Button */}
                        <div className="netflix-add-btn-row family-add-btn-in-row">
                          <button className="netflix-add-btn" onClick={handleAddFamily}>
                            <span className="netflix-add-plus">+</span>
                          </button>
                          <div className="netflix-add-label">
                            {user?.family_id ? 
                              (user?.is_family_head ? 'Invite Family Member' : 'Contact Family Head') : 
                              'Create Family'
                            }
                          </div>
                        </div>
                      </div>
                      {!isFamilyHead && familyMembers.some(member => member.id === user?.id) && (
                        <div style={{marginTop: '20px', display: 'flex', justifyContent: 'center'}}>
                          <button 
                            className="family-leave-btn" 
                            onClick={handleLeaveGroup} 
                            style={{
                              color: '#b91c1c', 
                              border: '1px solid #b91c1c', 
                              background: 'white', 
                              borderRadius: 4, 
                              padding: '8px 24px', 
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = '#b91c1c';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(185, 28, 28, 0.2)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.color = '#b91c1c';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                            }}
                          >
                            Leave Family Group
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {familyMembers.length === 0 && (
                    <div className="text-center py-2 text-gray-500">No family members yet.</div>
                  )}
                </div>
              </div>
            </div>


            
          </div>
        </div>
        {/* Invite Modal Popup - moved outside profile-bg */}
      </div>
      
      {showFamilyForm && ReactDOM.createPortal(
        <div className="invite-modal-overlay" onClick={handleFamilyCancel}>
          <div className="invite-modal" onClick={e => e.stopPropagation()}>
            <button className="invite-modal-close" onClick={handleFamilyCancel}>&times;</button>
            <div className="family-invite-search-card" style={{boxShadow: 'none', background: 'none', border: 'none', padding: 0}}>
              <div className="family-invite-search-title">Create Your Family</div>
              <form onSubmit={handleFamilySave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Family Name *</label>
                  <input
                    type="text"
                    name="family_name"
                    value={familyForm.family_name}
                    onChange={handleFamilyInput}
                    placeholder="Enter your family name"
                    required
                    className="input-edit"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Family Address</label>
                  <input
                    type="text"
                    name="address"
                    value={familyForm.address}
                    onChange={handleFamilyInput}
                    placeholder="Enter family address"
                    className="input-edit"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={familyForm.phone}
                      onChange={handleFamilyInput}
                      placeholder="Phone number"
                      className="input-edit"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={familyForm.email}
                      onChange={handleFamilyInput}
                      placeholder="Email address"
                      className="input-edit"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Family Notes</label>
                  <textarea
                    name="family_notes"
                    value={familyForm.family_notes}
                    onChange={handleFamilyInput}
                    placeholder="Any additional notes about your family"
                    rows={3}
                    className="input-edit"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexDirection: 'column' }}>
                  <button 
                    type="submit" 
                    className="invite-send-btn"
                    style={{ background: '#10b981', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%', fontSize: '0.875rem' }}
                  >
                    Create Family
                  </button>
                  <button 
                    type="button" 
                    onClick={handleFamilyCancel} 
                    className="profile-cancel-btn family-invite-cancel-btn"
                    style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%', fontSize: '0.875rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Invite Parishioner Modal */}
      {showInviteForm && ReactDOM.createPortal(
        <div className="invite-modal-overlay" onClick={() => setShowInviteForm(false)}>
          <div className="invite-modal" onClick={e => e.stopPropagation()}>
            <button className="invite-modal-close" onClick={() => setShowInviteForm(false)}>&times;</button>
            <div className="family-invite-search-card" style={{boxShadow: 'none', background: 'none', border: 'none', padding: 0}}>
              <div className="family-invite-search-title">Invite a Parishioner</div>
              <div className="family-invite-search-row">
                <input
                  type="text"
                  placeholder="Search parishioner by name or email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-edit family-invite-search-input"
                />
                <button className="profile-cancel-btn family-invite-cancel-btn" onClick={() => setShowInviteForm(false)}>Cancel</button>
              </div>
              {loadingSearch ? (
                <div className="text-center py-2">Searching...</div>
              ) : errorSearch ? (
                <div className="text-center py-2 text-red-500">{errorSearch}</div>
              ) : searchResults.length > 0 ? (
                <div className="search-results-list">
                  {searchResults.map(p => (
                    <div key={p.id} className="search-result-item">
                      <div className="search-result-info">
                        <div className="font-semibold text-[#3F2E1E]">{p.name}</div>
                        <div className="text-xs text-[#5C4B38]">{p.email}</div>
                        <select
                          value={inviteRelationship}
                          onChange={e => setInviteRelationship(e.target.value)}
                          className="invite-relationship-select"
                        >
                          <option value="">Relationship</option>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Child">Child</option>
                        </select>
                      </div>
                      <button
                        className="invite-send-btn"
                        disabled={!inviteRelationship}
                        onClick={() => handleSendInvite(p, inviteRelationship)}
                      >Invite</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500">No results found.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}




      {/* Deactivate Account Confirmation Modal */}
      {showDeactivateModal && ReactDOM.createPortal(
        <div className="invite-modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="invite-modal" onClick={e => e.stopPropagation()}>
            <button className="invite-modal-close" onClick={() => setShowDeactivateModal(false)}>&times;</button>
            <div className="family-invite-search-card" style={{boxShadow: 'none', background: 'none', border: 'none', padding: 0}}>
              <div className="family-invite-search-title" style={{color: '#dc2626'}}>⚠️ Deactivate Account</div>
              <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                <p style={{color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '1rem'}}>
                  Are you sure you want to deactivate your account?
                </p>
                <div style={{background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1rem'}}>
                  <p style={{color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: '500'}}>
                    <strong>Warning:</strong> This action will:
                  </p>
                  <ul style={{color: '#dc2626', fontSize: '14px', margin: '0.5rem 0 0 1rem', padding: 0}}>
                    <li>Deactivate your account immediately</li>
                    <li>Log you out of the system</li>
                    <li>Prevent you from accessing your account</li>
                    <li>Require admin approval to reactivate</li>
                  </ul>
              </div>
                <p style={{color: '#6b7280', fontSize: '14px', margin: 0}}>
                  This action cannot be undone. Please contact support if you need help.
                </p>
                  </div>
              <div style={{display: 'flex', gap: '0.75rem', justifyContent: 'flex-end'}}>
                  <button 
                  onClick={handleDeactivateAccount}
                  disabled={deactivating}
                  style={{
                    background: deactivating ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: deactivating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {deactivating ? 'Deactivating...' : 'Yes, Deactivate Account'}
                  </button>
                  <button 
                  onClick={() => setShowDeactivateModal(false)}
                  disabled={deactivating}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: deactivating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  >
                    Cancel
                  </button>
                </div>
            </div>
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
    </>
  );
};

export default Profile;
