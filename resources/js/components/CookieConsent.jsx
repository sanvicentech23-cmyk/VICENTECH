import React, { useEffect, useState } from 'react';
import axios from 'axios';

function generateCookieId() {
    const existing = localStorage.getItem('guest_cookie_id');
    if (existing) return existing;
    const id = 'g-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('guest_cookie_id', id);
    return id;
}

export default function CookieConsent({ user }) {
    const [visible, setVisible] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [visitStartTime, setVisitStartTime] = useState(null);
    const [currentVisitId, setCurrentVisitId] = useState(null);

    useEffect(() => {
        const hasConsent = localStorage.getItem('cookie_consent_accepted') === 'true';
        const isLoggedIn = !!user;
        
        // Only show cookie consent for parishioners (regular users), not for admin/staff/priest
        // Handle both boolean and integer values (0/1) for role fields
        const isAdmin = user && (user.is_admin === true || user.is_admin === 1 || user.is_admin === "1");
        const isStaff = user && (user.is_staff === true || user.is_staff === 1 || user.is_staff === "1");
        const isPriest = user && (user.is_priest === true || user.is_priest === 1 || user.is_priest === "1");
        const isParishioner = user && !isAdmin && !isStaff && !isPriest;
        const shouldShow = !hasConsent && (isParishioner || !isLoggedIn);
        
        setVisible(shouldShow);
        
        // Track visit start time
        if (shouldShow) {
            setVisitStartTime(Date.now());
        }
    }, [user]);

    // Track page views and visit duration
    useEffect(() => {
        const hasConsent = localStorage.getItem('cookie_consent_accepted') === 'true';
        const isLoggedIn = !!user;
        
        // Only track for parishioners (regular users) or guests, not for admin/staff/priest
        // Handle both boolean and integer values (0/1) for role fields
        const isAdmin = user && (user.is_admin === true || user.is_admin === 1 || user.is_admin === "1");
        const isStaff = user && (user.is_staff === true || user.is_staff === 1 || user.is_staff === "1");
        const isPriest = user && (user.is_priest === true || user.is_priest === 1 || user.is_priest === "1");
        const isParishioner = user && !isAdmin && !isStaff && !isPriest;
        const shouldTrack = hasConsent && (isParishioner || !isLoggedIn);
        
        if (shouldTrack) {
            const cookieId = generateCookieId();
            
            // Track page view
            const trackPageView = async () => {
                try {
                    await axios.post('/api/guest-visits/track-page', {
                        cookie_id: cookieId,
                        url_path: window.location.pathname + window.location.search
                    });
                } catch (e) {
                    // ignore failures
                }
            };
            
            trackPageView();
            
            // Track visit end when user leaves
            const handleBeforeUnload = async () => {
                if (currentVisitId) {
                    const sessionDuration = Math.floor((Date.now() - visitStartTime) / 1000);
                    try {
                        await axios.put(`/api/guest-visits/${currentVisitId}`, {
                            visit_end: new Date().toISOString(),
                            session_duration: sessionDuration
                        });
                    } catch (e) {
                        // ignore failures
                    }
                }
            };
            
            window.addEventListener('beforeunload', handleBeforeUnload);
            
            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [user, currentVisitId, visitStartTime]);

    const accept = async () => {
        const cookieId = generateCookieId();
        try {
            const response = await axios.post('/api/guest-visits', {
                cookie_id: cookieId,
                accepted: true,
                url_path: window.location.pathname + window.location.search,
                visit_start: new Date().toISOString(),
                pages_viewed: [window.location.pathname + window.location.search]
            });
            setCurrentVisitId(response.data.data.id);
        } catch (e) {
            // ignore failures; still hide the banner
        }
        localStorage.setItem('cookie_consent_accepted', 'true');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-50">
                <div className="mx-auto max-w-6xl m-3 md:m-4 p-3 md:p-4 rounded-md bg-gray-900 text-white shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                        <div className="text-sm md:text-base leading-6 md:leading-7">
                            We use cookies to personalize content, remember preferences, and analyze traffic. By clicking Accept, you consent to the use of cookies as described.
                            {' '}
                            <button
                                onClick={() => setShowInfo(true)}
                                className="underline text-amber-400 hover:text-amber-300 focus:outline-none ml-1 inline-block"
                            >Learn more</button>
                        </div>
                        <div className="flex items-stretch md:items-center gap-2 w-full md:w-auto">
                            <button onClick={accept} className="w-full md:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded text-sm font-medium">Accept</button>
                        </div>
                    </div>
                </div>
            </div>

            {showInfo && (
                <div className="fixed inset-0 z-50 bg-black/50 p-3 md:p-4 overflow-y-auto flex">
                    <div className="bg-white rounded-md md:rounded-lg shadow-xl w-full max-w-2xl md:max-w-3xl m-auto p-4 md:p-6 text-gray-800">
                        <div className="flex items-start justify-between mb-3 md:mb-4 gap-3">
                            <h3 className="text-base md:text-lg font-semibold text-gray-900">About Cookies and Data Use</h3>
                            <button onClick={() => setShowInfo(false)} className="text-gray-500 hover:text-gray-700 shrink-0" aria-label="Close">✕</button>
                        </div>
                        <div className="space-y-3 md:space-y-4 text-sm md:text-[0.95rem] leading-6 md:leading-7">
                            <p>
                                We use strictly necessary cookies to keep the site secure and working, and optional cookies to improve your experience (for example, remembering preferences and measuring site usage).
                            </p>
                            <p>
                                When you accept cookies as a guest, we store a non-identifying cookie ID and basic visit details (IP address, browser user agent, page path, and timestamp). This helps us understand visits and maintain service quality. We do not sell your data.
                            </p>
                            <p>
                                You can clear your consent anytime by deleting site data in your browser settings. For questions, contact the parish office.
                            </p>
                        </div>
                        <div className="mt-4 md:mt-5 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2 md:gap-3">
                            <button onClick={() => setShowInfo(false)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 w-full md:w-auto">Close</button>
                            <button onClick={() => { setShowInfo(false); accept(); }} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded w-full md:w-auto">Accept & Continue</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


