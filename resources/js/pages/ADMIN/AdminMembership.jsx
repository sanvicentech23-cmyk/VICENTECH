import React, { useEffect, useState } from 'react';
import { Pencil, Trash } from 'lucide-react';
import '../../../css/AdminMembership.css';
import { authenticatedRequest } from '../../utils/csrf';

const PARISHIONER_STATUSES = [
  { label: 'Active Member', value: 'active', color: 'green' },
  { label: 'Inactive Member', value: 'inactive', color: 'yellow' },
  { label: 'Visitor', value: 'visitor', color: 'blue' },
  { label: 'New Member', value: 'new_member', color: 'purple' },
];

const FAMILY_ROLES = [
  { label: 'Family Head', value: 'head', color: 'purple' },
  { label: 'Spouse', value: 'spouse', color: 'blue' },
  { label: 'Child', value: 'child', color: 'green' },
  { label: 'Parent', value: 'parent', color: 'orange' },
  { label: 'Sibling', value: 'sibling', color: 'teal' },
  { label: 'Other', value: 'other', color: 'gray' },
  // Invitation system roles
  { label: 'Father', value: 'Father', color: 'purple' },
  { label: 'Mother', value: 'Mother', color: 'pink' },
  { label: 'Sibling', value: 'Sibling', color: 'teal' },
  { label: 'Spouse', value: 'Spouse', color: 'blue' },
  { label: 'Child', value: 'Child', color: 'green' },
];

const FAMILY_STATUSES = [
  { label: 'Active Family', value: 'active', color: 'green' },
  { label: 'Inactive Family', value: 'inactive', color: 'yellow' },
  { label: 'Transferred Family', value: 'transferred', color: 'blue' },
];

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Staff', value: 'staff' },
  { label: 'Priest', value: 'priest' },
  { label: 'Parishioner', value: 'parishioner' },
];

const FILTERS = [
  { label: 'All', value: 'all' },
  ...PARISHIONER_STATUSES,
];

const initialForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  birthdate: '1990-01-01',
  membership_status: 'new_member',
  membership_date: '',
  last_attendance: '',
  baptismal_parish: '',
  confirmation_parish: '',
  ministry_involvements: [],
  membership_notes: '',
  newsletter_subscribed: true,
  volunteer_interest: false,
};

