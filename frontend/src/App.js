import React from 'react';
import ReactDOM from 'react-dom/client';
//import './index.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// --- CORE COMPONENTS ---
import NavBar from './components/Navbar/Navbar';

// --- PAGE & COMPONENT IMPORTS ---
import Home from './components/Home/Home';
import Login from './pages/Login/index';
import Register from './pages/Register/Register';
import ContactUs from './pages/ContactUs/ContactUs';
import Feedback from './components/Feedback/Feedback';
import BookAppointment from './pages/BookAppointment/index';
import UserProfile from './pages/UserProfile/index'; // Updated path
import Payment from './pages/Payment/index';
import AdminManagement from './pages/AdminManagement/index';
import FAQs from './pages/FAQs/index';
import ExploreTests from './pages/ExploreTests/index';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import PasswordReset from './pages/PasswordReset/PasswordReset';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Router>
      <NavBar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Register />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/password-reset/:userId/:token' element={<PasswordReset />} />
        <Route path='/contact-us' element={<ContactUs />} />
        <Route path='/faq' element={<FAQs />} />
        <Route path='/explore-tests' element={<ExploreTests />} />
        <Route path='/feedback' element={<Feedback />} />
        <Route path='/book-appointment' element={<BookAppointment />} />
        <Route path='/user-profile' element={<UserProfile />} />
        <Route path='/payment' element={<Payment />} />
        <Route path='/admin' element={<AdminManagement />} />

        <Route path='*' element={
          <div style={{ paddingTop: '120px', textAlign: 'center' }}>
            <h2>404 - Page Not Found</h2>
          </div>
        } />
      </Routes>
  </Router>
);
