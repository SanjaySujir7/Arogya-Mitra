import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import InputField from '../components/InputField';
import './RegisterPage.css';

const API_BASE = process.env.REACT_APP_API_BASE;

function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        date_of_birth: '',
    });

    const [errors, setErrors] = useState({});
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear field error on change
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

        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required.';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required.';

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Enter a valid email address.';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required.';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters.';
        }

        if (formData.password !== formData.confirm_password) {
            newErrors.confirm_password = 'Passwords do not match.';
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
            const { confirm_password, ...payload } = formData;

            const response = await fetch(`${API_BASE}/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitStatus({ type: 'success', message: 'Registration successful! Redirecting to login...' });
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    password: '',
                    confirm_password: '',
                    date_of_birth: '',
                });
                setErrors({});
                setTimeout(() => navigate('/login'), 1500);
            } else {
                if (data.detail) {
                    setSubmitStatus({ type: 'error', message: data.detail });
                } else if (data.non_field_errors) {
                    const msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
                    setSubmitStatus({ type: 'error', message: msg });
                } else if (typeof data === 'object') {
                    const backendErrors = {};
                    Object.entries(data).forEach(([key, value]) => {
                        backendErrors[key] = Array.isArray(value) ? value[0] : value;
                    });
                    setErrors(backendErrors);
                    setSubmitStatus({ type: 'error', message: 'Please fix the errors below.' });
                } else {
                    setSubmitStatus({ type: 'error', message: 'Registration failed. Please try again.' });
                }
            }
        } catch {
            setSubmitStatus({ type: 'error', message: 'Network error. Please try again later.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-card">
                <div className="register-header">
                    <h1>Create Account</h1>
                    <p>Join Arogya Mitra — your health companion</p>
                </div>

                {submitStatus.message && (
                    <div className={`status-banner ${submitStatus.type}`}>
                        {submitStatus.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <InputField
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            error={errors.first_name}
                            required
                        />
                        <InputField
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            error={errors.last_name}
                            required
                        />
                    </div>

                    <InputField
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        required
                    />

                    <div className="form-row">
                        <InputField
                            label="Password"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            error={errors.password}
                            required
                        />
                        <InputField
                            label="Confirm Password"
                            type="password"
                            name="confirm_password"
                            value={formData.confirm_password}
                            onChange={handleChange}
                            error={errors.confirm_password}
                            required
                        />
                    </div>

                    <InputField
                        label="Date of Birth"
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        error={errors.date_of_birth}
                    />

                    <button type="submit" className="submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating Account...' : 'Register'}
                    </button>

                    <div className="login-link-container">
                        <p>Already have an account? <Link to="/login" className="login-link">Login</Link></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RegisterPage;
