import { useState, type FormEvent } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import { useAuth } from '../lib/auth';
import { Logo, Spinner } from '../components/ui';
import { PublicHeader } from '../components/PublicHeader';

type Mode = 'login' | 'signup';

export function AuthPage({ mode }: { mode: Mode }) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isRecovery = new URLSearchParams(window.location.search).get('recovery') === '1';

  if (user && !isRecovery) {
    navigate({ name: 'dashboard' });
    return null;
  }

  const isSignup = mode === 'signup';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (isRecovery) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        window.history.replaceState({}, '', `${window.location.pathname}#/login`);
        await supabase.auth.signOut();
        setNotice('Password updated. You can now sign in.');
      } else if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        });
        if (signUpError) throw signUpError;
        if (data.session) navigate({ name: 'dashboard' });
        else setNotice('Check your email and click the confirmation link, then return here to sign in.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate({ name: 'dashboard' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      const friendly = msg.includes('Invalid credentials') || msg.includes('Invalid login')
        ? 'Incorrect email or password.'
        : msg.includes('already registered') || msg.includes('already been registered')
        ? 'An account with this email already exists.'
        : msg;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    setError(null); setNotice(null);
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/?recovery=1#/login`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw resetError;
      setNotice('If an account exists for that email, a password-reset link is on its way.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send the reset email.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size={40} withText={false} />
            <h1 className="mt-5 font-display text-3xl font-700 tracking-tight text-white">
              {isRecovery ? 'Choose a new password' : isSignup ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              {isRecovery ? 'Enter a secure password for your NEXORA account.' : isSignup ? 'Start analyzing charts with AI in minutes.' : 'Sign in to access your dashboard.'}
            </p>
          </div>

          <form onSubmit={submit} className="glass space-y-4 p-6">
            {isSignup && !isRecovery && (
              <div>
                <label className="field-label">Display name</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Trader"
                    className="input pl-10"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            {!isRecovery && <div>
              <label className="field-label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>}
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                  autoComplete={isSignup || isRecovery ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-bear-500/30 bg-bear-500/10 px-3 py-2.5 text-xs text-bear-400">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {notice && (
              <div className="flex items-start gap-2 rounded-lg border border-neon-500/30 bg-neon-500/10 px-3 py-2.5 text-xs text-neon-400">
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-neon w-full">
              {loading ? <Spinner /> : (
                <>
                  {isRecovery ? 'Update password' : isSignup ? 'Create account' : 'Sign in'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            {!isSignup && !isRecovery && (
              <button type="button" onClick={requestPasswordReset} disabled={loading} className="w-full text-center text-xs text-ink-400 hover:text-neon-400 disabled:opacity-50">
                Forgot your password?
              </button>
            )}
          </form>

          {!isRecovery && <p className="mt-6 text-center text-sm text-ink-400">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => navigate({ name: isSignup ? 'login' : 'signup' })}
              className="text-neon-400 neon-underline font-medium"
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </p>}
        </div>
      </main>
    </div>
  );
}
