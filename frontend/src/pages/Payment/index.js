import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Snackbar } from "@mui/material";
// Import the CSS Module for styling
import styles from './styles.module.css';

const url = "http://localhost:5000";

function Payment() {
    const [amount, setAmount] = useState(0);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [contact, setContact] = useState("");
    const [status, setStatus] = useState(false);
    const [trueContact, setTrueContact] = useState(true);
    const [appointmentId, setAppointmentId] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    const handleClose = () => {
        setStatus(false);
        setTrueContact(true);
    };

    useEffect(() => {
        if (location.state) {
            if (location.state.amount) setAmount(location.state.amount);
            if (location.state.name) setName(location.state.name);
            if (location.state.email) setEmail(location.state.email);
            if (location.state.appointmentId) setAppointmentId(location.state.appointmentId);
        }
    }, [location.state]);

    function loadScript(src) {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                return resolve(true);
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    }

    async function displayRazorpay() {
        try {
            if (!amount || Number(amount) <= 0) {
                alert('Please enter a valid amount greater than 0.');
                return;
            }
            if (!contact || contact.toString().length !== 10) {
                setTrueContact(false);
                return;
            }
            setTrueContact(true);

            const sdkLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!sdkLoaded) {
                alert('Razorpay SDK failed to load. Check your network.');
                return;
            }

            const orderCreationResponse = await fetch(`${url}/api/checkout/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: String(amount),
                    appointmentId: appointmentId
                })
            });

            if (!orderCreationResponse.ok) {
                let serverBody;
                try {
                    serverBody = await orderCreationResponse.json();
                } catch (e) {
                    serverBody = await orderCreationResponse.text().catch(() => '');
                }
                const serverMessage = serverBody?.message || serverBody?.error || serverBody || `HTTP ${orderCreationResponse.status}`;
                console.error('Failed to create payment order. Status:', orderCreationResponse.status, 'Server message:', serverMessage);
                alert(`Failed to create payment order:\n${serverMessage}\n\nCommon causes: invalid/missing RAZORPAY keys in backend .env, backend route not mounted, or server error. Check backend logs.`);
                return;
            }

            const data = await orderCreationResponse.json();
            if (!data || !data.id) {
                console.error('Order creation returned invalid payload', data);
                alert('Could not create payment order. Check console for details or contact support.');
                return;
            }

            const publicKey = data.key || "rzp_test_aqRrSZmCJ6Z4pC";
            if (!data.key) {
                console.warn("Server did not return a Razorpay public key; falling back to embedded key (may cause 401).");
            }

            const options = {
                key: publicKey,
                amount: String(data.amount),
                currency: data.currency,
                name: "LifeCare",
                description: "Appointment Payment",
                image: url + "/logo.svg",
                order_id: data.id,
                handler: async function (response) {
                    try {
                        await fetch(url + '/api/checkout/verification/user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: true, oid: data.id })
                        });

                        const userString = localStorage.getItem("user");
                        const token = userString ? JSON.parse(userString).token : null;
                        if (appointmentId && token) {
                            await fetch(url + `/api/appointment/markPaid/${appointmentId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    transactionId: response.razorpay_payment_id,
                                    orderId: data.id
                                })
                            });
                        }
                        setStatus(true);
                        setTimeout(() => navigate('/user-profile'), 1200);
                    } catch (innerErr) {
                        console.error("Post-payment handling failed", innerErr);
                        alert("Payment succeeded but we couldn't update the appointment status. Contact support.");
                    }
                },
                prefill: { name, email, contact: "" + contact },
                notes: { address: "LifeCare Corporate Office" },
                theme: { color: "#3073D9" }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (err) {
            console.error("displayRazorpay error:", err);
            alert("An unexpected error occurred while starting payment. Check console for details.");
        }
    }
    
    // Variable to determine if the button should be disabled
    const isDisabled = !amount || Number(amount) <= 0 || !contact || contact.toString().length !== 10;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.paymentBlock}>
                <h1 className={styles.heading}>Payment Details</h1>
                <p className={styles.text}>Confirm your appointment by completing the payment.</p>
                
                

                <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={styles.input}
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="Enter your email address"
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Amount (INR)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={styles.input}
                            placeholder="e.g., 500"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contact Number</label>
                        <input
                            type="number"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            className={styles.input}
                            placeholder="Enter your 10-digit mobile number"
                        />
                    </div>
                </form>

                <button
                    type="button"
                    onClick={displayRazorpay}
                    disabled={isDisabled}
                    className={`${styles.proceedBtn} ${isDisabled ? styles.disabled : ''}`}
                >
                    Pay Now
                </button>
            </div>

            <Snackbar open={status} autoHideDuration={4000} onClose={handleClose} message="Transaction completed successfully!" />
            <Snackbar open={!trueContact} autoHideDuration={4000} onClose={handleClose} message="Contact number must be 10 digits." />
        </div>
    );
}

export default Payment;