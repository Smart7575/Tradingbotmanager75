import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, AlertTriangle, Key, CheckCircle, Info } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface SettingsProps {
  onSettingsUpdated: (coupled: boolean) => void;
}

export default function Settings({ onSettingsUpdated }: SettingsProps) {
  const [eToroCoupled, setEToroCoupled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [userKey, setUserKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mcpStatus, setMcpStatus] = useState<{
    status: 'loading' | 'connected' | 'error';
    url: string;
    baseUrl?: string;
    apiTitle?: string;
    apiVersion?: string;
    skillVersion?: string;
    routes?: Record<string, string>;
    message?: string;
  }>({ status: 'loading', url: 'https://mcp.public-api.etoro.com' });

  useEffect(() => {
    // Fetch settings
    apiFetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setEToroCoupled(data.eToroCoupled);
        setApiKey(data.apiKey || '');
        setUserKey(data.userKey || '');
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    // Fetch live MCP server status
    apiFetch('/api/etoro/mcp-status')
      .then(r => r.json())
      .then(data => {
        setMcpStatus(data);
      })
      .catch((err) => {
        setMcpStatus({
          status: 'error',
          url: 'https://mcp.public-api.etoro.com',
          message: err.message || 'Kon geen verbinding maken met het MCP status-endpoint.'
        });
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eToroCoupled, apiKey, userKey })
      });
      if (res.ok) {
        setSaveSuccess(true);
        onSettingsUpdated(eToroCoupled);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert('Opslaan mislukt');
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 font-mono">Laden...</div>;
  }

  return (
    <div id="settings-tab" className="p-8 space-y-8 overflow-y-auto max-w-3xl mx-auto w-full font-sans text-slate-100">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
          <Key className="w-6 h-6 text-cyan-400" />
          <span>Instellingen</span>
        </h2>
        <p className="text-sm text-slate-400">Beheer uw eToro developer integratie en API-beveiliging.</p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2.5 text-emerald-400 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Integratie-instellingen succesvol opgeslagen!</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        
        {/* API Auth Panel */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">eToro Developer Credentials</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Vereist voor het openen en synchroniseren van Agent Portfolios.</p>
            </div>
            
            {/* Live Link Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={eToroCoupled}
                onChange={(e) => setEToroCoupled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
              <span className="ml-2 text-xs font-mono font-bold text-slate-300">
                {eToroCoupled ? 'LIVE BROKER' : 'SANDBOX / TEST'}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">eToro API-Key (x-api-key)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="et_live_8f391b0cc48123da760e..."
                disabled={!eToroCoupled}
                className="w-full bg-slate-950 border border-slate-800 disabled:opacity-30 rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 text-slate-200"
              />
            </div>

            {/* User Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">eToro User-Key (x-user-key)</label>
              <input
                type="text"
                value={userKey}
                onChange={(e) => setUserKey(e.target.value)}
                placeholder="usr_stefan_trader_99"
                disabled={!eToroCoupled}
                className="w-full bg-slate-950 border border-slate-800 disabled:opacity-30 rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 text-slate-200"
              />
            </div>
          </div>

          {/* Secure Storage Note */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg flex items-start space-x-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-200">Veilige Opslag & Encryptie</p>
              <p className="text-[11px] leading-relaxed">
                Uw eToro API-sleutels en webhook-tokens worden uitsluitend versleuteld opgeslagen (envelope encryption) op de beveiligde Cloud Run container. Uw credentials worden nooit getoond in logbestanden of gedeeld met derden.
              </p>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-slate-950 rounded-lg text-xs font-mono font-bold transition"
          >
            SLA CONFIGURATIE OP
          </button>
        </div>

      </form>

      {/* eToro MCP Server Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>eToro MCP Server Live Status</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Gesynchroniseerd via het Model Context Protocol (MCP) voor de eToro Public API.
            </p>
          </div>
          
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950 rounded-full border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${
              mcpStatus.status === 'connected' ? 'bg-emerald-500 animate-pulse' :
              mcpStatus.status === 'loading' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-300">
              {mcpStatus.status === 'connected' ? 'CONNECTED' :
               mcpStatus.status === 'loading' ? 'LADEN...' : 'ERROR'}
            </span>
          </div>
        </div>

        {mcpStatus.status === 'error' && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-mono">
            Error connecting to MCP: {mcpStatus.message}
          </div>
        )}

        {mcpStatus.status === 'connected' && (
          <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-400">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span className="text-[9px] uppercase text-slate-500 block">MCP Server Endpoint</span>
              <p className="text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap">{mcpStatus.url}</p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
              <span className="text-[9px] uppercase text-slate-500 block">eToro Public API Endpoint</span>
              <p className="text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap">{mcpStatus.baseUrl}</p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-0.5 col-span-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">API Catalogus</span>
                  <p className="text-slate-300 font-sans font-medium">{mcpStatus.apiTitle}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase text-slate-500 block">API Versie</span>
                  <p className="text-slate-300 font-sans">{mcpStatus.apiVersion}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {mcpStatus.status === 'connected' && mcpStatus.routes && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300">Beschikbare MCP Routes ({Object.keys(mcpStatus.routes).length})</span>
              <span className="text-[9px] text-slate-500 font-mono">Dynamic route specifications</span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-900 custom-scrollbar">
              {Object.entries(mcpStatus.routes).map(([routeId, description]) => {
                const descStr = String(description);
                const isGet = descStr.startsWith('GET');
                const isPost = descStr.startsWith('POST');
                const isPut = descStr.startsWith('PUT') || descStr.startsWith('PATCH');
                const isDelete = descStr.startsWith('DELETE');
                
                return (
                  <div key={routeId} className="p-2 flex items-start space-x-2 text-xs hover:bg-slate-900/50 transition">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 ${
                      isGet ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                      isPost ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      isPut ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      isDelete ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {descStr.split(' ')[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] font-bold text-slate-300 truncate">{routeId}</p>
                      <p className="text-[9px] text-slate-500 truncate">
                        {descStr.substring(descStr.indexOf('/') !== -1 ? descStr.indexOf('/') : 0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Connection Guidelines */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-slate-200 text-sm flex items-center space-x-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span>Verificatie & API Vereisten</span>
        </h3>
        
        <div className="space-y-3 text-xs text-slate-400 leading-relaxed font-sans">
          <p>
            eToro vereist dat uw account volledig geverifieerd is (KYC) voordat de API-functionaliteit en developer instellingen beschikbaar worden gesteld.
          </p>
          <div className="flex items-start space-x-2 text-amber-400/90 font-mono text-[10px] bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Belangrijk: De eToro API is relatief nieuw (begin 2026). Endpoints en tarieflimieten (Rate limits) kunnen veranderen. Zorg dat u backoff-logica activeert bij actieve bots.</span>
          </div>
        </div>
      </div>

    </div>
  );
}
