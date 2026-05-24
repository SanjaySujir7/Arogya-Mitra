import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, ArrowRight, Loader } from 'lucide-react';
import './OnboardingModal.css';

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 0;
    const dob = new Date(dateOfBirth);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function OnboardingModal({ isOpen, onClose, onComplete }) {
    const { user, apiFetch } = useAuth();
    
    const [formData, setFormData] = useState({
        gender: '',
        height_cm: '',
        weight_kg: '',
        blood_group: '',
        is_pregnant: false
    });
    
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Calculate age to conditionally show pregnancy question
    const age = calculateAge(user?.date_of_birth);
    const showPregnancyQuestion = formData.gender === 'Female' && age > 18;

    useEffect(() => {
        // Reset pregnant state if condition is no longer met
        if (!showPregnancyQuestion && formData.is_pregnant) {
            setFormData(prev => ({ ...prev, is_pregnant: false }));
        }
    }, [showPregnancyQuestion, formData.is_pregnant]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const res = await apiFetch('/profile/health/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gender: formData.gender,
                    height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
                    weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                    blood_group: formData.blood_group || null,
                    is_pregnant: formData.is_pregnant
                })
            });

            if (res.ok) {
                const data = await res.json();
                onComplete(data); // update parent state
                onClose();
            } else {
                const errData = await res.json();
                setError(errData.detail || 'Failed to update profile. Please try again.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="onboarding-backdrop">
            <div className="onboarding-modal">
                <div className="onboarding-header">
                    <div className="onboarding-icon">
                        <Activity size={24} />
                    </div>
                    <h2>Welcome to Arogya Mitra!</h2>
                    <p>Before we begin, please tell us a little bit about yourself so we can personalize your health tracking experience.</p>
                </div>

                {error && <div className="onboarding-error">{error}</div>}

                <form onSubmit={handleSubmit} className="onboarding-form">
                    <div className="onboarding-form-grid">
                        <div className="hl-form-group">
                            <label>Gender <span className="required">*</span></label>
                            <select 
                                className="hl-form-input" 
                                value={formData.gender}
                                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                required
                            >
                                <option value="" disabled>Select gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="hl-form-group">
                            <label>Height (cm) <span className="required">*</span></label>
                            <input 
                                type="number" 
                                className="hl-form-input" 
                                placeholder="e.g. 170"
                                value={formData.height_cm}
                                onChange={(e) => setFormData({...formData, height_cm: e.target.value})}
                                required
                                min="50"
                                max="300"
                                step="0.1"
                            />
                        </div>

                        <div className="hl-form-group">
                            <label>Weight (kg) <span className="required">*</span></label>
                            <input 
                                type="number" 
                                className="hl-form-input" 
                                placeholder="e.g. 65.5"
                                value={formData.weight_kg}
                                onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                                required
                                min="20"
                                max="300"
                                step="0.1"
                            />
                        </div>

                        <div className="hl-form-group">
                            <label>Blood Group (Optional)</label>
                            <select 
                                className="hl-form-input" 
                                value={formData.blood_group}
                                onChange={(e) => setFormData({...formData, blood_group: e.target.value})}
                            >
                                <option value="">I don't know</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>
                    </div>

                    {showPregnancyQuestion && (
                        <div className="hl-form-group pregnancy-group">
                            <label className="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={formData.is_pregnant}
                                    onChange={(e) => setFormData({...formData, is_pregnant: e.target.checked})}
                                />
                                <span className="checkbox-text">I am currently pregnant</span>
                            </label>
                        </div>
                    )}

                    <div className="onboarding-footer">
                        <button type="submit" className="onboarding-submit" disabled={submitting}>
                            {submitting ? <Loader size={18} className="spin-animation" /> : 'Get Started'}
                            {!submitting && <ArrowRight size={18} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default OnboardingModal;
