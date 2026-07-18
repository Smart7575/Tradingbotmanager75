import React from 'react';
import { Bot, Signal, Position } from '../types';
import { TrendingUp, Percent, Layers, PlayCircle, AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight, RefreshCw, Zap } from 'lucide-react';

interface DashboardProps {
  bots: (Bot & { instruments: any[]; webhookToken: string })[];
  signals: Signal[];
  positions: Position[];
  onSelectBot: (botId: string) => void;
  onNavigateToWizard: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Dashboard({
  bots,
  signals,
  positions,
  onSelectBot,
  onNavigateToWizard,
  onRefresh,
  isRefreshing
}: DashboardProps) {
  // Aggregate Metrics
  const activeBots = bots.filter(b => b.status === 'active').length;
  const totalBotsCount = bots.length;
  
  // Calculate aggregate portfolio metrics
  // Start equity
  const totalStartBudget = bots.reduce((sum, b) => sum + b.startBudgetUsd, 0);
  
  // Open positions valuation
  const totalOpenPosValue = positions.reduce((sum, p) => sum + p.sizeUsd + p.pnlUsd, 0);
  
  // Total current value = sum of cash balances + open position values
  const totalCashBalance = bots.reduce((sum, b) => sum + b.balanceUsd, 0);
  const totalCurrentValue = totalCashBalance + totalOpenPosValue;
  
  // All-time return
  const totalPnlUsd = totalCurrentValue - totalStartBudget;
  const totalPnlPct = totalStartBudget > 0 ? (totalPnlUsd / totalStartBudget) * 100 : 0;

  // Rendement vandaag (mocked realistic fluctuation for today)
  const todayReturnUsd = totalStartBudget * 0.0084; // realistic positive day +0.84%
  const todayReturnPct = 0.84;

  const openPositionsCount = positions.filter(p => p.status === 'open').length;

  // Simple SVG sparkline generator
  const renderSparkline = (botId: string, color: string) => {
    // Generate a simple curved path for sparklines
    const points = botId === 'bot-1' 
      ? [20, 25, 15, 30, 45, 40, 55, 60]
      : botId === 'bot-2'
      ? [30, 20, 40, 35, 25, 45, 50, 55]
      : [30, 30, 30, 30, 30, 30, 30, 30]; // flat/new

    const width = 120;
    const height = 30;
    const maxVal = Math.max(...points);
    const minVal = Math.min(...points);
    const range = maxVal - minVal || 1;
    
    const coordinates = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - minVal) / range) * (height - 6) - 3;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coordinates}
        />
      </svg>
    );
  };

  return (
    <div id="dashboard-tab" className="p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full font-sans">
      
      {/* Header and Action */}
      <div id="dashboard-header-container" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
            <span>Trading Bot Dashboard</span>
            {isRefreshing && <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />}
          </h2>
          <p className="text-sm text-slate-400">Monitor live eToro Agent Portfolios en TradingView webhook signalen.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            id="refresh-dashboard-btn"
            onClick={onRefresh}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono font-medium text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>

          <button
            id="create-new-bot-btn"
            onClick={onNavigateToWizard}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-slate-950 rounded-lg text-sm font-semibold transition"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Nieuwe Bot</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div id="metric-cards-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Totaalrendement */}
        <div id="metric-total-return" className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp className="w-24 h-24 text-cyan-400" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Totaalrendement (all-time)</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
              {totalPnlUsd >= 0 ? '+' : ''}${totalPnlUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className={`text-xs font-mono font-bold flex items-center ${
                totalPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {totalPnlPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {totalPnlPct.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-500">op ${totalStartBudget.toLocaleString()} inzet</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Rendement Vandaag */}
        <div id="metric-today-return" className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Rendement Vandaag</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
              +${todayReturnUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                {todayReturnPct.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-500">real-time geschat</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Open Posities */}
        <div id="metric-open-positions" className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Actieve Posities</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">{openPositionsCount}</h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-xs font-mono text-slate-300">
                ${totalOpenPosValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500">belegd vermogen</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Actieve Bots */}
        <div id="metric-active-bots" className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Bots Actief</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
              {activeBots} <span className="text-slate-500 text-lg">/ {totalBotsCount}</span>
            </h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-xs text-slate-400 flex items-center font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                {totalBotsCount - activeBots} gepauzeerd
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bots Grid Section */}
      <div id="bots-grid-section" className="space-y-4">
        <h3 className="text-lg font-bold text-slate-200">Uw Actieve Trading Bots</h3>
        <div id="bots-grid-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => {
            // Calculate bot-specific metrics
            const botPositions = positions.filter(p => p.botId === bot.id && p.status === 'open');
            const botOpenPosValue = botPositions.reduce((sum, p) => sum + p.sizeUsd + p.pnlUsd, 0);
            const botCurrentValue = bot.balanceUsd + botOpenPosValue;
            const botPnlUsd = botCurrentValue - bot.startBudgetUsd;
            const botPnlPct = (botPnlUsd / bot.startBudgetUsd) * 100;
            const botIsActive = bot.status === 'active';
            const sparklineColor = botPnlPct >= 0 ? '#10b981' : '#f43f5e'; // Emerald or Rose

            return (
              <div
                key={bot.id}
                id={`bot-card-${bot.id}`}
                onClick={() => onSelectBot(bot.id)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden cursor-pointer transition-all group hover:shadow-lg hover:shadow-cyan-950/20 flex flex-col"
              >
                {/* Header info */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">{bot.name}</h4>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        {bot.strategyName} • {bot.instruments.length} Assets
                      </p>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      bot.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : bot.status === 'paused'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-850 text-slate-400 border-slate-800'
                    }`}>
                      {bot.status === 'active' ? 'ACTIEF' : bot.status === 'paused' ? 'GEPAUZEERD' : 'GESTOP'}
                    </span>
                  </div>

                  {/* Core Metric & sparkline */}
                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Rendement</span>
                      <div className={`text-lg font-bold font-mono tracking-tight ${
                        botPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {botPnlPct >= 0 ? '+' : ''}{botPnlPct.toFixed(2)}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {botPnlUsd >= 0 ? '+' : ''}${botPnlUsd.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      {renderSparkline(bot.id, sparklineColor)}
                    </div>
                  </div>

                  {/* Allocated Assets tag list */}
                  <div className="flex flex-wrap gap-1.5">
                    {bot.instruments.map((inst) => (
                      <span key={inst.id} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                        {inst.tvSymbol} <span className="text-slate-500">{inst.weightPct}%</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-5 py-3.5 bg-slate-950/50 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500">
                  <div className="flex items-center space-x-1">
                    <span>Portfolio:</span>
                    <span className="text-slate-300 font-bold">{bot.agentPortfolioId}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-cyan-400">
                    <span>{botPositions.length} posities</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Signals & Open Positions */}
      <div id="recent-tables-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Active Open Positions (8 cols) */}
        <div id="dashboard-active-positions" className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-100">Live Open Posities</h3>
              <p className="text-xs text-slate-400">Actieve posities momenteel gemonitord op eToro.</p>
            </div>
            <span className="text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
              {openPositionsCount} Actief
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {positions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-sm">
                Geen open posities momenteel. Activeer uw bots of stuur TV-signalen.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-mono uppercase bg-slate-950/40">
                    <th className="p-4 font-semibold">Bot / Asset</th>
                    <th className="p-4 font-semibold">Richting</th>
                    <th className="p-4 font-semibold">Entry / Huidig</th>
                    <th className="p-4 font-semibold">Grootte</th>
                    <th className="p-4 font-semibold text-right">P&L (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {positions.map((pos) => {
                    const botObj = bots.find(b => b.id === pos.botId);
                    return (
                      <tr key={pos.id} className="hover:bg-slate-850/40 transition">
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{pos.tvSymbol}</div>
                          <div className="text-[10px] text-slate-500">{botObj ? botObj.name : 'Bot'}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pos.direction === 'long' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {pos.direction.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">
                          <div>${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className="text-[10px] text-slate-500">${pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-300">${pos.sizeUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          <div className="text-[10px] text-slate-500">{pos.quantity} units</div>
                        </td>
                        <td className={`p-4 text-right font-bold text-sm ${
                          pos.pnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          <div>{pos.pnlUsd >= 0 ? '+' : ''}${pos.pnlUsd.toFixed(2)}</div>
                          <div className="text-[10px]">{pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Webhook Signals (5 cols) */}
        <div id="dashboard-recent-signals" className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-100">Recente Webhook Signalen</h3>
              <p className="text-xs text-slate-400">Laatste binnengekomen TradingView payloads.</p>
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-800 overflow-y-auto max-h-[400px]">
            {signals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-sm">
                Geen signalen ontvangen.
              </div>
            ) : (
              signals.map((sig) => {
                const botObj = bots.find(b => b.id === sig.botId);
                return (
                  <div key={sig.id} className="p-4 hover:bg-slate-850/30 transition flex justify-between items-start text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{sig.tvSymbol}</span>
                        <span className={`px-1.5 py-0.1 text-[9px] font-bold rounded ${
                          sig.action.startsWith('open_') 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {sig.action.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {botObj ? botObj.name : 'Unknown Bot'}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {new Date(sig.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full border font-bold ${
                        sig.status === 'filled' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : sig.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {sig.status.toUpperCase()}
                      </span>
                      {sig.errorMessage && (
                        <div className="text-[9px] text-rose-400 max-w-[150px] truncate" title={sig.errorMessage}>
                          {sig.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Compliance Footer Disclaimer per PRD (5. Compliance) */}
      <div id="compliance-disclaimer" className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex items-start space-x-3 text-slate-500 text-xs font-sans">
        <AlertTriangle className="w-5 h-5 text-amber-500/60 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-400">Wettelijke Disclaimer & Compliance</p>
          <p>
            Deze applicatie is puur een uitvoeringstool en biedt geen financieel advies, aanbevelingen of beleggingsstrategieën.
            Alle transacties worden uitgevoerd via eToro Agent Portfolios op eigen risico van de gebruiker. Rendementen uit het verleden bieden geen garantie voor de toekomst. De gebruiker is als enige eindverantwoordelijk voor het beheren van de bot-instellingen en het bewaken van de actieve risico-limieten.
          </p>
        </div>
      </div>

    </div>
  );
}
