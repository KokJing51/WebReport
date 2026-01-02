import React, { useState } from 'react';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Layout } from './components/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { CalendarPage } from './components/calendar/CalendarPage';
import { BookingsPage } from './components/bookings/BookingsPage';
import ReviewsPage from './components/reviews/ReviewsPage';
import { ContentManager } from './components/content/ContentManager';
import { AutomationsPage } from './components/automations/AutomationsPage';
import { ShowcasePage } from './components/showcase/ShowcasePage';
import { SettingsPage } from './components/settings/SettingsPage';
import { Toaster } from './components/ui/sonner';

type AppState = 'auth' | 'onboarding' | 'app';
type AppPage = 'dashboard' | 'calendar' | 'bookings' | 'reviews' | 'content' | 'automations' | 'showcase' | 'settings';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    // Check if user is already logged in
    const user = localStorage.getItem('user');
    return user ? 'app' : 'auth';
  });
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  });

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    // Check if user has completed onboarding (has merchant record)
    // For now, always go to app - we can add onboarding check later
    setAppState('app');
    setCurrentPage('dashboard');
  };

  const handleStartOnboarding = () => {
    setAppState('onboarding');
  };

  const handleCompleteOnboarding = () => {
    // Log out the user after onboarding completion
    localStorage.removeItem('user');
    setCurrentUser(null);
    setAppState('auth');
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setAppState('auth');
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as AppPage);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} user={currentUser} />;
      case 'calendar':
        return <CalendarPage onNavigate={handleNavigate} user={currentUser} />;
      case 'bookings':
        return <BookingsPage onNavigate={handleNavigate} user={currentUser} />;
      case 'reviews':
        return <ReviewsPage />;
      case 'content':
        return <ContentManager onNavigate={handleNavigate} />;
      case 'automations':
        return <AutomationsPage onNavigate={handleNavigate} />;
      case 'showcase':
        return <ShowcasePage />;
      case 'settings':
        return <SettingsPage onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} user={currentUser} />;
    }
  };

  if (appState === 'auth') {
    return (
      <>
        <AuthPage 
          onLogin={handleLogin} 
          onStartOnboarding={handleStartOnboarding} 
        />
        <Toaster />
      </>
    );
  }

  if (appState === 'onboarding') {
    return (
      <>
        <OnboardingWizard onComplete={handleCompleteOnboarding} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Layout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={currentUser}
      >
        {renderCurrentPage()}
      </Layout>
      <Toaster />
    </>
  );
}