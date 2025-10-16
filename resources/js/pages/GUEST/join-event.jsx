import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/axios';
import '../../../css/events.css';

const JoinEvent = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        terms_accepted: false
    });

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await api.get(`/events/${eventId}`);
                setEvent(response.data);
            } catch (error) {
                console.error('Error fetching event:', error);
                setMessage('Event not found or no longer available.');
                setMessageType('error');
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            fetchEvent();
        } else {
            setLoading(false);
            setMessage('No event specified.');
            setMessageType('error');
        }
    }, [eventId]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.terms_accepted) {
            setMessage('Please accept the terms and conditions to proceed.');
            setMessageType('error');
            return;
        }

        setSubmitting(true);
        setMessage('');

        try {
            const response = await api.post(`/events/${eventId}/join`, formData);
            
            // Send analytics data for event registration
            try {
                await api.post('/analytics/event-registration', {
                    event_id: eventId,
                    event_title: event?.title || 'Unknown Event',
                    registration_date: new Date().toISOString(),
                    participant_data: {
                        name: `${formData.first_name} ${formData.last_name}`,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address
                    }
                });
            } catch (analyticsError) {
                console.warn('Analytics tracking failed:', analyticsError);
                // Don't show error to user, just log it
            }
            
            setMessage('Your registration has been submitted successfully! You will receive a confirmation email shortly.');
            setMessageType('success');
            
            // Reset form
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                address: '',
                terms_accepted: false
            });

            // Redirect to events page after 3 seconds
            setTimeout(() => {
                navigate('/events');
            }, 3000);

        } catch (error) {
            console.error('Error submitting registration:', error);
            setMessage(error.response?.data?.message || 'An error occurred while submitting your registration. Please try again.');
            setMessageType('error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="events-page min-h-screen pb-20">
                <section className="events-hero text-center">
                    <div className="bg-white border border-[#f2e4ce] shadow-lg p-8 pb-10 w-full mt-6">
                        <h1 className="text-5xl font-extrabold text-[#3F2E1E] mb-3 tracking-tight font-['Times_New_Roman']">Join Event</h1>
                        <p className="text-lg text-[#5C4B38] max-w-2xl mx-auto leading-relaxed">
                            Loading event details...
                        </p>
                    </div>
                </section>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="events-page min-h-screen pb-20">
                <section className="events-hero text-center">
                    <div className="bg-white border border-[#f2e4ce] shadow-lg p-8 pb-10 w-full mt-6">
                        <h1 className="text-5xl font-extrabold text-[#3F2E1E] mb-3 tracking-tight font-['Times_New_Roman']">Event Not Found</h1>
                        <p className="text-lg text-[#5C4B38] max-w-2xl mx-auto leading-relaxed">
                            The event you're looking for is not available.
                        </p>
                        <button 
                            onClick={() => navigate('/events')}
                            className="mt-4 bg-[#3F2E1E] text-white px-6 py-2 rounded-lg hover:bg-[#2A1F15] transition-colors"
                        >
                            Back to Events
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="events-page min-h-screen pb-20">
            {/* Hero Section */}
            <section className="events-hero text-center">
                <div className="bg-white border border-[#f2e4ce] shadow-lg p-8 pb-10 w-full mt-6">
                    <h1 className="text-5xl font-extrabold text-[#3F2E1E] mb-3 tracking-tight font-['Times_New_Roman']">Join Event</h1>
                    <p className="text-lg text-[#5C4B38] max-w-2xl mx-auto leading-relaxed">
                        Register to participate in our parish event
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <div className="bg-white border border-[#f2e4ce] rounded-2xl shadow-lg p-8 max-w-4xl mx-auto -mt-16">
                
                {/* Event Details */}
                <div className="mb-8 p-6 bg-[#FFF6E5] border border-[#f3ddbe] rounded-lg">
                    <h2 className="text-2xl font-bold text-[#3F2E1E] mb-4">{event.title}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[#5C4B38]">
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>{event.date ? new Date(event.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric'
                            }) : 'Date TBA'}</span>
                        </div>
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            <span>{event.time || 'Time TBA'}</span>
                        </div>
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <span>{event.location || 'Location TBA'}</span>
                        </div>
                    </div>
                    {event.description && (
                        <p className="mt-4 text-[#5C4B38]">{event.description}</p>
                    )}
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${
                        messageType === 'success' 
                            ? 'bg-green-100 border border-green-300 text-green-700' 
                            : 'bg-red-100 border border-red-300 text-red-700'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div>
                        <h3 className="text-xl font-semibold text-[#3F2E1E] mb-4 border-b border-[#f2e4ce] pb-2">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#3F2E1E] mb-2">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-[#f3ddbe] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F2E1E] focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#3F2E1E] mb-2">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-[#f3ddbe] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F2E1E] focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#3F2E1E] mb-2">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-[#f3ddbe] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F2E1E] focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#3F2E1E] mb-2">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-[#f3ddbe] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F2E1E] focus:border-transparent"
                                />
                            </div>

                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-[#3F2E1E] mb-2">
                                Address
                            </label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                rows="2"
                                className="w-full px-3 py-2 border border-[#f3ddbe] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F2E1E] focus:border-transparent"
                            />
                        </div>
                    </div>





                    {/* Terms and Conditions */}
                    <div>
                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                name="terms_accepted"
                                checked={formData.terms_accepted}
                                onChange={handleInputChange}
                                required
                                className="mt-1 mr-3 h-4 w-4 text-[#3F2E1E] focus:ring-[#3F2E1E] border-[#f3ddbe] rounded"
                            />
                            <label className="text-sm text-[#5C4B38]">
                                I agree to the terms and conditions and understand that my registration is subject to approval. 
                                I consent to the collection and use of my personal information for event registration purposes. 
                                <span className="text-red-500"> *</span>
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-between items-center pt-6">
                        <button
                            type="button"
                            onClick={() => navigate('/events')}
                            className="px-6 py-2 border border-[#3F2E1E] text-[#3F2E1E] rounded-lg hover:bg-[#3F2E1E] hover:text-white transition-colors"
                        >
                            Back to Events
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2 bg-[#3F2E1E] text-white rounded-lg hover:bg-[#2A1F15] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Submitting...' : 'Register for Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JoinEvent;