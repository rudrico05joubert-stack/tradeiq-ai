import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { useRoute, navigate } from './lib/router';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { TradingOS, type View } from './pages/TradingOS';
import { AnalysisPage } from './pages/AnalysisPage';

function Router() {
  const route = useRoute();
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');

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
