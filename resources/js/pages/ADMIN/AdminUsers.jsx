import React, { useEffect, useState } from 'react';
import { Pencil, Trash } from 'lucide-react';
import '../../../css/AdminUsers.css';

const ROLES = [
  { label: 'Parishioner', value: 'parishioner' },
  { label: 'Staff', value: 'staff' },
  { label: 'Admin', value: 'admin' },
  { label: 'Priest', value: 'priest' },
];

const FILTERS = [
  { label: 'All', value: 'all' },
  ...ROLES,
];

const initialForm = {
  name: '',
  email: '',
  username: '',
  password: '',
  password_confirmation: '',
  Sex: 'male',
  address: '',
  phone: '',
  birthdate: '1990-01-01',
  role: '',
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guestVisits, setGuestVisits] = useState([]);
  const [guestVisitsLoading, setGuestVisitsLoading] = useState(true);
  const [guestPage, setGuestPage] = useState(1);
  const [guestLastPage, setGuestLastPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [activateUser, setActivateUser] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [activating, setActivating] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        console.log('Fetched users data:', data); // Debug log
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchGuestVisits = (page = 1) => {
    setGuestVisitsLoading(true);
    fetch(`/api/admin/guest-visits?page=${page}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        // Laravel paginator structure: { data: [...], current_page, last_page }
        const items = Array.isArray(data) ? data : (data.data || []);
        setGuestVisits(items);
        setGuestPage(data.current_page || 1);
        setGuestLastPage(data.last_page || 1);
        setGuestVisitsLoading(false);
      })
      .catch(() => setGuestVisitsLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    fetchGuestVisits(1);
  }, []);

  // Helper function to check if user is deactivated
  const isUserDeactivated = (user) => {
    return user.status === 'inactive';
  };

  const filteredUsers = users.filter(user => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'admin') return user.is_admin;
    if (roleFilter === 'staff') return user.is_staff;
    if (roleFilter === 'priest') return user.is_priest;
    if (roleFilter === 'parishioner') return !user.is_admin && !user.is_staff && !user.is_priest;
    return true;
  });

  if (loading) return <div className="loading-users">Loading users...</div>;

  // Responsive styles
  const containerStyle = {
    margin: '1.5rem auto',
    padding: '1.5rem',
    maxWidth: '100%',
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
    maxWidth: '1200px',
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
    boxSizing: 'border-box',
  };

  const tableWrapperStyle = {
    background: 'white',
    borderRadius: '0.75rem',
    border: '1.5px solid #f2e4ce',
    boxShadow: '0 4px 12px rgba(60, 47, 30, 0.08)',
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
    zIndex: 3000,
    padding: '20px',
    overflowY: 'auto',
  };

  const modalContentStyle = {
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
    position: 'relative',
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle add user submit
  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAddLoading(true);
    // Send all required fields for Laravel registration
    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
      phone: form.phone,
      gender: form.Sex,
      birthdate: form.birthdate,
      address: form.address,
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
        // Laravel validation errors
        if (data.errors) {
          setError(Object.values(data.errors).map(arr => arr.join(' ')).join('\n'));
        } else {
          setError(data.message || 'Failed to add user.');
        }
      } else {
        setSuccess('User added successfully!');
        setShowAdd(false);
        fetchUsers();
      }
    } catch (err) {
      setError('Network error.');
    }
    setAddLoading(false);
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
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
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

  // Handle deactivate user
  const handleDeactivateUser = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeactivate = async () => {
    setError('');
    setSuccess('');
    setDeactivating(true);
    
    console.log('Deactivating user:', deleteUser); // Debug log
    
    try {
      // Try using the existing delete endpoint but with a deactivate flag
      const requestBody = {
        status: 'inactive',
        deactivate: true
      };
      console.log('Sending deactivation request:', requestBody); // Debug log
      
      const res = await fetch(`/api/users/${deleteUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      
      console.log('Deactivation response status:', res.status); // Debug log
      const data = await res.json();
      console.log('Deactivation response data:', data); // Debug log
      
      if (!res.ok) {
        setError(data.message || 'Failed to deactivate user.');
      } else {
        setSuccess('User account deactivated successfully!');
        setShowDelete(false);
        setDeleteUser(null);
        
        // Update the user in the local state immediately
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === deleteUser.id 
              ? { ...user, status: 'inactive' }
              : user
          )
        );
        
        // Dispatch deactivation event to notify logged-in users
        const eventDetail = { 
          userId: deleteUser.id,
          userName: deleteUser.name,
          deactivatedAt: new Date().toISOString()
        };
        console.log('AdminUsers: Dispatching userDeactivated event:', eventDetail);
        window.dispatchEvent(new CustomEvent('userDeactivated', { 
          detail: eventDetail
        }));
        
        // Also fetch fresh data from server
        fetchUsers();
      }
    } catch (err) {
      console.error('Deactivation error:', err); // Debug log
      setError('Network error.');
    }
    setDeactivating(false);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Handle activate user - show confirmation first
  const handleActivateUser = (user) => {
    setActivateUser(user);
    setShowActivateConfirm(true);
    setError('');
    setSuccess('');
  };

  // Confirm activate user
  const confirmActivate = async () => {
    setError('');
    setSuccess('');
    setActivating(true);
    
    try {
      const res = await fetch(`/api/users/${activateUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'active',
          activate: true
        }),
      });
      const data = await res.json();
      console.log('Activation response:', data); // Debug log
      if (!res.ok) {
        setError(data.message || 'Failed to activate user.');
      } else {
        setSuccess('User account activated successfully!');
        
        // Update the user in the local state immediately
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === activateUser.id 
              ? { ...u, status: 'active' }
              : u
          )
        );
        
        // Also fetch fresh data from server
        fetchUsers();
      }
    } catch (err) {
      setError('Network error.');
    }
    setActivating(false);
    setShowActivateConfirm(false);
    setActivateUser(null);
  };

  // Cancel activate
  const cancelActivate = () => {
    setShowActivateConfirm(false);
    setActivateUser(null);
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

  // Open deactivate modal
  const openDeactivate = (user) => {
    setDeleteUser(user);
    setShowDelete(true);
    setError('');
    setSuccess('');
  };

  return (
    <>
      {/* Deactivate Confirmation Modal */}
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
            maxWidth: 500,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '700' }}>
              Deactivate Account
            </h3>
            <p style={{ color: '#374151', marginBottom: '1rem', lineHeight: 1.6, fontSize: '16px' }}>
              Are you sure you want to deactivate <strong>{deleteUser?.name}</strong>'s account?
            </p>
            <div style={{background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem'}}>
              <p style={{color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: '500'}}>
                <strong>Warning:</strong> This action will:
              </p>
              <ul style={{color: '#dc2626', fontSize: '14px', margin: '0.5rem 0 0 1rem', padding: 0, textAlign: 'left'}}>
                <li>Deactivate the user's account immediately</li>
                <li>Prevent the user from logging in</li>
                <li>Keep all user data intact</li>
                <li>Require admin approval to reactivate</li>
              </ul>
            </div>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              This action can be reversed by an admin if needed.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={cancelDelete}
                disabled={deactivating}
                style={{
                  background: '#f8f9fa',
                  color: '#6c757d',
                  border: '1px solid #dee2e6',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  cursor: deactivating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeactivate}
                disabled={deactivating}
                style={{
                  background: deactivating ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  cursor: deactivating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {deactivating ? 'Deactivating...' : 'Yes, Deactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Confirmation Modal */}
      {showActivateConfirm && (
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
            maxWidth: 500,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ color: '#16a34a', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '700' }}>
              Activate Account
            </h3>
            <p style={{ color: '#374151', marginBottom: '1rem', lineHeight: 1.6, fontSize: '16px' }}>
              Are you sure you want to activate <strong>{activateUser?.name}</strong>'s account?
            </p>
            <div style={{background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem'}}>
              <p style={{color: '#16a34a', fontSize: '14px', margin: 0, fontWeight: '500'}}>
                <strong>This action will:</strong>
              </p>
              <ul style={{color: '#16a34a', fontSize: '14px', margin: '0.5rem 0 0 1rem', padding: 0, textAlign: 'left'}}>
                <li>Reactivate the user's account immediately</li>
                <li>Allow the user to log in again</li>
                <li>Restore full access to the system</li>
                <li>Keep all user data intact</li>
              </ul>
            </div>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              The user will be able to access their account immediately after activation.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={cancelActivate}
                disabled={activating}
                style={{
                  background: '#f8f9fa',
                  color: '#6c757d',
                  border: '1px solid #dee2e6',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  cursor: activating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmActivate}
                disabled={activating}
                style={{
                  background: activating ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  cursor: activating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {activating ? 'Activating...' : 'Yes, Activate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sacraments-container responsive-admin-users" style={{ ...containerStyle, maxWidth: 1200, minHeight: '100vh', padding: '1.5rem', margin: '0 auto', overflowX: 'auto' }}>
      <style>{`
        @media (max-width: 600px) {
          .responsive-admin-users {
            width: 95vw !important;
            max-width: 100vw !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }
      `}</style>
      <style>{`
        @media (max-width: 600px) {
          .responsive-admin-users {
            width: 95vw !important;
            max-width: 100vw !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }
      `}</style>
      {error && <div className="error-msg" style={{ whiteSpace: 'pre-line' }}>{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="sacraments-header" style={headerStyle}>
        <h1 className="sacraments-title" style={{ fontSize: '2rem', width: '100%' }}>Manage Users</h1>
        <div className="filter-bar" style={filterBarStyle}>
          <label htmlFor="roleFilter" style={{ marginRight: '8px', fontWeight: 600, color: '#3F2E1E' }}>Filter by Role:</label>
          <select id="roleFilter" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', minWidth: 120 }}>
            {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button
            onClick={() => { setShowAdd(true); setForm(initialForm); setError(''); setSuccess(''); }}
            className="add-btn management-btn primary"
            style={{ minHeight: 44, fontWeight: 600, fontSize: '0.95rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(205, 139, 62, 0.1)', background: '#CD8B3E', color: 'white', padding: '0.625rem 1rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 180 }}
          >
            + Add Account
          </button>
        </div>
      </div>

      <div className="user-table-wrapper" style={tableWrapperStyle}>
        <div style={{ width: '100%' }}>
          <table className="user-table responsive-table" style={{ ...tableStyle, fontSize: '0.95rem', minWidth: 500 }}>
            <thead>
              <tr style={{ background: '#f9f6f2' }}>
                <th style={{ padding: '0.5rem', minWidth: 40 }}>#</th>
                <th style={{ padding: '0.5rem', minWidth: 120 }}>Name</th>
                <th style={{ padding: '0.5rem', minWidth: 140 }}>Email</th>
                <th style={{ padding: '0.5rem', minWidth: 80 }}>Sex</th>
                <th style={{ padding: '0.5rem', minWidth: 120 }}>Address</th>
                <th style={{ padding: '0.5rem', minWidth: 80 }}>Role</th>
                <th style={{ padding: '0.5rem', minWidth: 100 }}>Status</th>
                <th style={{ padding: '0.5rem', minWidth: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '1rem' }}>No users found.</td>
                </tr>
              )}
              {filteredUsers.map((user, idx) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f2e4ce', opacity: isUserDeactivated(user) ? 0.7 : 1 }}>
                  <td style={{ padding: '0.5rem' }}>{idx + 1}</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-word' }}>{user.name}</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-word' }}>{user.email}</td>
                  <td style={{ padding: '0.5rem' }}>{user.Sex || user.gender}</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-word' }}>{user.address}</td>
                  <td style={{ padding: '0.5rem' }}>{user.is_admin ? 'Admin' : user.is_staff ? 'Staff' : user.is_priest ? 'Priest' : 'Parishioner'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: isUserDeactivated(user) ? '#fef2f2' : '#f0fdf4',
                      color: isUserDeactivated(user) ? '#dc2626' : '#16a34a',
                      border: `1px solid ${isUserDeactivated(user) ? '#fecaca' : '#bbf7d0'}`
                    }}>
                      {isUserDeactivated(user) ? 'Deactivated' : 'Active'}
                    </span>
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
                      {isUserDeactivated(user) ? (
                        <button
                          onClick={() => handleActivateUser(user)}
                          disabled={activating}
                          className="text-green-600 hover:text-green-800 cursor-pointer"
                          style={{ 
                            minWidth: 32, 
                            minHeight: 32, 
                            borderRadius: 6, 
                            background: '#f0fdf4', 
                            border: '1px solid #bbf7d0', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            opacity: activating ? 0.5 : 1
                          }}
                          title="Activate Account"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2l4-4"/>
                            <circle cx="12" cy="12" r="9"/>
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => openDeactivate(user)}
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                          style={{ minWidth: 32, minHeight: 32, borderRadius: 6, background: '#f2f2f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Deactivate Account"
                        >
                          <Trash size={18} />
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

      {/* Guest Cookie Consents */}
      <div className="user-table-wrapper" style={{ ...tableWrapperStyle, marginTop: '2rem' }}>
        <div style={{ 
          background: 'rgb(205, 139, 62)', 
          borderRadius: '1rem 1rem 0 0', 
          padding: '1.5rem 2rem', 
          margin: '-1rem -1rem 1rem -1rem',
          color: 'white',
          textAlign: 'left',
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
            fontSize: '1.5rem', 
            fontWeight: '800', 
            margin: '0',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            zIndex: 1
          }}>
          Guest Cookie Consents
          </h2>
          
        </div>
        <div style={{ padding: '1rem' }}>
          {guestVisitsLoading ? (
            <div style={{ padding: '0.75rem' }}>Loading guest visits...</div>
          ) : (
            <div style={{ width: '100%' }}>
              <table className="user-table responsive-table" style={{ ...tableStyle, fontSize: '0.9rem', minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: '#f9f6f2' }}>
                    <th style={{ padding: '0.5rem', minWidth: 160 }}>Visit Start</th>
                    <th style={{ padding: '0.5rem', minWidth: 160 }}>Visit End</th>
                    <th style={{ padding: '0.5rem', minWidth: 100 }}>Duration</th>
                    <th style={{ padding: '0.5rem', minWidth: 120 }}>IP Address</th>
                    <th style={{ padding: '0.5rem', minWidth: 140 }}>Entry Path</th>
                    <th style={{ padding: '0.5rem', minWidth: 200 }}>Pages Viewed</th>
                    <th style={{ padding: '0.5rem', minWidth: 200 }}>Cookie ID</th>
                  </tr>
                </thead>
                <tbody>
                  {guestVisits.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '1rem' }}>No guest consents found.</td>
                    </tr>
                  )}
                  {guestVisits.map((v, idx) => {
                    const formatDuration = (seconds) => {
                      if (!seconds) return '-';
                      const hours = Math.floor(seconds / 3600);
                      const minutes = Math.floor((seconds % 3600) / 60);
                      const secs = seconds % 60;
                      if (hours > 0) {
                        return `${hours}h ${minutes}m ${secs}s`;
                      } else if (minutes > 0) {
                        return `${minutes}m ${secs}s`;
                      } else {
                        return `${secs}s`;
                      }
                    };

                    const formatPagesViewed = (pages) => {
                      if (!pages || !Array.isArray(pages) || pages.length === 0) return '-';
                      if (pages.length === 1) return pages[0];
                      return `${pages.length} pages (${pages.slice(0, 2).join(', ')}${pages.length > 2 ? '...' : ''})`;
                    };

                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid #f2e4ce' }}>
                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                          {v.visit_start ? new Date(v.visit_start).toLocaleString() : (v.accepted_at || v.created_at)}
                        </td>
                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                          {v.visit_end ? new Date(v.visit_end).toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                          {formatDuration(v.session_duration)}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{v.ip_address || '-'}</td>
                        <td style={{ padding: '0.5rem', wordBreak: 'break-word' }}>{v.url_path || '-'}</td>
                        <td style={{ padding: '0.5rem', wordBreak: 'break-word' }} title={Array.isArray(v.pages_viewed) ? v.pages_viewed.join(', ') : ''}>
                          {formatPagesViewed(v.pages_viewed)}
                        </td>
                        <td style={{ padding: '0.5rem', wordBreak: 'break-word', fontFamily: 'monospace' }}>{v.cookie_id}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end', padding: '0.75rem' }}>
                <button
                  onClick={() => { if (guestPage > 1) fetchGuestVisits(guestPage - 1); }}
                  disabled={guestPage <= 1}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid #e2cfa3', background: guestPage <= 1 ? '#f5f5f5' : '#fff', color: '#3F2E1E' }}
                >Prev</button>
                <span style={{ fontSize: '0.9rem', color: '#3F2E1E' }}>Page {guestPage} of {guestLastPage}</span>
                <button
                  onClick={() => { if (guestPage < guestLastPage) fetchGuestVisits(guestPage + 1); }}
                  disabled={guestPage >= guestLastPage}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid #e2cfa3', background: guestPage >= guestLastPage ? '#f5f5f5' : '#fff', color: '#3F2E1E' }}
                >Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
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
                Add New User
              </h2>
              <p style={{ 
                fontSize: '0.9rem', 
                margin: '0.5rem 0 0 0', 
                opacity: 0.9,
                position: 'relative',
                zIndex: 1
              }}>
                Create a new user account with role assignment
              </p>
            </div>
            <form onSubmit={handleAddUser} className="add-user-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 500, margin: '0 auto', paddingBottom: '1rem' }}>
              <input type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Name" required disabled={addLoading} />
              <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="Email" required disabled={addLoading} />
              <input type="text" name="username" value={form.username} onChange={handleFormChange} placeholder="Username" required disabled={addLoading} />
              <input type="password" name="password" value={form.password} onChange={handleFormChange} placeholder="Password" required disabled={addLoading} />
              <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleFormChange} placeholder="Confirm Password" required disabled={addLoading} />
              <label htmlFor="sex-select" style={{ fontWeight: 600, color: '#3F2E1E' }}>Sex:</label>
              <select id="sex-select" name="Sex" value={form.Sex} onChange={handleFormChange} required disabled={addLoading} style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', minWidth: 120 }}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <input type="text" name="address" value={form.address} onChange={handleFormChange} placeholder="Address" disabled={addLoading} />
              <input type="text" name="phone" value={form.phone} onChange={handleFormChange} placeholder="Phone" disabled={addLoading} />
              <input type="date" name="birthdate" value={form.birthdate} onChange={handleFormChange} required disabled={addLoading} />
              <select name="role" value={form.role} onChange={handleFormChange} required disabled={addLoading} style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', minWidth: 120 }}>
                <option value="">Select Role</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                <button type="submit" className="primary" style={{ background: '#CD8B3E', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} disabled={addLoading}>
                  {addLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                      <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #fff', borderTop: '3px solid #CD8B3E', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                      Adding...
                    </span>
                  ) : 'Add User'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} disabled={addLoading}>Cancel</button>
              </div>
            </form>
            {/* Spinner animation style */}
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            {error && <div className="error-msg" style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEdit && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <div style={{ 
              background: 'rgb(205, 139, 62)', 
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
                Edit User
              </h2>
              <p style={{ 
                fontSize: '0.9rem', 
                margin: '0.5rem 0 0 0', 
                opacity: 0.9,
                position: 'relative',
                zIndex: 1
              }}>
                Update user information and role assignment
              </p>
            </div>
            <form onSubmit={handleEditUser} className="edit-user-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 500, margin: '0 auto', paddingBottom: '1rem' }}>
              <input type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Name" required disabled={editLoading} />
              <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="Email" required disabled={editLoading} />
              <input type="text" name="username" value={form.username} onChange={handleFormChange} placeholder="Username" disabled={editLoading} />
              <input type="password" name="password" value={form.password} onChange={handleFormChange} placeholder="New Password (leave blank to keep current)" disabled={editLoading} />
              <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleFormChange} placeholder="Confirm New Password" disabled={editLoading} />
              <label htmlFor="edit-sex-select" style={{ fontWeight: 600, color: '#3F2E1E' }}>Sex:</label>
              <select id="edit-sex-select" name="Sex" value={form.Sex} onChange={handleFormChange} required disabled={editLoading} style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', minWidth: 120 }}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <input type="text" name="address" value={form.address} onChange={handleFormChange} placeholder="Address" disabled={editLoading} />
              <input type="text" name="phone" value={form.phone} onChange={handleFormChange} placeholder="Phone" disabled={editLoading} />
              <input type="date" name="birthdate" value={form.birthdate} onChange={handleFormChange} required disabled={editLoading} />
              <select name="role" value={form.role} onChange={handleFormChange} required disabled={editLoading} style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e2cfa3', fontSize: 14, color: '#3F2E1E', background: '#fff', minWidth: 120 }}>
                <option value="">Select Role</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                <button type="submit" className="primary" style={{ background: '#CD8B3E', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} disabled={editLoading}>
                  {editLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                      <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #fff', borderTop: '3px solid #CD8B3E', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                      Updating...
                    </span>
                  ) : 'Update User'}
                </button>
                <button type="button" onClick={() => setShowEdit(false)} style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} disabled={editLoading}>Cancel</button>
              </div>
            </form>
            {error && <div className="error-msg" style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
          </div>
        </div>
      )}

      {/* Deactivate User Modal */}
      {showDelete && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <div style={{ 
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', 
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
                ⚠️ Deactivate Account
              </h2>
              <p style={{ 
                fontSize: '0.9rem', 
                margin: '0.5rem 0 0 0', 
                opacity: 0.9,
                position: 'relative',
                zIndex: 1
              }}>
                Temporarily disable user account access
              </p>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '1rem', color: '#3F2E1E', marginBottom: '0.4rem' }}>
                Are you sure you want to deactivate <strong>{deleteUser?.name}</strong>'s account?
              </p>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.8rem' }}>
                Email: {deleteUser?.email}
              </p>
              <div style={{background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1rem'}}>
                <p style={{color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: '500'}}>
                  <strong>This action will:</strong>
                </p>
                <ul style={{color: '#dc2626', fontSize: '14px', margin: '0.5rem 0 0 1rem', padding: 0, textAlign: 'left'}}>
                  <li>Deactivate the user's account immediately</li>
                  <li>Prevent the user from logging in</li>
                  <li>Keep all user data intact</li>
                  <li>Allow admin to reactivate later if needed</li>
                </ul>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={handleDeactivateUser} 
                className="primary" 
                style={{ background: '#DC2626', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} 
                disabled={deactivating}
              >
                {deactivating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #fff', borderTop: '3px solid #DC2626', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                    Deactivating...
                  </span>
                ) : 'Deactivate Account'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowDelete(false)} 
                style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} 
                disabled={deactivating}
              >
                Cancel
              </button>
            </div>
            {error && <div className="error-msg" style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminUsers;
