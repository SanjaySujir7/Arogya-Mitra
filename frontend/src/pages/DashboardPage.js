import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingModal from '../components/OnboardingModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import AlertPanel from '../components/AlertPanel';
import GoalTracker from '../components/GoalTracker';
import {
    AreaChart, Area, LineChart, Line,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Activity, Footprints, Scale, Moon, Sun, Plus, HeartPulse, ShieldAlert, LineChart as LineChartIcon, TrendingDown, Loader, User, X, Save, Target } from 'lucide-react';
import './DashboardPage.css';

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 0;
    const dob = new Date(dateOfBirth);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function ProfileModal({ isOpen, onClose, currentProfile, onSave, apiFetch, user }) {
    const [height, setHeight] = useState('');
    const [isPregnant, setIsPregnant] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setHeight(currentProfile?.height_cm || '');
            setIsPregnant(currentProfile?.is_pregnant || false);
        }
    }, [isOpen, currentProfile]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await apiFetch('/profile/health/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    height_cm: height ? parseFloat(height) : null,
                    is_pregnant: isPregnant 
                })
            });
            if (res.ok) {
                const data = await res.json();
                onSave(data);
            } else {
                alert('Failed to update profile');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div style={{
                background: 'var(--card-bg)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400,
                border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Edit Profile</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Height (cm)</label>
                        <input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="e.g. 175"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 8,
                                border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none'
                            }}
                        />
                    </div>
                    
                    {user?.health_profile?.gender === 'Female' && calculateAge(user?.date_of_birth) > 18 && (
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={isPregnant}
                                    onChange={(e) => setIsPregnant(e.target.checked)}
                                    style={{ width: '18px', height: '18px', accentColor: '#1f73b7', cursor: 'pointer' }}
                                />
                                Currently Pregnant
                            </label>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #1f73b7, #4caf50)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {saving ? <Loader size={16} className="spin-animation" /> : <Save size={16} />}
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ---------- Mock Data (Alerts & Goals — to be replaced later) ---------- */
const mockAlerts = [
    { severity: 'red', message: 'Blood pressure reading above normal range (130/85).', time: '2 hours ago' },
    { severity: 'amber', message: 'Blood sugar level slightly elevated at 140 mg/dL.', time: '5 hours ago' },
    { severity: 'green', message: 'Daily step goal achieved! 10,200 steps.', time: 'Yesterday' },
    { severity: 'blue', message: 'Monthly health report is ready to download.', time: '2 days ago' },
];



/* ---------- Chart Tooltip ---------- */
const ChartTooltip = ({ active, payload, label }) => {
    const { theme } = useTheme();
    if (!active || !payload?.length) return null;

    const bg = theme === 'light' ? '#ffffff' : 'rgba(15,17,23,0.95)';
    const border = theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)';
    const titleColor = theme === 'light' ? '#0f172a' : '#f0f2f5';
    const textColor = theme === 'light' ? '#475569' : '#c4c9d4';

    return (
        <div style={{
            background: bg, border: border,
            borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: textColor,
        }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: titleColor }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
            ))}
        </div>
    );
};

/* ---------- Empty Chart Placeholder ---------- */
function EmptyChartMessage({ message }) {
    return (
        <div style={{
            height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500,
        }}>
            {message || 'No data yet. Start logging your health!'}
        </div>
    );
}

/* ---------- BMI Category Helper ---------- */
function getBmiCategory(bmi) {
    if (!bmi) return { label: '--', color: 'green' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'amber' };
    if (bmi < 25) return { label: 'Normal', color: 'green' };
    if (bmi < 30) return { label: 'Overweight', color: 'amber' };
    return { label: 'Obese', color: 'red' };
}

