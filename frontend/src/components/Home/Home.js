import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./styles.module.css";
import axios from "axios";

// A sub-component to render star icons based on a rating.
const StarRating = ({ rating }) => {
    const totalStars = 5;
    let stars = [];
    for (let i = 1; i <= totalStars; i++) {
        stars.push(
            <span key={i} className={i <= rating ? styles.starFilled : styles.starEmpty}>
                ★
            </span>
        );
    }
    return <div className={styles.starRating}>{stars}</div>;
};


function Home() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();

    // State for managing feedback data
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ count: 0, avgRating: 0 });
    const [feedbackLoading, setFeedbackLoading] = useState(true);
    const [feedbackError, setFeedbackError] = useState("");
    const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);

    useEffect(() => {
        const userString = localStorage.getItem("user");
        if (userString) {
            try {
                const user = JSON.parse(userString);
                setIsLoggedIn(true);
                if (user.email === "rahulrajput77666@gmail.com") {
                    setIsAdmin(true);
                }
            } catch (err) {
                console.error("Failed to parse user:", err);
                localStorage.removeItem("user");
                setIsLoggedIn(false);
            }
        }
    }, []);

    // Effect for the initial fetch of recent feedback and stats
    useEffect(() => {
        const fetchInitialFeedbacks = async () => {
            try {
                setFeedbackLoading(true);
                const { data } = await axios.get("http://localhost:5000/api/feedback/");
                if (data.stats) setReviewStats(data.stats);
                if (data.reviews) setReviews(data.reviews);
                setFeedbackError("");
            } catch (error) {
                console.error("Failed to fetch feedback:", error);
                setFeedbackError("Could not load feedback at this time.");
            } finally {
                setFeedbackLoading(false);
            }
        };

        fetchInitialFeedbacks();
    }, []);

    const handleLoginRedirect = () => {
        navigate("/login");
    };

    // Function to fetch and display all feedback
    const handleShowAllFeedback = async () => {
        setFeedbackLoading(true);
        try {
            const { data } = await axios.get("http://localhost:5000/api/feedback/all");
            setReviews(data);
            setIsFeedbackExpanded(true); // This will hide the "See All" button
            setFeedbackError("");
        } catch (error) {
            console.error("Failed to fetch all feedback:", error);
            setFeedbackError("Could not load all feedback.");
        } finally {
            setFeedbackLoading(false);
        }
    };

    return (
        <main className={styles.home}>
            {/* --- Hero Section --- */}
            <section className={styles.hero}>
                <div className={styles.heroOverlay}></div>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Take Control of Your Health Story. It Begins with a Simple Test.
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Get accurate, timely pathology services from the comfort of your home.
                    </p>
                    <Link to="/book-appointment" className={styles.heroCtaButton}>
                        Book an Appointment
                    </Link>
                </div>
            </section>

            {/* --- Most Opted Tests Section --- */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Most Opted Tests</h2>
                    <p className={styles.sectionSubtitle}>
                        Quickly find and book our most popular diagnostic tests.
                    </p>
                </div>
                <div className={styles.testGrid}>
                    <Link to="/explore-tests" className={styles.testCard}>
                        <img src="./covid.png" alt="Covid Test" className={styles.testIcon} />
                        <h3 className={styles.testName}>Covid Test</h3>
                    </Link>
                    <Link to="/explore-tests" className={styles.testCard}>
                        <img src="./basic.png" alt="Basic Profile" className={styles.testIcon} />
                        <h3 className={styles.testName}>Basic Profile</h3>
                    </Link>
                    <Link to="/explore-tests" className={styles.testCard}>
                        <img src="./fullBodyScan.png" alt="Full Body Scan" className={styles.testIcon} />
                        <h3 className={styles.testName}>Full Body Scan</h3>
                    </Link>
                    <Link to="/explore-tests" className={styles.testCard}>
                        <img src="./miniScan.png" alt="Mini Scan" className={styles.testIcon} />
                        <h3 className={styles.testName}>Mini Scan</h3>
                    </Link>
                    <Link to="/explore-tests" className={styles.testCard}>
                        <img src="./cardio.png" alt="Cardio Test" className={styles.testIcon} />
                        <h3 className={styles.testName}>Cardio Test</h3>
                    </Link>
                </div>
                {/* Explore All Tests Button */}
                <Link to="/explore-tests" className={styles.exploreTestsButton}>
                    Explore All Tests
                </Link>
            </section>

            {/* --- Customer Feedback Section --- */}
            <section className={`${styles.section} ${styles.feedbackSection}`}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>What Our Patients Say</h2>
                        <p className={styles.sectionSubtitle}>
                            We are trusted by thousands of patients and their families.
                        </p>
                    </div>
                    {/* "See All" button, which disappears after click */}
                    {!isFeedbackExpanded && (
                        <button onClick={handleShowAllFeedback} className={styles.seeAllLink}>
                            See All <i className="fas fa-arrow-right"></i>
                        </button>
                    )}
                </div>

                {/* Overall Rating Summary */}
                { !feedbackLoading && !feedbackError && reviewStats.count > 0 && (
                    <div className={styles.overallRating}>
                        <div className={styles.avgRatingValue}>{reviewStats.avgRating.toFixed(1)}</div>
                        <div className={styles.ratingDetails}>
                            <StarRating rating={reviewStats.avgRating} />
                            <p>Based on {reviewStats.count} reviews</p>
                        </div>
                    </div>
                )}
                
                <div className={styles.feedbackGrid}>
                    {feedbackLoading ? (
                        <p style={{ textAlign: 'center' }}>Loading feedback...</p>
                    ) : feedbackError ? (
                        <p className={styles.feedbackError}>{feedbackError}</p>
                    ) : reviews.length > 0 ? (
                        reviews.map((feedback) => (
                            <div key={feedback._id} className={styles.feedbackCard}>
                                <StarRating rating={feedback.rating} />
                                <p className={styles.reviewText}>
                                    "{feedback.feedback}"
                                </p>
                                <p className={styles.reviewerName}>- {feedback.name}</p>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center' }}>No feedback has been submitted yet.</p>
                    )}
                </div>
                
                {/* The "Share Your Feedback" button remains at the bottom */}
                <Link to="/feedback" className={styles.feedbackButton}>
                    Share Your Feedback
                </Link>
            </section>

            {/* --- Footer Section --- */}
            <footer className={styles.footer}>
                <div className={styles.footerContainer}>
                    <div className={styles.footerColumn}>
                        <h3 className={styles.footerHeader}>Browse</h3>
                        <Link to="/faq" className={styles.footerLink}>FAQs</Link>
                        {isAdmin && (
                            <Link to="/admin" className={styles.footerLink}>Admin Management</Link>
                        )}
                        <Link to="/contact-us" className={styles.footerLink}>Contact Us</Link>
                        {isLoggedIn ? (
                            <Link to="/profile" className={styles.footerLink}>My Profile</Link>
                        ) : (
                            <button onClick={handleLoginRedirect} className={styles.footerLink}>Login</button>
                        )}
                    </div>
                    <div className={styles.footerColumn}>
                        <h3 className={styles.footerHeader}>Get in Touch</h3>
                        <p className={styles.footerText}>
                            <i className="fas fa-phone"></i> +91 9644922096
                        </p>
                        <p className={styles.footerText}>
                            <i className="fas fa-envelope"></i> rahulrajput77666@gmail.com
                        </p>
                    </div>
                    <div className={styles.footerColumn}>
                        <h3 className={styles.footerHeader}>Follow Us</h3>
                        <div className={styles.socialIcons}>
                            <a href="https://www.facebook.com/profile.php?id=100047588586819" className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                                <i className="fab fa-facebook-f"></i>
                            </a>
                            <a href="https://www.instagram.com/rahulrajput.4u/?hl=en" className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                                <i className="fab fa-instagram"></i>
                            </a>
                            <a href="https://twitter.com" className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                                <i className="fab fa-twitter"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <div className={styles.footerCopyright}>
                    &copy; {new Date().getFullYear()} LifeCare Pathology. All Rights Reserved.
                </div>
            </footer>
        </main>
    );
}

export default Home;

