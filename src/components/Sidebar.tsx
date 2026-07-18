import React from 'react';
import { LayoutDashboard, PlusCircle, BookOpen, ScrollText, Settings as SettingsIcon, Radio, LogOut } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedBotId: string | null;
  setSelectedBotId: (id: string | null) => void;
  eToroConnected: boolean;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  selectedBotId,
  setSelectedBotId,
  eToroConnected,
  user,
  onLogout
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'wizard', name: 'Nieuwe Bot', icon: PlusCircle, highlight: true },
    { id: 'strategies', name: 'Strategieën', icon: BookOpen },
    { id: 'signals', name: 'Signaallog', icon: ScrollText },
    { id: 'settings', name: 'Instellingen', icon: SettingsIcon },
  ];

  return (
    <div id="sidebar-container" className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 font-sans">
      {/* Brand Header */}
      <div id="brand-header" className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/30">
          <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
        <div>
          <h1 className="text-md font-bold tracking-wider text-slate-100">TRADING BOT</h1>
          <p className="text-xs text-slate-500 font-mono tracking-widest">MANAGER v1.3</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div id="sidebar-nav" className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold text-slate-500 tracking-widest font-mono mb-2 uppercase">Menu</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => {
                setCurrentTab(item.id);
                setSelectedBotId(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm font-medium group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : item.highlight
                  ? 'text-cyan-400 hover:bg-slate-800 border border-transparent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                <span>{item.name}</span>
              </div>
              {item.highlight && !isActive && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/20 font-bold">
                  ADD
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Connection & User Footer Widget */}
      <div id="sidebar-footer" className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative flex-shrink-0">
              {user?.avatarUrl ? (
                <img referrerPolicy="no-referrer" src={user.avatarUrl} alt={user.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-cyan-400 font-mono">
                  {user?.fullName ? user.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'US'}
                </div>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                eToroConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.fullName || 'Gebruiker'}</p>
              <div className="flex items-center space-x-1.5">
                <span className={`text-[9px] font-mono uppercase tracking-wider ${
                  eToroConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {eToroConnected ? 'eToro Live' : 'Demo Mode'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Logout Button */}
          <button 
            onClick={onLogout}
            title="Log uit"
            className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
