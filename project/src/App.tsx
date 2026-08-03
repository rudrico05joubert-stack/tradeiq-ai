import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { useRoute, navigate } from './lib/router';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { TradingOS, type View } from './pages/TradingOS';
import { AnalysisPage } from './pages/AnalysisPage';
import { verifyPayment } from './lib/api';
import { Spinner } from './components/ui';

function Router() {
  const route = useRoute();
  const { user, loading, refreshProfile } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [paymentState, setPaymentState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (loading || !user || paymentState !== 'idle') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'callback') return;
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) { setPaymentError('The payment reference is missing.'); setPaymentState('error'); return; }
    setPaymentState('verifying');
    verifyPayment(reference)
      .then(async () => {
        await refreshProfile();
        setPaymentState('success');
        window.history.replaceState({}, '', `${window.location.pathname}#/dashboard`);
        setTimeout(() => navigate({ name: 'dashboard' }), 900);
      })
      .catch((error) => { setPaymentError(error instanceof Error ? error.message : 'Payment verification failed.'); setPaymentState('error'); });
  }, [loading, user, paymentState, refreshProfile]);

  // Reset to dashboard view whenever we (re)enter the dashboard route.
  useEffect(() => {
    if (route.name === 'dashboard') setView((v) => (v === 'dashboard' ? v : 'dashboard'));
  }, [route.name]);

  // Protect dashboard/analysis routes; redirect to login once auth is resolved.
  useEffect(() => {
    if (!loading && !user && (route.name === 'dashboard' || route.name === 'analysis')) {
      navigate({ name: 'login' });
    }
  }, [loading, user, route]);

  if (paymentState === 'verifying' || paymentState === 'success') {
    return <div className="flex min-h-screen items-center justify-center bg-ink-950"><div className="text-center"><div className="mx-auto flex w-fit items-center justify-center text-neon-400"><Spinner /></div><h1 className="mt-4 font-display text-xl font-600 text-white">{paymentState === 'success' ? 'Payment confirmed' : 'Confirming your payment'}</h1><p className="mt-2 text-sm text-ink-400">{paymentState === 'success' ? 'Your NEXORA plan is now active.' : 'Please keep this page open for a moment.'}</p></div></div>;
  }
  if (paymentState === 'error') {
    return <div className="flex min-h-screen items-center justify-center bg-ink-950 px-5"><div className="max-w-md text-center"><h1 className="font-display text-xl font-600 text-white">We could not confirm the payment yet</h1><p className="mt-2 text-sm text-ink-400">{paymentError}</p><button className="btn-neon mt-5" onClick={() => { window.history.replaceState({}, '', `${window.location.pathname}#/dashboard`); setPaymentState('idle'); navigate({ name: 'dashboard' }); }}>Return to dashboard</button></div></div>;
  }

  switch (route.name) {
    case 'home': return <HomePage />;
    case 'login': return <AuthPage mode="login" />;
    case 'signup': return <AuthPage mode="signup" />;
    case 'dashboard': return <TradingOS view={view} setView={setView} />;
    case 'analysis': return <AnalysisPage id={route.id} />;
    default: return <HomePage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
