import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Signal, Position, Strategy } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BotWizard from './components/BotWizard';
import BotDetail from './components/BotDetail';
import StrategiesList from './components/StrategiesList';
import SignalLog from './components/SignalLog';
import Settings from './components/Settings';
import AuthScreen from './components/AuthScreen';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { apiFetch } from './lib/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [eToroConnected, setEToroConnected] = useState<boolean>(true);

  // Authentication states
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Core Data State
  const [bots, setBots] = useState<(Bot & { instruments: any[]; webhookToken: string })[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Check user session via Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          username: firebaseUser.email?.split('@')[0] || 'trader',
          email: firebaseUser.email || '',
          fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Stefan Trader',
          avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firebaseUser.email || 'trader')}`
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setUser(null);
    }
  };

  const fetchAllData = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const [botsRes, signalsRes, positionsRes, stratsRes, settingsRes] = await Promise.all([
        apiFetch('/api/bots'),
        apiFetch('/api/signals'),
        apiFetch('/api/positions'),
        apiFetch('/api/strategies'),
        apiFetch('/api/settings')
      ]);

      if (botsRes.ok) setBots(await botsRes.json());
      if (signalsRes.ok) setSignals(await signalsRes.json());
      if (positionsRes.ok) setPositions(await positionsRes.json());
      if (stratsRes.ok) setStrategies(await stratsRes.json());

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setEToroConnected(settings.eToroCoupled);
      }
    } catch (e) {
      console.error('Error loading API data from backend', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // No-op for checkSession as onAuthStateChanged handles it now

  useEffect(() => {
    if (user) {
      fetchAllData();
      // Refresh periodically for simulation price updates & logs
      const interval = setInterval(fetchAllData, 8000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleSelectBot = (botId: string) => {
    setSelectedBotId(botId);
    setCurrentTab('bot-detail');
  };

  const handleBotCreated = (botId: string, webhookToken: string) => {
    // Refresh data and select newly created bot details
    fetchAllData().then(() => {
      setSelectedBotId(botId);
      setCurrentTab('bot-detail');
    });
  };

  if (authLoading) {
    return (
      <div id="auth-loading-viewport" className="flex flex-col items-center justify-center bg-slate-950 text-slate-100 min-h-screen">
        <div className="w-8 h-8 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-400">Gebruikerssessie laden...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div id="app-root-container" className="flex bg-slate-950 text-slate-100 min-h-screen overflow-hidden font-sans">
      
      {/* Interactive Sidebar Panel */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedBotId={selectedBotId}
        setSelectedBotId={setSelectedBotId}
        eToroConnected={eToroConnected}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Screen Panel with Motion Transitions */}
      <div id="main-content-viewport" className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab + (selectedBotId || '')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="flex-1 overflow-y-auto h-full"
          >
            {currentTab === 'dashboard' && (
              <Dashboard
                bots={bots}
                signals={signals}
                positions={positions}
                onSelectBot={handleSelectBot}
                onNavigateToWizard={() => setCurrentTab('wizard')}
                onRefresh={fetchAllData}
                isRefreshing={isRefreshing}
              />
            )}

            {currentTab === 'wizard' && (
              <BotWizard
                strategies={strategies}
                onBotCreated={handleBotCreated}
                onCancel={() => {
                  setCurrentTab('dashboard');
                  setSelectedBotId(null);
                }}
              />
            )}

            {currentTab === 'bot-detail' && selectedBotId && (
              <BotDetail
                botId={selectedBotId}
                onBack={() => {
                  setCurrentTab('dashboard');
                  setSelectedBotId(null);
                  fetchAllData();
                }}
              />
            )}

            {currentTab === 'strategies' && (
              <StrategiesList strategies={strategies} />
            )}

            {currentTab === 'signals' && (
              <SignalLog
                signals={signals}
                bots={bots}
                onRefresh={fetchAllData}
                isRefreshing={isRefreshing}
              />
            )}

            {currentTab === 'settings' && (
              <Settings
                onSettingsUpdated={(coupled) => setEToroConnected(coupled)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
