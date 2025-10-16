import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessPopup from '../../components/SuccessPopup';

const StaffProfile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const navigate = useNavigate();
  
  // Success popup states
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');

  // Helper function to show success popup
  const showSuccess = (title, message) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setShowSuccessPopup(true);
  };

  const hideSuccess = () => {
    setShowSuccessPopup(false);
  };

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
    } else {
      navigate('/login');
    }
  }, [navigate]);

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

  const handleImageChange = (e) => {
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
      console.log('Response user data:', data.user);
      console.log('New profile_image value:', data.user?.profile_image);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update the user data with the new profile image URL
      const newUserData = {
        ...user,
        ...data.user
      };
      
      console.log('Updating user data:', newUserData);
      console.log('New profile image URL:', newUserData.profile_image);
      setUser(newUserData);
      localStorage.setItem('user', JSON.stringify(newUserData));
      setIsEditing(false);
      
      // Clear the preview and file to force fresh image loading
      setEditForm(prev => ({ 
        ...prev, 
        profileImageFile: null, 
        profileImagePreview: null 
      }));
      
      // Force a small delay to ensure image is updated
      setTimeout(() => {
        console.log('Image should be updated now');
        // Force re-render by updating the user state again
        setUser(prevUser => ({ ...prevUser }));
      }, 100);
      
      // Show success popup
      const hasImageUpdate = editForm.profileImageFile;
      showSuccess(
        'Profile Updated!',
        hasImageUpdate 
          ? 'Your profile and photo have been updated successfully.' 
          : 'Your profile has been updated successfully.'
      );
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getProfileImageUrl = (imageUrl) => {
    console.log('getProfileImageUrl called with:', imageUrl);
    
    if (!imageUrl) {
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=F9E4C8&color=333&size=256`;
      console.log('No image URL, using fallback:', fallbackUrl);
      return fallbackUrl;
    }
    
    if (imageUrl.startsWith('data:')) {
      console.log('Data URL detected:', imageUrl.substring(0, 50) + '...');
      return imageUrl; // For preview images
    }
    
    if (imageUrl.startsWith('http')) {
      console.log('Absolute URL detected:', imageUrl);
      return imageUrl; // Already absolute URL
    }
    
    // Handle Laravel storage paths
    if (imageUrl.startsWith('/storage/')) {
      const fullUrl = `${window.location.origin}${imageUrl}`;
      console.log('Storage path detected, full URL:', fullUrl);
      return fullUrl;
    }
    
    // Handle relative storage paths
    if (imageUrl.startsWith('storage/')) {
      const fullUrl = `${window.location.origin}/${imageUrl}`;
      console.log('Relative storage path detected, full URL:', fullUrl);
      return fullUrl;
    }
    
    // Handle other relative paths
    if (imageUrl.startsWith('/')) {
      const fullUrl = `${window.location.origin}${imageUrl}`;
      console.log('Other relative path detected, full URL:', fullUrl);
      return fullUrl;
    }
    
    // Default fallback
    console.log('Using imageUrl as-is:', imageUrl);
    return imageUrl;
  };

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #DED0B6'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#3F2E1E',
          margin: 0
        }}>
          Staff Profile
        </h1>
        <button
          onClick={handleEditToggle}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isEditing ? '#6b7280' : '#CD8B3E',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Profile Image */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #DED0B6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#C2A68C'
          }}>
            {isEditing && editForm.profileImagePreview ? (
              <img
                src={editForm.profileImagePreview}
                alt="Profile Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : user.profile_image ? (
              <img
                key={user?.profile_image || 'no-image'}
                src={getProfileImageUrl(user.profile_image)}
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  console.error('Profile image failed to load:', e.target.src);
                  // Fallback to avatar if image fails
                  if (!e.target.src.includes('ui-avatars.com')) {
                    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=F9E4C8&color=333&size=256`;
                    console.log('Loading fallback avatar:', fallbackUrl);
                    e.target.src = fallbackUrl;
                  }
                }}
                onLoad={(e) => {
                  console.log('Profile image loaded successfully:', e.target.src);
                }}
              />
            ) : null}
            <svg 
              width="60" 
              height="60" 
              fill="#fff" 
              viewBox="0 0 24 24"
              style={{ display: user.profile_image ? 'none' : 'flex' }}
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          
          {isEditing && (
            <label style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#CD8B3E',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        {/* Profile Details */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #DED0B6',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            ) : (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                fontSize: '16px',
                color: '#374151'
              }}>
                {user.name || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Email
            </label>
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              fontSize: '16px',
              color: '#374151'
            }}>
              {user.email}
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={editForm.phone}
                onChange={handleInputChange}
                pattern="[0-9]{11}"
                maxLength="11"
                inputMode="numeric"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #DED0B6',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            ) : (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                fontSize: '16px',
                color: '#374151'
              }}>
                {user.phone || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Gender
            </label>
            {isEditing ? (
              <select
                name="gender"
                value={editForm.gender}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #DED0B6',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                fontSize: '16px',
                color: '#374151'
              }}>
                {user.gender || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Birth Date
            </label>
            {isEditing ? (
              <input
                type="date"
                name="birthdate"
                value={editForm.birthdate}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #DED0B6',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            ) : (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                fontSize: '16px',
                color: '#374151'
              }}>
                {user.birthdate ? new Date(user.birthdate).toLocaleDateString() : 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Address
            </label>
            {isEditing ? (
              <textarea
                name="address"
                value={editForm.address}
                onChange={handleInputChange}
                rows="3"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #DED0B6',
                  borderRadius: '6px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
            ) : (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                fontSize: '16px',
                color: '#374151',
                minHeight: '60px'
              }}>
                {user.address || 'Not provided'}
              </div>
            )}
          </div>

          {isEditing && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isSaving ? '#9ca3af' : '#CD8B3E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <SuccessPopup
          title={successTitle}
          message={successMessage}
          onClose={hideSuccess}
        />
      )}
    </div>
  );
};

export default StaffProfile;
