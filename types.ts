
export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
}

export interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  min: number;
  max: number;
  mean: number;
  median: number;
}

export interface PortfolioHolding {
  securityType: string;
  ticker: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
}

export interface Account {
  id: string;
  name: string;
  type: 'Stocks' | 'ETF' | 'Bonds' | 'Mutual Funds' | 'General Investment';
  accountNumber: string;
  balance: number;
}

export interface AccountHistoryEntry {
  id: string;
  accountId: string;
  accountName: string;
  type: 'Account Created' | 'Funds Added' | 'Funds Withdrawn' | 'Balance Transfer' | 'Buy Security' | 'Sell Security' | 'Dividend Earned' | 'Rebalance';
  description: string;
  amount: number;
  timestamp: Date;
  details?: string;
  securityType?: 'Stocks' | 'ETF' | 'Bonds' | 'Mutual Funds' | 'General Investment'; // New: type of security if transaction is security-related
  ticker?: string; // New: ticker if transaction is security-related
  status?: 'Completed' | 'Pending' | 'Failed'; // New: transaction status
}

export interface BondData {
  symbol: string;
  name: string;
  coupon: string;
  maturityDate: string;
  yield: string;
  lastPrice: number;
  // Extended fields for Corporate Bonds
  yieldOverRate?: string;
  inflationRate?: string;
  issuedDate?: string;
  vettedDate?: string;
  term?: 'Short Term' | 'Medium Term' | 'Long Term';
  investmentGrade?: 'Investment Grade' | 'Non-investment Grade';
  couponDiscount?: number;
}
