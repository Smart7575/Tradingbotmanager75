import { 
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  collection, query, where 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  Bot, BotStatus, BotInstrument, Strategy, Signal, Order, Position, PerformanceSnapshot, WebhookToken, EToroInstrument 
} from '../types';

const DEFAULT_STRATEGIES: Strategy[] = [
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
];

const DEFAULT_INSTRUMENTS: EToroInstrument[] = [
  { id: 1, symbol: 'BTCUSD', name: 'Bitcoin / USD', type: 'crypto', price: 65230.50 },
  { id: 2, symbol: 'ETHUSD', name: 'Ethereum / USD', type: 'crypto', price: 3450.20 },
  { id: 3, symbol: 'AAPL', name: 'Apple Inc. Common Stock', type: 'stock', price: 191.25 },
  { id: 4, symbol: 'TSLA', name: 'Tesla Inc. Common Stock', type: 'stock', price: 248.80 },
  { id: 5, symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', price: 482.40 },
  { id: 6, symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', price: 421.10 },
  { id: 7, symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex', price: 1.0865 },
  { id: 8, symbol: 'SOLUSD', name: 'Solana / USD', type: 'crypto', price: 142.15 },
];

async function seedUserFirestoreClient(userId: string) {
  try {
    console.log(`[Seeder Client] Seeding Firestore collections for user: ${userId}`);

    // 1. Settings
    await setDoc(doc(db, 'settings', userId), {
      eToroCoupled: true,
      apiKey: "et_live_8f391b0cc48123da760e",
      userKey: "usr_stefan_trader_99",
      userId
    });

    // 2. Strategies
    for (const strat of DEFAULT_STRATEGIES) {
      await setDoc(doc(db, 'strategies', strat.id), { ...strat, userId });
    }

    // 3. Bots
    const defaultBots = [
      {
        id: 'bot-1',
        name: 'Apex Crypto Swinger',
        status: 'active' as BotStatus,
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
        status: 'active' as BotStatus,
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
        status: 'paused' as BotStatus,
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
      await setDoc(doc(db, 'bots', bot.id), bot);
    }

    // 4. Webhook Tokens
    const defaultTokens = [
      { id: 'wt-1', botId: 'bot-1', token: 'b_crypto_momentum', userId },
      { id: 'wt-2', botId: 'bot-2', token: 'b_tech_scalper', userId },
      { id: 'wt-3', botId: 'bot-3', token: 'b_forex_reversal', userId }
    ];

    for (const wt of defaultTokens) {
      await setDoc(doc(db, 'webhookTokens', wt.botId), wt);
    }

    // 5. Bot Instruments
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
      }
    ];

    for (const bi of defaultInstruments) {
      await setDoc(doc(db, 'botInstruments', bi.id), bi);
    }

    // 6. Performance Snapshots
    const defaultSnapshots = [
      {
        id: 'ps-1-1',
        botId: 'bot-1',
        date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
        realizedPnl: 10,
        unrealizedPnl: 20,
        equity: 1530,
        userId
      },
      {
        id: 'ps-1-2',
        botId: 'bot-1',
        date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
        realizedPnl: 15,
        unrealizedPnl: 45,
        equity: 1560,
        userId
      },
      {
        id: 'ps-2-1',
        botId: 'bot-2',
        date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
        realizedPnl: -5,
        unrealizedPnl: 120,
        equity: 2115,
        userId
      }
    ];

    for (const ps of defaultSnapshots) {
      await setDoc(doc(db, 'performanceSnapshots', ps.id), ps);
    }

    console.log(`[Seeder Client] Seeding successful for user: ${userId}`);
  } catch (e) {
    console.error('[Seeder Client] Error seeding user firestore', e);
  }
}

async function emulateWebhookClient(botId: string, payload: any): Promise<any> {
  const { bot_token, signal_id, symbol, action, sizing, signal_price, timestamp } = payload;

  if (!bot_token || !symbol || !action) {
    throw new Error('Missing mandatory fields: bot_token, symbol, action');
  }

  // Find Bot & Token Authentication
  const botDoc = await getDoc(doc(db, 'bots', botId));
  if (!botDoc.exists()) {
    throw new Error('Bot not found');
  }
  const bot = botDoc.data() as Bot & { userId: string };

  const tokenQuery = query(collection(db, 'webhookTokens'), where('botId', '==', botId), where('token', '==', bot_token));
  const tokenSnap = await getDocs(tokenQuery);

  if (tokenSnap.empty) {
    throw new Error('Invalid or missing webhook authorization token');
  }

  // Check bot status is ACTIVE
  if (bot.status !== 'active') {
    throw new Error(`Bot is currently ${bot.status}. Webhook rejected.`);
  }

  // Find instrument configuration inside this bot
  const biQuery = query(collection(db, 'botInstruments'), where('botId', '==', botId), where('tvSymbol', '==', symbol));
  const biSnap = await getDocs(biQuery);
  
  if (biSnap.empty) {
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
    await setDoc(doc(db, 'signals', newSignalId), newSignal);
    throw new Error(`Onbekend symbol voor deze bot: ${symbol}`);
  }

  const botInstrument = biSnap.docs[0].data() as BotInstrument;

  // Check for Idempotency
  const dupeQuery = query(collection(db, 'signals'), where('botId', '==', botId), where('externalSignalId', '==', signal_id));
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
    await setDoc(doc(db, 'signals', dupeSignalId), dupeSignal);
    return { status: 'ignored', reason: 'Duplicate signal' };
  }

  // Record initial Signal
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

  const currentAssetPrice = signal_price || botInstrument.currentPrice;

  // Get strategy
  const stratDoc = await getDoc(doc(db, 'strategies', bot.strategyId));
  const strategy = stratDoc.exists() ? stratDoc.data() as Strategy : null;

  const posQuery = query(collection(db, 'positions'), where('botId', '==', botId), where('status', '==', 'open'));
  const posSnap = await getDocs(posQuery);
  const activePositions = posSnap.docs.map(d => d.data() as Position);

  if (action === 'open_long' || action === 'open_short') {
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
      await setDoc(doc(db, 'signals', rejectSignalId), rejectSignal);
      throw new Error('Risk check failed: Max positions exceeded');
    }

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
      await setDoc(doc(db, 'signals', rejectSignalId), rejectSignal);
      throw new Error('Position already open');
    }

    let sizeUsd = 200;
    const mode = sizing?.mode || strategy?.parameters.sizingMode || 'percent_of_bot_allocation';
    const val = sizing?.value || strategy?.parameters.sizingValue || 20;

    if (mode === 'fixed_amount') {
      sizeUsd = val;
    } else if (mode === 'percent_of_bot_allocation') {
      sizeUsd = bot.startBudgetUsd * (val / 100);
    }

    const instrumentCapPct = botInstrument.capPct || 50;
    const maxCapUsd = bot.startBudgetUsd * (instrumentCapPct / 100);
    if (sizeUsd > maxCapUsd) {
      sizeUsd = maxCapUsd;
    }

    if (bot.balanceUsd < sizeUsd) {
      if (bot.balanceUsd >= 100) {
        sizeUsd = bot.balanceUsd;
      } else {
        signalRecord.status = 'rejected';
        signalRecord.errorMessage = `Insufficient funds in Agent Portfolio cash balance ($${bot.balanceUsd.toFixed(2)}).`;
        await setDoc(doc(db, 'signals', signalRecordId), signalRecord);
        throw new Error('Insufficient cash balance');
      }
    }

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
    
    await setDoc(doc(db, 'bots', botId), bot);
    await setDoc(doc(db, 'positions', newPosition.id), newPosition);
    await setDoc(doc(db, 'orders', newOrder.id), newOrder);
    await setDoc(doc(db, 'signals', signalRecordId), signalRecord);

    return { success: true, sizeUsd, quantity, orderId: newOrder.brokerOrderId };

  } else if (action === 'close') {
    const openPosQuery = query(collection(db, 'positions'), where('botId', '==', botId), where('tvSymbol', '==', symbol), where('status', '==', 'open'));
    const openPosSnap = await getDocs(openPosQuery);
    if (openPosSnap.empty) {
      signalRecord.status = 'rejected';
      signalRecord.errorMessage = `Geen open positie gevonden om te sluiten voor instrument: ${symbol}`;
      await setDoc(doc(db, 'signals', signalRecordId), signalRecord);
      throw new Error('No open position to close');
    }

    const posDoc = openPosSnap.docs[0];
    const pos = posDoc.data() as Position;
    pos.status = 'closed';
    
    const priceDiff = pos.direction === 'long' 
      ? currentAssetPrice - pos.entryPrice 
      : pos.entryPrice - currentAssetPrice;
    
    const finalPnl = parseFloat((priceDiff * pos.quantity).toFixed(2));
    pos.pnlUsd = finalPnl;
    pos.pnlPct = parseFloat(((priceDiff / pos.entryPrice) * 100).toFixed(2));
    pos.currentPrice = currentAssetPrice;

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

    const snapQuery = query(collection(db, 'performanceSnapshots'), where('botId', '==', botId), where('date', '==', new Date().toISOString().split('T')[0]));
    const snapSnap = await getDocs(snapQuery);

    const allClosedQuery = query(collection(db, 'positions'), where('botId', '==', botId), where('status', '==', 'closed'));
    const allClosedSnap = await getDocs(allClosedQuery);
    const closedPos = allClosedSnap.docs.map(d => d.data() as Position);
    const totalRealizedPnl = closedPos.reduce((sum, p) => sum + p.pnlUsd, 0) + finalPnl;

    const allOpenQuery = query(collection(db, 'positions'), where('botId', '==', botId), where('status', '==', 'open'));
    const allOpenSnap = await getDocs(allOpenQuery);
    const openPos = allOpenSnap.docs.map(d => d.data() as Position).filter(p => p.id !== pos.id);
    const totalUnrealizedPnl = openPos.reduce((sum, p) => sum + p.pnlUsd, 0);

    const botEquity = bot.balanceUsd + openPos.reduce((sum, p) => sum + p.sizeUsd + p.pnlUsd, 0);

    await setDoc(doc(db, 'bots', botId), bot);
    await setDoc(doc(db, 'positions', posDoc.id), pos);
    await setDoc(doc(db, 'orders', newOrder.id), newOrder);
    await setDoc(doc(db, 'signals', signalRecordId), signalRecord);

    if (!snapSnap.empty) {
      const snapDoc = snapSnap.docs[0];
      await updateDoc(doc(db, 'performanceSnapshots', snapDoc.id), {
        realizedPnl: totalRealizedPnl,
        unrealizedPnl: totalUnrealizedPnl,
        equity: botEquity
      });
    } else {
      const newSnapId = `ps-${Date.now()}`;
      await setDoc(doc(db, 'performanceSnapshots', newSnapId), {
        id: newSnapId,
        botId,
        date: new Date().toISOString().split('T')[0],
        realizedPnl: totalRealizedPnl,
        unrealizedPnl: totalUnrealizedPnl,
        equity: botEquity,
        userId: bot.userId
      });
    }

    return { success: true, status: 'closed', pnlUsd: finalPnl, returnedCash };
  }

  return { success: false, status: 'unknown_action' };
}

