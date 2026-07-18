import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  collection, query, where, addDoc 
} from 'firebase/firestore';
import { 
  Bot, BotStatus, BotInstrument, Strategy, Signal, Order, Position, PerformanceSnapshot, WebhookToken, EToroInstrument, AuthUser 
} from './src/types';

export const app = express();
const PORT = 3000;

app.use(express.json());

// Firebase initialization
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAP6t5SW7pIAgEQ2dlKh67nee6khUxKaXk",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "tradingbotmanager75.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "tradingbotmanager75",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "tradingbotmanager75.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "327545877828",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:327545877828:web:8bd3256427f412977a1311"
};

const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp);

// Global instruments catalogue (simulated eToro)
let instruments: EToroInstrument[] = [
  { id: 1, symbol: 'BTCUSD', name: 'Bitcoin / USD', type: 'crypto', price: 65230.50 },
  { id: 2, symbol: 'ETHUSD', name: 'Ethereum / USD', type: 'crypto', price: 3450.20 },
  { id: 3, symbol: 'AAPL', name: 'Apple Inc. Common Stock', type: 'stock', price: 191.25 },
  { id: 4, symbol: 'TSLA', name: 'Tesla Inc. Common Stock', type: 'stock', price: 248.80 },
  { id: 5, symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', price: 482.40 },
  { id: 6, symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', price: 421.10 },
  { id: 7, symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex', price: 1.0865 },
  { id: 8, symbol: 'SOLUSD', name: 'Solana / USD', type: 'crypto', price: 142.15 },
];


// Helper function to fetch real-time instrument details from public financial APIs
async function fetchInstrumentDetails(symbol: string): Promise<{ symbol: string; name: string; type: 'crypto' | 'stock' | 'forex'; price: number } | null> {
  const query = symbol.trim().toUpperCase();
  if (!query) return null;

  const isCrypto = query.endsWith('USD') || ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'LINK', 'DOT', 'UNI', 'AVAX', 'MATIC'].includes(query);
  const isForex = query.length === 6 && !query.includes('USD') && !isCrypto;
  const type: 'crypto' | 'stock' | 'forex' = isCrypto ? 'crypto' : (isForex ? 'forex' : 'stock');

  try {
    if (type === 'crypto') {
      let coinbaseSymbol = query;
      if (query.endsWith('USD') && query.length > 3) {
        coinbaseSymbol = query.slice(0, -3) + '-USD';
      }
      const res = await fetch(`https://api.exchange.coinbase.com/products/${coinbaseSymbol}/ticker`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data && data.price) {
          const price = parseFloat(parseFloat(data.price).toFixed(2));
          const baseName = query.endsWith('USD') ? query.slice(0, -3) : query;
          return {
            symbol: query,
            name: `${baseName} / USD (Crypto)`,
            type: 'crypto',
            price
          };
        }
      }
    } else if (type === 'stock') {
      const res = await fetch(`https://api.nasdaq.com/api/quote/${query}/info?assetclass=stocks`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const data: any = await res.json();
        const lastSale = data?.data?.primaryData?.lastSalePrice;
        if (lastSale) {
          const priceStr = lastSale.replace('$', '').trim();
          const price = parseFloat(parseFloat(priceStr).toFixed(2));
          const name = data?.data?.companyName || `${query} Stock`;
          return {
            symbol: query,
            name,
            type: 'stock',
            price
          };
        }
      }
    } else if (type === 'forex') {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data: any = await res.json();
        if (data && data.rates) {
          const rates = data.rates;
          const ccy1 = query.slice(0, 3);
          const ccy2 = query.slice(3, 6);
          if (rates[ccy1] && rates[ccy2]) {
            const rate = rates[ccy2] / rates[ccy1];
            const price = parseFloat(rate.toFixed(4));
            return {
              symbol: query,
              name: `${ccy1} / ${ccy2} (Forex)`,
              type: 'forex',
              price
            };
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error fetching real price for ${symbol}:`, err);
  }
  return null;
}

// Periodically update existing catalogue prices from live APIs
async function updateCatalogPrices() {
  console.log('[Catalog] Updating real-time catalog prices from live APIs...');
  for (const inst of instruments) {
    try {
      const details = await fetchInstrumentDetails(inst.symbol);
      if (details) {
        inst.price = details.price;
        if (details.name && !inst.name.includes('Stock')) {
          inst.name = details.name;
        }
      }
    } catch (e) {
      console.error(`Error updating catalog item ${inst.symbol}:`, e);
    }
  }
}

// Initial update
updateCatalogPrices().catch(err => console.error('Error in initial catalog update:', err));

// Update every 30 seconds
setInterval(() => {
  updateCatalogPrices().catch(err => console.error('Error in periodic catalog update:', err));
}, 30000);

interface DatabaseSchema {
  settings: {
    eToroCoupled: boolean;
    apiKey?: string;
    userKey?: string;
  };
  bots: Bot[];
  botInstruments: BotInstrument[];
  strategies: Strategy[];
  webhookTokens: WebhookToken[];
  signals: Signal[];
  orders: Order[];
  positions: Position[];
  performanceSnapshots: PerformanceSnapshot[];
  users?: AuthUser[];
}

// Dummy compatibility wrappers
function loadDb(): DatabaseSchema {
  return {
    users: [],
    settings: { eToroCoupled: true },
    strategies: [],
    bots: [],
    botInstruments: [],
    webhookTokens: [],
    signals: [],
    orders: [],
    positions: [],
    performanceSnapshots: []
  };
}
function saveDb(data: any) {}

function getUserId(req: express.Request): string {
  return req.headers['x-user-id'] as string || 'default_user';
}

// Seeder function to populate initial dummy/template data inside Firestore for a given user
async function seedUserFirestore(userId: string) {
  try {
    console.log(`Seeding Firestore collections for user: ${userId}`);

    // 1. Settings
    await setDoc(doc(firestoreDb, 'settings', userId), {
      eToroCoupled: true,
      apiKey: "et_live_8f391b0cc48123da760e",
      userKey: "usr_stefan_trader_99",
      userId
    });

    // 2. Bots
    const defaultBots = [
      {
        id: 'bot-1',
        name: 'Apex Crypto Swinger',
        status: 'active',
        strategyId: 'strat-1',
        strategyName: 'Crypto Momentum Swing',
        agentPortfolioId: 'ap-90218-crypto',
        scopedUserToken: 'tok_scoped_agent_btc_eth_momentum',
        startBudgetUsd: 1500,
        balanceUsd: 1050,
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        userId
      },
      {
        id: 'bot-2',
        name: 'Nvidia/Tesla Accelerator',
        status: 'active',
        strategyId: 'strat-2',
        strategyName: 'Nvidia/Tesla Day Scalper',
        agentPortfolioId: 'ap-88124-tech',
        scopedUserToken: 'tok_scoped_tech_scalper_ap',
        startBudgetUsd: 2000,
        balanceUsd: 1517.60,
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        userId
      },
      {
        id: 'bot-3',
        name: 'Euro Rebounder',
        status: 'paused',
        strategyId: 'strat-3',
        strategyName: 'Macro Forex Trend Reversal',
        agentPortfolioId: 'ap-74105-forex',
        scopedUserToken: 'tok_scoped_forex_reversal_ap',
        startBudgetUsd: 1000,
        balanceUsd: 1000,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        userId
      }
    ];

    for (const bot of defaultBots) {
      await setDoc(doc(firestoreDb, 'bots', bot.id), bot);
    }

    // 3. Webhook Tokens
    const defaultTokens = [
      { id: 'wt-1', botId: 'bot-1', token: 'b_crypto_momentum', userId },
      { id: 'wt-2', botId: 'bot-2', token: 'b_tech_scalper', userId },
      { id: 'wt-3', botId: 'bot-3', token: 'b_forex_reversal', userId }
    ];

    for (const wt of defaultTokens) {
      await setDoc(doc(firestoreDb, 'webhookTokens', wt.botId), wt);
    }

    // 4. Bot Instruments
    const defaultInstruments = [
      {
        id: 'bi-1',
        botId: 'bot-1',
        etoroInstrumentId: 1,
        tvSymbol: 'BTCUSD',
        tvExchange: 'BINANCE',
        weightPct: 70,
        capPct: 50,
        currentPrice: 65230.50,
        userId
      },
      {
        id: 'bi-2',
        botId: 'bot-1',
        etoroInstrumentId: 2,
        tvSymbol: 'ETHUSD',
        tvExchange: 'BINANCE',
        weightPct: 30,
        capPct: 30,
        currentPrice: 3450.20,
        userId
      },
      {
        id: 'bi-3',
        botId: 'bot-2',
        etoroInstrumentId: 5,
        tvSymbol: 'NVDA',
        tvExchange: 'NASDAQ',
        weightPct: 60,
        capPct: 60,
        currentPrice: 482.40,
        userId
      },
      {
        id: 'bi-4',
        botId: 'bot-2',
        etoroInstrumentId: 4,
        tvSymbol: 'TSLA',
        tvExchange: 'NASDAQ',
        weightPct: 40,
        capPct: 40,
        currentPrice: 248.80,
        userId
      },
      {
        id: 'bi-5',
        botId: 'bot-3',
        etoroInstrumentId: 7,
        tvSymbol: 'EURUSD',
        tvExchange: 'OANDA',
        weightPct: 100,
        capPct: 100,
        currentPrice: 1.0865,
        userId
      }
    ];

    for (const bi of defaultInstruments) {
      await setDoc(doc(firestoreDb, 'botInstruments', bi.id), bi);
    }

    // 5. Positions
    const defaultPositions = [
      {
        id: 'pos-1',
        botId: 'bot-1',
        botInstrumentId: 'bi-1',
        tvSymbol: 'BTCUSD',
        direction: 'long',
        entryPrice: 65110.00,
        currentPrice: 65230.50,
        sizeUsd: 450.00,
        quantity: 0.006911,
        openTimestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        status: 'open',
        pnlUsd: 0.83,
        pnlPct: 0.18,
        userId
      },
      {
        id: 'pos-2',
        botId: 'bot-2',
        botInstrumentId: 'bi-3',
        tvSymbol: 'NVDA',
        direction: 'long',
        entryPrice: 479.50,
        currentPrice: 482.40,
        sizeUsd: 482.40,
        quantity: 1.000000,
        openTimestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        status: 'open',
        pnlUsd: 2.90,
        pnlPct: 0.60,
        userId
      },
      {
        id: 'pos-3',
        botId: 'bot-1',
        botInstrumentId: 'bi-1',
        tvSymbol: 'BTCUSD',
        direction: 'long',
        entryPrice: 62450.00,
        exitPrice: 64100.00,
        currentPrice: 64100.00,
        sizeUsd: 300.00,
        quantity: 0.004804,
        openTimestamp: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        closeTimestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
        status: 'closed',
        pnlUsd: 7.92,
        pnlPct: 2.64,
        userId
      }
    ];

    for (const pos of defaultPositions) {
      await setDoc(doc(firestoreDb, 'positions', pos.id), pos);
    }

    // 6. Performance Snapshots
    const defaultPerformance = [
      { id: 'ps-1', botId: 'bot-1', date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1500, userId },
      { id: 'ps-2', botId: 'bot-1', date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 25, unrealizedPnl: 0, equity: 1525, userId },
      { id: 'ps-3', botId: 'bot-1', date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 25, unrealizedPnl: -10, equity: 1515, userId },
      { id: 'ps-4', botId: 'bot-1', date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 55, unrealizedPnl: 5, equity: 1560, userId },
      { id: 'ps-5', botId: 'bot-1', date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 55, unrealizedPnl: 12, equity: 1567, userId },
      { id: 'ps-6', botId: 'bot-1', date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 95, unrealizedPnl: 2, equity: 1597, userId },
      { id: 'ps-7', botId: 'bot-1', date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 95, unrealizedPnl: 8, equity: 1603, userId },
      { id: 'ps-8', botId: 'bot-1', date: new Date(Date.now()).toISOString().split('T')[0], realizedPnl: 110, unrealizedPnl: 6.86, equity: 1616.86, userId },

      { id: 'ps-9', botId: 'bot-2', date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 2000, userId },
      { id: 'ps-10', botId: 'bot-2', date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: -30, unrealizedPnl: 0, equity: 1970, userId },
      { id: 'ps-11', botId: 'bot-2', date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 15, unrealizedPnl: 0, equity: 2015, userId },
      { id: 'ps-12', botId: 'bot-2', date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 15, unrealizedPnl: -5, equity: 2010, userId },
      { id: 'ps-13', botId: 'bot-2', date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 45, unrealizedPnl: 4, equity: 2049, userId },
      { id: 'ps-14', botId: 'bot-2', date: new Date(Date.now()).toISOString().split('T')[0], realizedPnl: 45, unrealizedPnl: 10.53, equity: 2055.53, userId },

      { id: 'ps-15', botId: 'bot-3', date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1000, userId },
      { id: 'ps-16', botId: 'bot-3', date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1000, userId },
      { id: 'ps-17', botId: 'bot-3', date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1000, userId },
      { id: 'ps-18', botId: 'bot-3', date: new Date(Date.now()).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1000, userId }
    ];

    for (const ps of defaultPerformance) {
      await setDoc(doc(firestoreDb, 'performanceSnapshots', ps.id), ps);
    }

    // 7. Strategies
    const defaultStrategies = [
      {
        id: 'strat-1',
        name: 'Crypto Momentum Swing',
        type: 'webhook',
        parameters: {
          direction: 'both',
          sizingMode: 'percent_of_bot_allocation',
          sizingValue: 20,
          maxPositions: 4,
          stopLossPct: 3,
          takeProfitPct: 7,
          cooldownMinutes: 15
        },
        version: 'v1.2',
        userId
      },
      {
        id: 'strat-2',
        name: 'Nvidia/Tesla Day Scalper',
        type: 'webhook',
        parameters: {
          direction: 'long',
          sizingMode: 'fixed_amount',
          sizingValue: 250,
          maxPositions: 2,
          stopLossPct: 2,
          takeProfitPct: 5
        },
        version: 'v2.0',
        userId
      },
      {
        id: 'strat-3',
        name: 'Macro Forex Trend Reversal',
        type: 'webhook',
        parameters: {
          direction: 'both',
          sizingMode: 'percent_of_bot_allocation',
          sizingValue: 25,
          maxPositions: 2,
          stopLossPct: 1.5,
          takeProfitPct: 4
        },
        version: 'v1.0',
        userId
      }
    ];

    for (const strat of defaultStrategies) {
      await setDoc(doc(firestoreDb, 'strategies', strat.id), strat);
    }

    console.log(`Seeding successful for user: ${userId}`);
  } catch (e) {
    console.error('Error seeding user firestore', e);
  }
}

// Legacy JSON DB helpers removed
function legacy_loadDb(): DatabaseSchema {
  const defaultDb: DatabaseSchema = {
  settings: {
    eToroCoupled: true
  },
  strategies: [
      {
        id: 'strat-1',
        name: 'Crypto Momentum Swing',
        type: 'webhook',
        parameters: {
          direction: 'both',
          sizingMode: 'percent_of_bot_allocation',
          sizingValue: 20,
          maxPositions: 4,
          stopLossPct: 3,
          takeProfitPct: 7,
          cooldownMinutes: 15
        },
        version: 'v1.2'
      },
      {
        id: 'strat-2',
        name: 'Nvidia/Tesla Day Scalper',
        type: 'webhook',
        parameters: {
          direction: 'long',
          sizingMode: 'fixed_amount',
          sizingValue: 250,
          maxPositions: 2,
          stopLossPct: 2,
          takeProfitPct: 5
        },
        version: 'v2.0'
      },
      {
        id: 'strat-3',
        name: 'Macro Forex Trend Reversal',
        type: 'webhook',
        parameters: {
          direction: 'both',
          sizingMode: 'percent_of_bot_allocation',
          sizingValue: 25,
          maxPositions: 2,
          stopLossPct: 1.5,
          takeProfitPct: 4
        },
        version: 'v1.0'
      }
    ],
    bots: [
      {
        id: 'bot-1',
        name: 'Apex Crypto Swinger',
        status: 'active',
        strategyId: 'strat-1',
        strategyName: 'Crypto Momentum Swing',
        agentPortfolioId: 'ap-90218-crypto',
        scopedUserToken: 'tok_scoped_agent_btc_eth_momentum',
        startBudgetUsd: 1500,
        balanceUsd: 1050, // has some open long position
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), // 30 days ago
      },
      {
        id: 'bot-2',
        name: 'Nvidia/Tesla Accelerator',
        status: 'active',
        strategyId: 'strat-2',
        strategyName: 'Nvidia/Tesla Day Scalper',
        agentPortfolioId: 'ap-88124-tech',
        scopedUserToken: 'tok_scoped_tech_scalper_ap',
        startBudgetUsd: 2000,
        balanceUsd: 1517.60, // has open positions
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), // 15 days ago
      },
      {
        id: 'bot-3',
        name: 'Euro Rebounder',
        status: 'paused',
        strategyId: 'strat-3',
        strategyName: 'Macro Forex Trend Reversal',
        agentPortfolioId: 'ap-74105-forex',
        scopedUserToken: 'tok_scoped_forex_reversal_ap',
        startBudgetUsd: 1000,
        balanceUsd: 1000,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      }
    ],
    botInstruments: [
      {
        id: 'bi-1',
        botId: 'bot-1',
        etoroInstrumentId: 1,
        tvSymbol: 'BTCUSD',
        tvExchange: 'BINANCE',
        weightPct: 70,
        capPct: 50,
        currentPrice: 65230.50
      },
      {
        id: 'bi-2',
        botId: 'bot-1',
        etoroInstrumentId: 2,
        tvSymbol: 'ETHUSD',
        tvExchange: 'BINANCE',
        weightPct: 30,
        capPct: 30,
        currentPrice: 3450.20
      },
      {
        id: 'bi-3',
        botId: 'bot-2',
        etoroInstrumentId: 5,
        tvSymbol: 'NVDA',
        tvExchange: 'NASDAQ',
        weightPct: 50,
        capPct: 50,
        currentPrice: 482.40
      },
      {
        id: 'bi-4',
        botId: 'bot-2',
        etoroInstrumentId: 4,
        tvSymbol: 'TSLA',
        tvExchange: 'NASDAQ',
        weightPct: 50,
        capPct: 50,
        currentPrice: 248.80
      },
      {
        id: 'bi-5',
        botId: 'bot-3',
        etoroInstrumentId: 7,
        tvSymbol: 'EURUSD',
        tvExchange: 'OANDA',
        weightPct: 100,
        currentPrice: 1.0865
      }
    ],
    webhookTokens: [
      {
        id: 'wt-1',
        botId: 'bot-1',
        token: 'b_7f2c9a1e4d3b',
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'wt-2',
        botId: 'bot-2',
        token: 'b_9a8b7c6d5e4f',
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'wt-3',
        botId: 'bot-3',
        token: 'b_1a2b3c4d5e6f',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      }
    ],
    signals: [
      {
        id: 'sig-1',
        botId: 'bot-1',
        botInstrumentId: 'bi-1',
        tvSymbol: 'BTCUSD',
        externalSignalId: 'tv-btc-swing-101-1718105000',
        action: 'open_long',
        receivedPayload: {
          version: 1,
          bot_token: 'b_7f2c9a1e4d3b',
          signal_id: 'tv-btc-swing-101-1718105000',
          symbol: 'BTCUSD',
          action: 'open_long',
          sizing: { mode: 'percent_of_bot_allocation', value: 30 },
          risk: { stop_loss_pct: 3, take_profit_pct: 7 },
          signal_price: 64250.00,
          timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
        },
        timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        status: 'filled'
      },
      {
        id: 'sig-2',
        botId: 'bot-2',
        botInstrumentId: 'bi-3',
        tvSymbol: 'NVDA',
        externalSignalId: 'tv-nvda-scalp-204-1718214200',
        action: 'open_long',
        receivedPayload: {
          version: 1,
          bot_token: 'b_9a8b7c6d5e4f',
          signal_id: 'tv-nvda-scalp-204-1718214200',
          symbol: 'NVDA',
          action: 'open_long',
          sizing: { mode: 'fixed_amount', value: 250 },
          risk: { stop_loss_pct: 2, take_profit_pct: 5 },
          signal_price: 472.10,
          timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
        },
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        status: 'filled'
      },
      {
        id: 'sig-3',
        botId: 'bot-1',
        botInstrumentId: 'bi-2',
        tvSymbol: 'ETHUSD',
        externalSignalId: 'tv-eth-swing-99-1718301100',
        action: 'open_long',
        receivedPayload: {
          version: 1,
          bot_token: 'b_7f2c9a1e4d3b',
          signal_id: 'tv-eth-swing-99-1718301100',
          symbol: 'ETHUSD',
          action: 'open_long',
          sizing: { mode: 'percent_of_bot_allocation', value: 20 },
          risk: { stop_loss_pct: 3, take_profit_pct: 7 },
          signal_price: 3380.00,
          timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
        },
        timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        status: 'rejected',
        errorMessage: 'Risk check failed: Max concurrent positions (4) would be violated'
      }
    ],
    orders: [
      {
        id: 'ord-1',
        botId: 'bot-1',
        botInstrumentId: 'bi-1',
        signalId: 'sig-1',
        brokerOrderId: 'et-ord-881203',
        type: 'market',
        action: 'buy',
        status: 'filled',
        price: 64250.00,
        quantity: 0.007, // ~450 USD size
        timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'ord-2',
        botId: 'bot-2',
        botInstrumentId: 'bi-3',
        signalId: 'sig-2',
        brokerOrderId: 'et-ord-904123',
        type: 'market',
        action: 'buy',
        status: 'filled',
        price: 472.10,
        quantity: 1.022, // ~482 USD size (some margin/sizing)
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      }
    ],
    positions: [
      {
        id: 'pos-1',
        botId: 'bot-1',
        botInstrumentId: 'bi-1',
        tvSymbol: 'BTCUSD',
        direction: 'long',
        entryPrice: 64250.00,
        currentPrice: 65230.50,
        sizeUsd: 450.00,
        quantity: 0.007,
        openTimestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        status: 'open',
        pnlUsd: 6.86, // (65230.50 - 64250.00) * 0.007
        pnlPct: 1.53
      },
      {
        id: 'pos-2',
        botId: 'bot-2',
        botInstrumentId: 'bi-3',
        tvSymbol: 'NVDA',
        direction: 'long',
        entryPrice: 472.10,
        currentPrice: 482.40,
        sizeUsd: 482.40,
        quantity: 1.022,
        openTimestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        status: 'open',
        pnlUsd: 10.53, // (482.40 - 472.10) * 1.022
        pnlPct: 2.18
      }
    ],
    performanceSnapshots: [
      // Snapshot series over last 7 days for equity curves
      { id: 'ps-1', botId: 'bot-1', date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1500 },
      { id: 'ps-2', botId: 'bot-1', date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 25, unrealizedPnl: 0, equity: 1525 },
      { id: 'ps-3', botId: 'bot-1', date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 25, unrealizedPnl: -10, equity: 1515 },
      { id: 'ps-4', botId: 'bot-1', date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 55, unrealizedPnl: 5, equity: 1560 },
      { id: 'ps-5', botId: 'bot-1', date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 55, unrealizedPnl: 12, equity: 1567 },
      { id: 'ps-6', botId: 'bot-1', date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 95, unrealizedPnl: 2, equity: 1597 },
      { id: 'ps-7', botId: 'bot-1', date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 95, unrealizedPnl: 8, equity: 1603 },
      { id: 'ps-8', botId: 'bot-1', date: new Date(Date.now()).toISOString().split('T')[0], realizedPnl: 110, unrealizedPnl: 6.86, equity: 1616.86 },

      { id: 'ps-9', botId: 'bot-2', date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 2000 },
      { id: 'ps-10', botId: 'bot-2', date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: -30, unrealizedPnl: 0, equity: 1970 },
      { id: 'ps-11', botId: 'bot-2', date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 15, unrealizedPnl: 0, equity: 2015 },
      { id: 'ps-12', botId: 'bot-2', date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 15, unrealizedPnl: -5, equity: 2010 },
      { id: 'ps-13', botId: 'bot-2', date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 45, unrealizedPnl: 4, equity: 2049 },
      { id: 'ps-14', botId: 'bot-2', date: new Date(Date.now()).toISOString().split('T')[0], realizedPnl: 45, unrealizedPnl: 10.53, equity: 2055.53 },

      { id: 'ps-15', botId: 'bot-3', date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1000 },
      { id: 'ps-16', botId: 'bot-3', date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1000 },
      { id: 'ps-17', botId: 'bot-3', date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1000 },
      { id: 'ps-18', botId: 'bot-3', date: new Date(Date.now()).toISOString().split('T')[0], realizedPnl: 0, unrealizedPnl: 0, equity: 1000 },
    ]
  };

  return defaultDb;
}

// Helper to parse cookies manually to avoid external middleware dependency
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('='));
    }
  });
  return cookies;
}

// Authentication Endpoints

// Register user
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, fullName } = req.body;
  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: 'Vul alstublieft alle verplichte velden in.' });
  }

  const db = loadDb();
  db.users = db.users || [];

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();

  // Validate duplicates
  const exists = db.users.find(u => u.username.toLowerCase() === normalizedUsername || u.email.toLowerCase() === normalizedEmail);
  if (exists) {
    return res.status(400).json({ error: 'Gebruikersnaam of e-mailadres is al in gebruik.' });
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const newUser: AuthUser = {
    id: 'usr_' + crypto.randomBytes(8).toString('hex'),
    username: username.trim(),
    email: normalizedEmail,
    fullName: fullName.trim(),
    passwordHash,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDb(db);

  res.json({ success: true, message: 'Registratie succesvol! U kunt nu inloggen.' });
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vul gebruikersnaam/e-mail en wachtwoord in.' });
  }

  const db = loadDb();
  db.users = db.users || [];

  const normalizedInput = username.trim().toLowerCase();
  const user = db.users.find(u => u.username.toLowerCase() === normalizedInput || u.email.toLowerCase() === normalizedInput);

  if (!user || !user.passwordHash) {
    return res.status(400).json({ error: 'Ongeldige gebruikersnaam/e-mail of wachtwoord.' });
  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== user.passwordHash) {
    return res.status(400).json({ error: 'Ongeldige gebruikersnaam/e-mail of wachtwoord.' });
  }

  // Generate session token
  const token = crypto.randomBytes(32).toString('hex');
  (user as any).sessionToken = token;
  saveDb(db);

  // Set secure cookie
  res.cookie('session_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl
    }
  });
});

// Get current user session
app.get('/api/auth/me', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['session_token'] || req.headers['authorization']?.toString().replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Niet ingelogd' });
  }

  const db = loadDb();
  db.users = db.users || [];
  const user = db.users.find(u => (u as any).sessionToken === token);

  if (!user) {
    return res.status(401).json({ error: 'Sessie verlopen of ongeldig' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl
  });
});

// Logout user
app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['session_token'];

  if (token) {
    const db = loadDb();
    db.users = db.users || [];
    const user = db.users.find(u => (u as any).sessionToken === token);
    if (user) {
      delete (user as any).sessionToken;
      saveDb(db);
    }
  }

  res.clearCookie('session_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });

  res.json({ success: true });
});

// Google Auth Consent Link / Sandbox Screen
app.get('/api/auth/google', (req, res) => {
  const isProdConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  if (isProdConfigured) {
    // Real Google OAuth redirect
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account'
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  // Render simulated consent page
  res.send(`
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Google Sign-In Simulator</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 flex items-center justify-center min-h-screen p-4 text-slate-100 font-sans">
      <div class="bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-8 border border-slate-800">
        <div class="flex flex-col items-center mb-6">
          <svg class="w-12 h-12 mb-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <h1 class="text-xl font-bold text-slate-100">Google Sign-In Simulator</h1>
          <p class="text-xs text-slate-400 mt-1">Authenticatie op eToro Trading Bot</p>
          <div class="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs rounded-lg p-3 mt-4 text-center font-sans">
            <strong>Sandbox Testomgeving:</strong> Er is momenteel geen Google Client ID ingesteld in uw configuratie. Test direct met een gesuggereerd e-mailadres hieronder om de inlogflow te voltooien!
          </div>
        </div>

        <form action="/api/auth/google/callback" method="GET" class="space-y-4">
          <div>
            <label class="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Kies een account</label>
            <div class="space-y-2">
              <button type="button" onclick="selectEmail('SMartinali75@gmail.com', 'SMartinali75')" class="w-full flex items-center p-3 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-850 hover:border-cyan-500/30 transition text-left">
                <div class="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold mr-3 text-sm">S</div>
                <div>
                  <p class="text-sm font-semibold text-slate-200">SMartinali75</p>
                  <p class="text-xs text-slate-500">SMartinali75@gmail.com</p>
                </div>
              </button>
              
              <button type="button" onclick="selectEmail('stefan.trader@gmail.com', 'Stefan Trader')" class="w-full flex items-center p-3 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-850 hover:border-cyan-500/30 transition text-left">
                <div class="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold mr-3 text-sm">ST</div>
                <div>
                  <p class="text-sm font-semibold text-slate-200">Stefan Trader</p>
                  <p class="text-xs text-slate-500">stefan.trader@gmail.com</p>
                </div>
              </button>
            </div>
          </div>

          <div class="border-t border-slate-800 pt-4">
            <label class="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Of voer handmatig in</label>
            <input type="email" id="custom_email" name="custom_email" placeholder="naam@voorbeeld.com" required class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-cyan-500 text-slate-200">
            <input type="hidden" id="name_input" name="custom_name" value="">
            <input type="hidden" id="code_input" name="code" value="mock_google_code_xyz">
          </div>

          <button type="submit" class="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-mono font-bold py-2.5 px-4 rounded-lg transition mt-2">
            SIMULEER GOOGLE INLOGGEN
          </button>
        </form>
      </div>

      <script>
        function selectEmail(email, name) {
          document.getElementById('custom_email').value = email;
          document.getElementById('name_input').value = name;
          document.querySelector('form').submit();
        }
        
        // Handle manual form submission
        document.querySelector('form').addEventListener('submit', function() {
          const email = document.getElementById('custom_email').value;
          if (email && !document.getElementById('name_input').value) {
            document.getElementById('name_input').value = email.split('@')[0];
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Google OAuth callback endpoint
app.get('/api/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  const isProdConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  let email = '';
  let fullName = '';
  let googleId = 'g_' + Math.random().toString(36).substring(2, 10);
  let avatarUrl = '';

  if (isProdConfigured) {
    try {
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'https://oauth2.googleapis.com/token' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenRes.ok) {
        throw new Error('Google token exchange failed');
      }

      const tokenData: any = await tokenRes.json();
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer \${tokenData.access_token}` }
      });

      if (!userRes.ok) {
        throw new Error('Google userinfo fetch failed');
      }

      const userData: any = await userRes.json();
      email = userData.email;
      fullName = userData.name || userData.given_name || email.split('@')[0];
      googleId = userData.id;
      avatarUrl = userData.picture || '';
    } catch (err: any) {
      return res.status(500).send(`
        <html>
          <body style="background:#020617; color:#f8fafc; font-family:sans-serif; text-align:center; padding: 40px;">
            <h2>Google Login Fout</h2>
            <p style="color:#ef4444;">\${err.message || err}</p>
            <button onclick="window.close()" style="background:#06b6d4; color:#0f172a; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">Sluit venster</button>
          </body>
        </html>
      `);
    }
  } else {
    // Sandbox / simulated fallback resolution
    email = (req.query.custom_email as string) || 'testuser@gmail.com';
    fullName = (req.query.custom_name as string) || email.split('@')[0];
    avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=\${encodeURIComponent(fullName)}`;
  }

  // Persist / Register / Login the user in db.json
  const db = loadDb();
  db.users = db.users || [];

  const normalizedEmail = email.trim().toLowerCase();
  let user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    // Register new user automatically
    user = {
      id: 'usr_' + crypto.randomBytes(8).toString('hex'),
      username: email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 5),
      email: normalizedEmail,
      fullName: fullName,
      googleId: googleId,
      avatarUrl: avatarUrl,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    // Update existing user with google info if not set
    if (!user.googleId) user.googleId = googleId;
    if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
  }

  // Generate session token
  const token = crypto.randomBytes(32).toString('hex');
  (user as any).sessionToken = token;
  saveDb(db);

  // Set secure cookie
  res.cookie('session_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  // Render popup success scripts to communicate with main viewport
  res.send(`
    <html>
      <head>
        <title>Google Authentication Succesvol</title>
      </head>
      <body style="background:#020617; color:#f8fafc; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
        <p style="font-size: 14px; font-weight: 500;">
          Inloggen succesvol! Dit venster sluit automatisch...
        </p>
      </body>
    </html>
  `);
});

// Endpoints

// 1. Instruments Catalogue Search (with Real-time Pricing)
app.get('/api/instruments', async (req, res) => {
  const query = (req.query.q || '').toString().trim().toUpperCase();
  if (!query) {
    return res.json(instruments);
  }

  // 1. Check if the query is an exact match for a symbol we already have
  const matched = instruments.find(i => i.symbol === query);
  if (matched) {
    try {
      const details = await fetchInstrumentDetails(matched.symbol);
      if (details) {
        matched.price = details.price;
        if (details.name && !matched.name.includes('Stock')) {
          matched.name = details.name;
        }
      }
    } catch (e) {
      console.error(`Error updating matched item ${matched.symbol}:`, e);
    }
    return res.json([matched]);
  }

  // 2. If not an exact match but the query fits general length constraints, fetch in real-time
  if (query.length >= 2 && query.length <= 12) {
    try {
      const details = await fetchInstrumentDetails(query);
      if (details) {
        const dynamicInstrument: EToroInstrument = {
          id: Math.floor(100000 + Math.random() * 900000),
          symbol: details.symbol,
          name: details.name,
          type: details.type,
          price: details.price
        };
        instruments.push(dynamicInstrument);
        return res.json([dynamicInstrument]);
      }
    } catch (e) {
      console.error(`Error fetching dynamic details for ${query}:`, e);
    }
  }

  // 3. Fallback: text search on the current catalog
  const filtered = instruments.filter(
    i => i.symbol.toUpperCase().includes(query) || i.name.toUpperCase().includes(query)
  );
  res.json(filtered);
});

// Get user eToro settings
app.get('/api/settings', async (req, res) => {
  try {
    const userId = getUserId(req);
    const settingsDoc = await getDoc(doc(firestoreDb, 'settings', userId));
    if (settingsDoc.exists()) {
      res.json(settingsDoc.data());
    } else {
      // If doesn't exist, let's seed the database for this new user, then return settings
      await seedUserFirestore(userId);
      const seededDoc = await getDoc(doc(firestoreDb, 'settings', userId));
      res.json(seededDoc.data() || { eToroCoupled: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user eToro settings
app.post('/api/settings', async (req, res) => {
  try {
    const userId = getUserId(req);
    const updatedSettings = {
      eToroCoupled: req.body.eToroCoupled,
      apiKey: req.body.apiKey,
      userKey: req.body.userKey,
      userId
    };
    await setDoc(doc(firestoreDb, 'settings', userId), updatedSettings, { merge: true });
    res.json({ status: 'ok', settings: updatedSettings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Bots endpoints
app.get('/api/bots', async (req, res) => {
  try {
    const userId = getUserId(req);
    // Fetch all bots, botInstruments, and webhookTokens for this user
    const botsSnap = await getDocs(query(collection(firestoreDb, 'bots'), where('userId', '==', userId)));
    const botInstrumentsSnap = await getDocs(query(collection(firestoreDb, 'botInstruments'), where('userId', '==', userId)));
    const webhookTokensSnap = await getDocs(query(collection(firestoreDb, 'webhookTokens'), where('userId', '==', userId)));

    const bots = botsSnap.docs.map(d => d.data() as Bot);
    const botInstruments = botInstrumentsSnap.docs.map(d => d.data() as BotInstrument);
    const webhookTokens = webhookTokensSnap.docs.map(d => d.data() as WebhookToken);

    // Decorate bots with their associated instruments list
    const decoratedBots = bots.map(bot => {
      const botInsts = botInstruments.filter(bi => bi.botId === bot.id);
      const tokenObj = webhookTokens.find(wt => wt.botId === bot.id);
      return {
        ...bot,
        instruments: botInsts,
        webhookToken: tokenObj?.token || ''
      };
    });
    res.json(decoratedBots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bots', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { 
      name, strategyId, startBudgetUsd, selectedInstruments, createNewPortfolio, existingToken, riskSettings 
    } = req.body;

    if (!name || !strategyId || !startBudgetUsd || !selectedInstruments || selectedInstruments.length === 0) {
      return res.status(400).json({ error: 'Incomplete bot data parameters' });
    }

    const newBotId = `bot-${Date.now()}`;
    
    // Get strategy to find strategyName
    const stratDoc = await getDoc(doc(firestoreDb, 'strategies', strategyId));
    const selectedStrat = stratDoc.exists() ? stratDoc.data() : null;
    const strategyName = selectedStrat ? selectedStrat.name : 'Custom Webhook Strategy';

    // eToro Agent Portfolio assignment
    const agentPortfolioId = createNewPortfolio ? `ap-${Math.floor(10000 + Math.random() * 90000)}-auto` : `ap-manual-${Math.floor(10000 + Math.random() * 90000)}`;
    const scopedUserToken = createNewPortfolio ? `tok_auto_${Math.random().toString(36).substring(7)}` : (existingToken || '');

    const newBot: Bot & { userId: string } = {
      id: newBotId,
      name,
      status: 'active',
      strategyId,
      strategyName,
      agentPortfolioId,
      scopedUserToken,
      startBudgetUsd: parseFloat(startBudgetUsd),
      balanceUsd: parseFloat(startBudgetUsd),
      createdAt: new Date().toISOString(),
      userId
    };

    // Create BotInstruments
    const newBotInstruments = selectedInstruments.map((inst: any, idx: number) => {
      const catalogItem = instruments.find(i => i.id === inst.id);
      return {
        id: `bi-${Date.now()}-${idx}`,
        botId: newBotId,
        etoroInstrumentId: inst.id,
        tvSymbol: catalogItem ? catalogItem.symbol : inst.symbol,
        tvExchange: catalogItem?.type === 'crypto' ? 'BINANCE' : (catalogItem?.type === 'forex' ? 'OANDA' : 'NASDAQ'),
        weightPct: parseFloat(inst.weightPct || (100 / selectedInstruments.length).toFixed(1)),
        capPct: inst.capPct ? parseFloat(inst.capPct) : null,
        currentPrice: catalogItem ? catalogItem.price : 100,
        userId
      };
    });

    // Create Webhook Token
    const tokenString = `b_${Math.random().toString(16).substring(2, 14)}`;
    const newWebhookToken = {
      id: `wt-${Date.now()}`,
      botId: newBotId,
      token: tokenString,
      createdAt: new Date().toISOString(),
      userId
    };

    // Initial snapshot
    const initialSnapshot = {
      id: `ps-${Date.now()}`,
      botId: newBotId,
      date: new Date().toISOString().split('T')[0],
      realizedPnl: 0,
      unrealizedPnl: 0,
      equity: parseFloat(startBudgetUsd),
      userId
    };

    // Save to Firestore asynchronously
    await setDoc(doc(firestoreDb, 'bots', newBotId), newBot);
    for (const bi of newBotInstruments) {
      await setDoc(doc(firestoreDb, 'botInstruments', bi.id), bi);
    }
    await setDoc(doc(firestoreDb, 'webhookTokens', newBotId), newWebhookToken);
    await setDoc(doc(firestoreDb, 'performanceSnapshots', initialSnapshot.id), initialSnapshot);

    res.status(201).json({
      status: 'ok',
      botId: newBotId,
      webhookToken: tokenString
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update bot status / details
app.put('/api/bots/:id', async (req, res) => {
  try {
    const botId = req.params.id;
    const { status, name } = req.body;
    
    const botDocRef = doc(firestoreDb, 'bots', botId);
    const botDoc = await getDoc(botDocRef);
    if (!botDoc.exists()) {
      return res.status(404).json({ error: 'Bot niet gevonden' });
    }

    const updatedData: any = {};
    if (status) updatedData.status = status;
    if (name) updatedData.name = name;

    await updateDoc(botDocRef, updatedData);
    res.json({ status: 'ok', bot: { ...botDoc.data(), ...updatedData } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/bots/:id', async (req, res) => {
  try {
    const botId = req.params.id;
    // Delete the bot
    await deleteDoc(doc(firestoreDb, 'bots', botId));

    // Helper to query and delete docs in a collection by botId
    const deleteByBotId = async (colName: string) => {
      const q = query(collection(firestoreDb, colName), where('botId', '==', botId));
      const snap = await getDocs(q);
      for (const docObj of snap.docs) {
        await deleteDoc(doc(firestoreDb, colName, docObj.id));
      }
    };

    await deleteByBotId('botInstruments');
    await deleteByBotId('webhookTokens');
    await deleteByBotId('signals');
    await deleteByBotId('orders');
    await deleteByBotId('positions');
    await deleteByBotId('performanceSnapshots');

    res.json({ status: 'ok' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Regenerate webhook token
app.post('/api/bots/:id/token/regenerate', async (req, res) => {
  try {
    const botId = req.params.id;
    const tokenQuery = query(collection(firestoreDb, 'webhookTokens'), where('botId', '==', botId));
    const tokenSnap = await getDocs(tokenQuery);
    if (tokenSnap.empty) {
      return res.status(404).json({ error: 'Token voor deze bot niet gevonden' });
    }

    const tokenDoc = tokenSnap.docs[0];
    const newToken = `b_${Math.random().toString(16).substring(2, 14)}`;
    await updateDoc(doc(firestoreDb, 'webhookTokens', tokenDoc.id), {
      token: newToken,
      createdAt: new Date().toISOString()
    });

    res.json({ status: 'ok', token: newToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bot metrics and historical stats
app.get('/api/bots/:id/performance', async (req, res) => {
  try {
    const botId = req.params.id;
    const q = query(collection(firestoreDb, 'performanceSnapshots'), where('botId', '==', botId));
    const snap = await getDocs(q);
    const snapshots = snap.docs.map(d => d.data());
    // Sort snapshots by date
    snapshots.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    res.json(snapshots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bots/:id/signals', async (req, res) => {
  try {
    const botId = req.params.id;
    const q = query(collection(firestoreDb, 'signals'), where('botId', '==', botId));
    const snap = await getDocs(q);
    const botSignals = snap.docs.map(d => d.data());
    botSignals.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(botSignals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bots/:id/positions', async (req, res) => {
  try {
    const botId = req.params.id;
    const q = query(collection(firestoreDb, 'positions'), where('botId', '==', botId));
    const snap = await getDocs(q);
    const botPositions = snap.docs.map(d => d.data());
    res.json(botPositions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bots/:id/orders', async (req, res) => {
  try {
    const botId = req.params.id;
    const q = query(collection(firestoreDb, 'orders'), where('botId', '==', botId));
    const snap = await getDocs(q);
    const botOrders = snap.docs.map(d => d.data());
    botOrders.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(botOrders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Global metrics
app.get('/api/signals', async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = query(collection(firestoreDb, 'signals'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const signals = snap.docs.map(d => d.data());
    signals.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(signals.slice(0, 50));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = query(collection(firestoreDb, 'positions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    res.json(snap.docs.map(d => d.data()));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/strategies', async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = query(collection(firestoreDb, 'strategies'), where('userId', '==', userId));
    const snap = await getDocs(q);
    res.json(snap.docs.map(d => d.data()));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// TRADINGVIEW WEBHOOK ENDPOINT
app.post('/api/webhooks/tv/:bot_id', async (req, res) => {
  try {
    const botId = req.params.bot_id;
    const payload = req.body;

    // Rule 1: Validate payload has basic JSON structure
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const { version, bot_token, signal_id, symbol, action, sizing, risk, signal_price, timestamp } = payload;

    if (!bot_token || !symbol || !action) {
      return res.status(400).json({ error: 'Missing mandatory fields: bot_token, symbol, action' });
    }

    // Find Bot & Token Authentication
    const botDoc = await getDoc(doc(firestoreDb, 'bots', botId));
    if (!botDoc.exists()) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    const bot = botDoc.data() as Bot & { userId: string };

    const tokenQuery = query(collection(firestoreDb, 'webhookTokens'), where('botId', '==', botId), where('token', '==', bot_token));
    const tokenSnap = await getDocs(tokenQuery);

    if (tokenSnap.empty) {
      return res.status(401).json({ error: 'Invalid or missing webhook authorization token' });
    }

    // Check bot status is ACTIVE (not paused or stopped)
    if (bot.status !== 'active') {
      return res.status(400).json({ error: `Bot is currently ${bot.status}. Webhook rejected.` });
    }

    // Find instrument configuration inside this bot
    const biQuery = query(collection(firestoreDb, 'botInstruments'), where('botId', '==', botId), where('tvSymbol', '==', symbol));
    const biSnap = await getDocs(biQuery);
    
    if (biSnap.empty) {
      // Log as rejected in the Signal log, but respond with error to TV
      const newSignalId = `sig-${Date.now()}`;
      const newSignal = {
        id: newSignalId,
        botId,
        botInstrumentId: '',
        tvSymbol: symbol,
        externalSignalId: signal_id || `err-${Date.now()}`,
        action,
        receivedPayload: payload,
        timestamp: timestamp || new Date().toISOString(),
        status: 'rejected',
        errorMessage: `Onbekend symbol voor deze bot: ${symbol}`,
        userId: bot.userId
      };
      await setDoc(doc(firestoreDb, 'signals', newSignalId), newSignal);
      return res.status(400).json({ error: `Onbekend symbol voor deze bot: ${symbol}` });
    }

    const botInstrument = biSnap.docs[0].data() as BotInstrument;

    // Check for Idempotency
    const dupeQuery = query(collection(firestoreDb, 'signals'), where('botId', '==', botId), where('externalSignalId', '==', signal_id));
    const dupeSnap = await getDocs(dupeQuery);
    if (!dupeSnap.empty && signal_id) {
      const dupeSignalId = `sig-${Date.now()}`;
      const dupeSignal = {
        id: dupeSignalId,
        botId,
        botInstrumentId: botInstrument.id,
        tvSymbol: symbol,
        externalSignalId: `${signal_id}-dupe`,
        action,
        receivedPayload: payload,
        timestamp: timestamp || new Date().toISOString(),
        status: 'duplicate',
        errorMessage: 'Duplicate signal_id detected. Ignored.',
        userId: bot.userId
      };
      await setDoc(doc(firestoreDb, 'signals', dupeSignalId), dupeSignal);
      return res.status(200).json({ status: 'ignored', reason: 'Duplicate signal' });
    }

    // Check for stale/delayed signals (> 2 minutes)
    const signalTime = timestamp ? new Date(timestamp).getTime() : Date.now();
    const timeDiffMinutes = Math.abs(Date.now() - signalTime) / 60000;
    if (timeDiffMinutes > 2) {
      const expiredSignalId = `sig-${Date.now()}`;
      const expiredSignal = {
        id: expiredSignalId,
        botId,
        botInstrumentId: botInstrument.id,
        tvSymbol: symbol,
        externalSignalId: signal_id || `exp-${Date.now()}`,
        action,
        receivedPayload: payload,
        timestamp: timestamp || new Date().toISOString(),
        status: 'expired',
        errorMessage: `Signaal verlopen: vertraging van ${timeDiffMinutes.toFixed(1)} minuten exceeds 2-minute threshold.`,
        userId: bot.userId
      };
      await setDoc(doc(firestoreDb, 'signals', expiredSignalId), expiredSignal);
      return res.status(400).json({ error: 'Signal expired' });
    }

    // Strategy Risk Checks
    const stratDoc = await getDoc(doc(firestoreDb, 'strategies', bot.strategyId));
    const strategy = stratDoc.exists() ? stratDoc.data() : null;

    const posQuery = query(collection(firestoreDb, 'positions'), where('botId', '==', botId), where('status', '==', 'open'));
    const posSnap = await getDocs(posQuery);
    const activePositions = posSnap.docs.map(d => d.data() as Position);

    if (action === 'open_long' || action === 'open_short') {
      // Max positions check
      const maxPosLimit = strategy?.parameters.maxPositions || 4;
      if (activePositions.length >= maxPosLimit) {
        const rejectSignalId = `sig-${Date.now()}`;
        const rejectSignal = {
          id: rejectSignalId,
          botId,
          botInstrumentId: botInstrument.id,
          tvSymbol: symbol,
          externalSignalId: signal_id || `risk-${Date.now()}`,
          action,
          receivedPayload: payload,
          timestamp: timestamp || new Date().toISOString(),
          status: 'rejected',
          errorMessage: `Risk check failed: Max concurrent positions (${maxPosLimit}) would be exceeded.`,
          userId: bot.userId
        };
        await setDoc(doc(firestoreDb, 'signals', rejectSignalId), rejectSignal);
        return res.status(400).json({ error: 'Risk check failed: Max positions exceeded' });
      }

      // Check if position already open for this instrument
      const existingPos = activePositions.find(p => p.tvSymbol === symbol);
      if (existingPos) {
        const rejectSignalId = `sig-${Date.now()}`;
        const rejectSignal = {
          id: rejectSignalId,
          botId,
          botInstrumentId: botInstrument.id,
          tvSymbol: symbol,
          externalSignalId: signal_id || `risk-${Date.now()}`,
          action,
          receivedPayload: payload,
          timestamp: timestamp || new Date().toISOString(),
          status: 'rejected',
          errorMessage: `Risk check failed: Open position already exists for ${symbol}.`,
          userId: bot.userId
        };
        await setDoc(doc(firestoreDb, 'signals', rejectSignalId), rejectSignal);
        return res.status(400).json({ error: 'Position already open' });
      }
    }

    // Record initial Signal in received/validated state
    const signalRecordId = `sig-${Date.now()}`;
    const signalRecord: Signal & { userId: string } = {
      id: signalRecordId,
      botId,
      botInstrumentId: botInstrument.id,
      tvSymbol: symbol,
      externalSignalId: signal_id || `sig-${Date.now()}`,
      action,
      receivedPayload: payload,
      timestamp: timestamp || new Date().toISOString(),
      status: 'validated',
      userId: bot.userId
    };

    // Process the action
    const currentAssetPrice = signal_price || botInstrument.currentPrice;

    if (action === 'open_long' || action === 'open_short') {
      // Calculate Sizing
      let sizeUsd = 200; // minimum allocation
      const mode = sizing?.mode || strategy?.parameters.sizingMode || 'percent_of_bot_allocation';
      const val = sizing?.value || strategy?.parameters.sizingValue || 20;

      if (mode === 'fixed_amount') {
        sizeUsd = val;
      } else if (mode === 'percent_of_bot_allocation') {
        sizeUsd = bot.startBudgetUsd * (val / 100);
      }

      // Apply cap per instrument check if available
      const instrumentCapPct = botInstrument.capPct || 50;
      const maxCapUsd = bot.startBudgetUsd * (instrumentCapPct / 100);
      if (sizeUsd > maxCapUsd) {
        sizeUsd = maxCapUsd;
      }

      // Check budget sufficiency
      if (bot.balanceUsd < sizeUsd) {
        // Scale down to whatever balance we have if it is above $100, otherwise reject
        if (bot.balanceUsd >= 100) {
          sizeUsd = bot.balanceUsd;
        } else {
          signalRecord.status = 'rejected';
          signalRecord.errorMessage = `Insufficient funds in Agent Portfolio cash balance ($${bot.balanceUsd.toFixed(2)}).`;
          await setDoc(doc(firestoreDb, 'signals', signalRecordId), signalRecord);
          return res.status(400).json({ error: 'Insufficient cash balance' });
        }
      }

      // Dedicate cash and create position
      bot.balanceUsd = parseFloat((bot.balanceUsd - sizeUsd).toFixed(2));
      const quantity = parseFloat((sizeUsd / currentAssetPrice).toFixed(6));

      const newPosition: Position & { userId: string } = {
        id: `pos-${Date.now()}`,
        botId,
        botInstrumentId: botInstrument.id,
        tvSymbol: symbol,
        direction: action === 'open_long' ? 'long' : 'short',
        entryPrice: currentAssetPrice,
        currentPrice: currentAssetPrice,
        sizeUsd,
        quantity,
        openTimestamp: new Date().toISOString(),
        status: 'open',
        pnlUsd: 0,
        pnlPct: 0,
        userId: bot.userId
      };

      const newOrder: Order & { userId: string } = {
        id: `ord-${Date.now()}`,
        botId,
        botInstrumentId: botInstrument.id,
        signalId: signalRecordId,
        brokerOrderId: `et-ord-${Math.floor(100000 + Math.random() * 900000)}`,
        type: payload.order_type || 'market',
        action: action === 'open_long' ? 'buy' : 'sell',
        status: 'filled',
        price: currentAssetPrice,
        quantity,
        timestamp: new Date().toISOString(),
        userId: bot.userId
      };

      signalRecord.status = 'filled';
      
      await setDoc(doc(firestoreDb, 'bots', botId), bot);
      await setDoc(doc(firestoreDb, 'positions', newPosition.id), newPosition);
      await setDoc(doc(firestoreDb, 'orders', newOrder.id), newOrder);
      await setDoc(doc(firestoreDb, 'signals', signalRecordId), signalRecord);

    } else if (action === 'close') {
      // Find open position for this instrument
      const openPosQuery = query(collection(firestoreDb, 'positions'), where('botId', '==', botId), where('tvSymbol', '==', symbol), where('status', '==', 'open'));
      const openPosSnap = await getDocs(openPosQuery);
      if (openPosSnap.empty) {
        signalRecord.status = 'rejected';
        signalRecord.errorMessage = `Geen open positie gevonden om te sluiten voor instrument: ${symbol}`;
        await setDoc(doc(firestoreDb, 'signals', signalRecordId), signalRecord);
        return res.status(400).json({ error: 'No open position to close' });
      }

      const posDoc = openPosSnap.docs[0];
      const pos = posDoc.data() as Position;
      pos.status = 'closed';
      
      // Calculate final profit or loss
      const priceDiff = pos.direction === 'long' 
        ? currentAssetPrice - pos.entryPrice 
        : pos.entryPrice - currentAssetPrice;
      
      const finalPnl = parseFloat((priceDiff * pos.quantity).toFixed(2));
      pos.pnlUsd = finalPnl;
      pos.pnlPct = parseFloat(((priceDiff / pos.entryPrice) * 100).toFixed(2));
      pos.currentPrice = currentAssetPrice;

      // Credit cash back to bot balance (original size + final profit/loss)
      const returnedCash = pos.sizeUsd + finalPnl;
      bot.balanceUsd = parseFloat((bot.balanceUsd + returnedCash).toFixed(2));

      const newOrder: Order & { userId: string } = {
        id: `ord-${Date.now()}`,
        botId,
        botInstrumentId: botInstrument.id,
        signalId: signalRecordId,
        brokerOrderId: `et-ord-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'market',
        action: pos.direction === 'long' ? 'sell' : 'buy',
        status: 'filled',
        price: currentAssetPrice,
        quantity: pos.quantity,
        timestamp: new Date().toISOString(),
        userId: bot.userId
      };

      signalRecord.status = 'filled';

      // Save performance snapshot point reflecting realized returns
      const snapQuery = query(collection(firestoreDb, 'performanceSnapshots'), where('botId', '==', botId), where('date', '==', new Date().toISOString().split('T')[0]));
      const snapSnap = await getDocs(snapQuery);

      // We need closed and open positions to calculate equity curve
      const allClosedQuery = query(collection(firestoreDb, 'positions'), where('botId', '==', botId), where('status', '==', 'closed'));
      const allClosedSnap = await getDocs(allClosedQuery);
      const closedPos = allClosedSnap.docs.map(d => d.data() as Position);
      // add current closed pos to calculate correctly
      const totalRealizedPnl = closedPos.reduce((sum, p) => sum + p.pnlUsd, 0) + finalPnl;

      const allOpenQuery = query(collection(firestoreDb, 'positions'), where('botId', '==', botId), where('status', '==', 'open'));
      const allOpenSnap = await getDocs(allOpenQuery);
      const openPos = allOpenSnap.docs.map(d => d.data() as Position).filter(p => p.id !== pos.id);
      const totalUnrealizedPnl = openPos.reduce((sum, p) => sum + p.pnlUsd, 0);

      const botEquity = bot.balanceUsd + openPos.reduce((sum, p) => sum + p.sizeUsd + p.pnlUsd, 0);

      await setDoc(doc(firestoreDb, 'bots', botId), bot);
      await setDoc(doc(firestoreDb, 'positions', posDoc.id), pos);
      await setDoc(doc(firestoreDb, 'orders', newOrder.id), newOrder);
      await setDoc(doc(firestoreDb, 'signals', signalRecordId), signalRecord);

      if (!snapSnap.empty) {
        const snapDoc = snapSnap.docs[0];
        await updateDoc(doc(firestoreDb, 'performanceSnapshots', snapDoc.id), {
          realizedPnl: totalRealizedPnl,
          unrealizedPnl: totalUnrealizedPnl,
          equity: botEquity
        });
      } else {
        const newSnapId = `ps-${Date.now()}`;
        await setDoc(doc(firestoreDb, 'performanceSnapshots', newSnapId), {
          id: newSnapId,
          botId,
          date: new Date().toISOString().split('T')[0],
          realizedPnl: totalRealizedPnl,
          unrealizedPnl: totalUnrealizedPnl,
          equity: botEquity,
          userId: bot.userId
        });
      }
    }

    res.status(200).json({
      status: 'success',
      signal_id: signal_id,
      action: action,
      price: currentAssetPrice,
      bot_balance: bot.balanceUsd
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to simulate/force testing signals from UI
app.post('/api/test/fire-webhook', async (req, res) => {
  try {
    const { botId, symbol, action, sizingValue, stopLossPct, takeProfitPct, customPrice } = req.body;
    
    const botDoc = await getDoc(doc(firestoreDb, 'bots', botId));
    if (!botDoc.exists()) {
      return res.status(404).json({ error: 'Bot niet gevonden' });
    }
    const bot = botDoc.data();

    const tokenQuery = query(collection(firestoreDb, 'webhookTokens'), where('botId', '==', botId));
    const tokenSnap = await getDocs(tokenQuery);
    if (tokenSnap.empty) {
      return res.status(404).json({ error: 'Token voor deze bot niet gevonden' });
    }
    const tokenObj = tokenSnap.docs[0].data();

    const biQuery = query(collection(firestoreDb, 'botInstruments'), where('botId', '==', botId), where('tvSymbol', '==', symbol));
    const biSnap = await getDocs(biQuery);
    const inst = biSnap.empty ? null : biSnap.docs[0].data();

    const payload = {
      version: 1,
      bot_token: tokenObj.token,
      signal_id: `sim-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(Date.now() / 1000)}`,
      symbol: symbol,
      action: action,
      sizing: {
        mode: 'percent_of_bot_allocation',
        value: sizingValue ? parseFloat(sizingValue) : 20
      },
      risk: {
        stop_loss_pct: stopLossPct ? parseFloat(stopLossPct) : 3,
        take_profit_pct: takeProfitPct ? parseFloat(takeProfitPct) : 7
      },
      signal_price: customPrice ? parseFloat(customPrice) : (inst ? inst.currentPrice : 100),
      timestamp: new Date().toISOString()
    };

    const resMock: any = {
      statusCode: 200,
      status: (code: number) => {
        resMock.statusCode = code;
        return resMock;
      },
      json: (data: any) => {
        if (resMock.statusCode >= 400) {
          res.status(resMock.statusCode).json({ error: data.error || 'Webhook failed to process' });
        } else {
          res.json({ success: true, payload, response: data });
        }
      }
    };

    // Trigger router manually or run the post handler logic directly
    return app._router.handle({ method: 'POST', url: `/api/webhooks/tv/${botId}`, body: payload, headers: {} }, resMock, (err: any) => {
      res.status(500).json({ error: 'Vite middleware routing error' });
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function startServer() {
  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TradingBotManager] Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
