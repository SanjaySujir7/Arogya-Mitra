import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { User, Mail, Calendar, Ruler, Droplet, Baby, Edit2, Save, X, ShieldCheck } from 'lucide-react';
import './ProfilePage.css';

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 0;
    const dob = new Date(dateOfBirth);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function ProfilePage() {
    const { user, apiFetch, setUser } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resizing, setResizing] = useState(false);
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSidebarToggle = () => {
        setResizing(true);
        setSidebarCollapsed(prev => !prev);
        setTimeout(() => setResizing(false), 350);
    };

    // Initialize form data when user loads
    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                date_of_birth: user.date_of_birth || '',
                gender: user.health_profile?.gender || '',
                height_cm: user.health_profile?.height_cm || '',
                blood_group: user.health_profile?.blood_group || '',
                is_pregnant: user.health_profile?.is_pregnant || false,
            });
        }
    }, [user, isEditing]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const payload = { ...formData };
        if (payload.height_cm === '') payload.height_cm = null;
        else if (payload.height_cm !== null) payload.height_cm = parseFloat(payload.height_cm);
        
        if (payload.date_of_birth === '') payload.date_of_birth = null;

        try {
            const res = await apiFetch('/profile/health/', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser); // Update global auth state
                setIsEditing(false);
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred while saving.' });
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    const health = user.health_profile || {};
    const isFemale = health.gender === 'Female' || health.gender === 'F';

    return (
        <div className="dashboard-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

            <main className={`dashboard-main ${sidebarCollapsed ? 'dashboard-main--collapsed' : ''} ${resizing ? 'resizing' : ''}`}>
                <div className="profile-page">
                    <div className="profile-header">
                        <div className="profile-header-avatar">
                            {user.first_name ? user.first_name.charAt(0).toUpperCase() : <User size={40} />}
                        </div>
                        <div className="profile-header-info">
                            <h1>{user.first_name} {user.last_name}</h1>
                            <p><ShieldCheck size={16} /> Active Health Profile</p>
                        </div>
                        {!isEditing && (
                            <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
                                <Edit2 size={18} /> Edit Profile
                            </button>
                        )}
                    </div>

                    {message && (
                        <div className={`profile-message profile-message--${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="profile-content">
                        <form onSubmit={handleSave}>
                            {/* --- Personal Information --- */}
                            <div className="profile-section">
                                <h2 className="profile-section-title">Personal Information</h2>
                                <div className="profile-grid">
                                    <div className="profile-field">
                                        <label><User size={16} /> First Name</label>
                                        {isEditing ? (
                                            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required />
                                        ) : (
                                            <div className="profile-value">{user.first_name || '—'}</div>
                                        )}
                                    </div>
                                    <div className="profile-field">
                                        <label><User size={16} /> Last Name</label>
                                        {isEditing ? (
                                            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required />
                                        ) : (
                                            <div className="profile-value">{user.last_name || '—'}</div>
                                        )}
                                    </div>
                                    <div className="profile-field profile-field--readonly">
                                        <label><Mail size={16} /> Email Address <span className="readonly-badge">Cannot be changed</span></label>
                                        <div className="profile-value">{user.email}</div>
                                    </div>
                                    {isFemale && calculateAge(user.date_of_birth) > 18 && (
                                        <div className="profile-field">
                                            <label><Baby size={16} /> Pregnancy Status</label>
                                            {isEditing ? (
                                                <label className="profile-toggle">
                                                    <input type="checkbox" name="is_pregnant" checked={formData.is_pregnant} onChange={handleChange} />
                                                    <span>Currently Pregnant</span>
                                                </label>
                                            ) : (
                                                <div className="profile-value">{health.is_pregnant ? 'Yes (Currently Pregnant)' : 'Not Pregnant'}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* --- Biological Data (Read-only after setup) --- */}
                            <div className="profile-section">
                                <h2 className="profile-section-title">Biological Data</h2>
                                <p className="profile-section-hint">These fields are locked after registration for medical accuracy.</p>
                                <div className="profile-grid">
                                    <div className={`profile-field ${user.date_of_birth ? 'profile-field--readonly' : ''}`}>
                                        <label>
                                            <Calendar size={16} /> Date of Birth 
                                            {user.date_of_birth && <span className="readonly-badge">Cannot be changed</span>}
                                        </label>
                                        {isEditing && !user.date_of_birth ? (
                                            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} max={new Date().toISOString().split('T')[0]} required />
                                        ) : (
                                            <div className="profile-value">{user.date_of_birth || '—'}</div>
                                        )}
                                    </div>
                                    <div className={`profile-field ${health.gender ? 'profile-field--readonly' : ''}`}>
                                        <label>
                                            <User size={16} /> Gender
                                            {health.gender && <span className="readonly-badge">Cannot be changed</span>}
                                        </label>
                                        {isEditing && !health.gender ? (
                                            <select name="gender" value={formData.gender} onChange={handleChange} required>
                                                <option value="" disabled>Select gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        ) : (
                                            <div className="profile-value">{health.gender || '—'}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- Health Metrics --- */}
                            <div className="profile-section">
                                <h2 className="profile-section-title">Health Metrics</h2>
                                <div className="profile-grid">
                                    <div className="profile-field">
                                        <label><Ruler size={16} /> Height (cm)</label>
                                        {isEditing ? (
                                            <input type="number" name="height_cm" value={formData.height_cm} onChange={handleChange} min="50" max="300" step="0.1" />
                                        ) : (
                                            <div className="profile-value">{health.height_cm ? `${health.height_cm} cm` : '—'}</div>
                                        )}
                                    </div>
                                    <div className="profile-field">
                                        <label><Droplet size={16} /> Blood Group</label>
                                        {isEditing ? (
                                            <select name="blood_group" value={formData.blood_group} onChange={handleChange}>
                                                <option value="">Unknown</option>
                                                <option value="A+">A+</option>
                                                <option value="A-">A-</option>
                                                <option value="B+">B+</option>
                                                <option value="B-">B-</option>
                                                <option value="O+">O+</option>
                                                <option value="O-">O-</option>
                                                <option value="AB+">AB+</option>
                                                <option value="AB-">AB-</option>
                                            </select>
                                        ) : (
                                            <div className="profile-value">{health.blood_group || 'Unknown'}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- Actions --- */}
                            {isEditing && (
                                <div className="profile-actions">
                                    <button type="button" className="profile-btn-cancel" onClick={() => setIsEditing(false)}>
                                        <X size={18} /> Cancel
                                    </button>
                                    <button type="submit" className="profile-btn-save" disabled={saving}>
                                        {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default ProfilePage;
