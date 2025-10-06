import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styles from "./styles.module.css";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";

// API base: prefer REACT_APP_API_URL, otherwise use deployed backend
const API_BASE = process.env.REACT_APP_API_URL || 'https://lifecare-pathology.onrender.com';

function BookAppointment() {
  const navigate = useNavigate();
  const location = useLocation();

  const [date, setDate] = useState(new Date());
  const [tests, setTests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [showAllTests, setShowAllTests] = useState(false);
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online"); // "online" or "cod"

  const [formData, setFormData] = useState({
    doorToDoor: "no",
    email: "",
    name: "",
    streetAddress: "",
    roadNo: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const VISIBLE_COUNT = 4;

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      // If no user is logged in, redirect to the login page
      navigate("/Login");
    } else {
      const userData = JSON.parse(userString);
      const details = userData.user || userData;
      // Debug: log user details for troubleshooting
      console.log("User details for booking:", details);
      setFormData(prev => ({
        ...prev,
        name: `${details.firstName || ''} ${details.lastName || ''}`.trim(),
        email: details.email || "",
      }));
    }
  }, [navigate]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [testsRes, profilesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/tests/`),
          axios.get(`${API_BASE}/api/profiles/`),
        ]);
        setTests(testsRes.data || []);
        setProfiles(profilesRes.data || []);
      } catch (err) {
        console.error(err);
        setFetchError("Failed to fetch tests/profiles.");
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.selectedProfile)
      setSelectedProfiles([location.state.selectedProfile]);
    if (location.state?.selectedTests)
      setSelectedTests(location.state.selectedTests);
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addTest = (test) => {
    if (!selectedTests.find(t => t._id === test._id))
      setSelectedTests([...selectedTests, test]);
  };
  const removeTest = (id) => setSelectedTests(selectedTests.filter(t => t._id !== id));

  const addProfile = (profile) => {
    if (!selectedProfiles.find(p => p._id === profile._id))
      setSelectedProfiles([...selectedProfiles, profile]);
  };
  const removeProfile = (id) =>
    setSelectedProfiles(selectedProfiles.filter(p => p._id !== id));

  const totalPrice = [
    ...selectedTests.map(t => Number(t.price || 0)),
    ...selectedProfiles.map(p => Number(p.price || 0)),
  ].reduce((sum, val) => sum + val, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!formData.name || !formData.email || !date) {
      setSubmitError("Please fill in all required fields.");
      return;
    }
    if (selectedProfiles.length === 0 && selectedTests.length === 0) {
        setSubmitError("Please select at least one test or profile.");
        return;
    }

    const userString = localStorage.getItem("user");
    if (!userString) {
        setSubmitError("Authentication error. Please log in again.");
        return;
    }
    const userData = JSON.parse(userString);
    const token = userData.token;
    if (!token) {
        setSubmitError("Authentication token not found. Please log in again.");
        return;
    }

    // Debug: log token before making request
    console.log("Booking appointment with token:", token);

    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const appointmentData = {
      name: formData.name,
      email: formData.email,
      date,
      tests: selectedTests.map(t => t._id),
      profiles: selectedProfiles.map(p => p._id),
      totalPrice,
      dtd: formData.doorToDoor,
      address: {
        streetAddress: formData.streetAddress,
        roadNo: formData.roadNo,
        city: formData.city,
        pincode: formData.pincode,
        state: formData.state,
      },
      // mark payment state depending on method (COD is paid=false but COD semantics handled on server/client)
      isPaymentDone: paymentMethod === "cod" ? false : false
    };

    try {
      const res = await axios.post(
        `${API_BASE}/api/appointment/bookAppointment`,
        appointmentData,
        config
      );

      // If COD -> appointment is created and we confirm booking immediately
      if (paymentMethod === "cod") {
        setSubmitSuccess(res.data.message || "Appointment booked successfully (Cash on Delivery)!");
        setTimeout(() => navigate("/user-profile"), 2000);
        return;
      }

      // If Online -> navigate to Payment page with amount and appointment id
      const appointment = res.data.appointment || res.data; // defensive
      const appointmentId = appointment?._id || appointment?.id;
      if (!appointmentId) {
        setSubmitError("Could not obtain appointment id for payment.");
        return;
      }

      navigate("/payment", {
        state: {
          amount: totalPrice,
          appointmentId,
          name: formData.name,
          email: formData.email,
        }
      });
    } catch (err) {
      console.error("Appointment booking error:", err.response || err);
      setSubmitError(err.response?.data?.message || "Failed to book appointment.");
    }
  };

  const visibleTests = showAllTests ? tests : tests.slice(0, VISIBLE_COUNT);
  const visibleProfiles = showAllProfiles ? profiles : profiles.slice(0, VISIBLE_COUNT);
  const isSubmitDisabled = selectedProfiles.length === 0 && selectedTests.length === 0;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.appointmentContainer}>
        <h1 className={styles.title}>Book Your Appointment</h1>
        <div className={styles.contentWrapper}>
          <div className={styles.calendarSection}>
            <h2 className={styles.sectionTitle}>Select a Date</h2>
            <Calendar onChange={setDate} value={date} />
          </div>

          <div className={styles.formSection}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  readOnly // User's email should not be changed
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Select Profiles</label>
                <div className={styles.multiSelect}>
                  {visibleProfiles.map(p => (
                    <button
                      type="button"
                      key={p._id}
                      onClick={() => addProfile(p)}
                      disabled={selectedProfiles.find(sel => sel._id === p._id)}
                    >
                      {p.name} — Rs.{p.price}
                    </button>
                  ))}
                </div>
                {profiles.length > VISIBLE_COUNT && (
                  <button
                    type="button"
                    className={styles.viewMoreBtn}
                    onClick={() => setShowAllProfiles(prev => !prev)}
                  >
                    {showAllProfiles ? "View Less" : `View More (${profiles.length - VISIBLE_COUNT})`}
                  </button>
                )}
                <div className={styles.selectedItems}>
                  {selectedProfiles.map(p => (
                    <div key={p._id} className={styles.selectedItem}>
                      {p.name} — Rs.{p.price}
                      <span className={styles.removeItem} onClick={() => removeProfile(p._id)}>×</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Select Tests</label>
                <div className={styles.multiSelect}>
                  {visibleTests.map(t => (
                    <button
                      type="button"
                      key={t._id}
                      onClick={() => addTest(t)}
                      disabled={selectedTests.find(sel => sel._id === t._id)}
                    >
                      {t.name} — Rs.{t.price}
                    </button>
                  ))}
                </div>
                {tests.length > VISIBLE_COUNT && (
                  <button
                    type="button"
                    className={styles.viewMoreBtn}
                    onClick={() => setShowAllTests(prev => !prev)}
                  >
                    {showAllTests ? "View Less" : `View More (${tests.length - VISIBLE_COUNT})`}
                  </button>
                )}
                <div className={styles.selectedItems}>
                  {selectedTests.map(t => (
                    <div key={t._id} className={styles.selectedItem}>
                      {t.name} — Rs.{t.price}
                      <span className={styles.removeItem} onClick={() => removeTest(t._id)}>×</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Total Price:</label>
                <div className={styles.priceDisplay}>Rs. {totalPrice}</div>
              </div>

              <div className={styles.formGroup}>
                <label>Door-to-door Service?</label>
                <div className={styles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      name="doorToDoor"
                      value="yes"
                      checked={formData.doorToDoor === "yes"}
                      onChange={handleInputChange}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="doorToDoor"
                      value="no"
                      checked={formData.doorToDoor === "no"}
                      onChange={handleInputChange}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className={styles.addressCard}>
                <h3>Collection Address</h3>
                <input type="text" name="streetAddress" placeholder="Street Address" value={formData.streetAddress} onChange={handleInputChange} required />
                <input type="text" name="roadNo" placeholder="Road / Apt No." value={formData.roadNo} onChange={handleInputChange} required />
                <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleInputChange} required />
                <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleInputChange} required />
                <input type="text" name="pincode" placeholder="Pincode" value={formData.pincode} onChange={handleInputChange} required />
              </div>

              <div className={styles.formGroup}>
                <label>Payment Method</label>
                <div className={styles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={paymentMethod === "online"}
                      onChange={() => setPaymentMethod("online")}
                    />
                    Online Payment
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                    />
                    Cash on Delivery
                  </label>
                </div>
              </div>

              {submitSuccess && <div className={styles.successMessage}>{submitSuccess}</div>}
              {submitError && <div className={styles.errorMessage}>{submitError}</div>}

              <button type="submit" className={styles.submitButton} disabled={isSubmitDisabled}>
                Confirm & Proceed to Pay
              </button>
            </form>
          </div>
        </div>

        <Link to="/" className={styles.backLink}>← Go back to Home</Link>
      </div>
    </div>
  );
}

export default BookAppointment;
