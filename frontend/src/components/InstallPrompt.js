import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        // Check if user dismissed the prompt within the last 7 days
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) return;
        }

        // Check if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        const handler = (e) => {
            // Prevent the default mini-infobar
            e.preventDefault();
            setDeferredPrompt(e);

            // Show the custom prompt after a short delay so user settles in
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('Arogya Mitra installed successfully!');
        }

        setDeferredPrompt(null);
        handleDismiss();
    };

    const handleDismiss = () => {
        setClosing(true);
        // Wait for close animation to finish
        setTimeout(() => {
            setShowPrompt(false);
            setClosing(false);
            // Don't show again for 7 days
            localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        }, 300);
    };

    if (!showPrompt) return null;

    return (
        <div className={`install-prompt-overlay ${closing ? 'closing' : ''}`}>
            <div className="install-prompt-card">
                <div className="install-prompt-content">
                    <div className="install-prompt-icon">🏥</div>
                    <div className="install-prompt-text">
                        <h4 className="install-prompt-title">Install Arogya Mitra</h4>
                        <p className="install-prompt-desc">
                            Add to your home screen for quick access &amp; offline support.
                        </p>
                    </div>
                </div>
                <div className="install-prompt-actions">
                    <button className="install-prompt-btn install-prompt-btn--dismiss" onClick={handleDismiss}>
                        Not Now
                    </button>
                    <button className="install-prompt-btn install-prompt-btn--install" onClick={handleInstall}>
                        Install App
                    </button>
                </div>
            </div>
        </div>
    );
}

export default InstallPrompt;
