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

  useEffect(() => {
    apiFetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setEToroCoupled(data.eToroCoupled);
        setApiKey(data.apiKey || '');
        setUserKey(data.userKey || '');
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
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
