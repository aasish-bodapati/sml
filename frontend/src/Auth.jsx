import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (isSignUp) {
                // Trigger Supabase Sign Up
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage('Registration successful! Please check your email for confirmation.');
            } else {
                // Trigger Supabase Login
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="macro-card" style={{ width: '100%', maxWidth: '400px', borderTop: '4px solid var(--accent)' }}>
                <h2 style={{ textAlign: 'center', color: 'var(--text-primary)' }}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                </h2>

                {message && <div className="error-banner" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--accent-light)', borderColor: 'var(--border)' }}>{message}</div>}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                        className="meal-input"
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        className="meal-input"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button className="log-btn" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                        {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <span
                        style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </span>
                </p>
            </div>
        </div>
    );
}
