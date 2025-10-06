import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import styles from './styles.module.css';

// Simple Icon components
const TestIcon = () => <i className="fas fa-vial"></i>;
const ProfileIcon = () => <i className="fas fa-layer-group"></i>;
const AppointmentIcon = () => <i className="fas fa-calendar-check"></i>;
function AdminManagement() {
    // --- STATE ---
    const [adminUser, setAdminUser] = useState(null);
    const [loginData, setLoginData] = useState({ email: '', password: '' });

    const [individualTests, setIndividualTests] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [contacts, setContacts] = useState([]);

    const [newTest, setNewTest] = useState({ name: '', price: '' });
    const [editingTestId, setEditingTestId] = useState(null);

    const [profileForm, setProfileForm] = useState({ id: null, name: '', price: '', description: '', tests: [] });

    const [activeTab, setActiveTab] = useState('tests');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', content: '' });

    // Report upload state
    const [reportFiles, setReportFiles] = useState({}); // { appointmentId: File }
    const [uploadingReportId, setUploadingReportId] = useState(null);

    // API base used by this module (prefer env var; fallback to deployed backend)
    const API_BASE = process.env.REACT_APP_API_URL || 'https://lifecare-pathology.onrender.com';

    // --- DATA FETCH ---
    const fetchData = useCallback(async (token) => {
        setLoading(true);
        try {
            // fetch public endpoints first (tests & profiles)
            const [testsRes, profilesRes] = await Promise.all([
                axios.get(`${API_BASE}/api/tests/`),
                axios.get(`${API_BASE}/api/profiles/`),
            ]);

            // Normalize tests response to always be an array
            const testsPayload = testsRes?.data;
            const testsArray = Array.isArray(testsPayload)
                ? testsPayload
                : (testsPayload?.tests || testsPayload?.data || []);
            setIndividualTests(testsArray);

            // Normalize profiles response to always be an array
            const profilesPayload = profilesRes?.data;
            const profilesArray = Array.isArray(profilesPayload)
                ? profilesPayload
                : (profilesPayload?.profiles || profilesPayload?.data || []);
            setProfiles(profilesArray);

            // Only call protected appointments endpoint when token exists
            if (token) {
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    const appointmentsRes = await axios.get(`${API_BASE}/api/appointment/getAllAppointments`, config);
                    const apptsPayload = appointmentsRes?.data;
                    const apptsArray = Array.isArray(apptsPayload) ? apptsPayload : (apptsPayload?.data || []);
                    setAppointments((apptsArray || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
                } catch (apptErr) {
                    // Show concise info and user-facing message
                    const status = apptErr?.response?.status;
                    const serverMessage = apptErr?.response?.data?.message || apptErr?.response?.data || apptErr.message;
                    console.warn("Appointments fetch failed:", status, serverMessage);
                    showMessage('error', `Could not load appointments (${status || 'error'}). ${serverMessage ? serverMessage : ''}`);
                    setAppointments([]);
                }
            } else {
                // no token: clear appointments
                setAppointments([]);
            }

            // Fetch feedbacks and contacts for admin tab
            if (token) {
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    // Feedback
                    const feedbackRes = await axios.get(`${API_BASE}/api/feedback/`, config);
                    setFeedbacks(feedbackRes.data?.reviews || []);
                    // Contacts
                    const contactRes = await axios.get(`${API_BASE}/api/contact/`, config);
                    setContacts(contactRes.data || []);
                } catch (err) {
                    console.warn("Feedback/Contact fetch failed:", err?.message);
                    setFeedbacks([]);
                    setContacts([]);
                }
            } else {
                setFeedbacks([]);
                setContacts([]);
            }
        } catch (error) {
            console.warn("Failed to fetch tests/profiles:", error?.message || error);
            showMessage('error', 'Failed to fetch tests or profiles. Is the backend running?');
        } finally {
            setLoading(false);
        }
    }, [API_BASE]);

    // Retry helper for appointments (used by the Retry button in the Appointments tab)
    const retryAppointments = useCallback(() => {
        if (adminUser && (adminUser.token || adminUser.data)) {
            const token = adminUser.token || adminUser.data;
            fetchData(token);
        } else {
            showMessage('error', 'Admin token missing — please log in again.');
        }
    }, [adminUser, fetchData]);

    // --- AUTH LOAD ---
    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const user = JSON.parse(loggedInUser);
            if (user && user.token) {
                setAdminUser(user);
                fetchData(user.token);
            } else setLoading(false);
        } else setLoading(false);
    }, [fetchData]);

    // --- LOGIN ---
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${API_BASE}/api/auth/Login`, loginData);
            // backend returns { data: <token>, user: { ... } }
            const token = response.data?.data;
            const isAdmin = response.data?.user?.isAdmin || response.data?.isAdmin || false;

            if (token && isAdmin) {
                const userObject = {
                    user: {
                        email: loginData.email,
                        isAdmin,
                        firstName: response.data?.user?.firstName || '',
                        lastName: response.data?.user?.lastName || ''
                    },
                    token
                };
                localStorage.setItem('user', JSON.stringify(userObject));
                setAdminUser(userObject);
                fetchData(token);
                showMessage('success', 'Login successful!');
                window.dispatchEvent(new Event('userLoggedIn'));
            } else {
                showMessage('error', 'You are not authorized as an admin.');
            }
        } catch (error) {
            console.error("Admin login error:", error);
            showMessage('error', error.response?.data?.message || 'Invalid admin email or password.');
        }
    };

    const handleLogout = () => { 
        localStorage.removeItem('user'); 
        setAdminUser(null); 
        window.dispatchEvent(new Event('userLoggedOut')); };
    const showMessage = (type, content) => {
          setMessage({ type, content });
         setTimeout(() => setMessage({ type: '', content: '' }), 3500);
    };
    // --- TESTS CRUD ---
    const handleAddTest = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${adminUser.token}` } };
            if (editingTestId) {
                await axios.put(`${API_BASE}/api/tests/${editingTestId}`, newTest, config);
                showMessage('success', 'Test updated successfully!');
            } else {
                await axios.post(`${API_BASE}/api/tests/`, newTest, config);
                showMessage('success', 'Individual test added!');
            }
            setNewTest({ name: '', price: '' });
            setEditingTestId(null);
            fetchData(adminUser.token);
        } catch (error) {
            showMessage('error', editingTestId ? 'Failed to update test.' : 'Failed to add test.');
        }
    };

    const handleDeleteTest = async (id) => {
        if (window.confirm('Are you sure? This will also remove the test from any profiles.')) {
            try {
                const config = { headers: { Authorization: `Bearer ${adminUser.token}` } };
                await axios.delete(`${API_BASE}/api/tests/${id}`, config);
                showMessage('success', 'Test deleted.');
                fetchData(adminUser.token);
            } catch (error) {
                showMessage('error', 'Failed to delete test.');
            }
        }
    };

    const handleEditTestClick = (test) => {
        setEditingTestId(test._id);
        setNewTest({ name: test.name, price: String(test.price) });
        setActiveTab('tests');
    };

    const cancelEditTest = () => {
        setEditingTestId(null);
        setNewTest({ name: '', price: '' });
    };

    const handleTestFormChange = (e) => setNewTest({ ...newTest, [e.target.name]: e.target.value });

    // --- PROFILES CRUD ---
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        const { id, name, price, description, tests } = profileForm;
        const data = { name, price, description, tests };
        const config = { headers: { Authorization: `Bearer ${adminUser.token}` } };
        try {
            if (id) {
                await axios.put(`${API_BASE}/api/profiles/${id}`, data, config);
                showMessage('success', 'Profile updated successfully!');
            } else {
                await axios.post(`${API_BASE}/api/profiles/`, data, config);
                showMessage('success', 'Profile added successfully!');
            }
            cancelProfileEdit();
            fetchData(adminUser.token);
        } catch (error) {
            showMessage('error', `Failed to ${id ? 'update' : 'add'} profile.`);
        }
    };

    // Toggle test id (string) in profileForm.tests
    const handleProfileTestCheckboxChange = (testId) => {
        const idStr = testId?.toString();
        setProfileForm(prev => {
            const exists = prev.tests.map(x => x.toString()).includes(idStr);
            const newTests = exists ? prev.tests.filter(id => id.toString() !== idStr) : [...prev.tests, idStr];
            return { ...prev, tests: newTests };
        });
    };

    const handleEditProfileClick = (profile) => {
        // Normalize profile.tests to array of id strings
        const testsIds = (profile.tests || []).map(t => {
            if (!t) return null;
            if (typeof t === 'object') return t._id ? t._id.toString() : (t.toString && t.toString());
            return t.toString();
        }).filter(Boolean);

        setProfileForm({
            id: profile._id,
            name: profile.name,
            price: profile.price,
            description: profile.description,
            tests: testsIds
        });
        setActiveTab('profiles');
    };

    const cancelProfileEdit = () => setProfileForm({ id: null, name: '', price: '', description: '', tests: [] });

    const handleDeleteProfile = async (id) => {
        if (window.confirm('Are you sure?')) {
            try {
                const config = { headers: { Authorization: `Bearer ${adminUser.token}` } };
                await axios.delete(`${API_BASE}/api/profiles/${id}`, config);
                showMessage('success', 'Profile deleted.');
                fetchData(adminUser.token);
            } catch (error) {
                showMessage('error', 'Failed to delete profile.');
            }
        }
    };

    // keep form values; ensure tests are stored as strings
    const handleProfileFormChange = (e) => setProfileForm({ ...profileForm, [e.target.name]: e.target.value });

    const getTestPriceById = useCallback((id) => {
        if (!id) return 0;
        const idStr = id.toString();
        const t = individualTests.find(x => (x._id && x._id.toString ? x._id.toString() === idStr : x._id === idStr));
        return t ? Number(t.price) || 0 : 0;
    }, [individualTests]);

    const selectedTestsTotal = useMemo(() => profileForm.tests.reduce((sum, id) => sum + getTestPriceById(id), 0), [profileForm.tests, getTestPriceById]);
    const selectedSave = useMemo(() => Math.max(0, selectedTestsTotal - Number(profileForm.price || 0)), [selectedTestsTotal, profileForm.price]);

    // --- UPDATE APPOINTMENT STATUS ---
    const handleUpdateAppointmentStatus = async (id, status) => {
        try {
            const config = { headers: { Authorization: `Bearer ${adminUser.token}` } };
            await axios.put(`${API_BASE}/api/appointment/updateStatus/${id}`, { status }, config);
            showMessage('success', 'Status updated!');
            fetchData(adminUser.token);
        } catch (error) {
            showMessage('error', 'Failed to update status.');
        }
    };
     const handleUpdateTested = async (id, tested) => {
        try {
            const config = { headers: { Authorization: `Bearer ${adminUser.token}` } };
            await axios.put(`${API_BASE}/api/appointment/updateTested/${id}`, { tested }, config);
            showMessage('success', 'Tested status updated!');
            fetchData(adminUser.token);
        } catch (error) {
            showMessage('error', 'Failed to update tested status.');
        }
    };
    // report upload was intentionally removed from admin UI; keep backend endpoint but no client upload here.

    // Download handler: open secure download URL and append encoded token from localStorage.
    // Read token directly from localStorage to avoid stale state issues.
    const handleDownloadReport = (filename) => {
        if (!filename) return;
        const stored = localStorage.getItem('user');
        let token = null;
        try {
            if (stored) {
                const parsed = JSON.parse(stored);
                // support common shapes: { token: '...' } or { data: '...' }
                token = parsed?.token || parsed?.data || null;
            }
        } catch (e) {
            token = null;
        }
        const qs = token ? `?token=${encodeURIComponent(token)}` : '';
        const url = `${API_BASE}/api/reports/${encodeURIComponent(filename)}${qs}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Trigger hidden file input
	const triggerFileInput = (id) => {
		const el = document.getElementById(`report-upload-${id}`);
		if (el) el.click();
	};

	// Handle file selection
	const handleReportFileChange = async (id, e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.type !== 'application/pdf') {
			showMessage('error', 'Only PDF files are allowed.');
			return;
		}
		setReportFiles(prev => ({ ...prev, [id]: file }));
		await uploadReport(id, file);
	};

	// Upload the report to backend
	const uploadReport = async (id, file) => {
		if (!adminUser || !adminUser.token) {
			showMessage('error', 'Admin token missing. Please login again.');
			return;
		}
		setUploadingReportId(id);
		const form = new FormData();
		form.append('report', file);
		try {
			const config = {
				headers: {
					Authorization: `Bearer ${adminUser.token}`,
					'Content-Type': 'multipart/form-data'
				}
			};
			await axios.post(`${API_BASE}/api/appointment/uploadReport/${id}`, form, config);
			showMessage('success', 'Report uploaded successfully.');
			// refresh lists
			fetchData(adminUser.token);
		} catch (err) {
			showMessage('error', err.response?.data?.message || 'Failed to upload report.');
		} finally {
			setUploadingReportId(null);
			setReportFiles(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
		}
	};

    if (loading && !adminUser) return <p className={styles.pageLoader}>Loading...</p>;

    // if (!adminUser) {
    //     return (
    //         <div className={styles.loginPage}>
    //             <div className={styles.loginFormContainer}>
    //                 <h2>Admin Login</h2>
    //                 <form onSubmit={handleLoginSubmit}>
    //                     <input type="email" placeholder="Admin Email" required onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} />
    //                     <input type="password" placeholder="Password" required onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} />
    //                     <button type="submit">Login</button>
    //                 </form>
    //                 {message.content && <div className={`${styles.message} ${styles[message.type]}`}>{message.content}</div>}
    //             </div>
    //         </div>
    //     );
    // }
    if (!adminUser) {
return (
<div className={styles.loginPage}>
<div className={styles.loginFormContainer}>
<h2>Admin Login</h2>
<form onSubmit={handleLoginSubmit}>
<input type="email" placeholder="Admin Email" required onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} />
<input type="password" placeholder="Password" required onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} />
<button type="submit">Login</button>
</form>
{message.content && <div className={`${styles.message} ${styles[message.type]}`}>{message.content}</div>}
</div>
</div>
);
}
    return (
        <div className={styles.adminDashboard}>
            <header className={styles.header}>
                <h1>Admin Dashboard</h1>
                <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
            </header>

            {message.content && <div className={`${styles.message} ${styles[message.type]}`}>{message.content}</div>}

            <div className={styles.dashboardContainer}>
                <nav className={styles.tabNav}>
                    <button onClick={() => setActiveTab('tests')} className={activeTab === 'tests' ? styles.active : ''}><TestIcon /> Manage Tests</button>
                    <button onClick={() => setActiveTab('profiles')} className={activeTab === 'profiles' ? styles.active : ''}><ProfileIcon /> Manage Profiles</button>
                    <button onClick={() => setActiveTab('appointments')} className={activeTab === 'appointments' ? styles.active : ''}><AppointmentIcon /> Manage Appointments</button>
                    <button onClick={() => setActiveTab('feedback')} className={activeTab === 'feedback' ? styles.active : ''}><i className="fas fa-comments"></i> Feedback & Contacts</button>
                </nav>

                <main className={styles.tabContent}>
                    {/* --- TESTS TAB --- */}
                    {activeTab === 'tests' && (
                        <div className={styles.contentGrid}>
                            <section className={styles.card}>
                                <h2>{editingTestId ? 'Edit Individual Test' : 'Add New Individual Test'}</h2>
                                <form onSubmit={handleAddTest} className={styles.form}>
                                    <input name="name" value={newTest.name} onChange={handleTestFormChange} placeholder="Test Name" required />
                                    <input name="price" type="number" value={newTest.price} onChange={handleTestFormChange} placeholder="Price" required />
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                        {editingTestId && <button type="button" onClick={cancelEditTest} className={styles.cancelButton}>Cancel</button>}
                                        <button type="submit" className={styles.formButton}>{editingTestId ? 'Update Test' : 'Add Test'}</button>
                                    </div>
                                </form>
                            </section>

                            <section className={styles.card}>
                                <h2>Existing Individual Tests</h2>
                                <ul className={styles.list}>
                                    {individualTests.map(t => (
                                        <li key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 700 }}>{t.name}</span>
                                                <span style={{ color: '#6c757d' }}>Rs. {t.price}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => handleEditTestClick(t)} className={styles.editButton}>Edit</button>
                                                <button onClick={() => handleDeleteTest(t._id)} className={styles.deleteButton}>Delete</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    )}

                    {/* --- PROFILES TAB --- */}
                    {activeTab === 'profiles' && (
                        <div className={styles.contentGrid}>
                            <section className={styles.card}>
                                <h2>{profileForm.id ? 'Edit Test Profile' : 'Add New Profile'}</h2>
                                <form onSubmit={handleProfileSubmit} className={styles.form}>
                                    <input name="name" value={profileForm.name} onChange={handleProfileFormChange} placeholder="Profile Name" required />
                                    <input name="price" type="number" value={profileForm.price} onChange={handleProfileFormChange} placeholder="Discounted Price" required />
                                    <textarea name="description" value={profileForm.description} onChange={handleProfileFormChange} placeholder="Short description" />
                                    <label>Select Tests:</label>
                                    <div className={styles.checkboxGrid}>
                                        {individualTests.map(t => (
    <div key={t._id} className={styles.checkboxItem}>
        <input
            type="checkbox"
            id={t._id}
            checked={profileForm.tests.map(x => x.toString()).includes(t._id.toString())}
            onChange={() => handleProfileTestCheckboxChange(t._id.toString())}
        />
        <label htmlFor={t._id}>{t.name} (Rs. {t.price})</label>
    </div>
))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                        <div>
                                            <div>Total Tests Price: Rs. {selectedTestsTotal}</div>
                                            <div>Total Save: Rs. {selectedSave}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {profileForm.id && <button type="button" onClick={cancelProfileEdit} className={styles.cancelButton}>Cancel</button>}
                                            <button type="submit" className={styles.formButton}>{profileForm.id ? 'Update Profile' : 'Add Profile'}</button>
                                        </div>
                                    </div>
                                </form>
                            </section>

                            <section className={styles.card}>
                                <h2>Existing Profiles</h2>
                                <div className={styles.profileList}>
                                    {profiles.map(p => {
                                        const totalTestsPrice = (p.tests || []).reduce((sum, t) => {
                                            const price = typeof t === 'object' ? Number(t.price || 0) : Number(getTestPriceById(t) || 0);
                                            return sum + price;
                                        }, 0);
                                        const totalSave = Math.max(0, totalTestsPrice - Number(p.price || 0));
                                        return (
                                            <div key={p._id} className={styles.profileItem}>
                                                <div className={styles.profileInfo}>
                                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                        <strong>{p.name}</strong>
                                                        <span>Rs. {p.price}</span>
                                                        <span>Total Save: Rs. {totalSave}</span>
                                                    </div>
                                                    <ul>
                                                        {(p.tests || []).map(t => {
                                                            // Resolve test name from populated object or id string
                                                            if (!t) return null;
                                                            if (typeof t === 'object') return <li key={t._id}>{t.name}</li>;
                                                            const idStr = t.toString();
                                                            const found = individualTests.find(i => i._id && i._id.toString ? i._id.toString() === idStr : i._id === idStr);
                                                            return <li key={idStr}>{found ? found.name : idStr}</li>;
                                                        })}
                                                    </ul>
                                                </div>
                                                <div className={styles.profileActions}>
                                                    <button onClick={() => handleEditProfileClick(p)} className={styles.editButton}>Edit</button>
                                                    <button onClick={() => handleDeleteProfile(p._id)} className={styles.deleteButton}>Delete</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    )}

                      {/* --- APPOINTMENTS TAB --- */}
                    {activeTab === 'appointments' && (
                        <section className={`${styles.card} ${styles.fullWidthCard}`}>
                            <h2>Manage Appointments</h2>

                           {/* Show retry control if appointments failed to load */}
                           {message.type === 'error' && message.content && (
                               <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                                   <div className={`${styles.message} ${styles[message.type]}`}>{message.content}</div>
                                   <button onClick={retryAppointments} className={styles.formButton}>Retry</button>
                               </div>
                           )}

                            <div className={styles.tableContainer}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Patient Name</th>
                                            <th>Tests</th>
                                            <th>Profiles</th>
                                            <th>Date</th>
                                            <th>Payment Status</th>
                                            <th>Appointment Status</th>
                                            <th>Total Price</th>
                                            <th>Tested</th>
                                            <th>Report</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(appointments.length > 0 ? appointments : []).map(app => {
                                            const testNames = (app.tests || []).map(t => typeof t === 'object' ? t.name : '');
                                            const profileNames = (app.profiles || []).map(p => typeof p === 'object' ? p.name : '');

                                            return (
                                                <tr key={app._id}>
                                                    <td>{app.name}</td>
                                                    <td>{testNames.join(', ') || '-'}</td>
                                                    <td>{profileNames.join(', ') || '-'}</td>
                                                    <td>{new Date(app.date).toLocaleDateString()}</td>
                                                    <td>
                                                        <select
                                                            value={app.isPaymentDone ? 'Paid' : 'Unpaid'}
                                                            onChange={async (e) => {
                                                                const newStatus = e.target.value === 'Paid';
                                                                try {
                                                                    const config = { headers: { Authorization: `Bearer ${adminUser.token}` } };
                                                                    await axios.put(`${API_BASE}/api/appointment/updatePayment/${app._id}`, { isPaymentDone: newStatus }, config);
                                                                    showMessage('success', 'Payment status updated!');
                                                                    fetchData(adminUser.token);
                                                                } catch {
                                                                    showMessage('error', 'Failed to update payment status.');
                                                                }
                                                            }}
                                                            style={{
                                                                backgroundColor: app.isPaymentDone ? '#1b7a2f' : '#c0392b',
                                                                color: '#fff'
                                                            }}
                                                        >
                                                            <option value="Paid">Paid</option>
                                                            <option value="Unpaid">Unpaid</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={app.status || 'Pending'}
                                                            onChange={(e) => handleUpdateAppointmentStatus(app._id, e.target.value)}
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="Confirmed">Confirmed</option>
                                                            <option value="Cancelled">Cancelled</option>
                                                        </select>
                                                    </td>
                                                    <td>Rs. {app.totalPrice}</td>
                                                    <td>
                                                        <select
                                                            value={app.tested || 'Pending'}
                                                            onChange={(e) => handleUpdateTested(app._id, e.target.value)}
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="Done">Done</option>
                                                        </select>
                                                    </td>
                                                    <td>
	{/* Hidden file input per appointment */}
	<input
		id={`report-upload-${app._id}`}
		type="file"
		accept="application/pdf"
		style={{ display: 'none' }}
		onChange={(e) => handleReportFileChange(app._id, e)}
	/>

	{app.report ? (
		<button type="button" onClick={() => handleDownloadReport(app.report)} className={styles.formButton}>
			Download Report
		</button>
	) : (
		// Only show Upload when payment done, confirmed and tested done
		(app.isPaymentDone && app.status === 'Confirmed' && (app.tested === 'Done' || app.tested === 'done')) ? (
			<>
				<button
					type="button"
					onClick={() => triggerFileInput(app._id)}
					disabled={uploadingReportId === app._id}
					className={styles.formButton}
				>
					{uploadingReportId === app._id ? 'Uploading...' : 'Upload Report (PDF)'}
				</button>
			</>
		) : (
			<span style={{ color: '#888' }}>N/A</span>
		)
	)}
</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* --- FEEDBACK & CONTACTS TAB --- */}
                    {activeTab === 'feedback' && (
                        <section className={`${styles.card} ${styles.fullWidthCard}`}>
                            <h2>Feedback & Contacts</h2>
                            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                {/* Feedback Section */}
                                <div style={{ flex: 1, minWidth: 320 }}>
                                    <h3 style={{ marginBottom: 16 }}>Feedback</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                        {feedbacks.length > 0 ? feedbacks.map(fb => (
                                            <div key={fb._id} style={{
                                                background: 'linear-gradient(135deg, #f7faff 0%, #eae6ff 100%)',
                                                borderRadius: 14,
                                                boxShadow: '0 4px 16px rgba(118,75,162,0.08)',
                                                padding: 18,
                                                marginBottom: 0,
                                                border: '1px solid #ececec',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, fontSize: 17 }}>{fb.name}</span>
                                                    <span style={{ color: '#764ba2', fontWeight: 600 }}>{fb.email}</span>
                                                </div>
                                                <div style={{ fontSize: 15, color: '#333', margin: '6px 0' }}>
                                                    {fb.feedback}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                                                    <span>
                                                        <span style={{ color: '#ffc107', fontWeight: 700 }}>★</span> {fb.rating}
                                                    </span>
                                                    <span style={{ color: '#888' }}>{fb.createdAt ? new Date(fb.createdAt).toLocaleString() : ''}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ textAlign: 'center', color: '#888', padding: 24, borderRadius: 12, background: '#f8f8fa' }}>No feedback found.</div>
                                        )}
                                    </div>
                                </div>
                                {/* Contacts Section */}
                                <div style={{ flex: 1, minWidth: 320 }}>
                                    <h3 style={{ marginBottom: 16 }}>Contact Requests</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                        {contacts.length > 0 ? contacts.map(c => (
                                            <div key={c._id} style={{
                                                background: 'linear-gradient(135deg, #fff7f0 0%, #f7e6ff 100%)',
                                                borderRadius: 14,
                                                boxShadow: '0 4px 16px rgba(251,189,102,0.08)',
                                                padding: 18,
                                                marginBottom: 0,
                                                border: '1px solid #ececec',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, fontSize: 17 }}>{c.name}</span>
                                                    <span style={{ color: '#fbad66', fontWeight: 600 }}>{c.email}</span>
                                                </div>
                                                <div style={{ fontSize: 15, color: '#333', margin: '6px 0' }}>
                                                    {c.issue || c.message}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: 14 }}>
                                                    <span style={{ color: '#888' }}>
                                                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ textAlign: 'center', color: '#888', padding: 24, borderRadius: 12, background: '#f8f8fa' }}>No contact requests found.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}

export default AdminManagement;