const AdminMembership = () => {
  // Helper functions for parishioner status
  const getParishionerStatusColor = (status) => {
    const statusConfig = PARISHIONER_STATUSES.find(s => s.value === status);
    return statusConfig ? statusConfig.color : 'gray';
  };

  const getParishionerStatusLabel = (status) => {
    const statusConfig = PARISHIONER_STATUSES.find(s => s.value === status);
    return statusConfig ? statusConfig.label : 'Unknown';
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [parishionerStats, setParishionerStats] = useState(null);
  const [autoUpdateLoading, setAutoUpdateLoading] = useState(false);
  
  // Family management state
  const [families, setFamilies] = useState([]);
  const [familyStats, setFamilyStats] = useState(null);
  const [showFamilyManagement, setShowFamilyManagement] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [showEditFamily, setShowEditFamily] = useState(false);
  const [showAddMemberToFamily, setShowAddMemberToFamily] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [familyForm, setFamilyForm] = useState({
    family_name: '',
    address: '',
    phone: '',
    email: '',
    newsletter_subscribed: true,
    volunteer_family: false,
    family_status: 'active',
    family_role: 'head',
    relationship_to_head: '',
    is_family_head: false
  });
  const [familyLoading, setFamilyLoading] = useState(false);
  const [showFamilyDetail, setShowFamilyDetail] = useState(false);
  // ...existing code...
  


  useEffect(() => {
    fetch('http://localhost:8000/sanctum/csrf-cookie', {
      credentials: 'include'
    });
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/all-users')
      .then(res => res.json())
      .then(data => {
        // Users already come with family data loaded from the API
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    fetchParishionerStats();
    fetchFamilies();
    fetchFamilyStats();
  }, []);

  // Update users when families change
  useEffect(() => {
    if (families.length > 0) {
      fetchUsers();
    }
  }, [families]);

  const fetchParishionerStats = async () => {
    try {
      const response = await authenticatedRequest('/api/admin/membership/statistics');
      const data = await response.json();
      if (data.success) {
        setParishionerStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch parishioner statistics:', error);
    }
  };

  const setSampleData = async () => {
    if (!confirm('This will set sample membership dates and attendance data for testing. Continue?')) return;
    
    setAutoUpdateLoading(true);
    try {
      // Get the first 6 users to set diverse sample data
      const userIds = users.slice(0, 6).map(user => user.id);
      
      // Set sample data to demonstrate different statuses
      const sampleData = [
        { id: userIds[0], membership_date: '2024-01-15', last_attendance: '2024-12-01' }, // Active member (recent activity)
        { id: userIds[1], membership_date: '2024-06-01', last_attendance: '2024-10-15' }, // Inactive member (old activity)
        { id: userIds[2], membership_date: '2024-11-01', last_attendance: '2024-12-10' }, // New member (recent join)
        { id: userIds[3], membership_date: '2023-08-01', last_attendance: '2024-11-20' }, // Visitor (occasional)
        { id: userIds[4], membership_date: '2024-03-01', last_attendance: '2024-11-01' }, // Inactive member (no recent activity)
        { id: userIds[5], membership_date: '2024-12-01', last_attendance: null }, // New member (no attendance yet)
      ];
      
      let successCount = 0;
      for (const data of sampleData) {
        if (data.id) {
          try {
            await authenticatedRequest(`/api/users/${data.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                membership_date: data.membership_date,
                last_attendance: data.last_attendance
              }),
            });
            successCount++;
          } catch (error) {
            console.log(`Could not update user ${data.id}:`, error);
          }
        }
      }
      
      setSuccess(`Sample data set for ${successCount} users! Now click "Auto Update Status" to see different status categories.`);
      fetchUsers();
    } catch (error) {
      setError('Failed to set sample data: ' + error.message);
    } finally {
      setAutoUpdateLoading(false);
    }
  };

  const createDiverseStatuses = async () => {
    if (!confirm('This will create diverse status examples by setting specific activity patterns. Continue?')) return;
    
    setAutoUpdateLoading(true);
    try {
      // Get available users
      const userIds = users.slice(0, 8).map(user => user.id);
      
      // Create very specific patterns to trigger different statuses
      const diverseData = [
        // Active Member - recent join + recent activity
        { id: userIds[0], membership_date: '2024-01-01', last_attendance: '2024-12-15' },
        
        // Inactive Member - old join + old activity (more than 60 days)
        { id: userIds[1], membership_date: '2023-06-01', last_attendance: '2024-09-01' },
        
        // New Member - very recent join + recent activity
        { id: userIds[2], membership_date: '2024-11-15', last_attendance: '2024-12-10' },
        
        // Visitor - old join + very old activity
        { id: userIds[3], membership_date: '2023-01-01', last_attendance: '2024-08-01' },
        
        // Another Inactive - regular member but no recent activity
        { id: userIds[4], membership_date: '2023-03-01', last_attendance: '2024-10-15' },
        
        // Another New Member - just joined
        { id: userIds[5], membership_date: '2024-12-01', last_attendance: '2024-12-05' },
        
        // Another Visitor - occasional attendee
        { id: userIds[6], membership_date: '2022-08-01', last_attendance: '2024-09-20' },
        
        // Another Active - regular attendee
        { id: userIds[7], membership_date: '2023-12-01', last_attendance: '2024-12-12' },
      ];
      
      let successCount = 0;
      for (const data of diverseData) {
        if (data.id) {
          try {
            await authenticatedRequest(`/api/users/${data.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                membership_date: data.membership_date,
                last_attendance: data.last_attendance
              }),
            });
            successCount++;
          } catch (error) {
            console.log(`Could not update user ${data.id}:`, error);
          }
        }
      }
      
      setSuccess(`Diverse status data set for ${successCount} users! Now click "Auto Update Status" to see all 4 status categories.`);
      fetchUsers();
    } catch (error) {
      setError('Failed to create diverse statuses: ' + error.message);
    } finally {
      setAutoUpdateLoading(false);
    }
  };

  const triggerAutoUpdate = async () => {
    setAutoUpdateLoading(true);
    try {
      const response = await authenticatedRequest('/api/admin/membership/update-all', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`Successfully updated ${data.updated_count} users' parishioner statuses automatically!`);
        fetchUsers(); // Refresh the user list
        fetchParishionerStats(); // Refresh statistics
      } else {
        setError('Failed to update parishioner statuses: ' + data.message);
      }
    } catch (error) {
      setError('Network error occurred while updating parishioner statuses');
    } finally {
      setAutoUpdateLoading(false);
    }
  };

  // Family management functions
  const fetchFamilies = async () => {
    try {
      const response = await authenticatedRequest('/api/admin/families');
      if (response.ok) {
        const data = await response.json();
        setFamilies(data.data || data);
      } else {
        console.error('Failed to fetch families:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch families:', error);
    }
  };

  const fetchFamilyStats = async () => {
    try {
      const response = await authenticatedRequest('/api/admin/families/statistics');
      if (response.ok) {
        const data = await response.json();
        setFamilyStats(data.data || data);
      } else {
        console.error('Failed to fetch family statistics:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch family statistics:', error);
    }
  };

  const handleAddFamily = async (e) => {
    e.preventDefault();
    setFamilyLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authenticatedRequest('/api/admin/families', {
        method: 'POST',
        body: JSON.stringify(familyForm),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Family created successfully!');
        setShowAddFamily(false);
        setFamilyForm({
          family_name: '',
          address: '',
          phone: '',
          email: '',
          newsletter_subscribed: true,
          volunteer_family: false,
          family_status: 'active'
        });
        fetchFamilies();
        fetchFamilyStats();
      } else {
        setError(data.message || 'Failed to create family');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleAddMemberToFamily = async (e) => {
    e.preventDefault();
    setFamilyLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authenticatedRequest('/api/admin/families/add-member', {
        method: 'POST',
        body: JSON.stringify({
          family_id: selectedFamily.id,
          user_id: selectedUser.id,
          family_role: familyForm.family_role,
          relationship_to_head: familyForm.relationship_to_head,
          is_family_head: familyForm.is_family_head
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Member added to family successfully!');
        setShowAddMemberToFamily(false);
        setSelectedFamily(null);
        setSelectedUser(null);
        fetchUsers();
        fetchFamilies();
        fetchFamilyStats();
      } else {
        setError(data.message || 'Failed to add member to family');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleRemoveMemberFromFamily = async (user) => {
    if (!confirm(`Remove ${user.name} from their family?`)) return;

    setFamilyLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authenticatedRequest('/api/admin/families/remove-member', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Member removed from family successfully!');
        fetchUsers();
        fetchFamilies();
        fetchFamilyStats();
      } else {
        setError(data.message || 'Failed to remove member from family');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleFamilyClick = (family) => {
    setSelectedFamily(family);
    setShowFamilyDetail(true);
  };

  const getFamilyRoleColor = (user) => {
    // Check if user has actual family relationship from invitation system
    if (user.family_relationship) {
      const relationship = user.family_relationship.relationship;
      switch(relationship) {
        case 'Father': return 'purple';
        case 'Mother': return 'pink';
        case 'Sibling': return 'teal';
        case 'Spouse': return 'blue';
        case 'Child': return 'green';
        default: return 'gray';
      }
    }
    
    // Check if user has family_member_relationship
    if (user.family_member_relationship) {
      const relationship = user.family_member_relationship.relationship;
      switch(relationship) {
        case 'Father': return 'purple';
        case 'Mother': return 'pink';
        case 'Sibling': return 'teal';
        case 'Spouse': return 'blue';
        case 'Child': return 'green';
        default: return 'gray';
      }
    }
    
    // Fallback to admin-assigned family_role
    const roleConfig = FAMILY_ROLES.find(r => r.value === user.family_role);
    return roleConfig ? roleConfig.color : 'gray';
  };

  const getFamilyRoleLabel = (user) => {
    // Check if user has actual family relationship from invitation system
    if (user.family_relationship) {
      return user.family_relationship.relationship;
    }
    
    // Check if user has family_member_relationship
    if (user.family_member_relationship) {
      return user.family_member_relationship.relationship;
    }
    
    // Fallback to admin-assigned family_role
    const roleConfig = FAMILY_ROLES.find(r => r.value === user.family_role);
    return roleConfig ? roleConfig.label : 'Unknown';
  };









  // Sacrament/parish record functionality removed per request


  const filteredUsers = users.filter(user => {
    // Only show parishioners (not admin, staff, or priest)
    if (user.is_admin || user.is_staff || user.is_priest) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter === 'all') return true;
    return user.membership_status === statusFilter;
  });

  if (loading) return <div className="loading-users">Loading users...</div>;

  // Responsive styles
  const containerStyle = {
    margin: '1.5rem auto',
    padding: '1.5rem',
    maxWidth: '100%',
    overflowX: 'auto',
    boxSizing: 'border-box',
  };

  const headerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'center',
    width: '100%',
  };

  const filterBarStyle = {
    marginBottom: '1.5rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center',
    background: '#fff',
    border: '1.5px solid #f2e4ce',
    borderRadius: '14px',
    boxShadow: '0 2px 8px rgba(60, 47, 30, 0.07)',
    padding: '0.7rem 1.2rem',
    maxWidth: '900px',
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
    boxSizing: 'border-box',
  };

  const tableWrapperStyle = {
    background: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #f2e4ce',
    overflowX: 'auto',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    width: '100%',
    boxSizing: 'border-box',
    marginTop: '1rem',
  };

  const tableStyle = {
    width: '100%',
    minWidth: '600px',
    borderCollapse: 'collapse',
    background: '#fff',
    fontSize: '1rem',
  };

  const modalStyle = {
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
    zIndex: 1000,
    padding: '20px',
  };

  const modalContentStyle = {
    background: 'white',
    border: '1px solid #f2e4ce',
    borderRadius: '1rem',
    boxShadow: '0 2px 8px rgba(60, 47, 30, 0.07)',
    padding: '1.5rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // For phone field, only allow numbers and limit to 11 digits
    if (name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 11);
      setForm(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle add member submit
  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEditLoading(true);
    
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      gender: form.Sex,
      birthdate: form.birthdate,
      address: form.address,
      password: form.password,
      password_confirmation: form.password_confirmation,
      is_admin: form.role === 'admin',
      is_staff: form.role === 'staff',
      is_priest: form.role === 'priest'
    };

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          setError(Object.values(data.errors).map(arr => arr.join(' ')).join('\n'));
        } else {
          setError(data.message || 'Failed to add member.');
        }
      } else {
        setSuccess('Member added successfully!');
        setShowEdit(false);
        setForm(initialForm);
        fetchUsers();
      }
    } catch (err) {
      setError('Network error.');
    }
    setEditLoading(false);
  };

  // Handle edit user submit
  const handleEditUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEditLoading(true);
    
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      gender: form.Sex,
      birthdate: form.birthdate,
      address: form.address,
      is_admin: form.role === 'admin',
      is_staff: form.role === 'staff',
      is_priest: form.role === 'priest'
    };

    // Only include password if it's provided
    if (form.password) {
      payload.password = form.password;
      payload.password_confirmation = form.password_confirmation;
    }

    try {
      const res = await authenticatedRequest(`/api/users/${editUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          setError(Object.values(data.errors).map(arr => arr.join(' ')).join('\n'));
        } else {
          setError(data.message || 'Failed to update user.');
        }
      } else {
        setSuccess('User updated successfully!');
        setShowEdit(false);
        setEditUser(null);
        fetchUsers();
      }
    } catch (err) {
      setError('Network error.');
    }
    setEditLoading(false);
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    setError('');
    setSuccess('');
    setDeleteLoading(true);
    
    try {
      const res = await authenticatedRequest(`/api/users/${deleteUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to delete user.');
      } else {
        setSuccess('User deleted successfully!');
        setShowDelete(false);
        setDeleteUser(null);
        fetchUsers();
      }
    } catch (err) {
      setError('Network error.');
    }
    setDeleteLoading(false);
  };

  // Open edit modal
  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      password: '',
      password_confirmation: '',
      Sex: user.Sex || user.gender || 'male',
      address: user.address || '',
      phone: user.phone || '',
      birthdate: user.birthdate || '1990-01-01',
      role: user.is_admin ? 'admin' : user.is_staff ? 'staff' : user.is_priest ? 'priest' : 'parishioner',
    });
    setShowEdit(true);
    setError('');
    setSuccess('');
  };

  // Open delete modal
  const openDelete = (user) => {
    setDeleteUser(user);
    setShowDelete(true);
    setError('');
    setSuccess('');
  };

  return (
    <div className="admin-membership-container">
      <style>{`
        /* Mobile-first responsive design */
        @media (max-width: 640px) {
          .membership-container {
            margin: 0 auto;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            max-width: calc(100% - 1rem);
          }
          .membership-card {
            margin: 0 auto;
            width: 100%;
            max-width: 100%;
            padding: 0.75rem !important;
          }
          .membership-table {
            margin: 0 auto;
            width: 100%;
            max-width: 100%;
          }
          .membership-card + .membership-card {
            margin-top: 1rem;
          }
          .membership-card h2,
          .membership-card h3 {
            font-size: 1rem !important;
            line-height: 1.4;
          }
          .filter-bar {
            flex-direction: column !important;
            gap: 0.75rem !important;
            align-items: stretch !important;
          }
          .filter-bar > * {
            width: 100% !important;
            max-width: none !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          .stats-item {
            padding: 0.5rem !important;
          }
          .stats-number {
            font-size: 1.25rem !important;
          }
          .stats-label {
            font-size: 0.75rem !important;
          }
        }
        @media (max-width: 768px) {
          .membership-container {
            margin: 0 auto;
            padding-left: 0.75rem;
            padding-right: 0.75rem;
            max-width: calc(100% - 1.5rem);
          }
          .membership-card {
            margin: 0 auto;
            width: 100%;
            max-width: 100%;
          }
          .membership-table {
            margin: 0 auto;
            width: 100%;
            max-width: 100%;
          }
          .stats-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.75rem !important;
          }
        }
        @media (max-width: 480px) {
          .membership-container {
            padding-left: 0.25rem;
            padding-right: 0.25rem;
            max-width: calc(100% - 0.5rem);
          }
          .membership-card {
            padding: 0.5rem !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.25rem !important;
          }
          .stats-item {
            padding: 0.25rem !important;
          }
          .stats-number {
            font-size: 1rem !important;
          }
          .stats-label {
            font-size: 0.625rem !important;
          }
        }
        
        /* Spinner animation for loading states */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {error && <div className="error-msg" style={{ whiteSpace: 'pre-line' }}>{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="membership-header">
        <h1 className="membership-title">Parishioner Membership Management</h1>
        <div className="membership-actions">
          <div className="membership-filters">
            <h3 className="filter-title">Filter by Status</h3>
            <div className="filter-buttons">
              {FILTERS.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`filter-btn ${statusFilter === filter.value ? 'active' : ''}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={triggerAutoUpdate}
            disabled={autoUpdateLoading}
            className="membership-btn secondary"
          >
            {autoUpdateLoading ? '⏳ Updating...' : '🔄 Auto Update Status'}
          </button>
          <button
            onClick={setSampleData}
            className="membership-btn warning"
            style={{ background: '#f59e0b', color: 'white' }}
          >
            🧪 Set Sample Data
          </button>
          <button
            onClick={createDiverseStatuses}
            className="membership-btn info"
            style={{ background: '#3b82f6', color: 'white' }}
          >
            🎯 Create All Status Types
          </button>
          <button
            onClick={() => setShowFamilyManagement(!showFamilyManagement)}
            className="membership-btn success"
          >
            {showFamilyManagement ? 'Hide' : 'Show'} Family Management
          </button>
          {/* Sacrament Management removed */}
          {/* Parish Records removed */}
          <button
            onClick={() => setShowEdit(true)}
            className="membership-btn primary"
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Parishioner Statistics Panel */}
      {parishionerStats && (
        <div className="membership-stats">
            <div className="stat-card">
              <div className="stat-number">{parishionerStats.active}</div>
              <div className="stat-label">🟢 Active Members</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{parishionerStats.inactive}</div>
              <div className="stat-label">🟡 Inactive Members</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{parishionerStats.visitor}</div>
              <div className="stat-label">🔵 Visitors</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{parishionerStats.new_member}</div>
              <div className="stat-label">🟣 New Members</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{parishionerStats.total}</div>
              <div className="stat-label">👥 Total Parishioners</div>
            </div>
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            background: '#fff3cd', 
            borderRadius: '8px', 
            border: '1px solid #ffeaa7',
            fontSize: '0.75rem',
            color: '#856404'
          }}>
            <strong>🔍 Status Debug Info:</strong> Status assignment depends on membership_date, last_attendance, donations, events, and prayer requests. 
            <br/><strong>Current Status Distribution:</strong> 
            Active: {parishionerStats?.active || 0} | 
            Inactive: {parishionerStats?.inactive || 0} | 
            Visitor: {parishionerStats?.visitor || 0} | 
            New Member: {parishionerStats?.new_member || 0}
            <br/><strong>To see all categories:</strong> Click "🧪 Set Sample Data" then "🔄 Auto Update Status"
          </div>
        </div>
      )}

      {/* Family Management Section */}
      <div className="membership-card" style={{ 
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
        borderRadius: '12px', 
        padding: '1rem', 
        margin: '1rem 0', 
        border: '1px solid #bae6fd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '700', 
            color: '#0c4a6e', 
            margin: 0
          }}>
            👨‍👩‍👧‍👦 Family Management System
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowFamilyManagement(!showFamilyManagement)}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                border: '1px solid #0ea5e9', 
                background: showFamilyManagement ? '#0ea5e9' : '#fff', 
                color: showFamilyManagement ? '#fff' : '#0ea5e9',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {showFamilyManagement ? 'Hide Families' : 'Show Families'}
            </button>
          </div>
        </div>

        {familyStats && (
          <div className="stats-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '0.75rem',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            <div className="stats-item" style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div className="stats-number" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0ea5e9' }}>{familyStats.total_families}</div>
              <div className="stats-label" style={{ fontSize: '0.75rem', color: '#6c757d' }}>👨‍👩‍👧‍👦 Total Families</div>
            </div>
            <div className="stats-item" style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div className="stats-number" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>{familyStats.active_families}</div>
              <div className="stats-label" style={{ fontSize: '0.75rem', color: '#6c757d' }}>✅ Active Families</div>
            </div>
            <div className="stats-item" style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div className="stats-number" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>{familyStats.total_members}</div>
              <div className="stats-label" style={{ fontSize: '0.75rem', color: '#6c757d' }}>👥 Family Members</div>
            </div>
            <div className="stats-item" style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div className="stats-number" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#8b5cf6' }}>{familyStats.unassigned_members}</div>
              <div className="stats-label" style={{ fontSize: '0.75rem', color: '#6c757d' }}>❓ Unassigned</div>
            </div>
            <div className="stats-item" style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div className="stats-number" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ef4444' }}>{familyStats.average_family_size}</div>
              <div className="stats-label" style={{ fontSize: '0.75rem', color: '#6c757d' }}>📊 Avg Size</div>
            </div>
          </div>
        )}

        {showFamilyManagement && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: '#f0f9ff', 
              borderRadius: '8px', 
              border: '1px solid #bae6fd',
              fontSize: '0.75rem',
              color: '#0c4a6e'
            }}>
              <strong>🏠 Family Management Features:</strong> Group parishioners into families, manage family profiles, track family relationships, and monitor family engagement. Each family has a unique code and can have multiple members with different roles (head, spouse, child, etc.).
            </div>
            
            {/* Family List */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem' 
              }}>
                <h4 style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  color: '#0c4a6e', 
                  margin: 0 
                }}>
                  👨‍👩‍👧‍👦 Family List ({families.length})
                </h4>
                <button
                  onClick={() => setShowAddFamily(true)}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '6px', 
                    border: '1px solid #0ea5e9', 
                    background: '#0ea5e9', 
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  + Add Family
                </button>
              </div>
              
              {families.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👨‍👩‍👧‍👦</div>
                  <div>No families found. Create your first family!</div>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {families.map((family) => (
                    <div
                      key={family.id}
                      onClick={() => handleFamilyClick(family)}
                      style={{ 
                        background: '#fff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = '#0ea5e9';
                        e.target.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.15)';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = '#bae6fd';
                        e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '0.75rem'
                      }}>
                        <div>
                          <h5 style={{ 
                            fontSize: '1rem', 
                            fontWeight: '600', 
                            color: '#0c4a6e', 
                            margin: '0 0 0.25rem 0' 
                          }}>
                            {family.family_name || 'Unnamed Family'}
                          </h5>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#6b7280',
                            fontFamily: 'monospace',
                            background: '#f1f5f9',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {family.family_code}
                          </div>
                        </div>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          backgroundColor: family.family_status === 'active' ? '#10b981' : 
                                         family.family_status === 'inactive' ? '#f59e0b' : '#3b82f6',
                          color: 'white'
                        }}>
                          {family.family_status === 'active' ? 'Active' : 
                           family.family_status === 'inactive' ? 'Inactive' : 'Transferred'}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        <div>
                          <strong>Members:</strong> {family.members?.length || 0}
                        </div>
                        <div>
                          <strong>Address:</strong> {family.address ? 'Set' : 'Not set'}
                        </div>
                        <div>
                          <strong>Phone:</strong> {family.phone || 'Not set'}
                        </div>
                        <div>
                          <strong>Email:</strong> {family.email || 'Not set'}
                        </div>
                      </div>
                      
                      {family.members && family.members.length > 0 && (
                        <div style={{ 
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #e5e7eb'
                        }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '600', 
                            color: '#0c4a6e',
                            marginBottom: '0.5rem'
                          }}>
                            Family Members:
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '0.25rem' 
                          }}>
                            {family.members.slice(0, 3).map((member) => (
                              <span
                                key={member.id}
                                style={{ 
                                  padding: '0.125rem 0.375rem', 
                                  borderRadius: '8px', 
                                  fontSize: '0.625rem', 
                                  fontWeight: '500',
                                  backgroundColor: member.is_family_head ? '#8b5cf6' : '#e5e7eb',
                                  color: member.is_family_head ? 'white' : '#374151'
                                }}
                              >
                                {member.name} {member.is_family_head ? '👑' : ''}
                              </span>
                            ))}
                            {family.members.length > 3 && (
                              <span style={{ 
                                fontSize: '0.625rem', 
                                color: '#6b7280',
                                fontStyle: 'italic'
                              }}>
                                +{family.members.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>



      <div className="user-table-wrapper membership-card membership-table" style={{...tableWrapperStyle, margin: '1rem 0' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="user-table responsive-table" style={{ ...tableStyle, fontSize: '0.875rem', minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#f9f6f2' }}>
                <th style={{ padding: '0.5rem', minWidth: 40 }}>#</th>
                <th style={{ padding: '0.5rem', minWidth: 120 }}>Name</th>
                <th style={{ padding: '0.5rem', minWidth: 140 }}>Email</th>
                <th style={{ padding: '0.5rem', minWidth: 80 }}>Sex</th>
                <th style={{ padding: '0.5rem', minWidth: 120 }}>Address</th>
                <th style={{ padding: '0.5rem', minWidth: 80 }}>Role</th>
                <th style={{ padding: '0.5rem', minWidth: 120 }}>Parishioner Status</th>
                <th style={{ padding: '0.5rem', minWidth: 100 }}>Family</th>
                <th style={{ padding: '0.5rem', minWidth: 100 }}>Family Role</th>
                <th style={{ padding: '0.5rem', minWidth: 100 }}>Last Attendance</th>
                <th style={{ padding: '0.5rem', minWidth: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '1rem' }}>No parishioners found.</td>
                </tr>
              )}
              {filteredUsers.map((user, idx) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f2e4ce' }}>
                  <td style={{ padding: '0.5rem' }}>{idx + 1}</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-word' }}>{user.name}</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-word' }}>{user.email}</td>
                  <td style={{ padding: '0.5rem' }}>{user.Sex || user.gender}</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-word' }}>{user.address}</td>
                  <td style={{ padding: '0.5rem' }}>{user.is_admin ? 'Admin' : user.is_staff ? 'Staff' : user.is_priest ? 'Priest' : 'Parishioner'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span 
                      style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        backgroundColor: getParishionerStatusColor(user.membership_status || 'new_member'),
                        color: 'white'
                      }}
                    >
                      {getParishionerStatusLabel(user.membership_status || 'new_member')}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {(user.family_id || user.family_relationship || user.family_member_relationship) ? (
                      <span style={{ fontSize: '0.75rem', color: '#0ea5e9' }}>
                        {user.family ? (user.family.family_name || user.family.family_code || `Family ID: ${user.family_id}`) : `Family ID: ${user.family_id}`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {(user.family_role || user.family_relationship || user.family_member_relationship) ? (
                      <span 
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          backgroundColor: getFamilyRoleColor(user),
                          color: 'white'
                        }}
                      >
                        {getFamilyRoleLabel(user)}
                        {user.is_family_head && ' 👑'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>No records</span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {user.last_attendance ? new Date(user.last_attendance).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openEdit(user)}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        style={{ minWidth: 32, minHeight: 32, borderRadius: 6, background: '#f2f2f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Edit User"
                      >
                        <Pencil size={18} />
                      </button>
                      {(user.family_id || user.family_relationship || user.family_member_relationship) ? (
                        <button
                          onClick={() => handleRemoveMemberFromFamily(user)}
                          className="text-orange-600 hover:text-orange-800 cursor-pointer"
                          style={{ minWidth: 32, minHeight: 32, borderRadius: 6, background: '#f2f2f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove from Family"
                        >
                          👨‍👩‍👧‍👦
                        </button>
                      ) : (
                        <button
                          onClick={() => { setSelectedUser(user); setShowAddMemberToFamily(true); }}
                          className="text-green-600 hover:text-green-800 cursor-pointer"
                          style={{ minWidth: 32, minHeight: 32, borderRadius: 6, background: '#f2f2f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Add to Family"
                        >
                          ➕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>



      {/* Add Member Modal */}
      {showEdit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(44, 44, 44, 0.25)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(60,40,20,0.18)',
            padding: '1.5rem',
            minWidth: 800,
            maxWidth: 900,
            width: '90vw',
            maxHeight: '90vh',
            overflow: 'visible',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}>
            <div style={{ 
              background: '#CD8B3E', 
              borderRadius: '12px 12px 0 0', 
              padding: '1.5rem 2rem', 
              margin: '-1.5rem -1.5rem 0 -1.5rem',
              color: 'white',
              textAlign: 'center',
              position: 'relative'
            }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                margin: '0 0 0.5rem 0',
                color: 'white'
              }}>
                {editUser ? 'Edit Member' : 'Add New Member'}
              </h2>
              <p style={{ 
                fontSize: '0.875rem', 
                margin: '0', 
                color: 'white',
                opacity: 0.9
              }}>
                {editUser ? 'Update the member information' : 'Create a new parishioner membership record'}
              </p>
              <button 
                onClick={() => {
                  setShowEdit(false);
                  setEditUser(null);
                  setForm(initialForm);
                }} 
                title="Close"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: 'white',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ 
              background: '#FFF6E5', 
              borderRadius: '0 0 12px 12px', 
              padding: '1.5rem', 
              marginBottom: 0, 
              width: '100%'
            }}>
              <form onSubmit={editUser ? handleEditUser : handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={form.name} 
                      onChange={handleFormChange} 
                      placeholder="Full Name" 
                      required 
                      disabled={editLoading}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: 8, 
                        border: '1.5px solid #e2cfa3', 
                        fontSize: 14, 
                        color: '#3F2E1E', 
                        background: '#fff',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Email *</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={form.email} 
                      onChange={handleFormChange} 
                      placeholder="Email Address" 
                      required 
                      disabled={editLoading}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: 8, 
                        border: '1.5px solid #e2cfa3', 
                        fontSize: 14, 
                        color: '#3F2E1E', 
                        background: '#fff',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Username</label>
                    <input 
                      type="text" 
                      name="username" 
                      value={form.username} 
                      onChange={handleFormChange} 
                      placeholder="Username" 
                      disabled={editLoading}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: 8, 
                        border: '1.5px solid #e2cfa3', 
                        fontSize: 14, 
                        color: '#3F2E1E', 
                        background: '#fff',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Phone</label>
                    <input 
                      type="tel" 
                      name="phone" 
                      value={form.phone} 
                      onChange={handleFormChange} 
                      pattern="[0-9]{11}"
                      maxLength="11"
                      inputMode="numeric"
                      placeholder="Phone Number" 
                      disabled={editLoading}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: 8, 
                        border: '1.5px solid #e2cfa3', 
                        fontSize: 14, 
                        color: '#3F2E1E', 
                        background: '#fff',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Sex *</label>
                    <select 
                      name="Sex" 
                      value={form.Sex} 
                      onChange={handleFormChange} 
                      required 
                      disabled={editLoading}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: 8, 
                        border: '1.5px solid #e2cfa3', 
                        fontSize: 14, 
                        color: '#3F2E1E', 
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Role *</label>
                    <select 
                      name="role" 
                      value={form.role} 
                      onChange={handleFormChange} 
                      required 
                      disabled={editLoading}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: 8, 
                        border: '1.5px solid #e2cfa3', 
                        fontSize: 14, 
                        color: '#3F2E1E', 
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select Role</option>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Address</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={form.address} 
                    onChange={handleFormChange} 
                    placeholder="Address" 
                    disabled={editLoading}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      borderRadius: 8, 
                      border: '1.5px solid #e2cfa3', 
                      fontSize: 14, 
                      color: '#3F2E1E', 
                      background: '#fff',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Birthdate *</label>
                  <input 
                    type="date" 
                    name="birthdate" 
                    value={form.birthdate} 
                    onChange={handleFormChange} 
                    required 
                    disabled={editLoading}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      borderRadius: 8, 
                      border: '1.5px solid #e2cfa3', 
                      fontSize: 14, 
                      color: '#3F2E1E', 
                      background: '#fff',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>
                      {editUser ? 'New Password' : 'Password *'}
                    </label>
                    <input 
                      type="password" 
                      name="password" 
                      value={form.password} 
                      onChange={handleFormChange} 
                      placeholder={editUser ? "Leave blank to keep current" : "Enter password"} 
                      required={!editUser}
                      disabled={editLoading}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: 8, 
                        border: '1.5px solid #e2cfa3', 
                        fontSize: 14, 
                        color: '#3F2E1E', 
                        background: '#fff',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>
                      {editUser ? 'Confirm Password' : 'Confirm Password *'}
                    </label>
                    <input 
                      type="password" 
                      name="password_confirmation" 
                      value={form.password_confirmation} 
                      onChange={handleFormChange} 
                      placeholder={editUser ? "Confirm new password" : "Confirm password"} 
                      required={!editUser}
                      disabled={editLoading}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: 8, 
                        border: '1.5px solid #e2cfa3', 
                        fontSize: 14, 
                        color: '#3F2E1E', 
                        background: '#fff',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                  <button 
                    type="submit" 
                    disabled={editLoading}
                    style={{ 
                      background: '#CD8B3E', 
                      color: 'white', 
                      padding: '0.75rem 2rem', 
                      borderRadius: 8, 
                      border: 'none', 
                      fontWeight: 600, 
                      fontSize: '1rem',
                      cursor: editLoading ? 'not-allowed' : 'pointer',
                      opacity: editLoading ? 0.7 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {editLoading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #fff', borderTop: '3px solid #CD8B3E', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                        {editUser ? 'Updating...' : 'Adding...'}
                      </span>
                    ) : (editUser ? 'Update User' : 'Add Member')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEdit(false);
                      setEditUser(null);
                      setForm(initialForm);
                    }} 
                    disabled={editLoading}
                    style={{ 
                      background: '#f8f9fa', 
                      color: '#6c757d', 
                      padding: '0.75rem 2rem', 
                      borderRadius: 8, 
                      border: '1px solid #dee2e6', 
                      fontWeight: 600, 
                      fontSize: '1rem',
                      cursor: editLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              
              {error && (
                <div style={{ 
                  color: '#dc3545', 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  background: '#f8d7da', 
                  border: '1px solid #f5c6cb', 
                  borderRadius: 8,
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ 
                  color: '#155724', 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  background: '#d4edda', 
                  border: '1px solid #c3e6cb', 
                  borderRadius: 8,
                  fontSize: '0.875rem'
                }}>
                  {success}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h2 className="text-3xl font-extrabold text-[#3F2E1E] mb-2" style={{ fontSize: '1.5rem', marginBottom: '0.8rem' }}>Delete User</h2>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>⚠️</div>
              <p style={{ fontSize: '1rem', color: '#3F2E1E', marginBottom: '0.4rem' }}>
                Are you sure you want to delete <strong>{deleteUser?.name}</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.8rem' }}>
                Email: {deleteUser?.email}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#DC2626', fontWeight: 600 }}>
                This action cannot be undone!
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={handleDeleteUser} 
                className="primary" 
                style={{ background: '#DC2626', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} 
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #fff', borderTop: '3px solid #DC2626', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                    Deleting...
                  </span>
                ) : 'Delete User'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowDelete(false)} 
                style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} 
                disabled={deleteLoading}
              >
                Cancel
              </button>
            </div>
            {error && <div className="error-msg" style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
          </div>
        </div>
      )}

      {/* Add Family Modal */}
      {showAddFamily && (
        <div style={{...modalStyle, padding: '1rem' }}>
          <div style={{...modalContentStyle, padding: '1rem', maxWidth: '100%', width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.8rem', fontWeight: '700', color: '#3F2E1E' }}>Add New Family</h2>
            <form onSubmit={handleAddFamily} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '100%', margin: '0 auto' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Family Name *</label>
                <input 
                  type="text" 
                  name="family_name" 
                  value={familyForm.family_name} 
                  onChange={(e) => setFamilyForm({...familyForm, family_name: e.target.value})} 
                  placeholder="Enter family name" 
                  required 
                  disabled={familyLoading}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: 8, 
                    border: '1.5px solid #e2cfa3', 
                    fontSize: 14, 
                    color: '#3F2E1E', 
                    background: '#fff',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Address</label>
                <input 
                  type="text" 
                  name="address" 
                  value={familyForm.address} 
                  onChange={(e) => setFamilyForm({...familyForm, address: e.target.value})} 
                  placeholder="Enter family address" 
                  disabled={familyLoading}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: 8, 
                    border: '1.5px solid #e2cfa3', 
                    fontSize: 14, 
                    color: '#3F2E1E', 
                    background: '#fff',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Phone</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={familyForm.phone} 
                    onChange={(e) => setFamilyForm({...familyForm, phone: e.target.value})} 
                    placeholder="Phone number" 
                    disabled={familyLoading}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      borderRadius: 8, 
                      border: '1.5px solid #e2cfa3', 
                      fontSize: 14, 
                      color: '#3F2E1E', 
                      background: '#fff',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={familyForm.email} 
                    onChange={(e) => setFamilyForm({...familyForm, email: e.target.value})} 
                    placeholder="Email address" 
                    disabled={familyLoading}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      borderRadius: 8, 
                      border: '1.5px solid #e2cfa3', 
                      fontSize: 14, 
                      color: '#3F2E1E', 
                      background: '#fff',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Family Anniversary</label>
                <input 
                  type="date" 
                  name="family_anniversary" 
                  value={familyForm.family_anniversary} 
                  onChange={(e) => setFamilyForm({...familyForm, family_anniversary: e.target.value})} 
                  disabled={familyLoading}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: 8, 
                    border: '1.5px solid #e2cfa3', 
                    fontSize: 14, 
                    color: '#3F2E1E', 
                    background: '#fff',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#3F2E1E', marginBottom: '0.5rem' }}>Family Notes</label>
                <textarea 
                  name="family_notes" 
                  value={familyForm.family_notes} 
                  onChange={(e) => setFamilyForm({...familyForm, family_notes: e.target.value})} 
                  placeholder="Enter any additional notes about the family" 
                  rows={3}
                  disabled={familyLoading}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: 8, 
                    border: '1.5px solid #e2cfa3', 
                    fontSize: 14, 
                    color: '#3F2E1E', 
                    background: '#fff',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexDirection: 'column' }}>
                <button type="submit" style={{ background: '#10b981', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%', fontSize: '0.875rem' }} disabled={familyLoading}>
                  {familyLoading ? 'Creating...' : 'Create Family'}
                </button>
                <button type="button" onClick={() => setShowAddFamily(false)} style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%', fontSize: '0.875rem' }} disabled={familyLoading}>Cancel</button>
              </div>
            </form>
            {error && <div className="error-msg" style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
          </div>
        </div>
      )}

      {/* Add Member to Family Modal */}
      {showAddMemberToFamily && selectedUser && (
        <div style={{...modalStyle, padding: '1rem' }}>
          <div style={{...modalContentStyle, padding: '1rem', maxWidth: '100%', width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.8rem', fontWeight: '700', color: '#3F2E1E' }}>Add {selectedUser.name} to Family</h2>
            <form onSubmit={handleAddMemberToFamily} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '100%', margin: '0 auto' }}>
              <label style={{ fontWeight: 600, color: '#3F2E1E' }}>Select Family:</label>
              <select 
                value={selectedFamily?.id || ''} 
                onChange={(e) => {
                  const family = families.find(f => f.id === parseInt(e.target.value));
                  setSelectedFamily(family);
                }} 
                required 
                disabled={familyLoading}
                style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff' }}
              >
                <option value="">Select Family</option>
                {families.map(family => (
                  <option key={family.id} value={family.id}>
                    {family.family_name} ({family.family_code})
                  </option>
                ))}
              </select>
              
              <label style={{ fontWeight: 600, color: '#3F2E1E' }}>Family Role:</label>
              <select 
                name="family_role" 
                value={familyForm.family_role || ''} 
                onChange={(e) => setFamilyForm({...familyForm, family_role: e.target.value})} 
                required 
                disabled={familyLoading}
                style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff' }}
              >
                <option value="">Select Role</option>
                {FAMILY_ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              
              <input 
                type="text" 
                name="relationship_to_head" 
                value={familyForm.relationship_to_head || ''} 
                onChange={(e) => setFamilyForm({...familyForm, relationship_to_head: e.target.value})} 
                placeholder="Relationship to Family Head" 
                disabled={familyLoading} 
              />
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#3F2E1E' }}>
                <input 
                  type="checkbox" 
                  name="is_family_head" 
                  checked={familyForm.is_family_head || false} 
                  onChange={(e) => setFamilyForm({...familyForm, is_family_head: e.target.checked})} 
                  disabled={familyLoading}
                />
                Is Family Head
              </label>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexDirection: 'column' }}>
                <button type="submit" style={{ background: '#10b981', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%', fontSize: '0.875rem' }} disabled={familyLoading}>
                  {familyLoading ? 'Adding...' : 'Add to Family'}
                </button>
                <button type="button" onClick={() => { setShowAddMemberToFamily(false); setSelectedUser(null); setSelectedFamily(null); }} style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%', fontSize: '0.875rem' }} disabled={familyLoading}>Cancel</button>
              </div>
            </form>
            {error && <div className="error-msg" style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
          </div>
        </div>
      )}

      {/* Family Detail Modal */}
      {showFamilyDetail && selectedFamily && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(44, 44, 44, 0.25)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(60,40,20,0.18)',
            padding: '1.5rem',
            minWidth: 800,
            maxWidth: 1000,
            width: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}>
            <div style={{ 
              background: '#0ea5e9', 
              borderRadius: '12px 12px 0 0', 
              padding: '1.5rem 2rem', 
              margin: '-1.5rem -1.5rem 0 -1.5rem',
              color: 'white',
              textAlign: 'center',
              position: 'relative'
            }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                margin: '0 0 0.5rem 0',
                color: 'white'
              }}>
                👨‍👩‍👧‍👦 {selectedFamily.family_name || 'Family Details'}
              </h2>
              <p style={{ 
                fontSize: '0.875rem', 
                margin: '0', 
                color: 'white',
                opacity: 0.9
              }}>
                Family Code: {selectedFamily.family_code}
              </p>
              <button 
                onClick={() => {
                  setShowFamilyDetail(false);
                  setSelectedFamily(null);
                }} 
                title="Close"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: 'white',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ 
              background: '#f8fafc', 
              borderRadius: '0 0 12px 12px', 
              padding: '1.5rem', 
              marginBottom: 0, 
              width: '100%'
            }}>
              {/* Family Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: '#0c4a6e', 
                  margin: '0 0 1rem 0',
                  borderBottom: '2px solid #0ea5e9',
                  paddingBottom: '0.5rem'
                }}>
                  📋 Family Information
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1rem' 
                }}>
                  <div style={{ 
                    background: '#fff', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb' 
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Family Name</div>
                    <div style={{ fontSize: '1rem', color: '#0c4a6e' }}>{selectedFamily.family_name || 'Not set'}</div>
                  </div>
                  <div style={{ 
                    background: '#fff', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb' 
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Family Code</div>
                    <div style={{ fontSize: '1rem', color: '#0c4a6e', fontFamily: 'monospace' }}>{selectedFamily.family_code}</div>
                  </div>
                  <div style={{ 
                    background: '#fff', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb' 
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Status</div>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      backgroundColor: selectedFamily.family_status === 'active' ? '#10b981' : 
                                     selectedFamily.family_status === 'inactive' ? '#f59e0b' : '#3b82f6',
                      color: 'white'
                    }}>
                      {selectedFamily.family_status === 'active' ? 'Active' : 
                       selectedFamily.family_status === 'inactive' ? 'Inactive' : 'Transferred'}
                    </span>
                  </div>
                  <div style={{ 
                    background: '#fff', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb' 
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Address</div>
                    <div style={{ fontSize: '1rem', color: '#0c4a6e' }}>{selectedFamily.address || 'Not set'}</div>
                  </div>
                  <div style={{ 
                    background: '#fff', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb' 
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Phone</div>
                    <div style={{ fontSize: '1rem', color: '#0c4a6e' }}>{selectedFamily.phone || 'Not set'}</div>
                  </div>
                  <div style={{ 
                    background: '#fff', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb' 
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Email</div>
                    <div style={{ fontSize: '1rem', color: '#0c4a6e' }}>{selectedFamily.email || 'Not set'}</div>
                  </div>
                </div>
              </div>

              {/* Family Members */}
              <div>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: '#0c4a6e', 
                  margin: '0 0 1rem 0',
                  borderBottom: '2px solid #0ea5e9',
                  paddingBottom: '0.5rem'
                }}>
                  👥 Family Members ({selectedFamily.members?.length || 0})
                </h3>
                
                {selectedFamily.members && selectedFamily.members.length > 0 ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '1rem' 
                  }}>
                    {selectedFamily.members.map((member) => (
                      <div
                        key={member.id}
                        style={{ 
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '1rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '0.75rem'
                        }}>
                          <div>
                            <h4 style={{ 
                              fontSize: '1rem', 
                              fontWeight: '600', 
                              color: '#0c4a6e', 
                              margin: '0 0 0.25rem 0' 
                            }}>
                              {member.name} {member.is_family_head && '👑'}
                            </h4>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#6b7280' 
                            }}>
                              {member.email}
                            </div>
                          </div>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: '600',
                            backgroundColor: member.is_family_head ? '#8b5cf6' : '#e5e7eb',
                            color: member.is_family_head ? 'white' : '#374151'
                          }}>
                            {member.family_role || 'Member'}
                          </span>
                        </div>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '0.5rem',
                          fontSize: '0.75rem',
                          color: '#6b7280'
                        }}>
                          <div>
                            <strong>Phone:</strong> {member.phone || 'Not set'}
                          </div>
                          <div>
                            <strong>Gender:</strong> {member.gender || 'Not set'}
                          </div>
                          <div>
                            <strong>Birthdate:</strong> {member.birthdate ? new Date(member.birthdate).toLocaleDateString() : 'Not set'}
                          </div>
                          <div>
                            <strong>Status:</strong> {member.membership_status || 'Not set'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem', 
                    color: '#6b7280',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                    <div>No family members found.</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '2rem',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    setShowFamilyDetail(false);
                    setShowEditFamily(true);
                  }}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid #0ea5e9', 
                    background: '#0ea5e9', 
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit Family
                </button>
                <button
                  onClick={() => {
                    setShowFamilyDetail(false);
                    setSelectedUser(null);
                    setShowAddMemberToFamily(true);
                  }}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid #10b981', 
                    background: '#10b981', 
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Add Member
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the family "${selectedFamily.family_name}"? This will remove all family associations.`)) {
                      // Handle family deletion here
                      console.log('Delete family:', selectedFamily.id);
                    }
                  }}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid #ef4444', 
                    background: '#ef4444', 
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Delete Family
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminMembership;
