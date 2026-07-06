import { useState, type FormEvent } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate({ name: 'dashboard' });
    return null;
  }

  const isSignup = mode === 'signup';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        });
        if (signUpError) throw signUpError;
        // Email confirmation is OFF; the onAuthStateChange listener will fire
        // and the profile is created by the handle_new_user trigger.
        navigate({ name: 'dashboard' });
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

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size={40} withText={false} />
            <h1 className="mt-5 font-display text-3xl font-700 tracking-tight text-white">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              {isSignup ? 'Start analyzing charts with AI in minutes.' : 'Sign in to access your dashboard.'}
            </p>
          </div>

          <form onSubmit={submit} className="glass space-y-4 p-6">
            {isSignup && (
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
            <div>
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
            </div>
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
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-bear-500/30 bg-bear-500/10 px-3 py-2.5 text-xs text-bear-400">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-neon w-full">
              {loading ? <Spinner /> : (
                <>
                  {isSignup ? 'Create account' : 'Sign in'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-400">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => navigate({ name: isSignup ? 'login' : 'signup' })}
              className="text-neon-400 neon-underline font-medium"
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