/* ---------- Greeting Helper ---------- */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function getFormattedDate() {
    return new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

/* ---------- Dashboard Component ---------- */
function DashboardPage() {
    const { user, setUser, apiFetch } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [dashData, setDashData] = useState(null);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [onboardingOpen, setOnboardingOpen] = useState(false);

    const axisColor = theme === 'light' ? '#94a3b8' : '#4b5063';

    const handleSidebarToggle = () => {
        setResizing(true);
        setSidebarCollapsed(!sidebarCollapsed);
        setTimeout(() => setResizing(false), 350);
    };

    // Fetch dashboard data from API
    const fetchDashboardData = useCallback(async () => {
        try {
            const [dashRes, goalsRes] = await Promise.all([
                apiFetch('/dashboard/'),
                apiFetch('/goals/')
            ]);

            if (dashRes.ok) {
                const data = await dashRes.json();
                setDashData(data);
                if (data.profile && (!data.profile.gender || !data.profile.height_cm)) {
                    setOnboardingOpen(true);
                }
            }
            if (goalsRes.ok) {
                const goalsData = await goalsRes.json();
                setGoals(goalsData);
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Extract data safely
    const profile = dashData?.profile;
    const latestLog = dashData?.latest_log;
    const bmi = dashData?.bmi;
    const bmiCat = getBmiCategory(bmi);

    // Format chart data
    const bpChartData = (dashData?.bp_trend || []).map((log) => {
        const d = new Date(log.date);
        return {
            day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
            systolic: log.systolic_bp,
            diastolic: log.diastolic_bp,
        };
    });

    const weightChartData = (dashData?.weight_trend || []).map((log, idx) => ({
        week: `W${idx + 1}`,
        kg: parseFloat(log.weight_kg),
    }));

    const weightValues = weightChartData.map(d => d.kg);
    const weightMin = weightValues.length ? Math.floor(Math.min(...weightValues) - 1) : 60;
    const weightMax = weightValues.length ? Math.ceil(Math.max(...weightValues) + 1) : 80;

    const mappedGoals = goals.map(goal => {
        let icon;
        switch (goal.metric_type) {
            case 'step_count': icon = <Footprints size={20} />; break;
            case 'water_intake': icon = <Activity size={20} />; break; // imported Activity earlier
            case 'sleep_hours': icon = <Moon size={20} />; break;
            case 'weight_kg': icon = <Scale size={20} />; break;
            default: icon = <Target size={20} />; break; // import Target
        }
        return {
            label: goal.title,
            current: goal.today_progress || 0,
            target: goal.target_value,
            unit: goal.unit,
            color: goal.color,
            icon: icon
        };
    });

    return (
        <div className="dashboard-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

            <main className={`dashboard-main ${sidebarCollapsed ? 'dashboard-main--collapsed' : ''} ${resizing ? 'resizing' : ''}`}>
                {/* Welcome Header */}
                <div className="dash-header">
                    <div className="dash-greeting">
                        <h1>{getGreeting()}, {user?.first_name || 'there'} 👋</h1>
                        <p>{getFormattedDate()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)', padding: '8px', borderRadius: '8px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        <button className="dash-action-btn" onClick={() => setProfileModalOpen(true)}>
                            <User size={18} style={{ marginRight: 6 }} /> Edit Profile
                        </button>
                        <button className="dash-action-btn" onClick={() => navigate('/health-log')}>
                            <Plus size={18} style={{ marginRight: 6 }} /> Log Today's Health
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                        <Loader size={32} className="spin-animation" style={{ color: 'var(--text-muted)' }} />
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="dash-stats">
                            <StatCard
                                icon={<Activity size={24} />} iconColor="green"
                                label="Health Score"
                                value={profile?.current_health_score ?? '--'}
                                sub="Out of 100"
                                badge={profile?.current_health_score >= 70 ? 'Good' : profile?.current_health_score >= 40 ? 'Fair' : 'Low'}
                                badgeColor={profile?.current_health_score >= 70 ? 'green' : profile?.current_health_score >= 40 ? 'amber' : 'red'}
                            />
                            <StatCard
                                icon={<Scale size={24} />} iconColor="blue"
                                label="BMI"
                                value={bmi ?? '--'}
                                sub={profile?.height_cm ? `Height: ${profile.height_cm}cm` : 'Set height in profile'}
                                badge={bmiCat.label}
                                badgeColor={bmiCat.color}
                            />
                            <StatCard
                                icon={<HeartPulse size={24} />} iconColor="rose"
                                label="Heart Rate"
                                value={latestLog?.heart_rate_bpm ?? '--'}
                                sub={latestLog?.heart_rate_bpm ? 'BPM • Resting' : 'No reading yet'}
                            />
                            <StatCard
                                icon={<ShieldAlert size={24} />} iconColor="amber"
                                label="Risk Level"
                                value={profile?.current_risk_level ?? '--'}
                                sub="Diabetes & Heart"
                                badge={profile?.current_risk_level === 'Low' ? 'No action needed' : 'Monitor'}
                                badgeColor={profile?.current_risk_level === 'Low' ? 'green' : 'amber'}
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="dash-charts">
                            <div className="dash-chart-card">
                                <div className="dash-chart-title">
                                    <LineChartIcon size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: '#60a5fa' }} />
                                    Blood Pressure ({bpChartData.length} {bpChartData.length === 1 ? 'day' : 'days'})
                                </div>
                                <div className="dash-chart-body">
                                    {bpChartData.length >= 2 ? (
                                        <ResponsiveContainer width="99%" height={250}>
                                            <AreaChart data={bpChartData}>
                                                <defs>
                                                    <linearGradient id="gradSys" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="gradDia" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#4ade80" stopOpacity={0.2} />
                                                        <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="day" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis domain={[60, 140]} stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Area type="monotone" dataKey="systolic" name="Systolic" stroke="#60a5fa" fill="url(#gradSys)" strokeWidth={2} />
                                                <Area type="monotone" dataKey="diastolic" name="Diastolic" stroke="#4ade80" fill="url(#gradDia)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <EmptyChartMessage message={
                                            bpChartData.length === 1
                                                ? 'Need at least 2 readings to show a trend. Keep logging!'
                                                : 'No blood pressure data yet. Log your first reading!'
                                        } />
                                    )}
                                </div>
                            </div>

                            <div className="dash-chart-card">
                                <div className="dash-chart-title">
                                    <TrendingDown size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: '#a78bfa' }} />
                                    Weight Trend ({weightChartData.length} {weightChartData.length === 1 ? 'entry' : 'entries'})
                                </div>
                                <div className="dash-chart-body">
                                    {weightChartData.length >= 2 ? (
                                        <ResponsiveContainer width="99%" height={250}>
                                            <LineChart data={weightChartData}>
                                                <XAxis dataKey="week" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis domain={[weightMin, weightMax]} stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Line type="monotone" dataKey="kg" name="Weight" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 4, fill: '#a78bfa' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <EmptyChartMessage message={
                                            weightChartData.length === 1
                                                ? 'Need at least 2 readings to show a trend. Keep logging!'
                                                : 'No weight data yet. Log your first entry!'
                                        } />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row */}
                        <div className="dash-bottom">
                            <AlertPanel alerts={mockAlerts} />
                            <GoalTracker goals={mappedGoals} />
                        </div>
                    </>
                )}
            </main>
            {/* Profile Modal */}
            <ProfileModal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                currentProfile={dashData?.profile}
                apiFetch={apiFetch}
                user={user}
                onSave={(updatedUser) => {
                    setProfileModalOpen(false);
                    if (updatedUser) setUser(updatedUser);
                    fetchDashboardData();
                }}
            />

            <OnboardingModal
                isOpen={onboardingOpen}
                onClose={() => setOnboardingOpen(false)}
                onComplete={(updatedUser) => { 
                    setOnboardingOpen(false); 
                    if (updatedUser) setUser(updatedUser);
                    fetchDashboardData(); 
                }}
            />
        </div>
    );
}

export default DashboardPage;


