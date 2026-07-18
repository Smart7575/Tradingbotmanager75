import React from 'react';
import { Strategy } from '../types';
import { BookOpen, Sliders, ShieldAlert, BadgeInfo, Layers, CheckCircle2 } from 'lucide-react';

interface StrategiesListProps {
  strategies: Strategy[];
}

export default function StrategiesList({ strategies }: StrategiesListProps) {
  return (
    <div id="strategies-list-tab" className="p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full font-sans text-slate-100">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
          <BookOpen className="w-6 h-6 text-cyan-400" />
          <span>Strategie Sjablonen (Templates)</span>
        </h2>
        <p className="text-sm text-slate-400">Beheer uw herbruikbare logische trading-configuraties gekoppeld aan actieve bots.</p>
      </div>

      {/* Strategies list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strat) => (
          <div 
            key={strat.id} 
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col justify-between"
          >
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{strat.name}</h3>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                    VERSiE {strat.version}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 border border-slate-800 text-slate-400">
                  {strat.type === 'webhook' ? 'WEBHOOK-ONLY' : 'RULE-BASED'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                {strat.id === 'strat-1' 
                  ? 'Ontworpen voor swing-traders die momentum-uitbraken op crypto (BTC/ETH) willen verhandelen op basis van RSI en MACD cross-overs.'
                  : strat.id === 'strat-2'
                  ? 'Een agressieve scalping-strategie met krappe stop-losses en take-profits, ideaal voor volatiele tech-aandelen gedurende reguliere handelsuren.'
                  : 'Macro trendvolgende strategie op basis van daggrafieken op forex paren. Maakt gebruik van voortschrijdende gemiddelden.'
                }
              </p>

              {/* Core Parameters info */}
              <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/60 font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Handelsrichting</span>
                  <span className="text-slate-200 font-bold uppercase">{strat.parameters.direction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sizing Modus</span>
                  <span className="text-slate-200 font-bold">{strat.parameters.sizingMode.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Standaard Sizing</span>
                  <span className="text-cyan-400 font-bold">{strat.parameters.sizingValue}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Gelijktijdig</span>
                  <span className="text-slate-200 font-bold">{strat.parameters.maxPositions} posities</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stop-Loss / Take-Profit</span>
                  <span className="text-slate-200 font-bold">
                    {strat.parameters.stopLossPct ? `${strat.parameters.stopLossPct}%` : 'NVT'} / {strat.parameters.takeProfitPct ? `${strat.parameters.takeProfitPct}%` : 'NVT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer usage status */}
            <div className="px-5 py-3.5 bg-slate-950/35 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex justify-between items-center">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80" />
                <span className="text-slate-400">Sjabloon is geverifieerd</span>
              </span>
              <span className="text-slate-500">ID: {strat.id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pine Script Template Section as requested in the PRD changelog */}
      <div id="pine-script-template-section" className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>Pine Script Webhook Integratie Code</span>
          </h3>
          <p className="text-xs text-slate-400">
            Kopieer deze Pine Script template code en plak deze in uw TradingView indicator of strategy om signalen naar uw bots te sturen.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
          <pre>{`// @version=5
strategy("eToro Bot Webhook Trigger", overlay=true)

// Configureer invoerparameters voor bot_token en bot_id
bot_token = input.string("b_7f2c9a1e4d3b", title="Bot Token")
bot_id = input.string("bot-1", title="Bot ID")

// Logica voor signalen
longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 50))
shortCondition = ta.crossunder(ta.sma(close, 14), ta.sma(close, 50))

// Genereer alert payload in JSON formaat
alert_msg_long = '{"version": 1, "bot_token": "' + bot_token + '", "signal_id": "' + str.tostring(time) + '", "symbol": "' + syminfo.ticker + '", "action": "open_long", "sizing": {"mode": "percent_of_bot_allocation", "value": 25}, "risk": {"stop_loss_pct": 3.0, "take_profit_pct": 7.0}, "signal_price": ' + str.tostring(close) + ', "timestamp": "' + str.tostring(time) + '"}'
alert_msg_close = '{"version": 1, "bot_token": "' + bot_token + '", "signal_id": "' + str.tostring(time) + '", "symbol": "' + syminfo.ticker + '", "action": "close", "timestamp": "' + str.tostring(time) + '"}'

if (longCondition)
    strategy.entry("My Long Entry", strategy.long, alert_message=alert_msg_long)

if (shortCondition)
    strategy.close("My Long Entry", alert_message=alert_msg_close)`}</pre>
        </div>
      </div>

    </div>
  );
}
