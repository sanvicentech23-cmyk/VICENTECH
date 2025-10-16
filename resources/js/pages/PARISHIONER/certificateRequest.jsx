import React, { useState } from 'react';
import '../../../css/certificateRequest.css';
import { api } from '../../utils/axios'; // Make sure this import is present

const CertificateRequest = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        birthdate: '',
        email: '',
        phone: '',
        address: '',
        certificateType: '',
        purpose: '',
        dateNeeded: '',
        additionalInfo: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    
    // Certificate validation states
    const [showValidation, setShowValidation] = useState(false);
    const [validationData, setValidationData] = useState({
        referenceNumber: ''
    });
    const [validationResult, setValidationResult] = useState(null);
    const [validationLoading, setValidationLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/certificate-requests', formData);
            setShowPopup(true);
            setFormData({
                firstName: '',
                lastName: '',
                birthdate: '',
                email: '',
                phone: '',
                address: '',
                certificateType: '',
                purpose: '',
                dateNeeded: '',
                additionalInfo: ''
            });
        } catch (error) {
            alert('Failed to submit request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Certificate validation handlers
    const handleValidationChange = (e) => {
        const { name, value } = e.target;
        setValidationData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleValidateCertificate = async (e) => {
        e.preventDefault();
        if (!validationData.referenceNumber.trim()) {
            alert('Please enter a reference number');
            return;
        }

        setValidationLoading(true);
        try {
            const response = await api.get(`/certificate-validation/${validationData.referenceNumber}`);
            setValidationResult(response.data);
        } catch (error) {
            if (error.response?.status === 404) {
                setValidationResult({ error: 'Certificate not found. Please check your reference number.' });
            } else {
                setValidationResult({ error: 'Failed to validate certificate. Please try again.' });
            }
        } finally {
            setValidationLoading(false);
        }
    };

    const resetValidation = () => {
        setValidationData({ referenceNumber: '' });
        setValidationResult(null);
        setShowValidation(false);
    };

    return (
        <div className="certificate-page min-h-screen pb-20">
            {/* Loading Overlay */}
            {loading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <div className="loading-text">Submitting your request...</div>
                </div>
            )}
            {/* Popup Modal */}
            {showPopup && (
                <div className="popup-modal">
                    <div className="popup-content">
                        <h2 className="popup-title">Request Submitted!</h2>
                        <p className="popup-message">Your certificate request has been submitted successfully. We will contact you for pickup or delivery arrangements.</p>
                        <button className="popup-close" onClick={() => setShowPopup(false)}>Close</button>
                    </div>
                </div>
            )}
            <section className="certificate-hero text-center">
                <div className="bg-white border border-[#f2e4ce] shadow-lg p-8 pb-10 w-full mt-6 relative">
                    {/* Validate Certificate Button - Upper Right */}
                    <div className="absolute top-6 right-6">
                        <button
                            onClick={() => setShowValidation(!showValidation)}
                            className="bg-[#CD8B3E] text-white px-6 py-3 rounded-lg hover:bg-[#B77B35] transition duration-300 font-medium"
                        >
                            Validate Certificate
                        </button>
                    </div>
                    
                    <h1 className="text-5xl font-extrabold text-[#3F2E1E] mb-3 tracking-tight font-['Times_New_Roman']">Certificate Request</h1>
                    <p className="text-lg text-[#5C4B38] max-w-2xl mx-auto leading-relaxed">
                        Request your church certificates and documents. Fill out the form below to process your request.
                    </p>
                </div>
            </section>

            {/* Certificate Request Form */}
            <div className={`bg-white border border-[#f2e4ce] rounded-2xl shadow-lg p-8 max-w-6xl mx-auto -mt-16 ${showValidation ? 'blur-sm' : ''}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block mb-2 text-sm font-medium text-[#3F2E1E]">First Name</label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Last Name</label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="birthdate" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Date of Birth</label>
                            <input
                                type="date"
                                id="birthdate"
                                name="birthdate"
                                value={formData.birthdate}
                                onChange={handleChange}
                                className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="certificateType" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Type of Certificate</label>
                            <select
                                id="certificateType"
                                name="certificateType"
                                value={formData.certificateType}
                                onChange={handleChange}
                                className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                                required
                            >
                                <option value="">Select certificate type</option>
                                <option value="baptism">Baptismal Certificate</option>
                                <option value="confirmation">Confirmation Certificate</option>
                                <option value="marriage">Marriage Certificate</option>
                                <option value="death">Death Certificate</option>
                                <option value="membership">Church Membership Certificate</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Contact Number</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="address" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Complete Address</label>
                        <textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                            rows="2"
                            required
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="purpose" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Purpose of Request</label>
                        <textarea
                            id="purpose"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                            rows="2"
                            placeholder="Please specify the purpose of your certificate request"
                            required
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="dateNeeded" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Date Needed</label>
                        <input
                            type="date"
                            id="dateNeeded"
                            name="dateNeeded"
                            value={formData.dateNeeded}
                            onChange={handleChange}
                            className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="additionalInfo" className="block mb-2 text-sm font-medium text-[#3F2E1E]">Additional Information</label>
                        <textarea
                            id="additionalInfo"
                            name="additionalInfo"
                            value={formData.additionalInfo}
                            onChange={handleChange}
                            className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E]"
                            rows="3"
                            placeholder="Any additional information that might help process your request"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#CD8B3E] text-white py-3 px-4 rounded-lg hover:bg-[#B77B35] transition duration-300"
                    >
                        Submit Request
                    </button>

                    <div className="text-center text-sm text-[#5C4B38]">
                        We will process your request and contact you for pickup or delivery arrangements
                    </div>
                    </form>
                </div>

            {/* Certificate Validation Popup */}
            {showValidation && (
                <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            {/* Close Button */}
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => setShowValidation(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                                >
                                    ×
                                </button>
                            </div>
                            
                            <h2 className="text-3xl font-bold text-[#3F2E1E] mb-6 text-center">Certificate Validation</h2>
                            <p className="text-[#5C4B38] text-center mb-6">
                                Enter your certificate reference number to verify its authenticity and view certificate details.
                            </p>
                            
                            <form onSubmit={handleValidateCertificate} className="space-y-4">
                                <div className="max-w-md mx-auto">
                                    <label htmlFor="referenceNumber" className="block mb-2 text-sm font-medium text-[#3F2E1E]">
                                        Reference Number
                                    </label>
                                    <input
                                        type="text"
                                        id="referenceNumber"
                                        name="referenceNumber"
                                        value={validationData.referenceNumber}
                                        onChange={handleValidationChange}
                                        className="w-full p-3 border border-[#f2e4ce] rounded-lg focus:ring-2 focus:ring-[#CD8B3E] focus:border-[#CD8B3E] text-center font-mono"
                                        placeholder="Enter reference number (e.g., REF-1234567890-ABC123)"
                                        required
                                    />
                                </div>
                                
                                <div className="text-center">
                                    <button
                                        type="submit"
                                        disabled={validationLoading}
                                        className="bg-[#CD8B3E] text-white py-3 px-8 rounded-lg hover:bg-[#B77B35] transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {validationLoading ? 'Validating...' : 'Validate Certificate'}
                                    </button>
                                </div>
                            </form>

                            {/* Validation Result */}
                            {validationResult && (
                                <div className="mt-8">
                                    {validationResult.error ? (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                            <div className="text-red-600 text-lg font-medium mb-2">❌ Validation Failed</div>
                                            <p className="text-red-700">{validationResult.error}</p>
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                            <div className="text-green-600 text-lg font-medium mb-4 text-center">✅ Certificate Valid</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-lg border">
                                                    <h3 className="font-semibold text-[#3F2E1E] mb-3">Certificate Details</h3>
                                                    <div className="space-y-2 text-sm">
                                                        <div><strong>Type:</strong> {validationResult.certificate_type}</div>
                                                        <div><strong>Recipient:</strong> {validationResult.recipient_name}</div>
                                                        <div><strong>Date:</strong> {new Date(validationResult.certificate_date).toLocaleDateString()}</div>
                                                        <div><strong>Priest:</strong> {validationResult.priest_name}</div>
                                                        <div><strong>Reference:</strong> <span className="font-mono bg-gray-100 px-2 py-1 rounded">{validationResult.unique_reference}</span></div>
                                                        <div><strong>Status:</strong> <span className="text-green-600 font-medium">{validationResult.status}</span></div>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border">
                                                    <h3 className="font-semibold text-[#3F2E1E] mb-3">Security Information</h3>
                                                    <div className="space-y-2 text-sm">
                                                        <div><strong>Generated:</strong> {new Date(validationResult.created_at).toLocaleDateString()}</div>
                                                        <div><strong>Last Updated:</strong> {new Date(validationResult.updated_at).toLocaleDateString()}</div>
                                                        {validationResult.emailed_at && (
                                                            <div><strong>Email Sent:</strong> {new Date(validationResult.emailed_at).toLocaleDateString()}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 text-center">
                                                <button
                                                    onClick={resetValidation}
                                                    className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
                                                >
                                                    Validate Another Certificate
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CertificateRequest; 