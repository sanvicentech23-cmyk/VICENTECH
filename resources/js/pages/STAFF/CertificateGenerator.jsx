import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../utils/axios';
import '../../../css/CertificateGenerator.css';

const CertificateGenerator = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    
    const { certificate, mode } = location.state || {};
    
    const [certificateData, setCertificateData] = useState(null);
    const [template, setTemplate] = useState(null);
    const [priests, setPriests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Template editing state
    const [selectedElement, setSelectedElement] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [templateElements, setTemplateElements] = useState([]);
    const [uploadedImages, setUploadedImages] = useState({});
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    
    // Form data
    const [formData, setFormData] = useState({
        recipient_name: '',
        certificate_date: '',
        priest_id: '',
        groom_name: '',
        bride_name: '',
        notes: ''
    });

    useEffect(() => {
        if (certificate?.id) {
            loadCertificateData();
        } else {
            setError('No certificate data provided');
            setLoading(false);
        }
    }, [certificate]);

    const loadCertificateData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/certificate-generation/data/${certificate.id}`);
            
            setCertificateData(response.data.certificate_request);
            setTemplate(response.data.template);
            setPriests(response.data.priests);
            
            // Initialize form data
            setFormData({
                recipient_name: response.data.certificate_request.recipient_name || '',
                certificate_date: response.data.certificate_request.certificate_date || '',
                priest_id: response.data.priests[0]?.id || '',
                groom_name: response.data.certificate_request.groom_name || '',
                bride_name: response.data.certificate_request.bride_name || '',
                notes: ''
            });
            
            // Initialize template elements
            if (response.data.template?.template_data?.elements) {
                setTemplateElements(response.data.template.template_data.elements);
            }
            
        } catch (err) {
            console.error('Error loading certificate data:', err);
            setError('Failed to load certificate data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleElementClick = (element) => {
        setSelectedElement(element);
        setIsEditing(true);
    };

    const handleElementUpdate = (elementId, updates) => {
        setTemplateElements(prev => 
            prev.map(el => 
                el.id === elementId 
                    ? { ...el, ...updates }
                    : el
            )
        );
    };

    const handleImageUpload = (elementId, file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            setUploadedImages(prev => ({
                ...prev,
                [elementId]: imageData
            }));
            
            // Update the element with the new image
            handleElementUpdate(elementId, {
                content: imageData,
                type: 'image'
            });
        };
        reader.readAsDataURL(file);
    };

    const handlePositionChange = (elementId, position) => {
        // Get canvas dimensions
        const canvasWidth = 800; // Canvas width
        const canvasHeight = 600; // Canvas height
        
        // Get element dimensions
        const element = templateElements.find(el => el.id === elementId);
        const elementWidth = element?.style?.width || 200;
        const elementHeight = element?.style?.height || 50;
        
        // Constrain position to canvas bounds
        const constrainedPosition = {
            x: Math.max(0, Math.min(position.x, canvasWidth - elementWidth)),
            y: Math.max(0, Math.min(position.y, canvasHeight - elementHeight))
        };
        
        handleElementUpdate(elementId, { position: constrainedPosition });
    };

    const handleStyleChange = (elementId, styleUpdates) => {
        handleElementUpdate(elementId, {
            style: { ...templateElements.find(el => el.id === elementId)?.style, ...styleUpdates }
        });
    };

    const handleAlignmentChange = (elementId, alignment) => {
        const styleUpdates = {};
        
        switch (alignment) {
            case 'left':
                styleUpdates.textAlign = 'left';
                break;
            case 'center':
                styleUpdates.textAlign = 'center';
                break;
            case 'right':
                styleUpdates.textAlign = 'right';
                break;
        }
        
        handleStyleChange(elementId, styleUpdates);
    };

    const handleDeleteElement = (elementId) => {
        if (window.confirm('Are you sure you want to delete this element? This action cannot be undone.')) {
            setTemplateElements(prev => prev.filter(el => el.id !== elementId));
            setSelectedElement(null);
        }
    };

    const handleAddImageElement = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageUrl = event.target.result;
                    const newElement = {
                        id: `image_${Date.now()}`,
                        type: 'image',
                        content: imageUrl,
                        position: { x: 100, y: 100 },
                        style: {
                            width: 150,
                            height: 150,
                            border: '2px dashed #ccc',
                            borderRadius: '8px'
                        }
                    };
                    setTemplateElements(prev => [...prev, newElement]);
                    setSelectedElement(newElement);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    // Drag and drop handlers - optimized for performance
    const handleMouseDown = useCallback((e, element) => {
        if (!isEditing) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Check if clicking on resize handle
        if (e.target.classList.contains('resize-handle')) {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(true);
            setResizeHandle(e.target.dataset.handle);
            setSelectedElement(element);
            return;
        }
        
        setIsDragging(true);
        setSelectedElement(element);
        
        const rect = e.currentTarget.getBoundingClientRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        
        if (canvasRect) {
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    }, [isEditing]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging && !isResizing) return;
        if (!selectedElement || !canvasRef.current) return;
        
        e.preventDefault();
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        
        if (isResizing && resizeHandle) {
            // Simple resize implementation
            const currentWidth = selectedElement.style.width || 150;
            const currentHeight = selectedElement.style.height || 150;
            const currentX = selectedElement.position.x;
            const currentY = selectedElement.position.y;
            
            const mouseX = e.clientX - canvasRect.left;
            const mouseY = e.clientY - canvasRect.top;
            
            let newWidth = currentWidth;
            let newHeight = currentHeight;
            let newX = currentX;
            let newY = currentY;
            
            // Simple resize logic
            if (resizeHandle === 'se') {
                newWidth = Math.max(50, mouseX - currentX);
                newHeight = Math.max(50, mouseY - currentY);
            } else if (resizeHandle === 'sw') {
                newWidth = Math.max(50, currentX + currentWidth - mouseX);
                newHeight = Math.max(50, mouseY - currentY);
                newX = mouseX;
            } else if (resizeHandle === 'ne') {
                newWidth = Math.max(50, mouseX - currentX);
                newHeight = Math.max(50, currentY + currentHeight - mouseY);
                newY = mouseY;
            } else if (resizeHandle === 'nw') {
                newWidth = Math.max(50, currentX + currentWidth - mouseX);
                newHeight = Math.max(50, currentY + currentHeight - mouseY);
                newX = mouseX;
                newY = mouseY;
            }
            
            // Constrain to canvas bounds
            newX = Math.max(0, Math.min(newX, canvasRect.width - newWidth));
            newY = Math.max(0, Math.min(newY, canvasRect.height - newHeight));
            
            // Direct state update for better performance
            setTemplateElements(prev => {
                const newElements = [...prev];
                const elementIndex = newElements.findIndex(el => el.id === selectedElement.id);
                if (elementIndex !== -1) {
                    newElements[elementIndex] = {
                        ...newElements[elementIndex],
                        position: { x: newX, y: newY },
                        style: { ...newElements[elementIndex].style, width: newWidth, height: newHeight }
                    };
                }
                return newElements;
            });
        } else if (isDragging) {
            // Handle dragging
            const newX = e.clientX - canvasRect.left - dragOffset.x;
            const newY = e.clientY - canvasRect.top - dragOffset.y;
            
            // Get element dimensions for better constraint calculation
            const elementWidth = selectedElement.style.width || 200;
            const elementHeight = selectedElement.style.height || 50;
            
            // Constrain to canvas bounds with proper element dimensions
            const constrainedX = Math.max(0, Math.min(newX, canvasRect.width - elementWidth));
            const constrainedY = Math.max(0, Math.min(newY, canvasRect.height - elementHeight));
            
            // Use requestAnimationFrame for smoother updates
            requestAnimationFrame(() => {
                setTemplateElements(prev => 
                    prev.map(el => 
                        el.id === selectedElement.id 
                            ? { ...el, position: { x: constrainedX, y: constrainedY } }
                            : el
                    )
                );
            });
        }
    }, [isDragging, isResizing, selectedElement, dragOffset, resizeHandle]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            setDragOffset({ x: 0, y: 0 });
        }
        if (isResizing) {
            setIsResizing(false);
            setResizeHandle(null);
        }
    }, [isDragging, isResizing]);

    // Add event listeners for drag and resize functionality
    useEffect(() => {
        if (isDragging || isResizing) {
            // Use passive: false for better control
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    // Add keyboard shortcut for delete
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Delete' && selectedElement && isEditing) {
                e.preventDefault();
                handleDeleteElement(selectedElement.id);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedElement, isEditing]);

    const renderElement = (element) => {
        const elementStyle = {
            position: 'absolute',
            left: `${element.position.x}px`,
            top: `${element.position.y}px`,
            ...element.style,
            cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default',
            border: selectedElement?.id === element.id ? '2px dashed #007bff' : 'none',
            zIndex: selectedElement?.id === element.id ? 10 : 1,
            userSelect: 'none'
        };

        switch (element.type) {
            case 'text':
                return (
                    <div
                        key={element.id}
                        className={`template-element text-element ${isDragging && selectedElement?.id === element.id ? 'dragging' : ''}`}
                        style={elementStyle}
                        onClick={() => handleElementClick(element)}
                        onMouseDown={(e) => handleMouseDown(e, element)}
                    >
                        {element.content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                            switch (key) {
                                case 'recipient_name':
                                    // For marriage certificates, use groom_name if available, otherwise recipient_name
                                    if (certificate?.certificate_type === 'marriage' && formData.groom_name) {
                                        return formData.groom_name;
                                    }
                                    return formData.recipient_name;
                                case 'certificate_date':
                                    return formData.certificate_date;
                                case 'priest_name':
                                    return priests.find(p => p.id === parseInt(formData.priest_id))?.name || '';
                                case 'groom_name':
                                    return formData.groom_name;
                                case 'bride_name':
                                    return formData.bride_name;
                                case 'unique_reference':
                                    return 'REF-' + Date.now();
                                default:
                                    return match;
                            }
                        })}
                    </div>
                );
            
            case 'image':
                return (
                    <div
                        key={element.id}
                        className={`template-element image-element ${isDragging && selectedElement?.id === element.id ? 'dragging' : ''} ${selectedElement?.id === element.id ? 'selected' : ''}`}
                        style={elementStyle}
                        onClick={() => handleElementClick(element)}
                        onMouseDown={(e) => handleMouseDown(e, element)}
                    >
                        <img
                            src={uploadedImages[element.id] || element.content}
                            alt={element.id}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                        {isEditing && selectedElement?.id === element.id && (
                            <>
                                <div 
                                    className="resize-handle resize-handle-se" 
                                    data-handle="se"
                                    onMouseDown={(e) => handleMouseDown(e, element)}
                                ></div>
                                <div 
                                    className="resize-handle resize-handle-sw" 
                                    data-handle="sw"
                                    onMouseDown={(e) => handleMouseDown(e, element)}
                                ></div>
                                <div 
                                    className="resize-handle resize-handle-ne" 
                                    data-handle="ne"
                                    onMouseDown={(e) => handleMouseDown(e, element)}
                                ></div>
                                <div 
                                    className="resize-handle resize-handle-nw" 
                                    data-handle="nw"
                                    onMouseDown={(e) => handleMouseDown(e, element)}
                                ></div>
                            </>
                        )}
                    </div>
                );
            
            case 'signature':
                return (
                    <div
                        key={element.id}
                        className={`template-element signature-element ${isDragging && selectedElement?.id === element.id ? 'dragging' : ''}`}
                        style={elementStyle}
                        onClick={() => handleElementClick(element)}
                        onMouseDown={(e) => handleMouseDown(e, element)}
                    >
                        <div className="signature-placeholder">
                            {priests.find(p => p.id === parseInt(formData.priest_id))?.esignature_path ? (
                                <img
                                    src={priests.find(p => p.id === parseInt(formData.priest_id))?.esignature_path}
                                    alt="Priest Signature"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <span>Priest Signature</span>
                            )}
                        </div>
                    </div>
                );
            
            case 'decoration':
                return (
                    <div
                        key={element.id}
                        className={`template-element decoration-element ${isDragging && selectedElement?.id === element.id ? 'dragging' : ''}`}
                        style={elementStyle}
                        onClick={() => handleElementClick(element)}
                        onMouseDown={(e) => handleMouseDown(e, element)}
                    >
                        <div className="decoration-content">
                            {element.content}
                        </div>
                    </div>
                );
            
            default:
                return null;
        }
    };

    const saveTemplate = async () => {
        try {
            const updatedTemplate = {
                ...template,
                template_data: {
                    ...template.template_data,
                    elements: templateElements
                }
            };
            
            await api.post('/certificate-generation/template', updatedTemplate);
            alert('Template saved successfully!');
        } catch (err) {
            console.error('Error saving template:', err);
            alert('Failed to save template');
        }
    };

    const generateCertificate = async () => {
        try {
            const certificateData = {
                certificate_request_id: certificate.id,
                certificate_template_id: template.id,
                priest_id: parseInt(formData.priest_id),
                certificate_date: formData.certificate_date,
                certificate_data: {
                    template_elements: templateElements,
                    form_data: formData,
                    uploaded_images: uploadedImages
                },
                notes: formData.notes || ''
            };
            
            const response = await api.post('/certificate-generation/generate', certificateData);
            
            if (response.data.download_url) {
                // Automatically download the PDF
                const link = document.createElement('a');
                link.href = response.data.download_url;
                link.download = `certificate-${response.data.certificate_release.unique_reference}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            alert('Certificate generated successfully! PDF downloaded and email sent to parishioner.');
            
            // Navigate to print page or show success
            navigate('/staff/certificates');
        } catch (err) {
            console.error('Error generating certificate:', err);
            alert('Failed to generate certificate');
        }
    };

    const ElementEditor = () => {
        if (!selectedElement) return null;
        
        return (
            <div className="element-editor">
                <h3>Edit Element: {selectedElement.id}</h3>
                
                <div className="editor-section">
                    <label>Position:</label>
                    <div className="position-controls">
                        <input
                            type="number"
                            placeholder="X"
                            value={selectedElement.position.x}
                            onChange={(e) => handlePositionChange(selectedElement.id, {
                                ...selectedElement.position,
                                x: parseInt(e.target.value) || 0
                            })}
                        />
                        <input
                            type="number"
                            placeholder="Y"
                            value={selectedElement.position.y}
                            onChange={(e) => handlePositionChange(selectedElement.id, {
                                ...selectedElement.position,
                                y: parseInt(e.target.value) || 0
                            })}
                        />
                    </div>
                </div>
                
                {selectedElement.type === 'text' && (
                    <>
                        <div className="editor-section">
                            <label>Font Size:</label>
                            <input
                                type="number"
                                value={selectedElement.style.fontSize || 14}
                                onChange={(e) => handleStyleChange(selectedElement.id, {
                                    fontSize: parseInt(e.target.value) || 14
                                })}
                            />
                        </div>
                        
                        <div className="editor-section">
                            <label>Color:</label>
                            <input
                                type="color"
                                value={selectedElement.style.color || '#000000'}
                                onChange={(e) => handleStyleChange(selectedElement.id, {
                                    color: e.target.value
                                })}
                            />
                        </div>
                        
                        <div className="editor-section">
                            <label>Alignment:</label>
                            <div className="alignment-controls">
                                <button
                                    className={selectedElement.style.textAlign === 'left' ? 'active' : ''}
                                    onClick={() => handleAlignmentChange(selectedElement.id, 'left')}
                                >
                                    ←
                                </button>
                                <button
                                    className={selectedElement.style.textAlign === 'center' ? 'active' : ''}
                                    onClick={() => handleAlignmentChange(selectedElement.id, 'center')}
                                >
                                    ↔
                                </button>
                                <button
                                    className={selectedElement.style.textAlign === 'right' ? 'active' : ''}
                                    onClick={() => handleAlignmentChange(selectedElement.id, 'right')}
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    </>
                )}
                
                {selectedElement.type === 'image' && (
                    <div className="editor-section">
                        <label>Image Upload:</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files[0]) {
                                    handleImageUpload(selectedElement.id, e.target.files[0]);
                                }
                            }}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="upload-image-btn"
                        >
                            📷 Upload New Image
                        </button>
                    </div>
                )}
                
                <div className="editor-section">
                    <label>Size:</label>
                    <div className="size-controls">
                        <input
                            type="number"
                            placeholder="Width"
                            value={selectedElement.style.width || 100}
                            onChange={(e) => handleStyleChange(selectedElement.id, {
                                width: parseInt(e.target.value) || 100
                            })}
                        />
                        <input
                            type="number"
                            placeholder="Height"
                            value={selectedElement.style.height || 100}
                            onChange={(e) => handleStyleChange(selectedElement.id, {
                                height: parseInt(e.target.value) || 100
                            })}
                        />
                    </div>
                </div>
                
                <div className="editor-actions">
                    <button 
                        onClick={() => handleDeleteElement(selectedElement.id)} 
                        className="btn btn-danger"
                        style={{ backgroundColor: '#dc3545', color: 'white', marginRight: '10px' }}
                    >
                        🗑️ Delete Element
                    </button>
                    <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                        Close Editor
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="certificate-generator">
                <div className="loading">Loading certificate data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="certificate-generator">
                <div className="error">{error}</div>
                <button onClick={() => navigate('/staff/certificates')} className="btn btn-primary">
                    Back to Certificates
                </button>
            </div>
        );
    }

    return (
        <div className="certificate-generator">
            <div className="generator-header">
                <h1>Certificate Generator</h1>
                <div className="header-actions">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`btn ${isEditing ? 'btn-warning' : 'btn-info'}`}
                    >
                        {isEditing ? 'Exit Edit Mode' : 'Edit Template'}
                    </button>
                    {isEditing && (
                        <button onClick={handleAddImageElement} className="btn btn-secondary">
                            📷 Add Image
                        </button>
                    )}
                    <button onClick={saveTemplate} className="btn btn-success">
                        Save Template
                    </button>
                    <button onClick={generateCertificate} className="btn btn-primary">
                        Generate Certificate
                    </button>
                </div>
            </div>

            <div className="generator-content">
                <div className="form-panel">
                    <h3>Certificate Information</h3>
                    
                    {/* Show recipient name for non-marriage certificates */}
                    {certificate?.certificate_type !== 'marriage' && (
                        <div className="form-group">
                            <label>Recipient Name:</label>
                            <input
                                type="text"
                                name="recipient_name"
                                value={formData.recipient_name}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="Enter recipient's name"
                            />
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label>Certificate Date:</label>
                        <input
                            type="date"
                            name="certificate_date"
                            value={formData.certificate_date}
                            onChange={handleInputChange}
                            className="form-control"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Priest:</label>
                        <select
                            name="priest_id"
                            value={formData.priest_id}
                            onChange={handleInputChange}
                            className="form-control"
                        >
                            <option value="">Select Priest</option>
                            {priests.map(priest => (
                                <option key={priest.id} value={priest.id}>
                                    {priest.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Show groom/bride fields for marriage certificates */}
                    {certificate?.certificate_type === 'marriage' && (
                        <>
                            <div className="form-group">
                                <label>Groom Name:</label>
                                <input
                                    type="text"
                                    name="groom_name"
                                    value={formData.groom_name}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="Enter groom's name"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Bride Name:</label>
                                <input
                                    type="text"
                                    name="bride_name"
                                    value={formData.bride_name}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="Enter bride's name"
                                />
                            </div>
                        </>
                    )}
                    
                    <div className="form-group">
                        <label>Notes:</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            className="form-control"
                            rows="3"
                        />
                    </div>
                </div>

                <div className="template-panel">
                    <div className="template-container">
                        <div
                            ref={canvasRef}
                            className="certificate-canvas"
                            style={{
                                width: template?.template_data?.dimensions?.width || 800,
                                height: template?.template_data?.dimensions?.height || 600,
                                background: template?.template_data?.background || '#ffffff',
                                border: template?.template_data?.border || '1px solid #ccc',
                                borderRadius: template?.template_data?.borderRadius || '8px',
                                boxShadow: template?.template_data?.boxShadow || '0 4px 8px rgba(0,0,0,0.1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {templateElements.map(renderElement)}
                        </div>
                    </div>
                    
                    {isEditing && <ElementEditor />}
                </div>
            </div>
        </div>
    );
};

export default CertificateGenerator;