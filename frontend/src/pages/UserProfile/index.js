import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './styles.module.css';
import { useNavigate } from 'react-router-dom';

// --- ICONS ---
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;

function UserProfile() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- State for Editing ---
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ firstName: '', lastName: '' });
    const [profileImageFile, setProfileImageFile] = useState(null);

    // Message state used by showTempMessage
    const [message, setMessage] = useState({ type: '', content: '' });

    // This robustly gets user details, handling nested or flat structures
    const userDetails = user?.user || user;

    // API base: prefer REACT_APP_API_URL, otherwise use deployed backend
    const API_BASE = process.env.REACT_APP_API_URL || 'https://lifecare-pathology.onrender.com';

    // Helper to build secure report download URL including token
    const getReportUrl = (filename) => {
        if (!filename) return '';
        const stored = localStorage.getItem('user');
        const token = user?.token || (stored ? (JSON.parse(stored).token || JSON.parse(stored).data) : null);
        const encoded = encodeURIComponent(filename);
        return `${API_BASE}/api/reports/${encoded}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const userDataFromStorage = localStorage.getItem('user');
            if (!userDataFromStorage) {
                setError('You must be logged in to view this page.');
                setLoading(false);
                return;
            }

            const parsedUser = JSON.parse(userDataFromStorage);
            // Always extract user info from 'user' if present
            const currentUserDetails = parsedUser.user || parsedUser;
            setUser(parsedUser);

            setEditData({
                firstName: currentUserDetails.firstName || '',
                lastName: currentUserDetails.lastName || ''
            });

            try {
                const token = parsedUser.token || parsedUser.data;
                if (!token) {
                    setError("Authentication token not found. Please log in again.");
                    setLoading(false);
                    return;
                }

                const config = { headers: { Authorization: `Bearer ${token}` } };

                // Try to fetch user appointments. If this fails (e.g. admin account has no user appointments),
                // do not treat it as a fatal error for the profile page — fall back to empty list.
                let fetched = [];
                try {
                    const resp = await axios.get(`${API_BASE}/api/appointment/my-appointments`, config);
                    fetched = resp?.data;
                } catch (apptErr) {
                    console.warn("Could not fetch user appointments (non-fatal):", apptErr?.response?.status || apptErr.message);
                    fetched = [];
                }

                setAppointments(Array.isArray(fetched) ? fetched : []);
            } catch (err) {
                console.error("Failed to initialize profile:", err);
                setError('Failed to initialize profile. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [navigate]);

    const handleEditToggle = () => setIsEditing(!isEditing);

    const handleInputChange = (e) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        // This is a placeholder. A real implementation would require a backend endpoint.
        alert("Profile update functionality requires a backend endpoint to be built.");
        setIsEditing(false);
        // You would also update the user object in localStorage here
    };

    const handleImageChange = async (e) => {
        if (!(e.target.files && e.target.files[0])) return;
        const file = e.target.files[0];
        // Optimistic UI: show preview immediately
        setProfileImageFile(file);
        // Upload to server
        try {
            const stored = localStorage.getItem('user');
            if (!stored) throw new Error('Not authenticated');
            const parsed = JSON.parse(stored);
            const token = parsed?.token || parsed?.data || parsed?.token;
            if (!token) throw new Error('Token missing');

            const form = new FormData();
            form.append('profile', file);

            const res = await axios.put(`${API_BASE}/api/profile/upload`, form, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });

            const updatedUser = res.data.user || res.data;
            // Preserve token when storing
            const userToStore = { ...(updatedUser || {}), token };
            localStorage.setItem('user', JSON.stringify(userToStore));
            setUser(userToStore);
            setProfileImageFile(null); // clear file object - display comes from server file URL
            showTempMessage('success', 'Profile image uploaded');
        } catch (err) {
            console.error("Upload failed", err);
            setProfileImageFile(null);
            showTempMessage('error', 'Failed to upload profile image');
        }
    };
    
    const handleImageRemove = async () => {
        try {
            const stored = localStorage.getItem('user');
            if (!stored) throw new Error('Not authenticated');
            const parsed = JSON.parse(stored);
            const token = parsed?.token || parsed?.data || parsed?.token;
            if (!token) throw new Error('Token missing');

            const res = await axios.delete(`${API_BASE}/api/profile/remove`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updatedUser = res.data.user || res.data;
            const userToStore = { ...(updatedUser || {}), token };
            localStorage.setItem('user', JSON.stringify(userToStore));
            setUser(userToStore);
            setProfileImageFile(null);
            showTempMessage('success', 'Profile image removed');
        } catch (err) {
            console.error("Remove failed", err);
            showTempMessage('error', 'Failed to remove profile image');
        }
    };

    // small helper for temporary message (reuses existing message state)
    const showTempMessage = (type, content) => {
        setMessage({ type, content });
        setTimeout(() => setMessage({ type: '', content: '' }), 3000);
    };


    if (loading) return <div className={styles.container}><p>Loading your profile...</p></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}><h1>My Profile</h1></header>
            <div className={styles.profileGrid}>
                {/* --- User Info Card --- */}
                <aside className={styles.card}>
                    <div className={styles.profilePictureContainer}>
                        {profileImageFile ? (
                            <img src={URL.createObjectURL(profileImageFile)} alt="Profile" className={styles.profilePicture} />
                        ) : userDetails?.profilePicture ? (
                            <img src={`${API_BASE}/uploads/profiles/${userDetails.profilePicture}`} alt="Profile" className={styles.profilePicture} />
                        ) : (
                            <img src={`https://ui-avatars.com/api/?name=${editData.firstName}+${editData.lastName}&background=random&size=128`} alt="Profile" className={styles.profilePicture} />
                        )}

                        {(profileImageFile || userDetails?.profilePicture) && (
                            <button onClick={handleImageRemove} className={styles.removeImageButton}>×</button>
                        )}

                        <label htmlFor="profile-upload" className={styles.uploadOverlay}>
                            <UploadIcon />
                            <span>Change</span>
                        </label>
                        <input id="profile-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>

                    {!isEditing ? (
                        <div className={styles.userInfo}>
                            <h2>{editData.firstName} {editData.lastName}</h2>
                            <p>{userDetails?.email}</p>
                            <button onClick={handleEditToggle} className={styles.editButton}><EditIcon /> Edit Profile</button>
                        </div>
                    ) : (
                        <form onSubmit={handleProfileUpdate} className={styles.editForm}>
                            <input
                                type="text"
                                name="firstName"
                                value={editData.firstName}
                                onChange={handleInputChange}
                                placeholder="First Name"
                            />
                            <input
                                type="text"
                                name="lastName"
                                value={editData.lastName}
                                onChange={handleInputChange}
                                placeholder="Last Name"
                            />
                            <div className={styles.formActions}>
                                <button type="button" onClick={handleEditToggle} className={styles.cancelButton}>Cancel</button>
                                <button type="submit" className={styles.saveButton}>Save</button>
                            </div>
                        </form>
                    )}
                </aside>

                {/* --- Appointments Section --- */}
                <main className={styles.card}>
                    <div className={styles.cardHeader}><CalendarIcon /><h2>My Appointments</h2></div>
                    <div className={styles.appointmentsListContainer}>
                        <header className={styles.appointmentsHeader}>
                            <span>Patient Name</span>
                            <span>Date</span>
                            <span>Services</span>
                            <span>Total Price</span>
                            <span>Payment</span>
                            <span>Tested</span>
                            <span>Report</span>
                        </header>
                        <div className={styles.appointmentCardsWrapper}>
                            {appointments.length > 0 ? (
                                appointments.map(app => (
                                    <div key={app._id} className={styles.appointmentCard}>
                                        <div className={styles.appointmentData} data-label="Patient:">{app.name}</div>
                                        <div className={styles.appointmentData} data-label="Date:">{new Date(app.date).toLocaleDateString()}</div>
                                        <div className={styles.appointmentData} data-label="Services:">
                                            <ul className={styles.serviceList}>
                                                {(app.tests || []).map(t => <li key={t._id}>{t.name}</li>)}
                                                {(app.profiles || []).map(p => <li key={p._id}>{p.name} (Profile)</li>)}
                                            </ul>
                                        </div>
                                        <div className={styles.appointmentData} data-label="Price:">Rs. {app.totalPrice}</div>
                                        <div className={styles.appointmentData} data-label="Payment:">{app.isPaymentDone ? "Paid" : "Unpaid"}</div>
                                        <div className={styles.appointmentData} data-label="Tested:"><span className={`${styles.status} ${styles[app.tested?.toLowerCase()]}`}>{app.tested}</span></div>
                                        <div className={styles.appointmentData} data-label="Report:">
                                            {app.status === 'Confirmed' && app.tested === 'Done' && app.report ? (
                                                <a
                                                    href={getReportUrl(app.report)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.downloadButton}
                                                >
                                                    <DownloadIcon /> Download
                                                </a>
                                            ) : (
                                                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>Pending</span>
                                            )}

                                        </div>
                                    </div>
                                ))
                            ) : (<p>You have not booked any appointments yet.</p>)}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default UserProfile;


