import React, { useState, useEffect } from "react";
import AdminEvents from "./AdminEvents";
import { api } from "../../utils/axios"; // Make sure this points to your axios instance

const AdminEventsContainer = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingEventId, setEditingEventId] = useState(null);
    const [eventFields, setEventFields] = useState({
        title: "",
        date: "",
        time: "",
        location: "",
        description: "",
        image: null,
    });
    const [eventImagePreview, setEventImagePreview] = useState("");

    const fetchEvents = () => {
        api.get("/events").then((res) => {
            // Defensive: ensure events is always an array
            if (Array.isArray(res.data)) {
                setEvents(res.data);
            } else if (res.data && Array.isArray(res.data.data)) {
                setEvents(res.data.data);
            } else {
                setEvents([]);
            }
            setLoading(false);
        }).catch((error) => {
            console.error('Failed to fetch events:', error);
            setEvents([]);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    // Minimal handler for image file
    const handleEventImageFile = (e, setFields, setPreview) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            setFields((prev) => ({ ...prev, image: file }));
            const reader = new FileReader();
            reader.onload = (ev) => setPreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    if (loading) {
        return <div className="loading-users">Loading events...</div>;
    }

    return (
        <AdminEvents
            events={events}
            editingEventId={editingEventId}
            eventFields={eventFields}
            eventImagePreview={eventImagePreview}
            setEditingEventId={setEditingEventId}
            setEventFields={setEventFields}
            setEventImagePreview={setEventImagePreview}
            setEvents={setEvents}
            handleEventImageFile={handleEventImageFile}
            fetchEvents={fetchEvents}
        />
    );
};

export default AdminEventsContainer;
