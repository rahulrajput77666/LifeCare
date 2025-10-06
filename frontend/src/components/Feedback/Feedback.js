import React, { useState } from 'react';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from './styles.module.css';
import illustration from './feedback.jpg'; 

// Reusable star rating sub-component
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
    const [data, setData] = useState({ name: "", email: "", feedback: "", rating: 0 });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

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

        if (!data.name || !data.email || !data.feedback || data.rating === 0) {
            setError("Please fill in all fields and provide a star rating.");
            return;
        }

        try {
            const url = "https://lifecare-pathology.onrender.com/api/feedback/";
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
                        <div className={styles.formGroup}>
                            <label htmlFor="name">Your Name</label>
                            <input 
                                id="name" 
                                name="name" 
                                type="text" 
                                placeholder="Enter your name" 
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
                                placeholder="Enter your email" 
                                className={styles.input} 
                                value={data.email} 
                                onChange={handleChange}
                                required 
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
