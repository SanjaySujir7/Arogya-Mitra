import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/InputField';
import './LoginPage.css';

const API_BASE = process.env.REACT_APP_API_BASE;

function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [errors, setErrors] = useState({});
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Enter a valid email address.';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required.';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus({ type: '', message: '' });

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_BASE}/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitStatus({ type: 'success', message: `Welcome back, ${data.user.first_name}!` });
                setErrors({});
                login(data.access_token, data.refresh_token, data.user);
                navigate('/dashboard');
            } else {
                if (data.detail) {
                    // SimpleJWT uses 'detail' for authentication failures
                    const isAuthError = data.detail.includes('No active account') || data.detail.includes('credentials');
                    const msg = isAuthError ? 'Invalid email or password. Please try again.' : data.detail;
                    setSubmitStatus({ type: 'error', message: msg });
                } else if (data.non_field_errors) {
                    const backendErrors = {};
                    const errorObj = typeof data.non_field_errors[0] === 'object'
                        ? data.non_field_errors[0]
                        : {};
                    Object.entries(errorObj).forEach(([key, value]) => {
                        backendErrors[key] = Array.isArray(value) ? value[0] : value;
                    });
                    if (Object.keys(backendErrors).length > 0) {
                        setErrors(backendErrors);
                    }
                    setSubmitStatus({ type: 'error', message: 'Invalid credentials. Please try again.' });
                } else if (typeof data === 'object') {
                    const backendErrors = {};
                    Object.entries(data).forEach(([key, value]) => {
                        backendErrors[key] = Array.isArray(value) ? value[0] : value;
                    });
                    setErrors(backendErrors);
                    setSubmitStatus({ type: 'error', message: 'Please fix the errors below.' });
                }
            }
        } catch {
            setSubmitStatus({ type: 'error', message: 'Network error. Please try again later.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h1>Welcome Back</h1>
                    <p>Sign in to Arogya Mitra — your health companion</p>
                </div>

                {submitStatus.message && (
                    <div className={`login-status-banner ${submitStatus.type}`}>
                        {submitStatus.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <InputField
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        required
                    />

                    <InputField
                        label="Password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        error={errors.password}
                        required
                    />

                    <div className="forgot-password-container">
                        <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
                    </div>

                    <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing In...' : 'Login'}
                    </button>

                    <div className="register-link-container">
                        <p>Don't have an account? <Link to="/register" className="register-link">Register</Link></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
