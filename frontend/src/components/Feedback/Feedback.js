import React, { useState, useEffect } from 'react';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from './styles.module.css';
// The image is now correctly imported from the same folder.
import illustration from './feedback.jpg'; 

// A self-contained Star Rating sub-component for a clean and interactive rating experience.
const StarRating = ({ rating, onRatingChange }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const stars = [1, 2, 3, 4, 5];

    return (
        <div className={styles.starRating} onMouseLeave={() => setHoverRating(0)}>
            {stars.map((starValue) => (
                <span
                    key={starValue}
                    className={`${styles.star} ${starValue <= (hoverRating || rating) ? styles.filled : ''}`}
                    onClick={() => onRatingChange(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                >
                    ★
                </span>
            ))}
        </div>
    );
};

function Feedback() {
    // State now only holds email initially, name will be entered by user.
    const [data, setData] = useState({ name: "", email: "", feedback: "", rating: 0 });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    // On component load, check if the user is logged in and pre-fill their email.
    useEffect(() => {
        const userString = localStorage.getItem("user");
        if (!userString) {
            navigate("/login");
            return; 
        }

        const userData = JSON.parse(userString);
        
        // FIX: Removed the database call for the user's name.
        // The form now only pre-fills the email from localStorage.
        setData(prevState => ({
            ...prevState,
            email: userData.email || '' 
        }));

    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData({ ...data, [name]: value });
    };

    const handleRatingChange = (newRating) => {
        setData({ ...data, rating: newRating });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Added validation for the manually entered name.
        if (!data.name || !data.feedback || data.rating === 0) {
            setError("Please fill in your name, provide feedback, and a star rating.");
            return;
        }

        try {
            const url = "http://localhost:5000/api/feedback/";
            await axios.post(url, data);
            
            setSuccess("Thank you for your valuable feedback!");
            
            setTimeout(() => {
                navigate("/");
            }, 2000);

        } catch (error) {
            const errorMessage = error.response?.data?.message || "Could not submit feedback. Please try again.";
            setError(errorMessage);
            console.error("Feedback submission error:", error);
        }
    };

    return (
        <div className={styles.feedbackPage}>
            <div className={styles.feedbackContainer}>
                <div className={styles.illustration}>
                    <img src={illustration} alt="Feedback Illustration" />
                </div>
                <div className={styles.formWrapper}>
                    <h1 className={styles.title}>Share Your Experience</h1>
                    <p className={styles.subtitle}>Your feedback helps us improve our services for everyone.</p>
                    
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* FIX: The "name" input is now editable and no longer read-only. */}
                        <div className={styles.formGroup}>
                            <label htmlFor="name">Your Name</label>
                            <input 
                                id="name" 
                                name="name" 
                                type="text" 
                                placeholder="Please enter your name" 
                                className={styles.input} 
                                value={data.name} 
                                onChange={handleChange}
                                required 
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="email">Your Email</label>
                            <input 
                                id="email" 
                                name="email" 
                                type="email" 
                                placeholder="Loading email..." 
                                className={styles.input} 
                                value={data.email} 
                                readOnly
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label>Rate Our Service</label>
                            <StarRating rating={data.rating} onRatingChange={handleRatingChange} />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="feedback">Your Feedback</label>
                            <textarea 
                                id="feedback" 
                                name="feedback" 
                                className={styles.textarea} 
                                placeholder="Tell us what you think..." 
                                value={data.feedback} 
                                onChange={handleChange} 
                                required
                            ></textarea>
                        </div>
                        
                        {success && <div className={styles.successMessage}>{success}</div>}
                        {error && <div className={styles.errorMessage}>{error}</div>}

                        <button type="submit" className={styles.submitButton}>
                            Submit Feedback
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Feedback;

