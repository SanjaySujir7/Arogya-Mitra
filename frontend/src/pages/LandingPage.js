import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calculator, Brain, TrendingUp, BellRing, FileText } from 'lucide-react';
import './LandingPage.css';

/* ---- Scroll animation hook ---- */
function useScrollReveal() {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const targets = el.querySelectorAll('.fade-up');
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.15 }
        );

        targets.forEach((t) => observer.observe(t));
        return () => observer.disconnect();
    }, []);

    return ref;
}

/* ---- Feature data ---- */
const features = [
    {
        icon: <Activity size={24} />,
        color: 'blue',
        title: 'Health Data Logging',
        desc: 'Track weight, BP, blood sugar, heart rate, sleep, water intake and step count — all in one place.',
    },
    {
        icon: <Calculator size={24} />,
        color: 'green',
        title: 'BMI & Health Score',
        desc: 'Automatic BMI calculation with WHO classification and a dynamic 0–100 health score.',
    },
    {
        icon: <Brain size={24} />,
        color: 'purple',
        title: 'AI Risk Prediction',
        desc: 'Machine learning models assess your diabetes and heart disease risk with probability scoring.',
    },
    {
        icon: <TrendingUp size={24} />,
        color: 'cyan',
        title: 'Trend Analysis',
        desc: 'Interactive weekly and monthly graphs to visualize your health progress over time.',
    },
    {
        icon: <BellRing size={24} />,
        color: 'amber',
        title: 'Smart Alerts',
        desc: 'Instant notifications for abnormal values, high-risk predictions and goal milestones.',
    },
    {
        icon: <FileText size={24} />,
        color: 'rose',
        title: 'Health Reports',
        desc: 'Download monthly PDF summaries with graphs, risk analysis and your overall health overview.',
    },
];

/* ---- Steps data ---- */
const steps = [
    {
        num: '1',
        title: 'Create Your Account',
        desc: 'Sign up in seconds and set up your personal health profile.',
    },
    {
        num: '2',
        title: 'Log Health Data',
        desc: 'Enter your daily vitals — BP, blood sugar, weight, sleep and more.',
    },
    {
        num: '3',
        title: 'Get AI Insights',
        desc: 'View trends, receive risk predictions and download health reports.',
    },
];

/* ---- Stats data ---- */
const stats = [
    { value: '8+', label: 'Health Metrics', color: 'blue' },
    { value: 'AI', label: 'Powered Predictions', color: 'green' },
    { value: '24/7', label: 'Real-time Monitoring', color: 'purple' },
    { value: 'PDF', label: 'Monthly Reports', color: 'amber' },
];

/* ---- Main Component ---- */
function LandingPage() {
    const pageRef = useScrollReveal();

    return (
        <div ref={pageRef} className="landing-page">
            {/* Navbar */}
            <nav className="landing-nav">
                <Link to="/" className="nav-logo">
                    <img src="/logo-1.png" alt="Arogya Mitra" />
                    <span>Arogya Mitra</span>
                </Link>
                <div className="nav-links">
                    <Link to="/login" className="nav-link-ghost">Log In</Link>
                    <Link to="/register" className="nav-link-primary">Get Started</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="hero-section">
                <div className="hero-orb hero-orb--blue" />
                <div className="hero-orb hero-orb--green" />
                <div className="hero-orb hero-orb--teal" />

                <div className="hero-content">
                    <h1 className="hero-title">
                        Your Health,{' '}
                        <span className="gradient-text">Intelligently Monitored</span>
                    </h1>
                    <p className="hero-subtitle">
                        Log daily vitals, set personalized health goals, and get advanced AI risk 
                        predictions for diabetes and heart disease all in one secure platform.
                    </p>
                    <div className="hero-cta">
                        <Link to="/register" className="btn-primary">
                            Start Free →
                        </Link>
                        <Link to="/login" className="btn-secondary">
                            I already have an account
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="landing-section">
                <div className="section-header fade-up">
                    <div className="section-label">✦ Features</div>
                    <h2 className="section-title">Everything you need for preventive healthcare</h2>
                    <p className="section-desc">
                        From daily health logging to AI-based risk analysis — Arogya Mitra gives
                        you the tools to stay ahead of potential health issues.
                    </p>
                </div>

                <div className="features-grid">
                    {features.map((f, i) => (
                        <div
                            className="feature-card fade-up"
                            key={f.title}
                            style={{ transitionDelay: `${i * 80}ms` }}
                        >
                            <div className={`feature-icon feature-icon--${f.color}`}>
                                {f.icon}
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="landing-section">
                <div className="section-header fade-up">
                    <div className="section-label">✦ How It Works</div>
                    <h2 className="section-title">Get started in three simple steps</h2>
                    <p className="section-desc">
                        No complicated setup. Sign up, log your health data, and let our AI
                        do the rest.
                    </p>
                </div>

                <div className="steps-grid fade-up">
                    {steps.map((s) => (
                        <div className="step-card" key={s.num}>
                            <div className="step-number">{s.num}</div>
                            <h3>{s.title}</h3>
                            <p>{s.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats */}
            <section className="stats-section">
                <div className="stats-bar fade-up">
                    {stats.map((s) => (
                        <div className="stat-item" key={s.label}>
                            <div className={`stat-value stat-value--${s.color}`}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <div className="cta-box fade-up">
                    <h2>Ready to take control of your health?</h2>
                    <p>
                        Join Arogya Mitra today and get personalized health insights powered
                        by artificial intelligence. It's free to get started.
                    </p>
                    <Link to="/register" className="btn-primary">
                        Create Your Free Account →
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-brand">
                    <img src="/logo-1.png" alt="" />
                    <span>© 2026 Arogya Mitra</span>
                </div>
                <div className="footer-disclaimer">
                    This application provides predictive health insights and is not a
                    substitute for professional medical advice, diagnosis, or treatment.
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;
