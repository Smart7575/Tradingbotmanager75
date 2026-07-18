import React, { useState, useEffect } from 'react';
import { Strategy, EToroInstrument } from '../types';
import { Search, Info, ShieldAlert, CheckCircle, ArrowRight, ArrowLeft, Plus, Trash2, Wallet, Layers, Sliders, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface BotWizardProps {
  strategies: Strategy[];
  onBotCreated: (botId: string, webhookToken: string) => void;
  onCancel: () => void;
}

export default function BotWizard({ strategies, onBotCreated, onCancel }: BotWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Form State
  // Step 1
  const [botName, setBotName] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState(strategies[0]?.id || 'strat-1');
  const [broker, setBroker] = useState('eToro'); // fixed in v1
  const [apiKey, setApiKey] = useState('');
  const [userKey, setUserKey] = useState('');

  // Load existing eToro settings on mount
  useEffect(() => {
    apiFetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setApiKey(data.apiKey || '');
          setUserKey(data.userKey || '');
        }
      })
      .catch(() => {});
  }, []);

  // Step 2
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogInstruments, setCatalogInstruments] = useState<EToroInstrument[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<(EToroInstrument & { weightPct: number; capPct?: number })[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Step 3
  const [portfolioMode, setPortfolioMode] = useState<'create' | 'link'>('create');
  const [startBudget, setStartBudget] = useState<number>(500);
  const [existingToken, setExistingToken] = useState('');

  // Step 4
  const [maxPositions, setMaxPositions] = useState<number>(4);
  const [instrumentCap, setInstrumentCap] = useState<number>(50);
  const [stopLoss, setStopLoss] = useState<number>(3);
  const [takeProfit, setTakeProfit] = useState<number>(7);

  // Load search catalog or fetch initially
  useEffect(() => {
    apiFetch(`/api/instruments?q=${encodeURIComponent(searchQuery)}`)
      .then(r => r.json())
      .then(data => {
        setCatalogInstruments(data);
      })
      .catch(() => {});
  }, [searchQuery]);

  // Calculations for step 2
  const totalWeight = selectedInstruments.reduce((sum, inst) => sum + inst.weightPct, 0);

  const handleAddInstrument = (inst: EToroInstrument) => {
    if (selectedInstruments.some(i => i.id === inst.id)) {
      setError('Instrument is al toegevoegd');
      return;
    }
    setError(null);
    // Equal distribution by default or custom
    const nextList = [...selectedInstruments, { ...inst, weightPct: 0 }];
    const equalWeight = parseFloat((100 / nextList.length).toFixed(1));
    const redistributed = nextList.map(item => ({ ...item, weightPct: equalWeight }));
    setSelectedInstruments(redistributed);
  };

  const handleRemoveInstrument = (id: number) => {
    const filtered = selectedInstruments.filter(i => i.id !== id);
    if (filtered.length > 0) {
      const equalWeight = parseFloat((100 / filtered.length).toFixed(1));
      setSelectedInstruments(filtered.map(item => ({ ...item, weightPct: equalWeight })));
    } else {
      setSelectedInstruments([]);
    }
  };

  const handleWeightChange = (id: number, val: string) => {
    const num = parseFloat(val) || 0;
    setSelectedInstruments(prev => prev.map(item => item.id === id ? { ...item, weightPct: num } : item));
  };

  const handleDistributeEqually = () => {
    if (selectedInstruments.length === 0) return;
    const equalWeight = parseFloat((100 / selectedInstruments.length).toFixed(1));
    setSelectedInstruments(prev => prev.map(item => ({ ...item, weightPct: equalWeight })));
  };

  // Validate current step before proceeding
  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!botName.trim()) {
        setError('Bot naam is verplicht.');
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (selectedInstruments.length === 0) {
        setError('Voeg ten minste één instrument toe.');
        return false;
      }
      // Sum check (allow small precision tolerances like 99.8 to 100.2, but display nicely)
      const absDiff = Math.abs(totalWeight - 100);
      if (absDiff > 0.5) {
        setError(`Het totale gewicht moet exact 100% zijn (momenteel ${totalWeight}%).`);
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (portfolioMode === 'create') {
        if (!startBudget || startBudget < 200) {
          setError('Minimaal startbudget voor een Agent Portfolio is $200 USD.');
          return false;
        }
      } else {
        if (!existingToken.trim()) {
          setError('Een scoped API token is verplicht om een bestaand portfolio te koppelen.');
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const handleNext = async () => {
    if (validateStep(step)) {
      if (step === 1) {
        // Save the updated broker credentials to the database settings
        try {
          await apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eToroCoupled: true, apiKey, userKey })
          });
        } catch (e) {
          console.error('Fout bij opslaan broker credentials:', e);
        }
      }
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  const handleStepClick = (targetStep: number) => {
    // Only allow clicking steps that are lower than current, or if current can validate up to target
    if (targetStep < step) {
      setStep(targetStep);
      setError(null);
    } else {
      // Validate incrementally
      let isValid = true;
      for (let i = step; i < targetStep; i++) {
        if (!validateStep(i)) {
          isValid = false;
          break;
        }
      }
      if (isValid) {
        setStep(targetStep);
      }
    }
  };

  const handleCreateBot = async () => {
    if (!validateStep(4)) return;

    try {
      const res = await apiFetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: botName,
          strategyId: selectedStrategyId,
          startBudgetUsd: portfolioMode === 'create' ? startBudget : 1000, // standard default if linked
          selectedInstruments: selectedInstruments.map(i => ({ id: i.id, symbol: i.symbol, weightPct: i.weightPct, capPct: instrumentCap })),
          createNewPortfolio: portfolioMode === 'create',
          existingToken: portfolioMode === 'link' ? existingToken : '',
          riskSettings: {
            maxPositions,
            instrumentCap,
            stopLossPct: stopLoss,
            takeProfitPct: takeProfit
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Er is iets misgegaan');
      } else {
        onBotCreated(data.botId, data.webhookToken);
      }
    } catch (e: any) {
      setError('Verbinding met de server mislukt.');
    }
  };

  const selectedStratObj = strategies.find(s => s.id === selectedStrategyId);

  return (
    <div id="bot-wizard-container" className="p-8 max-w-4xl mx-auto w-full font-sans text-slate-100">
      
      {/* Back button */}
      <button 
        onClick={onCancel}
        className="mb-6 flex items-center space-x-2 text-slate-400 hover:text-slate-200 text-xs font-mono tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>TERUG NAAR DASHBOARD</span>
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        
        {/* Wizard Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40">
          <h2 className="text-xl font-bold">Nieuwe Bot Aanmaken</h2>
          <p className="text-xs text-slate-400 mt-1">Stel in 4 eenvoudige stappen uw geautomatiseerde trading bot in.</p>
        </div>

        {/* Top Steps Progress Indicator */}
        <div id="wizard-steps-indicator" className="px-6 py-4 bg-slate-950/20 border-b border-slate-800 flex justify-between items-center text-xs font-mono font-bold tracking-wider">
          {[
            { num: 1, label: 'Basis' },
            { num: 2, label: 'Instrumenten' },
            { num: 3, label: 'Agent Portfolio' },
            { num: 4, label: 'Risk & Review' }
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => handleStepClick(s.num)}
              className={`flex items-center space-x-2 pb-1.5 border-b-2 transition ${
                step === s.num 
                  ? 'border-cyan-400 text-cyan-400' 
                  : step > s.num 
                  ? 'border-emerald-500 text-emerald-400' 
                  : 'border-transparent text-slate-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === s.num 
                  ? 'bg-cyan-500 text-slate-950' 
                  : step > s.num 
                  ? 'bg-emerald-500 text-slate-950' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {s.num}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Error Alert Bar */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start space-x-3 text-rose-400 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP CONTENT CONTAINER */}
        <div className="p-6 min-h-[350px]">
          
          {/* STEP 1: BASIS */}
          {step === 1 && (
            <div id="step-1-content" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Bot Name input */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Naam van de Bot</label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="bijv. Apex Bitcoin Momentum"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-cyan-500 text-slate-200"
                  />
                  <p className="text-[10px] text-slate-500 font-mono">Kies een unieke, makkelijk herkenbare naam.</p>
                </div>

                {/* Broker Selection (Locked to eToro) */}
                <div className="space-y-4">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Broker Account & Credentials</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm font-sans flex items-center justify-between text-slate-300">
                    <span className="font-semibold text-cyan-400">eToro API Integratie</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                      ACTIEF (V1)
                    </span>
                  </div>

                  {/* Input fields for credentials */}
                  <div className="space-y-3 bg-slate-950/40 p-4 border border-slate-800 rounded-lg">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">eToro API-Key (x-api-key)</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Voer uw eToro API-key in..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">eToro User-Key (x-user-key)</label>
                      <input
                        type="text"
                        value={userKey}
                        onChange={(e) => setUserKey(e.target.value)}
                        placeholder="usr_stefan_trader_99"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 text-slate-200"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">Deze credentials worden automatisch gekoppeld aan de nieuwe bot en opgeslagen in uw instellingen.</p>
                </div>

              </div>

              {/* Strategy Choice */}
              <div className="space-y-3">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Gekoppelde Strategie</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {strategies.map((strat) => (
                    <div
                      key={strat.id}
                      onClick={() => setSelectedStrategyId(strat.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        selectedStrategyId === strat.id
                          ? 'bg-cyan-500/5 border-cyan-500 text-slate-100'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-200">{strat.name}</div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          {strat.type === 'webhook' ? 'Webhook-gestuurd' : 'Regel-gestuurd'} (versie {strat.version})
                        </p>
                      </div>
                      <div className="mt-4 border-t border-slate-800/80 pt-2 text-[10px] text-slate-400 font-mono space-y-1">
                        <div>Richting: <span className="text-slate-300 font-bold">{strat.parameters.direction.toUpperCase()}</span></div>
                        <div>Sizing: <span className="text-slate-300 font-bold">{strat.parameters.sizingValue}% weight</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: INSTRUMENTEN */}
          {step === 2 && (
            <div id="step-2-content" className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Search column (5 cols) */}
                <div className="md:col-span-5 space-y-3">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Zoek Instrument</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="bijv. BTCUSD, TSLA, AAPL"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  
                  {/* Results list */}
                  <div className="bg-slate-950 border border-slate-800/60 rounded-lg max-h-[220px] overflow-y-auto divide-y divide-slate-900">
                    {catalogInstruments.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-600 font-mono">Geen instrumenten gevonden.</div>
                    ) : (
                      catalogInstruments.map((inst) => (
                        <div 
                          key={inst.id} 
                          className="p-2.5 flex justify-between items-center text-xs hover:bg-slate-900 transition"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-200">{inst.symbol}</span>
                            <span className="text-[10px] text-slate-500 ml-2 block font-sans truncate max-w-[150px]">{inst.name}</span>
                          </div>
                          <button
                            onClick={() => handleAddInstrument(inst)}
                            className="p-1 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Basket List (7 cols) */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Geselecteerde Assets (Mandje)</label>
                    {selectedInstruments.length > 0 && (
                      <button
                        onClick={handleDistributeEqually}
                        className="text-[10px] font-mono text-cyan-400 hover:underline"
                      >
                        Verdeel Gelijk
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4 space-y-3 min-h-[200px]">
                    {selectedInstruments.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs font-mono">
                        Geen instrumenten toegevoegd. Gebruik het zoekveld links om uw mandje samen te stellen.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto">
                        {selectedInstruments.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <span className="font-mono font-bold text-slate-200">{item.symbol}</span>
                              <span className="text-[9px] text-slate-500 ml-1.5 uppercase font-mono bg-slate-900 px-1 py-0.2 rounded">
                                {item.type}
                              </span>
                            </div>

                            {/* Weight percentage input */}
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[10px] font-mono text-slate-500">Gewicht:</span>
                              <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-1">
                                <input
                                  type="number"
                                  value={item.weightPct}
                                  onChange={(e) => handleWeightChange(item.id, e.target.value)}
                                  className="w-12 bg-transparent text-right py-0.5 focus:outline-none text-slate-200 font-mono text-xs"
                                  min="1"
                                  max="100"
                                />
                                <span className="text-slate-500 font-mono text-xs ml-0.5">%</span>
                              </div>

                              <button
                                onClick={() => handleRemoveInstrument(item.id)}
                                className="p-1 hover:text-rose-400 text-slate-500 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total Weight Indicator */}
                    {selectedInstruments.length > 0 && (
                      <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-400">Totaal Allocatie:</span>
                        <span className={`font-bold ${Math.abs(totalWeight - 100) < 0.5 ? 'text-emerald-400' : 'text-amber-500'}`}>
                          {totalWeight}% <span className="text-slate-500">/ 100%</span>
                        </span>
                      </div>
                    )}

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* STEP 3: AGENT PORTFOLIO */}
          {step === 3 && (
            <div id="step-3-content" className="space-y-6">
              
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 flex items-start space-x-3 text-xs text-cyan-300">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Wat zijn eToro Agent Portfolios?</p>
                  <p>
                    Met Agent Portfolios creëert eToro native afgebakende sub-accounts specifiek voor geautomatiseerde bots. Elke bot krijgt zijn eigen saldo, waardoor posities en prestaties 100% gesegregeerd blijven zonder extra administratie.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                
                {/* Option A: Create New Portfolio */}
                <div 
                  onClick={() => setPortfolioMode('create')}
                  className={`p-5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    portfolioMode === 'create'
                      ? 'bg-cyan-500/5 border-cyan-500 text-slate-100'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <Wallet className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-bold text-slate-200">A. Nieuwe Agent Portfolio</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Laat de app direct een nieuwe gesegregeerde Agent Portfolio aanmaken op uw eToro account met een startbudget.
                    </p>
                  </div>
                  
                  {portfolioMode === 'create' && (
                    <div className="mt-6 space-y-2 pt-4 border-t border-slate-800/80">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Startbudget (USD)</label>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                        <span className="text-slate-500 font-mono mr-1.5">$</span>
                        <input
                          type="number"
                          value={startBudget}
                          onChange={(e) => setStartBudget(parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent text-sm font-mono text-slate-200 focus:outline-none"
                          min="200"
                        />
                        <span className="text-slate-500 font-mono text-xs">USD</span>
                      </div>
                      <p className="text-[9px] text-amber-400/80 font-mono mt-1">
                        Let op: Dit startbudget (min. $200) wordt afgeschreven van uw eToro hoofdsaldo.
                      </p>
                    </div>
                  )}
                </div>

                {/* Option B: Link Existing */}
                <div 
                  onClick={() => setPortfolioMode('link')}
                  className={`p-5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    portfolioMode === 'link'
                      ? 'bg-cyan-500/5 border-cyan-500 text-slate-100'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <Layers className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-bold text-slate-200">B. Bestaande Portfolio koppelen</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Heeft u al handmatig een Agent Portfolio of scoped API token aangemaakt via eToro? Koppel hem hier direct.
                    </p>
                  </div>

                  {portfolioMode === 'link' && (
                    <div className="mt-6 space-y-2 pt-4 border-t border-slate-800/80">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Scoped eToro API-Token</label>
                      <input
                        type="password"
                        value={existingToken}
                        onChange={(e) => setExistingToken(e.target.value)}
                        placeholder="Voer het scoped API token in..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500 text-slate-200"
                      />
                      <p className="text-[9px] text-slate-500 font-mono">
                        Bijv: trade.real:read + trade.real:write scopes.
                      </p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* STEP 4: RISK & REVIEW */}
          {step === 4 && (
            <div id="step-4-content" className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Risk Parameters Form (Left) */}
                <div className="space-y-4 bg-slate-950/40 border border-slate-800 p-5 rounded-xl">
                  <h4 className="font-bold text-slate-200 flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Risk Management</span>
                  </h4>
                  
                  {/* Max concurrent positions */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Max Gelijktijdige Posities</span>
                      <span className="font-mono text-slate-200 font-bold">{maxPositions}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={maxPositions}
                      onChange={(e) => setMaxPositions(parseInt(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Instrument allocation cap */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Cap per Instrument (%)</span>
                      <span className="font-mono text-slate-200 font-bold">{instrumentCap}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={instrumentCap}
                      onChange={(e) => setInstrumentCap(parseInt(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Default Stop-loss and Take-profit */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Stop-Loss (%)</label>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono">
                        <input
                          type="number"
                          value={stopLoss}
                          onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent focus:outline-none text-rose-400 font-bold"
                          step="0.5"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Take-Profit (%)</label>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono">
                        <input
                          type="number"
                          value={takeProfit}
                          onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent focus:outline-none text-emerald-400 font-bold"
                          step="0.5"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plain English Summary (Right) */}
                <div className="space-y-4 bg-slate-950/40 border border-slate-800 p-5 rounded-xl">
                  <h4 className="font-bold text-slate-200 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Controleer Instellingen</span>
                  </h4>

                  <div className="space-y-3.5 text-xs text-slate-300 font-sans leading-relaxed">
                    <p>
                      U gaat de bot <strong className="text-slate-100">"{botName}"</strong> aanmaken. 
                      Deze bot is gekoppeld aan de strategie <strong className="text-slate-100">"{selectedStratObj?.name}"</strong>.
                    </p>
                    <p>
                      De bot beheert een mandje van <strong className="text-slate-100">{selectedInstruments.length} assets</strong>: 
                      {selectedInstruments.map(i => ` ${i.symbol} (${i.weightPct}%)`).join(',')}.
                    </p>
                    <p>
                      {portfolioMode === 'create' ? (
                        <span>
                          Er wordt een <strong className="text-slate-100">nieuwe eToro Agent Portfolio</strong> aangemaakt met een budget van 
                          <strong className="text-emerald-400"> ${startBudget} USD</strong>.
                        </span>
                      ) : (
                        <span>
                          De bot wordt gekoppeld aan een <strong className="text-slate-100">bestaande Agent Portfolio</strong> via het opgegeven scoped API token.
                        </span>
                      )}
                    </p>
                    <p>
                      Risico-limieten: Maximaal <strong className="text-slate-100">{maxPositions} posities</strong> tegelijkertijd open. 
                      Als er een TV-signaal binnenkomt, wordt er maximaal <strong className="text-slate-100">{instrumentCap}%</strong> van het portfoliobudget per asset gealloceerd, met een standaard stop-loss van <strong className="text-rose-400">{stopLoss}%</strong> en een take-profit van <strong className="text-emerald-400">{takeProfit}%</strong>.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex justify-between items-center">
          <div>
            {step > 1 && (
              <button
                id="wizard-prev-btn"
                onClick={handlePrev}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-medium transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>VORIGE</span>
              </button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <button
                id="wizard-next-btn"
                onClick={handleNext}
                className="flex items-center space-x-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg text-xs font-mono font-bold transition"
              >
                <span>VOLGENDE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="wizard-submit-btn"
                onClick={handleCreateBot}
                className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-mono font-bold transition shadow-lg shadow-emerald-950/30"
              >
                <CheckCircle className="w-4 h-4" />
                <span>ACTIVEER BOT & GENEREER WEBHOOK</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
