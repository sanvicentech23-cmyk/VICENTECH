import React, { useState, useEffect } from 'react';
import '../../../css/staffMortuary.css';
import { initialMortuaryData } from '../../data/mortuaryData';
import '../../services/MortuaryService';

const StaffMortuary = () => {
  const [racks, setRacks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRack, setSelectedRack] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    status: '',
    occupant: '',
    dateOccupied: ''
  });
  const [addFormData, setAddFormData] = useState({
    position_row: '',
    position_col: '',
    status: 'available',
    occupant: '',
    dateOccupied: '',
    notes: ''
  });
  const [availablePositions, setAvailablePositions] = useState([]);

  const mortuaryService = new window.MortuaryService();

  useEffect(() => {
    loadMortuaryData();
  }, []);

  const loadMortuaryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mortuaryService.fetchMortuaryData();
      
      if (response.success) {
        setRacks(response.data);
      } else {
        setError(response.message || 'Failed to load mortuary data');
      }
    } catch (err) {
      console.error('Error loading mortuary data:', err);
      setError('Failed to connect to server. Please check your connection.');
      
      // Fallback to localStorage if API fails
      let data = JSON.parse(localStorage.getItem('mortuaryData'));
      if (!data) {
        data = initialMortuaryData;
        localStorage.setItem('mortuaryData', JSON.stringify(data));
      }
      setRacks(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = async () => {
    try {
      // Load available positions
      const response = await mortuaryService.getAvailablePositions();
      if (response.success) {
        setAvailablePositions(response.availablePositions);
        
        if (response.availablePositions.length === 0) {
          alert('No available positions! All positions in the mortuary are occupied.');
          return;
        }
      } else {
        console.error('Failed to load available positions:', response.message);
      }
    } catch (error) {
      console.error('Error loading available positions:', error);
    }

    setAddFormData({
      position_row: '',
      position_col: '',
      status: 'available',
      occupant: '',
      dateOccupied: '',
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await mortuaryService.addRack(addFormData);
      
      if (response.success) {
        // Reload the mortuary data to get the updated list
        await loadMortuaryData();
        setIsAddModalOpen(false);
        alert('Rack added successfully!');
      } else {
        alert('Failed to add rack: ' + response.message);
      }
    } catch (error) {
      console.error('Error adding rack:', error);
      alert('Failed to add rack. Please try again.');
    }
  };

  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRackClick = (rack) => {
    setSelectedRack(rack);
  };

  const handleEditClick = () => {
    setEditFormData({
      id: selectedRack.id,
      status: selectedRack.status,
      occupant: selectedRack.occupant || '',
      dateOccupied: selectedRack.dateOccupied || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        status: editFormData.status,
        occupant: editFormData.status === 'available' ? null : editFormData.occupant,
        dateOccupied: editFormData.status === 'available' ? null : editFormData.dateOccupied
      };

      const response = await mortuaryService.updateRack(selectedRack.id, updateData);
      
      if (response.success) {
        // Update local state with the response data
        const updatedRacks = {
          ...racks,
          racks: racks.racks.map(rack => 
            rack.id === selectedRack.id ? response.rack : rack
          )
        };
        
        setRacks(updatedRacks);
        setSelectedRack(response.rack);
        
        // Also update localStorage as backup
        localStorage.setItem('mortuaryData', JSON.stringify(updatedRacks));
        window.dispatchEvent(new Event('mortuaryDataUpdated'));
        
        setIsEditModalOpen(false);
      } else {
        alert('Failed to update rack: ' + response.message);
      }
    } catch (error) {
      console.error('Error updating rack:', error);
      alert('Failed to update rack. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await mortuaryService.deleteRack(selectedRack.id);
      if (response.success) {
        // Remove from local state
        const updated = {
          ...racks,
          racks: racks.racks.filter(rack => rack.id !== selectedRack.id)
        };
        setRacks(updated);
        localStorage.setItem('mortuaryData', JSON.stringify(updated));
        window.dispatchEvent(new Event('mortuaryDataUpdated'));
        setSelectedRack(null);
        setIsDeleteModalOpen(false);
      } else {
        alert('Failed to delete rack: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting rack:', error);
      alert('Failed to delete rack. Please try again.');
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getTotalStats = () => {
    if (!racks || !racks.racks) return { total: 0, available: 0, occupied: 0, reserved: 0 };

    let total = 0;
    let available = 0;
    let occupied = 0;
    let reserved = 0;

    racks.racks.forEach(rack => {
      total++;
      switch (rack.status) {
        case 'available':
          available++;
          break;
        case 'occupied':
          occupied++;
          break;
        case 'reserved':
          reserved++;
          break;
      }
    });

    return { total, available, occupied, reserved };
  };

  const renderMortuaryGrid = () => {
    // Check if racks data is loaded
    if (!racks || !racks.rows || !racks.cols || !racks.racks) {
      return (
        <div className="mortuary-grid" style={{ 
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)'
        }}>
          {Array(25).fill().map((_, index) => (
            <div
              key={index}
              className="grid-cell empty"
              title="Loading..."
            >
            </div>
          ))}
        </div>
      );
    }

    const grid = Array(racks.rows).fill().map(() => Array(racks.cols).fill(null));

    // Place racks in their positions
    racks.racks.forEach(rack => {
      const [row, col] = rack.position;
      if (row < racks.rows && col < racks.cols) {
        grid[row][col] = rack;
      }
    });

    return (
      <div className="mortuary-grid" style={{ 
        gridTemplateColumns: `repeat(${racks.cols}, 1fr)`,
        gridTemplateRows: `repeat(${racks.rows}, 1fr)`
      }}>
        {grid.map((row, rowIndex) => 
          row.map((rack, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`grid-cell ${rack ? rack.status : 'empty'}`}
              onClick={() => rack && handleRackClick(rack)}
              title={rack ? `${rack.id} - ${rack.status}` : `Empty position (${rowIndex}, ${colIndex})`}
            >
              {rack && (
                <div className="rack-content">
                  <div className="rack-id">{rack.id}</div>
                  <div className="rack-status">{rack.status}</div>
                  {rack.occupant && (
                    <div className="rack-occupant">{rack.occupant}</div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  // Removed loading spinner - show content immediately

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h2>Error Loading Mortuary Data</h2>
          <p>{error}</p>
          <button onClick={loadMortuaryData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="mortuary-container">
      <div className="mortuary-header">
        <div className="header-content">
          <h1 className="mortuary-title">Mortuary Rack Management</h1>
        </div>
        <div className="header-actions">
          <button className="add-rack-button" onClick={handleAddClick}>
            <span className="button-icon">➕</span>
            <span className="button-text">Add Rack</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Total Racks</h3>
            <p className="stat-value total">{stats.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Available</h3>
            <p className="stat-value available">{stats.available}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Occupied</h3>
            <p className="stat-value occupied">{stats.occupied}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Reserved</h3>
            <p className="stat-value reserved">{stats.reserved}</p>
          </div>
        </div>
      </div>

      <div className="mortuary-layout">
        <div className="mortuary-legend">
          <div className="legend-item">
            <div className="legend-color available"></div>
            <span className="legend-text">Available</span>
          </div>
          <div className="legend-item">
            <div className="legend-color occupied"></div>
            <span className="legend-text">Occupied</span>
          </div>
          <div className="legend-item">
            <div className="legend-color reserved"></div>
            <span className="legend-text">Reserved</span>
          </div>
        </div>

        <div className="grid-container">
          {renderMortuaryGrid()}
        </div>
      </div>

      {selectedRack && (
        <div className="rack-details">
          <div className="details-header">
            <h3 className="details-title">Rack Details - {selectedRack.id}</h3>
            <button className="close-button" onClick={() => setSelectedRack(null)} aria-label="Close details">×</button>
          </div>
          <div className="details-content">
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`status-badge ${selectedRack.status}`}>
                  {selectedRack.status.charAt(0).toUpperCase() + selectedRack.status.slice(1)}
                </span>
              </div>
              {selectedRack.occupant && (
                <>
                  <div className="detail-item">
                    <span className="detail-label">Occupant:</span>
                    <span className="detail-value">{selectedRack.occupant}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date Occupied:</span>
                    <span className="detail-value">{selectedRack.dateOccupied}</span>
                  </div>
                </>
              )}
            </div>
            <div className="detail-actions">
              <button className="action-button edit" onClick={handleEditClick}>
                <span className="action-text">Edit</span>
                <span className="action-icon">✏️</span>
              </button>
              <button className="action-button delete" onClick={handleDeleteClick}>
                <span className="action-text">Reset</span>
                <span className="action-icon">🔄</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Rack {editFormData.id}</h3>
              <button className="close-button" onClick={() => setIsEditModalOpen(false)} aria-label="Close modal">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit} className="edit-form">
                <div className="form-group">
                  <label htmlFor="status">Status:</label>
                  <select
                    id="status"
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditFormChange}
                    required
                    className="form-control"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
                {editFormData.status !== 'available' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="occupant">Occupant Name:</label>
                      <input
                        type="text"
                        id="occupant"
                        name="occupant"
                        value={editFormData.occupant}
                        onChange={handleEditFormChange}
                        required
                        className="form-control"
                        placeholder="Enter occupant name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="dateOccupied">Date:</label>
                      <input
                        type="date"
                        id="dateOccupied"
                        name="dateOccupied"
                        value={editFormData.dateOccupied}
                        onChange={handleEditFormChange}
                        required
                        className="form-control"
                      />
                    </div>
                  </>
                )}
                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-button">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content confirmation-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button className="close-button" onClick={() => setIsDeleteModalOpen(false)} aria-label="Close modal">×</button>
            </div>
            <div className="modal-body">
              <div className="confirmation-content">
                <div className="confirmation-icon">⚠️</div>
                <div className="confirmation-text">
                  <p className="confirmation-question">Are you sure you want to permanently delete Rack {selectedRack.id}?</p>
                  <p className="confirmation-warning">This will remove the rack from the layout. This action cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="delete-button" onClick={handleDeleteConfirm}>
                Delete Rack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rack Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Rack</h3>
              <button className="close-button" onClick={() => setIsAddModalOpen(false)} aria-label="Close modal">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddSubmit} className="add-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="position_row">Position:</label>
                    <select
                      id="position_select"
                      name="position_select"
                      onChange={(e) => {
                        const selectedPos = availablePositions.find(pos => pos.id === e.target.value);
                        if (selectedPos) {
                          setAddFormData(prev => ({
                            ...prev,
                            position_row: selectedPos.row,
                            position_col: selectedPos.col
                          }));
                        }
                      }}
                      required
                      className="form-control"
                    >
                      <option value="">Select a position...</option>
                      {availablePositions.map(pos => (
                        <option key={pos.id} value={pos.id}>
                          {pos.id} (Row {pos.row}, Col {pos.col})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="add_status">Status:</label>
                  <select
                    id="add_status"
                    name="status"
                    value={addFormData.status}
                    onChange={handleAddFormChange}
                    required
                    className="form-control"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
                {addFormData.status !== 'available' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="add_occupant">Occupant Name:</label>
                      <input
                        type="text"
                        id="add_occupant"
                        name="occupant"
                        value={addFormData.occupant}
                        onChange={handleAddFormChange}
                        required
                        className="form-control"
                        placeholder="Enter occupant name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="add_dateOccupied">Date:</label>
                      <input
                        type="date"
                        id="add_dateOccupied"
                        name="dateOccupied"
                        value={addFormData.dateOccupied}
                        onChange={handleAddFormChange}
                        required
                        className="form-control"
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label htmlFor="add_notes">Notes (Optional):</label>
                  <textarea
                    id="add_notes"
                    name="notes"
                    value={addFormData.notes}
                    onChange={handleAddFormChange}
                    className="form-control"
                    rows="3"
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-button">
                    Add Rack
                  </button>
                </div>
              </form>
              {availablePositions.length === 0 && (
                <div className="no-positions-message">
                  <p>⚠️ No available positions in the mortuary. All positions are currently occupied.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMortuary;