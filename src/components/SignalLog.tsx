import React, { useState } from 'react';
import { Signal, Bot } from '../types';
import { ScrollText, Search, Filter, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface SignalLogProps {
  signals: Signal[];
  bots: Bot[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function SignalLog({ signals, bots, onRefresh, isRefreshing }: SignalLogProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [botFilter, setBotFilter] = useState<string>('all');
  const [searchSymbol, setSearchSymbol] = useState<string>('');
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);

  // Filter signals
  const filteredSignals = signals.filter(sig => {
    const matchesStatus = statusFilter === 'all' || sig.status === statusFilter;
    const matchesBot = botFilter === 'all' || sig.botId === botFilter;
    const matchesSymbol = !searchSymbol || sig.tvSymbol.toLowerCase().includes(searchSymbol.toLowerCase());
    return matchesStatus && matchesBot && matchesSymbol;
  });

  const toggleExpandSignal = (id: string) => {
    if (expandedSignalId === id) {
      setExpandedSignalId(null);
    } else {
      setExpandedSignalId(id);
    }
  };

  return (
    <div id="signals-log-tab" className="p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
            <ScrollText className="w-6 h-6 text-cyan-400" />
            <span>Globaal Webhook Signaallog</span>
          </h2>
          <p className="text-sm text-slate-400">Chronologisch overzicht van alle binnenkomende TradingView alert payloads en verwerkingsstatussen.</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono font-medium text-slate-400 hover:text-slate-200 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>REFRESH LOGS</span>
        </button>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Bot filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Bot:</span>
            <select
              value={botFilter}
              onChange={(e) => setBotFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Alle Bots</option>
              {bots.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Alle Statussen</option>
              <option value="filled">FILLED</option>
              <option value="rejected">REJECTED</option>
              <option value="expired">EXPIRED</option>
              <option value="duplicate">DUPLICATE</option>
              <option value="validated">VALIDATED</option>
            </select>
          </div>

          {/* Symbol search filter */}
          <div className="flex items-center space-x-2 relative">
            <span className="text-slate-500">Symbool:</span>
            <input
              type="text"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              placeholder="bijv. BTCUSD"
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 w-28 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="text-slate-500 shrink-0">
          Totaal: <span className="text-slate-300 font-bold">{filteredSignals.length} signalen</span>
        </div>
      </div>

      {/* Main Signal Log table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {filteredSignals.length === 0 ? (
          <div className="p-12 text-center text-sm font-mono text-slate-500">
            Geen webhook signalen gevonden die voldoen aan de filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-mono uppercase bg-slate-950/40">
                  <th className="p-4 font-semibold">Tijdstip</th>
                  <th className="p-4 font-semibold">Bot Naam</th>
                  <th className="p-4 font-semibold">Asset</th>
                  <th className="p-4 font-semibold">Actie</th>
                  <th className="p-4 font-semibold">Signaal ID</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {filteredSignals.map((sig) => {
                  const associatedBot = bots.find(b => b.id === sig.botId);
                  const isExpanded = expandedSignalId === sig.id;

                  return (
                    <React.Fragment key={sig.id}>
                      <tr className={`hover:bg-slate-850/30 transition ${isExpanded ? 'bg-slate-850/20' : ''}`}>
                        <td className="p-4 text-slate-500">
                          {new Date(sig.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 font-sans font-semibold text-slate-200">
                          {associatedBot ? associatedBot.name : 'Unknown Bot'}
                        </td>
                        <td className="p-4 font-bold text-slate-100">{sig.tvSymbol}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sig.action.startsWith('open_') 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {sig.action.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 max-w-[120px] truncate" title={sig.externalSignalId}>
                          {sig.externalSignalId}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                            sig.status === 'filled' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : sig.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {sig.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => toggleExpandSignal(sig.id)}
                            className="p-1 hover:text-cyan-400 hover:bg-slate-800 rounded transition text-slate-500"
                            title="Bekijk Raw Payload"
                          >
                            {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded JSON Details Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-3">
                              {sig.errorMessage && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-2 text-rose-400 text-xs">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  <span>Foutmelding: <strong>{sig.errorMessage}</strong></span>
                                </div>
                              )}
                              <div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                                  Binnengekomen JSON Payload (TradingView Alert)
                                </span>
                                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
                                  {JSON.stringify(sig.receivedPayload, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
