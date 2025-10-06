import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import styles from "./styles.module.css";

// API base: prefer REACT_APP_API_URL, otherwise use deployed backend
const API_BASE =
  process.env.REACT_APP_API_URL || "https://lifecare-pathology.onrender.com";

function Login() {
  const [data, setData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = ({ currentTarget: input }) => {
    setData({ ...data, [input.name]: input.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: res } = await axios.post(
        `${API_BASE}/api/auth/Login`,
        data
      );

      // ✅ FIX: The backend sends a response containing both the token
      // and user details. We must save this entire object.
      // The token is typically in res.data, and user info in res.user.

      // Construct a complete user object to store
      if (res.user && res.data) {
        localStorage.setItem(
          "user",
          JSON.stringify({ user: res.user, token: res.data })
        );
      } else if (res.data) {
        localStorage.setItem(
          "user",
          JSON.stringify({ user: {}, token: res.data })
        );
      } else {
        // fallback for legacy backend responses
        localStorage.setItem(
          "user",
          JSON.stringify({ ...res, token: res.data || res.token })
        );
      }

      // Dispatch a custom event to notify other components (like NavBar) of the login
      window.dispatchEvent(new Event("userLoggedIn"));

      // Navigate to the home page after a successful login
      navigate("/");
    } catch (error) {
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status <= 500
      ) {
        setError(error.response.data.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        {/* --- Left Side: The Form --- */}
        <div className={styles.formSide}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>
              Please enter your details to sign in.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                name="email"
                onChange={handleChange}
                value={data.email}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                name="password"
                onChange={handleChange}
                value={data.password}
                required
                className={styles.input}
              />
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.formActions}>
              <Link to="/forgot-password" className={styles.forgotPassword}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className={styles.signInButton}>
              Sign In
            </button>
          </form>
        </div>

        {/* --- Right Side: The Welcome Message --- */}
        <div className={styles.welcomeSide}>
          <div className={styles.welcomeContent}>
            <h2>New Here?</h2>
            <p>Sign up and discover a great amount of new opportunities!</p>
            <Link to="/signup">
              <button type="button" className={styles.signUpButton}>
                Sign Up
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
