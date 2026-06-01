import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InputField from '../components/InputField';
import './ForgotPasswordPage.css';

const API_BASE = process.env.REACT_APP_API_BASE;

function ForgotPasswordPage() {
    const navigate = useNavigate();
    
    // 1 = Request OTP, 2 = Verify OTP, 3 = Reset Password
    const [step, setStep] = useState(1);
    
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resetToken, setResetToken] = useState('');
    const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });

    const [errors, setErrors] = useState({});
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const otpRefs = useRef([]);

    // Auto-focus first OTP input when step changes to 2
    useEffect(() => {
        if (step === 2 && otpRefs.current[0]) {
            otpRefs.current[0].focus();
        }
    }, [step]);

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (errors.email) setErrors(prev => ({ ...prev, email: null }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
        if (errors.match) setErrors(prev => ({ ...prev, match: null }));
    };

    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;
        
        const newOtp = [...otp];
        // Only allow last character if they pasted or typed fast
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Auto-advance
        if (value && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1].focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData) {
            const newOtp = [...otp];
            for (let i = 0; i < pastedData.length; i++) {
                newOtp[i] = pastedData[i];
            }
            setOtp(newOtp);
            // Focus next empty or last
            const focusIndex = Math.min(pastedData.length, 5);
            if (otpRefs.current[focusIndex]) {
                otpRefs.current[focusIndex].focus();
            } else if (otpRefs.current[5]) {
                otpRefs.current[5].focus();
            }
        }
    };

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setSubmitStatus({ type: '', message: '' });
        
        if (!email.trim()) {
            setErrors({ email: 'Email is required.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/password-reset/request/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setSubmitStatus({ type: 'success', message: data.message });
                setTimeout(() => {
                    setSubmitStatus({ type: '', message: '' });
                    setStep(2);
                }, 1500);
            } else {
                setSubmitStatus({ type: 'error', message: data.detail || 'Failed to request OTP.' });
            }
        } catch (error) {
            setSubmitStatus({ type: 'error', message: 'Network error. Please try again later.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setSubmitStatus({ type: '', message: '' });
        
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setSubmitStatus({ type: 'error', message: 'Please enter all 6 digits.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/password-reset/verify-otp/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpString }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setResetToken(data.reset_token);
                setSubmitStatus({ type: 'success', message: 'OTP Verified Successfully!' });
                setTimeout(() => {
                    setSubmitStatus({ type: '', message: '' });
                    setStep(3);
                }, 1000);
            } else {
                setSubmitStatus({ type: 'error', message: data.detail || 'Invalid or expired OTP.' });
            }
        } catch (error) {
            setSubmitStatus({ type: 'error', message: 'Network error. Please try again later.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setSubmitStatus({ type: '', message: '' });
        
        const newErrors = {};
        if (!passwords.newPassword) newErrors.newPassword = 'New password is required.';
        else if (passwords.newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters.';
        
        if (!passwords.confirmPassword) newErrors.confirmPassword = 'Please confirm your password.';
        
        if (passwords.newPassword && passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword) {
            newErrors.match = 'Passwords do not match.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/password-reset/confirm/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    reset_token: resetToken,
                    new_password: passwords.newPassword
                }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setSubmitStatus({ type: 'success', message: 'Password reset successfully! Redirecting to login...' });
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setSubmitStatus({ type: 'error', message: data.detail || 'Failed to reset password.' });
            }
        } catch (error) {
            setSubmitStatus({ type: 'error', message: 'Network error. Please try again later.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="forgot-password-page">
            <div className="forgot-password-card">
                <div className="forgot-password-header">
                    <h1>{step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'Secure New Password'}</h1>
                    <p>
                        {step === 1 && 'Enter your email to receive an OTP'}
                        {step === 2 && `Enter the 6-digit code sent to ${email}`}
                        {step === 3 && 'Create a strong, unique new password'}
                    </p>
                </div>

                {submitStatus.message && (
                    <div className={`status-banner ${submitStatus.type}`}>
                        {submitStatus.message}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleRequestOTP} noValidate>
                        <InputField
                            label="Email Address"
                            type="email"
                            name="email"
                            value={email}
                            onChange={handleEmailChange}
                            error={errors.email}
                            required
                        />
                        <button type="submit" className="forgot-password-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOTP} noValidate>
                        <div className="otp-container" onPaste={handleOtpPaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => otpRefs.current[index] = el}
                                    type="text"
                                    maxLength={1}
                                    className="otp-input"
                                    value={digit}
                                    onChange={e => handleOtpChange(index, e.target.value)}
                                    onKeyDown={e => handleOtpKeyDown(index, e)}
                                    disabled={isSubmitting}
                                />
                            ))}
                        </div>
                        <button type="submit" className="forgot-password-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <div style={{ marginTop: '15px', fontSize: '0.85rem' }}>
                            <button type="button" onClick={handleRequestOTP} className="resend-link" disabled={isSubmitting}>
                                Resend OTP
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} noValidate>
                        <InputField
                            label="New Password"
                            type="password"
                            name="newPassword"
                            value={passwords.newPassword}
                            onChange={handlePasswordChange}
                            error={errors.newPassword}
                            required
                        />
                        <InputField
                            label="Confirm Password"
                            type="password"
                            name="confirmPassword"
                            value={passwords.confirmPassword}
                            onChange={handlePasswordChange}
                            error={errors.confirmPassword}
                            required
                        />
                        {errors.match && <p className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'left', marginTop: '-10px', marginBottom: '15px' }}>{errors.match}</p>}
                        
                        <button type="submit" className="forgot-password-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Resetting...' : 'Set New Password'}
                        </button>
                    </form>
                )}

                <div className="back-to-login">
                    <Link to="/login" className="back-link">Back to Login</Link>
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;