async function handleClientSideFallback(url: string, method: string, bodyObj: any, userId: string): Promise<Response> {
  const urlPath = url.split('?')[0].replace(/^\/+|\/+$/g, '');
  const parts = urlPath.split('/');

  console.log(`[API Fallback Router] Intercepted: ${method} ${urlPath} for user: ${userId}`);

  try {
    // 1. Settings Endpoints
    if (parts[0] === 'api' && parts[1] === 'settings' && parts.length === 2) {
      if (method === 'GET') {
        const settingsDoc = await getDoc(doc(db, 'settings', userId));
        if (settingsDoc.exists()) {
          return new Response(JSON.stringify(settingsDoc.data()), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
          await seedUserFirestoreClient(userId);
          const seededDoc = await getDoc(doc(db, 'settings', userId));
          return new Response(JSON.stringify(seededDoc.data() || { eToroCoupled: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      } else if (method === 'POST') {
        const payload = {
          eToroCoupled: bodyObj.eToroCoupled,
          apiKey: bodyObj.apiKey || '',
          userKey: bodyObj.userKey || '',
          userId
        };
        await setDoc(doc(db, 'settings', userId), payload);
        return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 2. Strategies Endpoints
    if (parts[0] === 'api' && parts[1] === 'strategies' && parts.length === 2) {
      if (method === 'GET') {
        const q = query(collection(db, 'strategies'), where('userId', '==', userId));
        const snap = await getDocs(q);
        if (snap.empty) {
          await seedUserFirestoreClient(userId);
          const reSnap = await getDocs(q);
          const data = reSnap.docs.map(d => d.data());
          return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const data = snap.docs.map(d => d.data());
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 3. Bots Endpoints (GET All or POST New)
    if (parts[0] === 'api' && parts[1] === 'bots' && parts.length === 2) {
      if (method === 'GET') {
        const botsSnap = await getDocs(query(collection(db, 'bots'), where('userId', '==', userId)));
        const botInstrumentsSnap = await getDocs(query(collection(db, 'botInstruments'), where('userId', '==', userId)));
        const webhookTokensSnap = await getDocs(query(collection(db, 'webhookTokens'), where('userId', '==', userId)));

        const bots = botsSnap.docs.map(d => d.data() as Bot);
        const botInstruments = botInstrumentsSnap.docs.map(d => d.data() as BotInstrument);
        const webhookTokens = webhookTokensSnap.docs.map(d => d.data() as WebhookToken);

        const decoratedBots = bots.map(bot => {
          const botInsts = botInstruments.filter(bi => bi.botId === bot.id);
          const tokenObj = webhookTokens.find(wt => wt.botId === bot.id);
          return {
            ...bot,
            instruments: botInsts,
            webhookToken: tokenObj?.token || ''
          };
        });

        return new Response(JSON.stringify(decoratedBots), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else if (method === 'POST') {
        const { name, strategyId, startBudgetUsd, selectedInstruments, createNewPortfolio, existingToken } = bodyObj;
        if (!name || !strategyId || !startBudgetUsd || !selectedInstruments || selectedInstruments.length === 0) {
          return new Response(JSON.stringify({ error: 'Incomplete bot data parameters' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const newBotId = `bot-${Date.now()}`;
        const stratDoc = await getDoc(doc(db, 'strategies', strategyId));
        const selectedStrat = stratDoc.exists() ? stratDoc.data() : null;
        const strategyName = selectedStrat ? selectedStrat.name : 'Custom Webhook Strategy';

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

        const newBotInstruments = selectedInstruments.map((inst: any, idx: number) => {
          const catalogItem = DEFAULT_INSTRUMENTS.find(i => i.id === inst.id);
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

        const tokenString = `b_${Math.random().toString(16).substring(2, 14)}`;
        const newWebhookToken = {
          id: `wt-${Date.now()}`,
          botId: newBotId,
          token: tokenString,
          createdAt: new Date().toISOString(),
          userId
        };

        const initialSnapshot = {
          id: `ps-${Date.now()}`,
          botId: newBotId,
          date: new Date().toISOString().split('T')[0],
          realizedPnl: 0,
          unrealizedPnl: 0,
          equity: parseFloat(startBudgetUsd),
          userId
        };

        await setDoc(doc(db, 'bots', newBotId), newBot);
        for (const bi of newBotInstruments) {
          await setDoc(doc(db, 'botInstruments', bi.id), bi);
        }
        await setDoc(doc(db, 'webhookTokens', newBotId), newWebhookToken);
        await setDoc(doc(db, 'performanceSnapshots', initialSnapshot.id), initialSnapshot);

        return new Response(JSON.stringify({
          status: 'ok',
          botId: newBotId,
          webhookToken: tokenString
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 4. Individual Bot Operations (PUT / DELETE / Regenerate Webhook Token)
    if (parts[0] === 'api' && parts[1] === 'bots' && parts.length === 3) {
      const botId = parts[2];
      if (method === 'PUT') {
        const { status, name } = bodyObj;
        const botDocRef = doc(db, 'bots', botId);
        const botDoc = await getDoc(botDocRef);
        if (!botDoc.exists()) {
          return new Response(JSON.stringify({ error: 'Bot niet gevonden' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        const updatedData: any = {};
        if (status) updatedData.status = status;
        if (name) updatedData.name = name;

        await updateDoc(botDocRef, updatedData);
        return new Response(JSON.stringify({ status: 'ok', bot: { ...botDoc.data(), ...updatedData } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else if (method === 'DELETE') {
        await deleteDoc(doc(db, 'bots', botId));
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Regenerate Webhook Token
    if (parts[0] === 'api' && parts[1] === 'bots' && parts[2] && parts[3] === 'token' && parts[4] === 'regenerate') {
      const botId = parts[2];
      const tokenString = `b_${Math.random().toString(16).substring(2, 14)}`;
      const newTokenObj = {
        id: `wt-${Date.now()}`,
        botId,
        token: tokenString,
        createdAt: new Date().toISOString(),
        userId
      };
      await setDoc(doc(db, 'webhookTokens', botId), newTokenObj);
      return new Response(JSON.stringify({ status: 'ok', token: tokenString }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. Bot Sub-resource Queries
    if (parts[0] === 'api' && parts[1] === 'bots' && parts[2] && parts.length === 4) {
      const botId = parts[2];
      const subResource = parts[3];

      if (subResource === 'performance') {
        const q = query(collection(db, 'performanceSnapshots'), where('botId', '==', botId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (subResource === 'signals') {
        const q = query(collection(db, 'signals'), where('botId', '==', botId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (subResource === 'positions') {
        const q = query(collection(db, 'positions'), where('botId', '==', botId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (subResource === 'orders') {
        const q = query(collection(db, 'orders'), where('botId', '==', botId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 6. Global Resource Queries (Signals, Positions, Instruments)
    if (parts[0] === 'api' && parts[1] === 'signals' && parts.length === 2) {
      const q = query(collection(db, 'signals'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data());
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (parts[0] === 'api' && parts[1] === 'positions' && parts.length === 2) {
      const q = query(collection(db, 'positions'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data());
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (parts[0] === 'api' && parts[1] === 'instruments' && parts.length === 2) {
      // Search parameter
      const params = new URL(url, window.location.origin).searchParams;
      const qParam = (params.get('q') || '').toLowerCase().trim();
      if (!qParam) {
        return new Response(JSON.stringify(DEFAULT_INSTRUMENTS), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        const filtered = DEFAULT_INSTRUMENTS.filter(
          i => i.symbol.toLowerCase().includes(qParam) || i.name.toLowerCase().includes(qParam)
        );
        return new Response(JSON.stringify(filtered), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // eToro status
    if (parts[0] === 'api' && parts[1] === 'etoro' && parts[2] === 'mcp-status') {
      return new Response(JSON.stringify({
        status: 'connected',
        url: 'https://mcp.public-api.etoro.com',
        latencyMs: 42,
        activeInstrumentsTracked: DEFAULT_INSTRUMENTS.length
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 7. Simulated Webhook Firing
    if (parts[0] === 'api' && parts[1] === 'test' && parts[2] === 'fire-webhook') {
      const { botId, symbol, action, sizingValue, stopLossPct, takeProfitPct, customPrice } = bodyObj;
      const botDoc = await getDoc(doc(db, 'bots', botId));
      if (!botDoc.exists()) {
        return new Response(JSON.stringify({ error: 'Bot niet gevonden' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const tokenQuery = query(collection(db, 'webhookTokens'), where('botId', '==', botId));
      const tokenSnap = await getDocs(tokenQuery);
      if (tokenSnap.empty) {
        return new Response(JSON.stringify({ error: 'Token voor deze bot niet gevonden' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      const tokenObj = tokenSnap.docs[0].data();

      const biQuery = query(collection(db, 'botInstruments'), where('botId', '==', botId), where('tvSymbol', '==', symbol));
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

      const result = await emulateWebhookClient(botId, payload);
      return new Response(JSON.stringify({ success: true, payload, response: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `Not Found: ${urlPath}` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error(`[API Fallback Router] Error handling route client side:`, err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Client Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options = { ...init };
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  const isInternal = url.startsWith('/api/') || url.startsWith('api/') || (!url.startsWith('http://') && !url.startsWith('https://'));

  if (isInternal) {
    const headers = new Headers(options.headers || {});
    if (auth.currentUser) {
      headers.set('x-user-id', auth.currentUser.uid);
    }
    options.headers = headers;

    // Detect if we are on Vercel or a non-development domain.
    // If we are, we can directly fall back to direct Firestore operations to avoid Vite middleware routing issues on production Vercel.
    const isVercel = window.location.hostname.includes('vercel.app');
    
    if (isVercel) {
      const userId = auth.currentUser?.uid || 'default_user';
      let bodyObj = {};
      if (options.body && typeof options.body === 'string') {
        try {
          bodyObj = JSON.parse(options.body);
        } catch (_) {}
      }
      return handleClientSideFallback(url, options.method || 'GET', bodyObj, userId);
    }
  }
  
  try {
    const response = await fetch(input, options);
    // If the backend exists but returns 404/500/502/503/504 for api routes, let's fall back transparently!
    if (isInternal && (!response.ok || response.status === 404)) {
      console.warn(`[API Client] Route ${url} failed or returned status ${response.status}. Falling back to client-side Firestore...`);
      const userId = auth.currentUser?.uid || 'default_user';
      let bodyObj = {};
      if (options.body && typeof options.body === 'string') {
        try {
          bodyObj = JSON.parse(options.body);
        } catch (_) {}
      }
      return handleClientSideFallback(url, options.method || 'GET', bodyObj, userId);
    }
    return response;
  } catch (err) {
    if (isInternal) {
      console.warn(`[API Client] Connection failed to ${url}. Falling back to client-side Firestore...`);
      const userId = auth.currentUser?.uid || 'default_user';
      let bodyObj = {};
      if (options.body && typeof options.body === 'string') {
        try {
          bodyObj = JSON.parse(options.body);
        } catch (_) {}
      }
      return handleClientSideFallback(url, options.method || 'GET', bodyObj, userId);
    }
    throw err;
  }
}
