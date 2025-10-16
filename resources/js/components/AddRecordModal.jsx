import React, { useState, useEffect } from 'react';

const AddRecordModal = ({ isOpen, onClose, onSubmit, recordType }) => {
  const [formData, setFormData] = useState({
    type: recordType || 'baptism',
    name: '',
    date: '',
    priest: '',
    status: 'completed',
    details: {},
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Default details for each record type
  const defaultDetails = {
    baptism: {
      parents: '',
      godparents: '',
      birth_date: '',
      birth_place: ''
    },
    confirmation: {
      sponsor: '',
      bishop: '',
      confirmation_name: '',
      baptism_date: ''
    },
    marriage: {
      spouse: '',
      witnesses: '',
      venue: '',
      marriage_license: ''
    },
    funeral: {
      deceased: '',
      date_of_death: '',
      cause_of_death: '',
      burial_place: ''
    },
    mass: {
      mass_type: '',
      attendance: '',
      offerings: '',
      special_intention: ''
    }
  };

  // Reset form when modal opens or record type changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: recordType || 'baptism',
        name: '',
        date: '',
        priest: '',
        status: 'completed',
        details: defaultDetails[recordType || 'baptism'] || {},
        notes: ''
      });
      setErrors({});
    }
  }, [isOpen, recordType]);

  // Update details when type changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      details: defaultDetails[prev.type] || {}
    }));
  }, [formData.type]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDetailChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        [key]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.priest.trim()) {
      newErrors.priest = 'Priest name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to create record. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderDetailFields = () => {
    const details = defaultDetails[formData.type] || {};
    
    return Object.keys(details).map(key => (
      <input
        key={key}
        type={key.includes('date') ? 'date' : 'text'}
        value={formData.details[key] || ''}
        onChange={(e) => handleDetailChange(key, e.target.value)}
        placeholder={`${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
        disabled={loading}
      />
    ));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="add-record-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="add-record-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ 
          background: 'linear-gradient(135deg, #CD8B3E 0%, #B77B35 100%)', 
          borderRadius: '1rem 1rem 0 0', 
          padding: '1.5rem 2rem', 
          margin: '-1.5rem -1.5rem 1.5rem -1.5rem',
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
            Add New {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} Record
          </h2>
          <p style={{ 
            fontSize: '0.9rem', 
            margin: '0.5rem 0 0 0', 
            opacity: 0.9,
            position: 'relative',
            zIndex: 1
          }}>
            Create a new parish record with detailed information
          </p>
        </div>

        <form onSubmit={handleSubmit} className="add-record-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 700, margin: '0 auto', paddingBottom: '1rem' }}>
          {/* Record Type */}
           <select
             name="type"
             value={formData.type}
             onChange={handleInputChange}
             required
             disabled={loading}
           >
             <option value="baptism">Baptism</option>
             <option value="confirmation">Confirmation</option>
             <option value="marriage">Marriage</option>
             <option value="funeral">Funeral</option>
             <option value="mass">Mass</option>
           </select>

           {/* Basic Information */}
           <input
             type="text"
             name="name"
             value={formData.name}
             onChange={handleInputChange}
             placeholder="Full Name *"
             required
             disabled={loading}
           />
           {errors.name && <span style={{ color: '#e74c3c', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.name}</span>}

           <input
             type="date"
             name="date"
             value={formData.date}
             onChange={handleInputChange}
             required
             disabled={loading}
           />
           {errors.date && <span style={{ color: '#e74c3c', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.date}</span>}

           <input
             type="text"
             name="priest"
             value={formData.priest}
             onChange={handleInputChange}
             placeholder="Priest Name *"
             required
             disabled={loading}
           />
           {errors.priest && <span style={{ color: '#e74c3c', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.priest}</span>}

           <select
             name="status"
             value={formData.status}
             onChange={handleInputChange}
             disabled={loading}
           >
             <option value="completed">Completed</option>
             <option value="pending">Pending</option>
             <option value="cancelled">Cancelled</option>
           </select>

          {/* Type-specific Details */}
          <div style={{ 
            borderTop: '1px solid #f2e4ce', 
            paddingTop: '1rem', 
            marginTop: '1rem' 
          }}>
            <h3 style={{ 
              color: '#3F2E1E', 
              fontSize: '1.1rem', 
              marginBottom: '1rem',
              fontWeight: 600
            }}>
              {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} Details
            </h3>
            {renderDetailFields()}
          </div>

           {/* Notes */}
           <textarea
             name="notes"
             value={formData.notes}
             onChange={handleInputChange}
             rows="3"
             placeholder="Additional notes (optional)"
             disabled={loading}
           />

          {/* Error Message */}
          {errors.submit && (
            <div style={{ 
              color: '#e74c3c', 
              textAlign: 'center', 
              marginBottom: '1rem',
              fontSize: '0.9rem',
              padding: '0.5rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px'
            }}>
              {errors.submit}
            </div>
          )}

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
            <button 
              type="submit" 
              className="primary" 
              style={{ background: '#CD8B3E', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} 
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #fff', borderTop: '3px solid #CD8B3E', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                  Creating...
                </span>
              ) : 'Create Record'}
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ background: '#eee', color: '#3F2E1E', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, width: '100%' }} 
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>

        <style jsx>{`
          .add-record-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(44, 44, 44, 0.25);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .add-record-modal-content {
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 8px 32px rgba(60,40,20,0.18);
            padding: 1.5rem;
            min-width: 600px;
            max-width: 700px;
            width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          input, select, textarea {
            width: 100%;
            margin-bottom: 1rem;
            padding: 0.6rem 1rem;
            border: 2px solid #DED0B6;
            border-radius: 10px;
            background: #FFF6E5;
            color: #3F2E1E;
            font-size: 1rem;
            font-family: inherit;
            transition: border 0.2s;
          }

          input:focus, select:focus, textarea:focus {
            border: 2px solid #CD8B3E !important;
            outline: none;
            boxShadow: 0 0 0 3px rgba(205, 139, 62, 0.1);
          }

          /* Spinner animation */
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Responsive styles for AddRecordModal */
          @media (max-width: 768px) {
            .add-record-modal-overlay {
              padding: 0.5rem;
            }

            .add-record-modal-content {
              padding: 1.5rem;
              border-radius: 12px;
              max-height: 95vh;
            }
          }

          @media (max-width: 640px) {
            .add-record-modal-overlay {
              padding: 0.25rem;
            }

            .add-record-modal-content {
              padding: 1rem;
              border-radius: 8px;
            }
          }

          @media (max-width: 480px) {
            .add-record-modal-overlay {
              padding: 0.125rem;
            }

            .add-record-modal-content {
              padding: 0.75rem;
              max-height: 98vh;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AddRecordModal;