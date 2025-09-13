import React, { useState, useEffect } from "react";
import axios from 'axios';

// --- STYLES ---
// All CSS is embedded here as a component to resolve the import error.
const Style = () => (
    <style>{`
        .contactPage {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            position: relative;
            min-height: 100vh;
        }
        .imgStyle {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: -1;
            filter: brightness(0.6);
        }
        .blockStyle {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 50px 20px;
            min-height: 100vh;
        }
        .block2Style {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 800px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
        }
        .sendMsgStyle {
            text-align: left;
            margin-bottom: 20px;
            grid-column: 1 / 2;
        }
        .title {
            font-size: 2.5rem;
            color: #2c3e50;
            font-weight: 700;
        }
        .formContainer {
            grid-column: 1 / 2;
        }
        .formGroup {
            margin-bottom: 20px;
        }
        .formLabel {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
            font-size: 0.95rem;
        }
        .formInput, .formTextarea {
            width: 100%;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #ccc;
            font-size: 1rem;
            box-sizing: border-box;
            transition: border-color 0.3s, box-shadow 0.3s;
        }
        .formInput:focus, .formTextarea:focus {
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            outline: none;
        }
        .formTextarea {
            min-height: 120px;
            resize: vertical;
        }
        .btnCase {
            margin-top: 10px;
        }
        .sendBtn {
            background: linear-gradient(90deg, #007bff, #0056b3);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .sendBtn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
        }
        .infoContainer {
            grid-column: 2 / 3;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 25px;
        }
        .infoGroup {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .infoIcon {
            width: 24px;
            height: 24px;
        }
        .infoText {
            color: #333;
            font-size: 1rem;
            line-height: 1.5;
        }
        .success_msg, .error_msg {
            text-align: center;
            padding: 12px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 0.95rem;
        }
        .success_msg {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error_msg {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        @media (max-width: 768px) {
            .block2Style {
                grid-template-columns: 1fr;
            }
            .infoContainer {
                grid-row: 1;
            }
        }
    `}</style>
);

const API_BASE = process.env.REACT_APP_API_URL || 'https://lifecare-pathology.onrender.com';

function ContactUs() {
    const [data, setData] = useState({ name: "", email: "", message: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // --- AUTHENTICATION CHECK ---
    useEffect(() => {
        const userString = localStorage.getItem("user");
        if (!userString) {
            console.log("No user found, redirecting to login.");
            // FIX: Use window.location.pathname to avoid router context errors.
            window.location.pathname = "/Login";
        } else {
            const userData = JSON.parse(userString);
            setData(prevState => ({
                ...prevState,
                name: userData.name || '',
                email: userData.email || ''
            }));
        }
    }, []); // Dependency array is empty

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData({ ...data, [name]: value });
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!data.message) {
            setError("Please enter a message.");
            return;
        }

        try {
            await axios.post(`${API_BASE}/api/contact/`, data);
            setSuccess('Your message has been sent successfully!');
            setData(prevState => ({ ...prevState, message: '' }));
        } catch (error) {
            console.error(error);
            setError('Server error. Please try again later.');
        }
    };

    return (
        <>
            <Style />
            <div className="contactPage">
                <img src='https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=1400&q=80' alt="Contact background" className="imgStyle" />
                <div className="blockStyle">
                    <div className="block2Style">
                        <div className="formContainer">
                            <div className="sendMsgStyle">
                                <span className="title">Send a Message</span>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="formGroup">
                                    <label className="formLabel" htmlFor="name">Name</label>
                                    {/* FIX: Removed readOnly to allow user input, as name is not available from localStorage */}
                                    <input id="name" name="name" type="text" className="formInput" onChange={handleChange} value={data.name} required />
                                </div>
                                <div className="formGroup">
                                    <label className="formLabel" htmlFor="email">Email ID</label>
                                    <input id="email" name="email" type="email" className="formInput" onChange={handleChange} value={data.email} required readOnly />
                                </div>
                                <div className="formGroup">
                                    <label className="formLabel" htmlFor="message">Type your message</label>
                                    <textarea id="message" name="message" className="formTextarea" onChange={handleChange} value={data.message} required />
                                </div>
                                
                                {success && <div className="success_msg">{success}</div>}
                                {error && <div className="error_msg">{error}</div>}

                                <div className="btnCase">
                                    <button type="submit" className="sendBtn">Send</button>
                                </div>
                            </form>
                        </div>
                        <div className="infoContainer">
                            <div className="infoGroup">
                                <img src="https://img.icons8.com/ios-filled/50/000000/mail.png" alt="email icon" className="infoIcon" />
                                <span className="infoText">rahulrajput77666@gmail.com</span>
                            </div>
                            <div className="infoGroup">
                                <img src="https://img.icons8.com/ios-filled/50/000000/marker.png" alt="address icon" className="infoIcon" />
                                <span className="infoText">44,Science House ,Anand Nagar Bhopal(MP)</span>
                            </div>
                            <div className="infoGroup">
                                <img src="https://img.icons8.com/ios-filled/50/000000/phone.png" alt="phone icon" className="infoIcon" />
                                <span className="infoText">+91 9644922096</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ContactUs;

