export interface User {
  id: string;
  email: string;
  eToroCoupled: boolean;
  apiKey?: string;
  userKey?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  createdAt: string;
}


export type BotStatus = 'active' | 'paused' | 'stopped';

export interface Bot {
  id: string;
  name: string;
  status: BotStatus;
  strategyId: string;
  strategyName: string;
  agentPortfolioId: string; // eToro Agent Portfolio ID
  scopedUserToken: string; // Scoped eToro API token
  startBudgetUsd: number;
  balanceUsd: number; // Current cash balance in USD
  createdAt: string;
}

export interface BotInstrument {
  id: string;
  botId: string;
  etoroInstrumentId: number;
  tvSymbol: string;
  tvExchange?: string;
  weightPct: number; // e.g. 50%
  capPct?: number;   // e.g. 30% max position cap
  currentPrice: number;
}

export type StrategyType = 'webhook' | 'rule';

export interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  parameters: {
    direction: 'long' | 'short' | 'both';
    sizingMode: 'fixed_amount' | 'percent_of_bot_allocation' | 'units';
    sizingValue: number;
    maxPositions: number;
    stopLossPct?: number;
    takeProfitPct?: number;
    cooldownMinutes?: number;
  };
  version: string;
}

export type SignalStatus = 'received' | 'validated' | 'order_placed' | 'filled' | 'rejected' | 'expired' | 'duplicate';

export interface Signal {
  id: string;
  botId: string;
  botInstrumentId: string;
  tvSymbol: string;
  externalSignalId: string; // signal_id from TV payload
  action: 'open_long' | 'open_short' | 'close' | 'close_partial' | 'modify_risk';
  receivedPayload: any;
  timestamp: string;
  status: SignalStatus;
  errorMessage?: string;
}

export interface Order {
  id: string;
  botId: string;
  botInstrumentId: string;
  signalId?: string;
  brokerOrderId: string;
  type: 'market' | 'limit';
  action: 'buy' | 'sell';
  status: 'pending' | 'filled' | 'rejected' | 'cancelled';
  price: number;
  quantity: number;
  timestamp: string;
}

export interface Position {
  id: string;
  botId: string;
  botInstrumentId: string;
  tvSymbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  sizeUsd: number;
  quantity: number;
  openTimestamp: string;
  status: 'open' | 'closed';
  pnlUsd: number;
  pnlPct: number;
}

export interface PerformanceSnapshot {
  id: string;
  botId: string;
  botInstrumentId?: string | null;
  date: string; // YYYY-MM-DD
  realizedPnl: number;
  unrealizedPnl: number;
  equity: number;
}

export interface WebhookToken {
  id: string;
  botId: string;
  token: string;
  createdAt: string;
  lastUsedAt?: string;
}

// Available instruments for search
export interface EToroInstrument {
  id: number;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'forex';
  price: number;
}
