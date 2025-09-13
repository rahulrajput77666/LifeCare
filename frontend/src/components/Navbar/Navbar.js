import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import styles from "./styles.module.css";

function NavBar() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const checkUserStatus = () => {
        try {
            const userDataString = localStorage.getItem("user");
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                setUser(userData);

                // ✅ Check both possible locations for isAdmin flag
                const adminFlag = userData?.isAdmin || userData?.user?.isAdmin;
                setIsAdmin(!!adminFlag);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
        } catch (error) {
            console.error("Could not parse user data from localStorage:", error);
            setUser(null);
            setIsAdmin(false);
        }
    };

    useEffect(() => {
        checkUserStatus();
        window.addEventListener('userLoggedIn', checkUserStatus);
        window.addEventListener('storage', checkUserStatus);

        return () => {
            window.removeEventListener('userLoggedIn', checkUserStatus);
            window.removeEventListener('storage', checkUserStatus);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.dispatchEvent(new Event('userLoggedIn')); // Re-check login status
        navigate("/");
    };

    const userDetails = user?.user || user;

    // Backend base URL for uploaded files
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    // Build profile image URL:
    // - If profilePicture is empty -> use ui-avatars
    // - If profilePicture looks like a full URL (http/https) -> use it as-is
    // - Otherwise treat it as an uploaded filename and prepend the uploads path
    const getProfileImageSrc = () => {
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userDetails?.firstName || '')}+${encodeURIComponent(userDetails?.lastName || '')}&background=0D8ABC&color=fff&size=48`;
        if (!userDetails) return defaultAvatar;
        const pic = userDetails.profilePicture || userDetails.profilePic || '';
        if (!pic) return defaultAvatar;
        // If it already contains protocol, return as-is
        if (/^https?:\/\//i.test(pic)) return pic;
        // If it starts with a slash, assume absolute path on same origin
        if (pic.startsWith('/')) return `${API_BASE}${pic}`;
        // Otherwise treat as filename stored under uploads/profiles
        return `${API_BASE}/uploads/profiles/${encodeURIComponent(pic)}`;
    };

    return (
        <header className={styles.navbar}>
            <div className={styles.navbarContainer}>
                <NavLink className={styles.logoLink} to="/">
                    <img src="/logo192.png" className={styles.logo} alt="LifeCare Logo" />
                </NavLink>

                <nav className={styles.navMenu}>
                    <NavLink className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink} to="/">Home</NavLink>
                    <div className={styles.dropdown}>
                        <button className={styles.navLink}>Services</button>
                        <div className={styles.dropdownContent}>
                            <NavLink to="/explore-tests">Explore Tests</NavLink>
                            <NavLink to="/book-appointment">Book Appointment</NavLink>
                            <NavLink to="/faq">FAQs</NavLink>
                            <NavLink to="/feedback">Share Feedback</NavLink>
                        </div>
                    </div>
                    <NavLink className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink} to="/contact-us">Contact Us</NavLink>
                </nav>

                <div className={styles.navActions}>
                    {user ? (
                        <>
                            {/* ✅ Show Admin Dashboard only if admin */}
                            {isAdmin && (
                                <NavLink to="/admin" className={styles.authButton}>
                                    Admin Dashboard
                                </NavLink>
                            )}

                            <NavLink to="/user-profile" className={styles.profileLink}>
                                <img
                                    src={getProfileImageSrc()}
                                    alt="My Profile"
                                    className={styles.profileImage}
                                    onError={(e) => {
                                        // fallback to UI avatars if uploaded image fails to load
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userDetails?.firstName || '')}+${encodeURIComponent(userDetails?.lastName || '')}&background=0D8ABC&color=fff&size=48`;
                                    }}
                                />
                            </NavLink>

                            <button onClick={handleLogout} className={styles.authButton}>Logout</button>
                        </>
                    ) : (
                        <NavLink to="/login" className={styles.authButton}>Login</NavLink>
                    )}
                </div>
            </div>
        </header>
    );
}

export default NavBar;