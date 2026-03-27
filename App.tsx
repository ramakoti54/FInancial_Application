import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, MessageSender, CandlestickData, PortfolioHolding, Account, AccountHistoryEntry, BondData } from './types';
import ChatMessageComponent from './components/ChatMessage';
import { generateFinancialAdvice, generateHistoricalChartData, generatePortfolioHoldings } from './services/geminiService';

// Mock list of ETFs simulating Yahoo Finance data
const yahooFinanceEtfs = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
  { symbol: 'IVV', name: 'iShares Core S&P 500 ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF' },
  { symbol: 'IEFA', name: 'iShares Core MSCI EAFE ETF' },
  { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF' },
  { symbol: 'IEMG', name: 'iShares Core MSCI Emerging Markets ETF' },
  { symbol: 'IJH', name: 'iShares Core S&P Mid-Cap ETF' },
  { symbol: 'IJR', name: 'iShares Core S&P Small-Cap ETF' },
  { symbol: 'GLD', name: 'SPDR Gold Shares' },
];

const tickerOptions = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA'];
const allTradableTickers = [...tickerOptions, ...yahooFinanceEtfs.map(e => e.symbol)];

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('Portfolio'); // Default to Portfolio tab
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [selectedTradingOption, setSelectedTradingOption] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>(''); // New state for amount

  // New states for historical performance chart
  const [showHistoricalPerformanceChart, setShowHistoricalPerformanceChart] = useState<boolean>(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('24hrs'); // Default to 24hrs
  const [historicalChartData, setHistoricalChartData] = useState<CandlestickData[] | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setErrorChart] = useState<string | null>(null);

  // New states for Buy/Sell modal
  const [showBuySellModal, setShowBuySellModal] = useState<boolean>(false);
  const [modalActionType, setModalActionType] = useState<'buy' | 'sell' | null>(null);
  const [simulatedMarketPrice, setSimulatedMarketPrice] = useState<number | null>(null);
  const [simulatedDailyRange, setSimulatedDailyRange] = useState<string | null>(null);

  // New states for Buy options in modal
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'market_price' | 'limit_price' | 'next_day_market'>('market_price');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [limitPriceError, setLimitPriceError] = useState<string | null>(null);

  // New states for Portfolio Holdings
  const [showPortfolioHoldings, setShowPortfolioHoldings] = useState<boolean>(false);
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[] | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState<boolean>(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [maxSellAmount, setMaxSellAmount] = useState<number | null>(null); // New state for max sell amount

  // New states for Transfer functionality
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [fromTicker, setFromTicker] = useState<string>('');
  const [toTicker, setToTicker] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [maxTransferAmount, setMaxTransferAmount] = useState<number | null>(null);
  const [fromTickerHoldingValue, setFromTickerHoldingValue] = useState<number | null>(null);
  const [toTickerCurrentPrice, setToTickerCurrentPrice] = useState<number | null>(null);

  // New states for Accounts tab
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [nextAccountId, setNextAccountId] = useState<number>(1); // For generating unique IDs
  const [showCreateAccountModal, setShowCreateAccountModal] = useState<boolean>(false);
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [newAccountType, setNewAccountType] = useState<'Stocks' | 'ETF' | 'Bonds' | 'Mutual Funds' | 'General Investment'>('General Investment');
  const [newInitialBalance, setNewInitialBalance] = useState<string>('');
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  const [showTransactionalAccountsOverviewModal, setShowTransactionalAccountsOverviewModal] = useState<boolean>(false);

  const [showAddFundsModal, setShowAddFundsModal] = useState<boolean>(false);
  const [selectedAccountForFunds, setSelectedAccountForFunds] = useState<string>('');
  const [addFundsAmount, setAddFundsAmount] = useState<string>('');
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<string>('Paypal');

  const [showWithdrawalModal, setShowWithdrawalModal] = useState<boolean>(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [withdrawalFromAccount, setWithdrawalFromAccount] = useState<string>('');
  const [withdrawalToAccount, setWithdrawalToAccount] = useState<string>(''); // For external or other internal account
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  const [accountHistory, setAccountHistory] = useState<AccountHistoryEntry[]>([]);
  const [selectedHistoryFilter, setSelectedHistoryFilter] = useState<string>('all');
  const [accountNotifications, setAccountNotifications] = useState<string[]>([]);
  
  // New state for Authorization tab
  const [selectedAuthMechanism, setSelectedAuthMechanism] = useState<string>('OAuth 2.0'); // Default auth mechanism

  // New states for Transactions tab
  const [transactionFilterTerm, setTransactionFilterTerm] = useState<string>('');
  const [transactionStartDate, setTransactionStartDate] = useState<string>(new Date(Date.now() - 86400000 * 30 * 3).toISOString().split('T')[0]); // Default to 3 months ago
  const [transactionEndDate, setTransactionEndDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [transactionDateRangeError, setTransactionDateRangeError] = useState<string | null>(null);
  const [selectedDividendSecurityType, setSelectedDividendSecurityType] = useState<string>('All');
  const [totalDividendsPast3Years, setTotalDividendsPast3Years] = useState<number>(0);
  const [totalProfitLossSelectedType, setTotalProfitLossSelectedType] = useState<number>(0);
  const [showDownloadSuccessNotification, setShowDownloadSuccessNotification] = useState<boolean>(false);

  // New states for Bonds functionality
  const [showBondMarketOverview, setShowBondMarketOverview] = useState<boolean>(false);
  const [showYahooFinanceBonds, setShowYahooFinanceBonds] = useState<boolean>(false);
  const [selectedBondType, setSelectedBondType] = useState<string | null>(null); 
  const [yahooBondsData, setYahooBondsData] = useState<BondData[] | null>(null);
  const [yahooBondsLoading, setYahooBondsLoading] = useState<boolean>(false);
  const [yahooBondsError, setYahooBondsError] = useState<string | null>(null);
  
  // Corporate Bond Specific States
  const [inflationRange, setInflationRange] = useState<string>('5Y');
  const [selectedCorporateBond, setSelectedCorporateBond] = useState<string>('');
  const [bondPurchasePrice, setBondPurchasePrice] = useState<string>('');
  const [isZeroDiscount, setIsZeroDiscount] = useState<boolean>(false);

  // Municipal Bond Specific States
  const [selectedMunicipalType, setSelectedMunicipalType] = useState<'General Obligation' | 'Revenue'>('General Obligation');
  const [selectedMunicipalBond, setSelectedMunicipalBond] = useState<string>('');

  // New states for ETF functionality
  const [selectedEtf, setSelectedEtf] = useState<string>('');

  const navigationTabs = ['Portfolio', 'Accounts', 'Transactions', 'Authorization', 'Documents', 'Contact'];

  // Derived variable for the active symbol (Ticker, ETF, or Bond)
  const activeSymbol = selectedTradingOption === 'ETF' 
    ? selectedEtf 
    : selectedTradingOption === 'Bonds'
        ? (selectedBondType === 'Corporate' ? selectedCorporateBond : selectedBondType === 'Municipal' ? selectedMunicipalBond : '')
        : selectedTicker;
  
  const isAmountValid = useCallback((value: string) => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  }, []);

  // Helper to find a portfolio holding by ticker
  const getHoldingForTicker = useCallback((ticker: string): PortfolioHolding | undefined => {
    return portfolioHoldings?.find(holding => holding.ticker === ticker);
  }, [portfolioHoldings]); 

  // Determine security type from ticker
  const getSecurityType = useCallback((ticker: string) => {
    if (yahooFinanceEtfs.some(e => e.symbol === ticker)) return 'ETF';
    // Simplified logic for bonds
    if (ticker.startsWith('CB-') || ticker.startsWith('MB-')) return 'Bonds';
    return 'Stocks';
  }, []);

  const fetchPortfolioHoldings = useCallback(async () => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    setPortfolioHoldings(null);
    try {
      const data = await generatePortfolioHoldings();
      setPortfolioHoldings(data);
      // Automatically show portfolio holdings after fetching
      setShowPortfolioHoldings(true);
    } catch (err) {
      console.error("Error fetching portfolio holdings:", err);
      setPortfolioError(`Failed to load portfolio holdings. Please try again. (${err instanceof Error ? err.message : String(err)})`);
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  const processAndDisplayMessage = useCallback(async (userPrompt: string, clearInput: boolean = true) => {
    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: MessageSender.USER,
      text: userPrompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    if (clearInput) {
      setInput('');
    }

    try {
      // Prepare chat history for Gemini API
      const chatHistory = messages.map(msg => ({
        role: msg.sender === MessageSender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const botResponseText = await generateFinancialAdvice({
        prompt: userPrompt,
        history: chatHistory,
      });

      const botMessage: ChatMessage = {
        id: Date.now().toString() + '-bot',
        sender: MessageSender.BOT,
        text: botResponseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Error sending message to Gemini:", err);
      setError(`Failed to get a response. Please try again: ${err instanceof Error ? err.message : String(err)}`);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        sender: MessageSender.BOT,
        text: "Oops! I encountered an issue. Please try rephrasing or sending a new message.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]); 

  // Mock function to simulate fetching Yahoo Finance bond data
  const fetchYahooBondsData = useCallback(async (bondType: string, subType?: string) => {
    setYahooBondsLoading(true);
    setYahooBondsError(null);
    setYahooBondsData(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call delay
      let data: BondData[] = [];
      switch (bondType) {
        case 'Corporate':
          data = [
            { 
                symbol: 'CB-A', 
                name: 'Corp Bond A', 
                coupon: '3.5%', 
                maturityDate: '2028-01-15', 
                yield: '3.4%', 
                lastPrice: 101.25,
                yieldOverRate: '3.8%',
                inflationRate: '2.5%',
                issuedDate: '2018-01-15',
                vettedDate: '2017-12-01',
                term: 'Medium Term',
                investmentGrade: 'Investment Grade',
                couponDiscount: 5.00
            },
            { 
                symbol: 'CB-B', 
                name: 'Corp Bond B', 
                coupon: '4.2%', 
                maturityDate: '2036-07-01', 
                yield: '4.1%', 
                lastPrice: 99.50,
                yieldOverRate: '4.5%',
                inflationRate: '2.8%',
                issuedDate: '2024-07-01',
                vettedDate: '2024-06-15',
                term: 'Long Term',
                investmentGrade: 'Investment Grade',
                couponDiscount: 2.50
            },
            { 
                symbol: 'CB-JNK', 
                name: 'XYZ High Yield', 
                coupon: '6.8%', 
                maturityDate: '2025-03-20', 
                yield: '7.1%', 
                lastPrice: 92.75,
                yieldOverRate: '7.5%',
                inflationRate: '3.1%',
                issuedDate: '2020-03-20',
                vettedDate: '2020-02-28',
                term: 'Short Term',
                investmentGrade: 'Non-investment Grade',
                couponDiscount: 10.00
            },
          ];
          break;
        case 'Municipal':
            if (subType === 'General Obligation') {
                data = [
                    { symbol: 'MB-GO-NY', name: 'NY State GO Bond 2026', coupon: '3.0%', maturityDate: '2026-06-01', yield: '2.8%', lastPrice: 100.50, issuedDate: '2016-06-01', investmentGrade: 'Investment Grade', term: 'Medium Term' },
                    { symbol: 'MB-GO-CA', name: 'CA State GO Bond 2030', coupon: '3.25%', maturityDate: '2030-08-15', yield: '3.1%', lastPrice: 101.10, issuedDate: '2020-08-15', investmentGrade: 'Investment Grade', term: 'Long Term' },
                    { symbol: 'MB-GO-TX', name: 'Texas GO Bond 2025', coupon: '2.5%', maturityDate: '2025-12-01', yield: '2.4%', lastPrice: 99.90, issuedDate: '2015-12-01', investmentGrade: 'Investment Grade', term: 'Short Term' },
                ];
            } else { // Revenue
                data = [
                    { symbol: 'MB-REV-NYC', name: 'NYC Transit Revenue', coupon: '4.0%', maturityDate: '2035-01-01', yield: '4.2%', lastPrice: 98.25, issuedDate: '2015-01-01', investmentGrade: 'Investment Grade', term: 'Long Term' },
                    { symbol: 'MB-REV-SFO', name: 'SF Airport Revenue', coupon: '3.75%', maturityDate: '2029-05-01', yield: '3.6%', lastPrice: 100.80, issuedDate: '2019-05-01', investmentGrade: 'Investment Grade', term: 'Medium Term' },
                    { symbol: 'MB-REV-CHI', name: 'Chicago Water Rev', coupon: '3.5%', maturityDate: '2027-10-15', yield: '3.55%', lastPrice: 99.50, issuedDate: '2017-10-15', investmentGrade: 'Non-investment Grade', term: 'Medium Term' },
                ];
            }
            break;
        case 'Mutual':
          data = [
            { symbol: 'MFND1', name: 'Global Bond Fund', coupon: 'N/A', maturityDate: 'N/A', yield: '1.8%', lastPrice: 15.30 },
            { symbol: 'MFND2', name: 'High Yield Fund', coupon: 'N/A', maturityDate: 'N/A', yield: '5.1%', lastPrice: 12.80 },
          ];
          break;
        case 'Treasury':
          data = [
            { symbol: 'TRES1', name: 'US Treasury 10Y', coupon: '2.5%', maturityDate: '2034-05-15', yield: '2.45%', lastPrice: 98.70 },
            { symbol: 'TRES2', name: 'US Treasury 2Y', coupon: '1.8%', maturityDate: '2026-02-01', yield: '1.75%', lastPrice: 100.10 },
          ];
          break;
        case 'Government':
          data = [
            { symbol: 'GOVT1', name: 'Canada Bond 5Y', coupon: '2.0%', maturityDate: '2029-09-01', yield: '1.95%', lastPrice: 100.50 },
            { symbol: 'GOVT2', name: 'Germany Bond 7Y', coupon: '1.5%', maturityDate: '2031-11-20', yield: '1.48%', lastPrice: 99.90 },
          ];
          break;
        default:
          data = [];
      }
      setYahooBondsData(data);
      if (bondType !== 'Municipal') {
          processAndDisplayMessage(`You are currently viewing available ${bondType} Bonds from Yahoo Finance.`, false);
      }
    } catch (err) {
      console.error("Error fetching Yahoo Bonds data:", err);
      setYahooBondsError(`Failed to load ${bondType} bond data. Please try again. (${err instanceof Error ? err.message : String(err)})`);
    } finally {
      setYahooBondsLoading(false);
    }
  }, [processAndDisplayMessage]);


  const sendMessage = useCallback(() => {
    if (input.trim() === '') return;
    processAndDisplayMessage(input); // Use the new helper
  }, [input, processAndDisplayMessage]);

  const fetchHistoricalData = useCallback(async (ticker: string, timeRange: string) => {
    setChartLoading(true);
    setErrorChart(null);
    setHistoricalChartData(null);
    try {
      const data = await generateHistoricalChartData(ticker, timeRange);
      setHistoricalChartData(data);
    } catch (err) {
      console.error("Error fetching historical chart data:", err);
      setErrorChart(`Failed to load historical data for ${ticker} (${timeRange}). Please try again.`);
    } finally {
      setChartLoading(false);
    }
  }, []);

  const openBuySellModal = useCallback((action: 'buy' | 'sell') => {
    const symbol = activeSymbol;
    const typeLabel = selectedTradingOption === 'ETF' ? 'ETF' : 'ticker';

    if (!symbol) {
      alert(`Please select a ${typeLabel} first.`);
      return;
    }

    setModalActionType(action);
    setSelectedPurchaseType('market_price');
    setLimitPrice('');
    setLimitPriceError(null);
    setSimulatedMarketPrice(null); 
    setSimulatedDailyRange(null); 
    setMaxSellAmount(null); 

    if (action === 'sell') {
      const holding = getHoldingForTicker(symbol);
      if (holding) {
        setAmount(holding.marketValue.toFixed(2));
        setMaxSellAmount(holding.marketValue);
      } else {
        alert(`You do not own any ${symbol} to sell.`);
        return; 
      }
    } else { // action === 'buy'
      if (!isAmountValid(amount)) { 
        alert("Please enter a valid amount to buy.");
        return;
      }
    }

    if (historicalChartData && historicalChartData.length > 0) {
      const lastData = historicalChartData[historicalChartData.length - 1];
      setSimulatedMarketPrice(lastData.close);
      setSimulatedDailyRange(`${lastData.low.toFixed(2)} - ${lastData.high.toFixed(2)}`);
    } else {
      const randomPrice = (Math.random() * 100 + 100).toFixed(2); 
      setSimulatedMarketPrice(parseFloat(randomPrice));
      const low = (parseFloat(randomPrice) * 0.98).toFixed(2);
      const high = (parseFloat(randomPrice) * 1.02).toFixed(2);
      setSimulatedDailyRange(`${low} - ${high}`);
    }
    setShowBuySellModal(true);
  }, [activeSymbol, selectedTradingOption, amount, historicalChartData, getHoldingForTicker, isAmountValid]);


  const confirmBuySell = useCallback(() => {
    const symbol = activeSymbol;
    if (!symbol || !isAmountValid(amount) || !modalActionType) return;
    if (modalActionType === 'buy' && selectedPurchaseType === 'limit_price' && (!!limitPriceError || !isAmountValid(limitPrice))) {
      return; 
    }

    const price = simulatedMarketPrice || 100;
    const transactionAmount = parseFloat(amount);
    const quantity = transactionAmount / price;
    
    // Update Portfolio Holdings State
    setPortfolioHoldings(prev => {
        const currentHoldings = prev || [];
        const existingIndex = currentHoldings.findIndex(h => h.ticker === symbol);
        
        if (modalActionType === 'buy') {
            if (existingIndex >= 0) {
                const updated = [...currentHoldings];
                const old = updated[existingIndex];
                const newShares = old.shares + quantity;
                const totalCost = (old.shares * old.avgCost) + (quantity * price);
                updated[existingIndex] = {
                    ...old,
                    shares: newShares,
                    avgCost: totalCost / newShares,
                    currentPrice: price,
                    marketValue: newShares * price,
                    gainLoss: (price - (totalCost / newShares)) * newShares
                };
                return updated;
            } else {
                return [...currentHoldings, {
                    securityType: selectedTradingOption === 'ETF' ? 'ETF' : 'Stocks',
                    ticker: symbol,
                    shares: quantity,
                    avgCost: price,
                    currentPrice: price,
                    marketValue: transactionAmount,
                    gainLoss: 0
                }];
            }
        } else if (modalActionType === 'sell') {
            if (existingIndex >= 0) {
                const updated = [...currentHoldings];
                const old = updated[existingIndex];
                const newShares = Math.max(0, old.shares - quantity);
                
                if (newShares <= 0.001) {
                    return updated.filter((_, i) => i !== existingIndex);
                } else {
                    updated[existingIndex] = {
                        ...old,
                        shares: newShares,
                        marketValue: newShares * price,
                        gainLoss: (price - old.avgCost) * newShares
                    };
                    return updated;
                }
            }
            return currentHoldings;
        }
        return currentHoldings;
    });

    let userPrompt = '';
    const marketInfo = `Considering the current market price of $${simulatedMarketPrice?.toFixed(2) || 'N/A'} and estimated daily range of ${simulatedDailyRange || 'N/A'}`;

    if (modalActionType === 'buy') {
      userPrompt = `I want to buy $${amount} worth of ${symbol}. ${marketInfo}, `;
      if (selectedPurchaseType === 'market_price') {
        userPrompt += `at the current market price. Please guide me through the purchase process, including advice on next day buying opportunities and considerations for post business hours purchase.`;
      } else if (selectedPurchaseType === 'limit_price') {
        userPrompt += `with a limit order at $${parseFloat(limitPrice).toFixed(2)}. Please guide me on this strategy, including advice on next day buying opportunities and considerations for post business hours purchase.`;
      } else if (selectedPurchaseType === 'next_day_market') {
        userPrompt += `on the next business day at market price. Please advise on this approach, including optimal timing and any potential risks.`;
      }
      setAccountHistory((prev) => [
        ...prev,
        {
          id: `hist-${Date.now()}-buy-${symbol}`,
          accountId: userAccounts[0]?.id || 'N/A', 
          accountName: userAccounts[0]?.name || 'N/A',
          type: 'Buy Security',
          description: `Bought ${amount} of ${symbol} at ${selectedPurchaseType === 'limit_price' ? `limit $${parseFloat(limitPrice).toFixed(2)}` : 'market price'}.`,
          amount: parseFloat(amount),
          timestamp: new Date(),
          securityType: selectedTradingOption === 'ETF' ? 'ETF' : 'Stocks', 
          ticker: symbol,
          status: 'Completed',
        },
      ]);
    } else if (modalActionType === 'sell') {
      userPrompt = `I want to sell $${amount} worth of ${symbol}. ${marketInfo}, please guide me through the selling process, including advice on optimal selling times and potential tax implications.`;
      setAccountHistory((prev) => [
        ...prev,
        {
          id: `hist-${Date.now()}-sell-${symbol}`,
          accountId: userAccounts[0]?.id || 'N/A',
          accountName: userAccounts[0]?.name || 'N/A',
          type: 'Sell Security',
          description: `Sold ${amount} of ${symbol} at market price.`,
          amount: -parseFloat(amount), 
          timestamp: new Date(),
          securityType: selectedTradingOption === 'ETF' ? 'ETF' : 'Stocks',
          ticker: symbol,
          status: 'Completed',
        },
      ]);
    }

    processAndDisplayMessage(userPrompt, false);
    setShowBuySellModal(false);
    setModalActionType(null);
    setActiveTab('Chat');
  }, [activeSymbol, selectedTradingOption, amount, modalActionType, simulatedMarketPrice, simulatedDailyRange, selectedPurchaseType, limitPrice, limitPriceError, processAndDisplayMessage, isAmountValid, userAccounts]);

  const handleShowHistoricalPerformanceClick = useCallback(() => {
    const symbol = activeSymbol;
    if (!symbol) return;
    
    setShowHistoricalPerformanceChart(true);
    setShowPortfolioHoldings(false); 
    setShowBondMarketOverview(false); 
    setShowYahooFinanceBonds(false); 
    
    fetchHistoricalData(symbol, selectedTimeRange);
  }, [activeSymbol, selectedTimeRange, fetchHistoricalData]);

  const handleTimeRangeChange = useCallback((range: string) => {
    setSelectedTimeRange(range);
    const symbol = activeSymbol;
    if (symbol) {
      fetchHistoricalData(symbol, range);
    }
  }, [activeSymbol, fetchHistoricalData]);

  const handleShowPortfolioHoldingsClick = useCallback(() => {
    setShowPortfolioHoldings(true);
    setShowHistoricalPerformanceChart(false); 
    setShowBondMarketOverview(false); 
    setShowYahooFinanceBonds(false); 
    if (!portfolioHoldings) { 
      fetchPortfolioHoldings();
    }
  }, [fetchPortfolioHoldings, portfolioHoldings]);

  const handleTransferClick = useCallback(() => {
    const symbol = activeSymbol;
    const typeLabel = selectedTradingOption === 'ETF' ? 'ETF' : 'ticker';

    if (!symbol) {
      alert(`Please select a ${typeLabel} first.`);
      return;
    }
    setShowTransferModal(true);
    setFromTicker(''); 
    setToTicker('');   
    setTransferAmount(''); 
    setMaxTransferAmount(null); 
    setFromTickerHoldingValue(null); 
    setToTickerCurrentPrice(null); 
  }, [activeSymbol, selectedTradingOption]);

  const handleFromTickerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFromTicker = e.target.value;
    setFromTicker(newFromTicker);
    const holding = getHoldingForTicker(newFromTicker);
    if (holding) {
      setFromTickerHoldingValue(holding.marketValue);
      setMaxTransferAmount(holding.marketValue);
    } else {
      setFromTickerHoldingValue(null);
      setMaxTransferAmount(null);
    }
    setTransferAmount(''); 
  }, [getHoldingForTicker]);

  const handleToTickerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newToTicker = e.target.value;
    setToTicker(newToTicker);
    if (newToTicker) {
      setToTickerCurrentPrice(parseFloat((Math.random() * 200 + 50).toFixed(2))); 
    } else {
      setToTickerCurrentPrice(null);
    }
  }, []);

  const handleTransferAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setTransferAmount(value);
    }
  }, []);

  const confirmTransfer = useCallback(() => {
    if (!fromTicker || !toTicker || fromTicker === toTicker || !isAmountValid(transferAmount)) {
      alert("Please select valid 'From' and 'To' tickers, ensure they are different, and enter a valid amount.");
      return;
    }

    const holding = getHoldingForTicker(fromTicker);
    const transAmt = parseFloat(transferAmount);

    if (!holding || transAmt > holding.marketValue) {
      alert(`You do not have $${transferAmount} worth of ${fromTicker} available to transfer. Your maximum is $${holding?.marketValue.toFixed(2) || '0.00'}.`);
      return;
    }
    
    // Update Portfolio Holdings for Transfer
    setPortfolioHoldings(prev => {
        const currentHoldings = prev || [];
        const fromIndex = currentHoldings.findIndex(h => h.ticker === fromTicker);
        const toIndex = currentHoldings.findIndex(h => h.ticker === toTicker);
        
        let updated = [...currentHoldings];
        
        // 1. Reduce From
        if (fromIndex >= 0) {
            const oldFrom = updated[fromIndex];
            const sharesToSell = transAmt / oldFrom.currentPrice;
            const newFromShares = Math.max(0, oldFrom.shares - sharesToSell);
            
            if (newFromShares <= 0.001) {
                 updated = updated.filter((_, i) => i !== fromIndex);
            } else {
                updated[fromIndex] = {
                    ...oldFrom,
                    shares: newFromShares,
                    marketValue: newFromShares * oldFrom.currentPrice,
                    gainLoss: (oldFrom.currentPrice - oldFrom.avgCost) * newFromShares
                };
            }
        }
        
        // 2. Add To
        const toPrice = toTickerCurrentPrice || 100; // Fallback
        const sharesToBuy = transAmt / toPrice;
        
        const newToIndex = updated.findIndex(h => h.ticker === toTicker);
        
        if (newToIndex >= 0) {
            const oldTo = updated[newToIndex];
            const newToShares = oldTo.shares + sharesToBuy;
            const totalCost = (oldTo.shares * oldTo.avgCost) + (sharesToBuy * toPrice);
            updated[newToIndex] = {
                ...oldTo,
                shares: newToShares,
                avgCost: totalCost / newToShares,
                currentPrice: toPrice,
                marketValue: newToShares * toPrice,
                gainLoss: (toPrice - (totalCost / newToShares)) * newToShares
            };
        } else {
            updated.push({
                securityType: getSecurityType(toTicker),
                ticker: toTicker,
                shares: sharesToBuy,
                avgCost: toPrice,
                currentPrice: toPrice,
                marketValue: transAmt,
                gainLoss: 0
            });
        }
        
        return updated;
    });

    const userPrompt = `I want to transfer $${transferAmount} worth of funds from my holdings in ${fromTicker} to ${toTicker}. Please advise on the process, tax implications, and potential market impacts of this investment reallocation.`;
    processAndDisplayMessage(userPrompt, false);
    setShowTransferModal(false);
    setActiveTab('Chat');
  }, [fromTicker, toTicker, transferAmount, getHoldingForTicker, isAmountValid, processAndDisplayMessage, toTickerCurrentPrice, getSecurityType]);

  const handleCreateAccount = useCallback(() => {
    setCreateAccountError(null);
    if (!newAccountName.trim()) {
      setCreateAccountError("Account Name cannot be empty.");
      return;
    }
    const initialBalanceNum = parseFloat(newInitialBalance);
    if (isNaN(initialBalanceNum) || initialBalanceNum < 0) {
      setCreateAccountError("Initial Balance must be a non-negative number.");
      return;
    }

    const newAcc: Account = {
      id: `acc-${nextAccountId}`,
      name: newAccountName,
      type: newAccountType,
      accountNumber: Math.floor(100000000 + Math.random() * 900000000).toString(), 
      balance: initialBalanceNum,
    };

    setUserAccounts((prev) => [...prev, newAcc]);
    setNextAccountId((prev) => prev + 1);

    setAccountHistory((prev) => [
      ...prev,
      {
        id: `hist-${Date.now()}`,
        accountId: newAcc.id,
        accountName: newAcc.name,
        type: 'Account Created',
        description: `Created new ${newAcc.type} account: ${newAcc.name}`,
        amount: initialBalanceNum,
        timestamp: new Date(),
        status: 'Completed',
        securityType: newAcc.type,
      },
    ]);

    processAndDisplayMessage(`I just created a new ${newAcc.type} investment account named "${newAcc.name}" with an initial balance of $${newAcc.balance.toFixed(2)}. What financial advice do you have for managing this new account?`, false);

    setShowCreateAccountModal(false);
    setNewAccountName('');
    setNewAccountType('General Investment');
    setNewInitialBalance('');
    setActiveTab('Chat'); 
  }, [newAccountName, newAccountType, newInitialBalance, nextAccountId, processAndDisplayMessage]);

  const handleAddFunds = useCallback(() => {
    if (!selectedAccountForFunds || !isAmountValid(addFundsAmount)) {
      alert("Please select an account and enter a valid amount to add.");
      return;
    }
    const amountNum = parseFloat(addFundsAmount);
    setUserAccounts((prev) =>
      prev.map((acc) =>
        acc.id === selectedAccountForFunds ? { ...acc, balance: acc.balance + amountNum } : acc
      )
    );

    const account = userAccounts.find(acc => acc.id === selectedAccountForFunds);
    if (account) {
      setAccountHistory((prev) => [
        ...prev,
        {
          id: `hist-${Date.now()}`,
          accountId: account.id,
          accountName: account.name,
          type: 'Funds Added',
          description: `Added funds to ${account.name} via ${selectedPaymentGateway}`,
          amount: amountNum,
          timestamp: new Date(),
          status: 'Completed',
        },
      ]);
      processAndDisplayMessage(`I just added $${amountNum.toFixed(2)} to my ${account.name} account via ${selectedPaymentGateway}. What advice do you have regarding adding funds and managing liquidity?`, false);
    }

    setShowAddFundsModal(false);
    setSelectedAccountForFunds('');
    setAddFundsAmount('');
    setSelectedPaymentGateway('Paypal');
    setActiveTab('Chat');
  }, [selectedAccountForFunds, addFundsAmount, isAmountValid, userAccounts, selectedPaymentGateway, processAndDisplayMessage]);

  const handleWithdrawal = useCallback(() => {
    setWithdrawalError(null);
    if (!withdrawalFromAccount || !isAmountValid(withdrawalAmount)) {
      setWithdrawalError("Please select a 'From' account and enter a valid amount.");
      return;
    }
    const amountNum = parseFloat(withdrawalAmount);
    const fromAcc = userAccounts.find(acc => acc.id === withdrawalFromAccount);

    if (!fromAcc) {
      setWithdrawalError("Selected 'From Account' not found.");
      return;
    }
    if (fromAcc.balance < amountNum) {
      setWithdrawalError("Insufficient funds in the selected account.");
      return;
    }

    setUserAccounts((prev) =>
      prev.map((acc) =>
        acc.id === withdrawalFromAccount ? { ...acc, balance: acc.balance - amountNum } : acc
      )
    );

    setAccountHistory((prev) => [
      ...prev,
      {
        id: `hist-${Date.now()}`,
        accountId: fromAcc.id,
        accountName: fromAcc.name,
        type: 'Funds Withdrawn',
        description: `Withdrew funds from ${fromAcc.name} to ${withdrawalToAccount || 'external account'}`,
        amount: -amountNum, 
        timestamp: new Date(),
        status: 'Completed',
      },
    ]);

    processAndDisplayMessage(`I just withdrew $${amountNum.toFixed(2)} from my ${fromAcc.name} account. What financial advice do you have regarding withdrawals and managing cash flow?`, false);

    setShowWithdrawalModal(false);
    setWithdrawalAmount('');
    setWithdrawalFromAccount('');
    setWithdrawalToAccount('');
    setWithdrawalError(null);
    setActiveTab('Chat');
  }, [withdrawalFromAccount, withdrawalAmount, withdrawalToAccount, isAmountValid, userAccounts, processAndDisplayMessage]);

  const filteredAccountHistory = useCallback(() => {
    let history = [...accountHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); 
    if (selectedHistoryFilter === 'all') {
      return history;
    }
    const filterMap = {
      'addedFunds': 'Funds Added',
      'withdrawals': 'Funds Withdrawn',
      'accountCreated': 'Account Created',
    };
    return history.filter(entry => entry.type === filterMap[selectedHistoryFilter as keyof typeof filterMap]);
  }, [accountHistory, selectedHistoryFilter]);

  const filterTransactions = useCallback(() => {
    let filtered = accountHistory.filter(entry => {
      const entryDate = new Date(entry.timestamp.toDateString());
      const start = new Date(transactionStartDate);
      const end = new Date(transactionEndDate);
      end.setDate(end.getDate() + 1); 

      const inDateRange = entryDate >= start && entryDate < end;

      const matchesSearchTerm = transactionFilterTerm.trim() === '' ||
        entry.description.toLowerCase().includes(transactionFilterTerm.toLowerCase()) ||
        entry.accountName.toLowerCase().includes(transactionFilterTerm.toLowerCase()) ||
        (entry.ticker && entry.ticker.toLowerCase().includes(transactionFilterTerm.toLowerCase())) ||
        (entry.securityType && entry.securityType.toLowerCase().includes(transactionFilterTerm.toLowerCase())) ||
        entry.type.toLowerCase().includes(transactionFilterTerm.toLowerCase());

      return inDateRange && matchesSearchTerm;
    });
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); 
  }, [accountHistory, transactionFilterTerm, transactionStartDate, transactionEndDate]);

  useEffect(() => {
    let totalDividends = 0;
    let totalProfitLoss = 0;
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    accountHistory.forEach(entry => {
      const matchesSecurityType = selectedDividendSecurityType === 'All' || entry.securityType === selectedDividendSecurityType;

      if (matchesSecurityType) {
        if (entry.type === 'Dividend Earned' && entry.timestamp >= threeYearsAgo) {
          totalDividends += entry.amount;
        }

        if (entry.type === 'Sell Security') {
          totalProfitLoss += entry.amount; 
        } else if (entry.type === 'Buy Security') {
          totalProfitLoss -= entry.amount; 
        }
      }
    });
    setTotalDividendsPast3Years(totalDividends);
    setTotalProfitLossSelectedType(totalProfitLoss);
  }, [accountHistory, selectedDividendSecurityType]);

  const handleDownloadLogs = useCallback(() => {
    const transactionsToDownload = filterTransactions(); 
    const header = ['ID', 'Account ID', 'Account Name', 'Type', 'Description', 'Amount', 'Timestamp', 'Security Type', 'Ticker', 'Status'];
    const csvContent = [
      header.join(','),
      ...transactionsToDownload.map(t =>
        [
          t.id,
          t.accountId,
          t.accountName,
          t.type,
          `"${t.description.replace(/"/g, '""')}"`, 
          t.amount.toFixed(2),
          t.timestamp.toISOString(),
          t.securityType || '',
          t.ticker || '',
          t.status || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `money_tree_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowDownloadSuccessNotification(true);
    setTimeout(() => setShowDownloadSuccessNotification(false), 3000); 
  }, [filterTransactions]);

  useEffect(() => {
    if (activeTab === 'Chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (activeTab !== 'Portfolio' || (selectedTradingOption !== 'Stocks' && selectedTradingOption !== 'Bonds' && selectedTradingOption !== 'ETF')) {
      setShowHistoricalPerformanceChart(false);
      setHistoricalChartData(null);
      setErrorChart(null);
      setShowPortfolioHoldings(false); 
      setPortfolioHoldings(null);
      setPortfolioError(null);
      setShowBondMarketOverview(false); 
      setShowYahooFinanceBonds(false);
      setSelectedBondType(null);
      setYahooBondsData(null);
      setYahooBondsError(null);
      setSelectedEtf(''); 
      setSelectedMunicipalBond('');
    }
  }, [activeTab, selectedTradingOption]); 

  useEffect(() => {
    if (selectedPurchaseType === 'limit_price' && simulatedMarketPrice !== null) {
      const parsedLimitPrice = parseFloat(limitPrice);
      if (isNaN(parsedLimitPrice) || limitPrice.trim() === '') {
        setLimitPriceError('Please enter a valid limit price.');
      } else {
        const minAllowed = simulatedMarketPrice - 2;
        const maxAllowed = simulatedMarketPrice + 2;
        if (parsedLimitPrice < minAllowed || parsedLimitPrice > maxAllowed) {
          setLimitPriceError(`Limit price must be within $${minAllowed.toFixed(2)} and $${maxAllowed.toFixed(2)}.`);
        } else {
          setLimitPriceError(null);
        }
      }
    } else {
      setLimitPriceError(null);
    }
  }, [limitPrice, selectedPurchaseType, simulatedMarketPrice]);

  useEffect(() => {
    if (activeTab === 'Portfolio' && selectedTradingOption === 'Stocks' && !portfolioHoldings && !portfolioLoading && !portfolioError && !showHistoricalPerformanceChart && !showPortfolioHoldings && !showBondMarketOverview && !showYahooFinanceBonds) {
      fetchPortfolioHoldings();
    }
  }, [activeTab, selectedTradingOption, portfolioHoldings, portfolioLoading, portfolioError, fetchPortfolioHoldings, showHistoricalPerformanceChart, showPortfolioHoldings, showBondMarketOverview, showYahooFinanceBonds]);

  // Fetch bonds when bond type or sub-type changes
  useEffect(() => {
    if (showYahooFinanceBonds && selectedBondType) {
      fetchYahooBondsData(selectedBondType, selectedMunicipalType);
    }
  }, [showYahooFinanceBonds, selectedBondType, selectedMunicipalType, fetchYahooBondsData]);


  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  }, [sendMessage, isLoading]);

  const handleTradingOptionClick = (option: string) => {
    console.log(`Trading option selected: ${option}`);
    setSelectedTradingOption(option);
    setSelectedTicker(''); 
    setAmount(''); 
    setSelectedEtf(''); 
    setSelectedMunicipalBond('');

    setShowHistoricalPerformanceChart(false);
    setHistoricalChartData(null);
    setErrorChart(null);
    setShowPortfolioHoldings(false);
    setPortfolioHoldings(null);
    setPortfolioError(null);
    setShowBondMarketOverview(false);
    setShowYahooFinanceBonds(false);
    setSelectedBondType(null);
    setYahooBondsData(null);
    setYahooBondsError(null);
    
    if (option === 'Bonds') {
      setShowBondMarketOverview(true); 
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + '-action',
        sender: MessageSender.BOT,
        text: `You selected "${option}". Please choose a bond type to explore.`,
        timestamp: new Date(),
      }]);
    } else if (option === 'Stocks') {
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + '-action',
        sender: MessageSender.BOT,
        text: `You selected "${option}". Now choose a ticker to see more options.`,
        timestamp: new Date(),
      }]);
    } else if (option === 'ETF') {
       setMessages((prev) => [...prev, {
        id: Date.now().toString() + '-action',
        sender: MessageSender.BOT,
        text: `You selected "${option}". Please choose an ETF from the list.`,
        timestamp: new Date(),
      }]);
    }
  };

  const handleTickerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTicker = e.target.value;
    setSelectedTicker(newTicker);
    setAmount(''); 
    setShowHistoricalPerformanceChart(false); 
    setHistoricalChartData(null); 
    setErrorChart(null); 
    setShowPortfolioHoldings(false); 
    setPortfolioHoldings(null);
    setPortfolioError(null);
    console.log(`Selected ticker: ${newTicker}`);
    if (newTicker !== '') {
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + '-ticker',
        sender: MessageSender.BOT,
        text: `You've selected ticker "${newTicker}". You can now explore its historical performance or simulate trades.`,
        timestamp: new Date(),
      }]);
    }
  };

  const handleEtfChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEtf = e.target.value;
    setSelectedEtf(newEtf);
    setAmount(''); 
    setShowHistoricalPerformanceChart(false); 
    setHistoricalChartData(null); 
    setErrorChart(null); 
    setShowPortfolioHoldings(false); 
    setPortfolioHoldings(null);
    setPortfolioError(null);

    if (newEtf !== '') {
       const etfName = yahooFinanceEtfs.find(etf => etf.symbol === newEtf)?.name;
       setMessages((prev) => [...prev, {
        id: Date.now().toString() + '-etf',
        sender: MessageSender.BOT,
        text: `You've selected ETF "${etfName}" (${newEtf}). Market data and trading options for this ETF would appear here.`,
        timestamp: new Date(),
      }]);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setAmount(value);
    }
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setLimitPrice(value);
    }
  };


  const handleNavigationTabClick = (tabName: string) => {
    setActiveTab(tabName);
    console.log(`Navigation tab selected: ${tabName}`);
    if (tabName !== 'Portfolio' && tabName !== 'Accounts' && tabName !== 'Authorization' && tabName !== 'Transactions' && tabName !== 'Contact') {
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + `-nav-${tabName}`,
        sender: MessageSender.BOT,
        text: `You navigated to "${tabName}". (Feature coming soon!)`,
        timestamp: new Date(),
      }]);
      setActiveTab('Chat'); 
    }
  };

  const formatDateLabel = (dateString: string, timeRange: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; 
    }

    switch (timeRange) {
      case '1hr':
      case '24hrs':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case '7days':
      case 'month':
        return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
      case 'qtr':
      case 'year':
      case '2years':
      case '5years':
      case '10years':
        return date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
      case 'full': 
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      default:
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  };

  // Helper to generate mock inflation/interest rate data
  const generateInflationData = (range: string) => {
    const dataPoints = [];
    const now = new Date();
    let years = 5;
    let intervals = 10; // Default for 5Y semiannual

    switch (range) {
        case 'Annual YTD':
            years = 1;
            intervals = 12; // Monthly
            break;
        case '5Y':
            years = 5;
            intervals = 10; // Semiannual
            break;
        case '10Y':
            years = 10;
            intervals = 20; // Semiannual
            break;
        case '20Y':
            years = 20;
            intervals = 40; // Semiannual
            break;
        default:
            years = 5;
            intervals = 10;
    }

    const intervalMs = (years * 365 * 24 * 60 * 60 * 1000) / intervals;

    for (let i = intervals; i >= 0; i--) {
        const date = new Date(now.getTime() - i * intervalMs);
        // Simulate a curve: rising recently, fluctuating before
        let baseRate = 3.5;
        if (i < 5) baseRate += 0.2 * (5 - i); // Recent rise
        else baseRate += Math.sin(i / 3) * 1.5; // Fluctuation

        const rate = Math.max(0.5, Math.min(8, baseRate + (Math.random() - 0.5) * 0.5));
        
        dataPoints.push({
            date: date.toISOString(),
            rate: parseFloat(rate.toFixed(2))
        });
    }
    return dataPoints;
  };

  const renderCandlestickChart = () => {
    if (!historicalChartData || historicalChartData.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          {chartLoading ? (
            <div className="flex justify-center items-center">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="ml-3">Loading historical data...</p>
            </div>
          ) : (
            chartError || "No historical data available for this selection."
          )}
        </div>
      );
    }

    const allPrices = historicalChartData.flatMap(d => [d.open, d.high, d.low, d.close, d.min, d.max]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const chartHeightPx = 200; 
    const displaySymbol = selectedTradingOption === 'ETF' ? selectedEtf : selectedTicker;

    return (
      <div className="w-full flex flex-col items-center bg-white p-4 rounded-lg shadow-md mt-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Historical Performance: {displaySymbol}</h3>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {['1hr', '24hrs', '7days', 'month', 'qtr', 'year', '2years', '5years', '10years'].map((range) => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range)}
              className={`px-3 py-1 text-xs rounded-md transition-colors duration-200
                ${selectedTimeRange === range ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                ${chartLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={chartLoading}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>

        {chartLoading ? (
          <div className="flex justify-center items-center h-[200px] w-full">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="ml-3 text-gray-700">Loading chart data...</p>
          </div>
        ) : chartError ? (
          <div className="text-red-500 text-center py-8">{chartError}</div>
        ) : (
          <div className="relative w-full overflow-x-auto p-2" style={{ height: `${chartHeightPx + 40}px` }}> 
            <div className="flex items-end h-full min-w-[300px]" style={{ width: `${historicalChartData.length * 20}px` }}> 
              {historicalChartData.map((data, index) => {
                const isBullish = data.close >= data.open;
                const candleColor = isBullish ? 'bg-green-500' : 'bg-red-500';
                const wickColor = isBullish ? 'border-green-500' : 'border-red-500';

                const openPos = ((data.open - minPrice) / priceRange) * chartHeightPx;
                const closePos = ((data.close - minPrice) / priceRange) * chartHeightPx;
                const highPos = ((data.high - minPrice) / priceRange) * chartHeightPx;
                const lowPos = ((data.low - minPrice) / priceRange) * chartHeightPx;

                const bodyHeight = Math.abs(openPos - closePos) || 1; 
                const wickHeight = Math.abs(highPos - lowPos);

                return (
                  <div key={index} className="relative group mx-[2px] w-[14px] flex flex-col items-center justify-end" style={{ height: `${chartHeightPx}px` }}>
                    <div className={`absolute w-px ${wickColor}`} style={{ height: `${wickHeight}px`, bottom: `${lowPos}px`, left: '50%', transform: 'translateX(-50%)' }}></div>
                    <div className={`absolute w-[10px] ${candleColor}`} style={{ height: `${bodyHeight}px`, bottom: `${Math.min(openPos, closePos)}px`, borderRadius: '1px' }}></div>
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-1 rounded whitespace-nowrap z-10 opacity-90">
                      <div>Date: {formatDateLabel(data.date, 'full')}</div> 
                      <div>Open: ${data.open.toFixed(2)}</div>
                      <div>High: ${data.high.toFixed(2)}</div>
                      <div>Low: ${data.low.toFixed(2)}</div>
                      <div>Close: ${data.close.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex justify-around text-xs text-gray-600 px-2 mt-1">
              {historicalChartData.map((data, index) => (
                <span key={index} className="w-[18px] text-center overflow-hidden whitespace-nowrap text-ellipsis">
                  {formatDateLabel(data.date, selectedTimeRange)}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowHistoricalPerformanceChart(false)}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Back to Portfolio
        </button>
      </div>
    );
  };

  const renderPortfolioHoldings = () => {
    if (portfolioLoading || !portfolioHoldings || portfolioHoldings.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          {portfolioLoading ? (
            <div className="flex justify-center items-center">
              <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="ml-3">Loading portfolio holdings...</p>
            </div>
          ) : (
            portfolioError || "No portfolio holdings available."
          )}
        </div>
      );
    }

    return (
      <div className="w-full flex flex-col items-center bg-white p-4 rounded-lg shadow-md mt-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Current Portfolio Holdings</h3>

        {portfolioError && (
          <div className="text-red-500 text-center py-4">{portfolioError}</div>
        )}

        <div className="overflow-x-auto w-full mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolioHoldings.map((holding, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{holding.securityType}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{holding.ticker}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{holding.shares.toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">${holding.avgCost.toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">${holding.currentPrice.toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">${holding.marketValue.toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <span className={`font-semibold ${holding.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>${holding.gainLoss.toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={() => setShowPortfolioHoldings(false)} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
          Back to Portfolio
        </button>
      </div>
    );
  };

  // Renamed from renderBondMarketOverviewModal to renderBondMarketOverview
  const renderBondMarketOverview = () => (
    <div className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md min-h-full items-start w-full mt-4">
      <h3 className="text-xl font-bold mb-4 text-gray-800 text-center w-full">Bond Market Overview</h3>
      <p className="text-gray-700 text-center mb-6 w-full">Select a bond type to view available options.</p>

      <div className="grid grid-cols-2 gap-4 w-full">
        {['Corporate', 'Municipal', 'Mutual', 'Treasury', 'Government'].map(type => (
          <button
            key={type}
            onClick={() => {
              setSelectedBondType(type);
              setShowBondMarketOverview(false); // Hide this view
              setShowYahooFinanceBonds(true); // Show Yahoo Finance bonds view
            }}
            className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 text-sm font-semibold"
          >
            {type} Bonds
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          setShowBondMarketOverview(false);
          setSelectedTradingOption(null); 
        }}
        className="mt-6 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 self-end"
      >
        Back to Portfolio
      </button>
    </div>
  );

  // Renamed from renderYahooFinanceBondsModal to renderYahooFinanceBonds
  const renderYahooFinanceBonds = () => {
    // Specific Render for Municipal Bonds with Dropdown and Actions
    if (selectedBondType === 'Municipal') {
        const currentBond = yahooBondsData?.find(b => b.symbol === selectedMunicipalBond);

        return (
            <div className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md min-h-full items-start w-full mt-4">
                <h3 className="text-xl font-bold mb-2 text-gray-800 text-center w-full">Municipal Bonds Market</h3>
                
                {/* Municipal Type Toggle */}
                <div className="flex justify-center w-full mb-4">
                    <div className="bg-gray-200 p-1 rounded-md flex">
                        <button
                            onClick={() => setSelectedMunicipalType('General Obligation')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${selectedMunicipalType === 'General Obligation' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            General Obligation
                        </button>
                        <button
                            onClick={() => setSelectedMunicipalType('Revenue')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${selectedMunicipalType === 'Revenue' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            Revenue
                        </button>
                    </div>
                </div>

                {/* Available Bonds Selector */}
                <div className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm mb-4">
                    <label htmlFor="municipal-bonds-dropdown" className="text-sm font-bold text-gray-700">Select Municipal Bond:</label>
                    <select 
                        id="municipal-bonds-dropdown"
                        value={selectedMunicipalBond}
                        onChange={(e) => {
                            setSelectedMunicipalBond(e.target.value);
                            setAmount('');
                        }}
                        className="block w-1/2 py-2 pl-3 pr-8 text-base bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option value="">Select a Bond</option>
                        {yahooBondsData?.map(bond => (
                            <option key={bond.symbol} value={bond.symbol}>{bond.name} ({bond.symbol})</option>
                        ))}
                        {!yahooBondsData && <option disabled>Loading bonds...</option>}
                    </select>
                </div>

                {/* Bonds Detail Table */}
                {yahooBondsLoading ? (
                    <div className="flex justify-center items-center h-24 w-full">
                        <p className="ml-3 text-gray-700">Loading bond data...</p>
                    </div>
                ) : yahooBondsError ? (
                    <div className="text-red-500 text-center py-4 w-full">{yahooBondsError}</div>
                ) : (
                    <div className="overflow-x-auto w-full mb-6">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bond Name</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yield</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maturity</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {yahooBondsData?.map((bond, index) => (
                                    <tr key={index} className={selectedMunicipalBond === bond.symbol ? "bg-blue-50" : ""}>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{bond.name}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">${bond.lastPrice.toFixed(2)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{bond.yield}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{bond.maturityDate}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bond.investmentGrade === 'Investment Grade' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {bond.investmentGrade || 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Actions Toolbar for Selected Bond */}
                {selectedMunicipalBond && (
                    <div className="w-full flex flex-wrap gap-2 justify-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <button
                            onClick={handleShowHistoricalPerformanceClick}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none transition-colors duration-200"
                        >
                            Performance Analysis
                        </button>
                        <button
                            onClick={() => { setAmount(''); openBuySellModal('buy'); }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none transition-colors duration-200"
                        >
                            Buy
                        </button>
                        <button
                            onClick={() => { setAmount(''); openBuySellModal('sell'); }}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none transition-colors duration-200"
                        >
                            Sell
                        </button>
                        <button
                            onClick={handleTransferClick}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none transition-colors duration-200"
                        >
                            Transfer
                        </button>
                    </div>
                )}

                <button
                    onClick={() => {
                        setShowYahooFinanceBonds(false);
                        setSelectedBondType(null);
                        setShowBondMarketOverview(true); 
                    }}
                    className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 self-end"
                >
                    Back to Bond Types
                </button>
            </div>
        );
    }

    // Specific Render for Corporate Bonds with Dropdown and Inflation Chart
    if (selectedBondType === 'Corporate') {
        const inflationData = generateInflationData(inflationRange);
        const chartHeight = 200;
        const rates = inflationData.map(d => d.rate);
        const minRate = Math.min(...rates) * 0.9;
        const maxRate = Math.max(...rates) * 1.1;
        const rateRange = maxRate - minRate;

        // Determine current selected bond data
        const currentBond = yahooBondsData?.find(b => b.symbol === selectedCorporateBond);

        return (
            <div className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md min-h-full items-start w-full mt-4">
                <h3 className="text-xl font-bold mb-2 text-gray-800 text-center w-full">Corporate Bonds Overview</h3>
                
                {/* Available Bonds Selector */}
                <div className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm mb-4">
                    <label htmlFor="available-bonds-dropdown" className="text-sm font-bold text-gray-700">Available bonds:</label>
                    <select 
                        id="available-bonds-dropdown"
                        value={selectedCorporateBond}
                        onChange={(e) => {
                            setSelectedCorporateBond(e.target.value);
                            setBondPurchasePrice(''); // Reset price input on change
                            setIsZeroDiscount(false); // Reset checkbox
                        }}
                        className="block w-1/2 py-2 pl-3 pr-8 text-base bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option value="">Select a Corporate Bond</option>
                        {yahooBondsData?.map(bond => (
                            <option key={bond.symbol} value={bond.symbol}>{bond.name} ({bond.symbol})</option>
                        ))}
                        {!yahooBondsData && <option disabled>Loading bonds...</option>}
                    </select>
                </div>

                {/* Bonds Detail Table */}
                {yahooBondsLoading ? (
                    <div className="flex justify-center items-center h-24 w-full">
                        <p className="ml-3 text-gray-700">Loading bond data...</p>
                    </div>
                ) : yahooBondsError ? (
                    <div className="text-red-500 text-center py-4 w-full">{yahooBondsError}</div>
                ) : (
                    <div className="overflow-x-auto w-full mb-6">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bond Name</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bond Price</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yield Over Rate</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inflation Rate</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment Graded Bonds</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {yahooBondsData?.map((bond, index) => (
                                    <tr key={index} className={selectedCorporateBond === bond.symbol ? "bg-blue-50" : ""}>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{bond.name}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">${bond.lastPrice.toFixed(2)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{bond.yieldOverRate}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{bond.inflationRate}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bond.investmentGrade === 'Investment Grade' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {bond.investmentGrade}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Bond Purchase Operation & Details Section */}
                {currentBond && (
                    <div className="w-full bg-white p-4 rounded-lg border border-blue-200 shadow-sm mb-6">
                        <h4 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Bond Purchase Operation: {currentBond.name}</h4>
                        
                        {/* Detail Fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                            <div>
                                <span className="block text-gray-500 text-xs">Issued Date</span>
                                <span className="font-semibold">{currentBond.issuedDate}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs">Maturity Date</span>
                                <span className="font-semibold">{currentBond.maturityDate}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs">Vetted Date</span>
                                <span className="font-semibold">{currentBond.vettedDate}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs">Term Longevity</span>
                                <span className="font-semibold text-blue-600">{currentBond.term}</span>
                            </div>
                        </div>

                        {/* Purchase Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <div>
                                <label htmlFor="bond-purchase-price" className="block text-sm font-medium text-gray-700 mb-1">Bond Purchase Price ($)</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="text"
                                        id="bond-purchase-price"
                                        className="block w-full rounded-md border-gray-300 pl-7 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm border"
                                        placeholder="0.00"
                                        value={bondPurchasePrice}
                                        onChange={(e) => {
                                            if (/^\d*\.?\d*$/.test(e.target.value)) setBondPurchasePrice(e.target.value);
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Enter cost in USD only.</p>
                            </div>

                            <div className="flex items-center h-full pb-3">
                                <input
                                    id="zero-discount-checkbox"
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    checked={isZeroDiscount}
                                    onChange={(e) => setIsZeroDiscount(e.target.checked)}
                                />
                                <label htmlFor="zero-discount-checkbox" className="ml-2 block text-sm text-gray-900">
                                    Opt for Zero Discount Buying Price
                                </label>
                            </div>
                        </div>

                        {/* Discount Info Display */}
                        <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-800">
                            {isZeroDiscount ? (
                                <p><strong>Zero Discount Applied:</strong> You are purchasing at the full price, skipping the initial discount to avoid payback adjustments at maturity.</p>
                            ) : (
                                <p><strong>Discount Available:</strong> A coupon discount of <strong>${currentBond.couponDiscount?.toFixed(2)}</strong> is applicable. {bondPurchasePrice && !isNaN(parseFloat(bondPurchasePrice)) ? `Net Cost: $${(parseFloat(bondPurchasePrice) - (currentBond.couponDiscount || 0)).toFixed(2)}` : ''}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Inflation Data Section */}
                <div className="w-full bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 mb-4">Corporate Bonds Inflation Data</h4>
                    <p className="text-xs text-gray-500 mb-4">Illustrating interest rate changes based on semi-annual data (Feds Rate of Interest).</p>
                    
                    {/* Time Range Controls */}
                    <div className="flex justify-center gap-2 mb-4">
                        {['Annual YTD', '5Y', '10Y', '20Y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setInflationRange(range)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors duration-200 ${inflationRange === range ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    {/* Chart */}
                    <div className="relative w-full h-[200px] border-l border-b border-gray-300 bg-white">
                        <svg className="w-full h-full" viewBox={`0 0 ${inflationData.length * 40} ${chartHeight}`} preserveAspectRatio="none">
                            {/* Line Path */}
                            <polyline
                                fill="none"
                                stroke="#2563EB"
                                strokeWidth="2"
                                points={inflationData.map((d, i) => {
                                    const x = i * (inflationData.length > 1 ? (inflationData.length * 40) / (inflationData.length - 1) : 0); 
                                    const y = chartHeight - ((d.rate - minRate) / rateRange) * chartHeight;
                                    return `${i * 40 + 20},${y}`;
                                }).join(' ')}
                            />
                            {/* Points */}
                            {inflationData.map((d, i) => {
                                const y = chartHeight - ((d.rate - minRate) / rateRange) * chartHeight;
                                return (
                                    <circle key={i} cx={i * 40 + 20} cy={y} r="3" fill="#2563EB">
                                        <title>{`Date: ${new Date(d.date).toLocaleDateString()}\nRate: ${d.rate}%`}</title>
                                    </circle>
                                );
                            })}
                        </svg>
                        {/* X-Axis Labels */}
                        <div className="absolute bottom-0 w-full flex justify-between text-[10px] text-gray-500 px-2 pointer-events-none">
                            <span>{new Date(inflationData[inflationData.length - 1].date).getFullYear()}</span>
                            <span>{new Date(inflationData[0].date).getFullYear()}</span>
                        </div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2">Interest Rate / Yield Trends (%)</p>
                </div>

                <button
                    onClick={() => {
                        setShowYahooFinanceBonds(false);
                        setSelectedBondType(null);
                        setShowBondMarketOverview(true); 
                    }}
                    className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 self-end"
                >
                    Back to Bond Types
                </button>
            </div>
        );
    }

    // Default Render for other Bond Types (Mutual, Treasury, Government)
    return (
    <div className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md min-h-full items-start w-full mt-4">
      <h3 className="text-xl font-bold mb-4 text-gray-800 text-center w-full">
        Yahoo Finance Bonds - {selectedBondType} Bonds
      </h3>

      {yahooBondsLoading ? (
        <div className="flex justify-center items-center h-48 w-full">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="ml-3 text-gray-700">Loading {selectedBondType} bond data...</p>
        </div>
      ) : yahooBondsError ? (
        <div className="text-red-500 text-center py-8 w-full">{yahooBondsError}</div>
      ) : !yahooBondsData || yahooBondsData.length === 0 ? (
        <p className="text-gray-500 text-center py-8 w-full">No {selectedBondType} bond data available from Yahoo Finance.</p>
      ) : (
        <div className="overflow-x-auto w-full mb-4 max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coupon
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Maturity Date
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yield
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Price
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {yahooBondsData.map((bond, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{bond.symbol}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{bond.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{bond.coupon}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{bond.maturityDate}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{bond.yield}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">${bond.lastPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={() => {
          setShowYahooFinanceBonds(false);
          setSelectedBondType(null);
          setShowBondMarketOverview(true); 
        }}
        className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 self-end"
      >
        Back to Bond Types
      </button>
    </div>
  );
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-blue-100 shadow-xl rounded-lg overflow-hidden">
      {/* Header */}
      <header className="flex flex-col items-center p-4 bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-md">
        <h1 className="font-['Pacifico'] text-[25px] font-bold text-cyan-600 text-center">
          Financial Aid by Money-Tree
        </h1>
        <p className="font-['Pacifico'] text-[14px] font-bold text-cyan-600 mt-1 pl-6">
          An agentic solution to your Financial challenges
        </p>
      </header>

      {/* Navigator Scroll Bar */}
      <nav className="flex-shrink-0 flex items-center p-2 bg-blue-800 text-white shadow-md overflow-x-auto whitespace-nowrap scrollbar-hide">
        {navigationTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleNavigationTabClick(tab)}
            className={`flex items-center space-x-1 px-3 py-2 text-xs font-medium rounded-md
            ${activeTab === tab ? 'bg-cyan-600 text-white' : 'hover:bg-blue-700'}
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-blue-800 mx-1 flex-shrink-0`}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {/* Up Arrow Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 rotate-180">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            <span>{tab}</span>
            {/* Down Arrow Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        ))}
      </nav>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 bg-blue-100">
        {activeTab === 'Portfolio' ? (
          <div className="flex flex-col space-y-4 p-4 bg-blue-100 rounded-lg shadow-md min-h-full items-start">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Your Financial Portfolio</h2>
            <p className="text-gray-600 mb-4">Select an option below to manage your investments or view market data.</p>
            {/* Trading Options Dropdown - Always visible in Portfolio tab */}
            <div className="relative flex items-center mb-4 w-full">
              <label htmlFor="trading-option-select" className="block text-sm font-medium text-cyan-600 mr-2">Trading options:</label>
              <select
                id="trading-option-select"
                value={selectedTradingOption || ''} // Use || '' to handle initial null state
                onChange={(e) => handleTradingOptionClick(e.target.value)}
                className="block w-full py-2 pl-3 pr-8 text-base bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md appearance-none cursor-pointer"
                aria-label="Choose a trading option"
              >
                <option value="">Select a trading option</option> {/* Default placeholder */}
                <option value="Stocks">Stocks</option>
                <option value="ETF">ETF</option>
                <option value="Bonds">Bonds</option>
                <option value="Mutual Funds">Mutual Funds</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white mr-1">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
              </div>
            </div>

            {/* Conditional Content Area based on Trading Option */}
            {selectedTradingOption === 'Stocks' ? (
              showHistoricalPerformanceChart ? (
                renderCandlestickChart()
              ) : showPortfolioHoldings ? (
                renderPortfolioHoldings()
              ) : (
                <>
                  {/* Select Ticker Name Component */}
                  <div className="relative flex items-center mt-4 w-full">
                    <label htmlFor="ticker-select" className="block text-sm font-medium text-cyan-600 mr-2">Choose Ticker:</label>
                    <select
                      id="ticker-select"
                      value={selectedTicker}
                      onChange={handleTickerChange}
                      className="block w-full py-2 pl-3 pr-8 text-base bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md appearance-none cursor-pointer"
                      aria-label="Choose the ticker name"
                    >
                      <option value="">Select a ticker</option>
                      {tickerOptions.map((ticker) => (
                        <option key={ticker} value={ticker}>{ticker}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white mr-1">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
                    </div>
                  </div>

                  {/* New: Amount Input Field */}
                  {selectedTicker && (
                    <div className="flex items-center mt-4 w-full">
                      <label htmlFor="amount-input" className="block text-sm font-medium text-cyan-600 mr-2">Amount:</label>
                      <div className="relative rounded-md shadow-sm flex-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="text"
                          id="amount-input"
                          value={amount}
                          onChange={handleAmountChange}
                          className="block w-full rounded-md border-gray-300 pl-7 pr-3 py-2 bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                          placeholder="0.00"
                          aria-label="Amount for transaction"
                          inputMode="numeric"
                          pattern="[0-9]*\.?[0-9]*"
                        />
                      </div>
                    </div>
                  )}

                  {/* New: Action Buttons for Stocks */}
                  {selectedTicker && (
                    <div className="flex flex-wrap gap-2 mt-4 w-full">
                      <button
                        onClick={handleShowHistoricalPerformanceClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={isLoading}
                        aria-label="Show historical performance"
                      >
                        {isLoading ? 'Loading...' : 'Show Historical Performance'}
                      </button>
                      <button
                        onClick={handleShowPortfolioHoldingsClick}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={portfolioLoading}
                        aria-label="Show portfolio holdings"
                      >
                        {portfolioLoading ? 'Loading...' : 'Show Portfolio Holdings'}
                      </button>
                      <button
                        onClick={() => openBuySellModal('buy')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={isLoading || !isAmountValid(amount)}
                        aria-label="Buy"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => openBuySellModal('sell')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={isLoading || !selectedTicker}
                        aria-label="Sell"
                      >
                        Sell
                      </button>
                      <button
                        onClick={handleTransferClick}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={isLoading || !selectedTicker}
                        aria-label="Transfer"
                      >
                        Transfer
                      </button>
                    </div>
                  )}
                </>
              )
            ) : selectedTradingOption === 'ETF' ? (
              showHistoricalPerformanceChart ? (
                renderCandlestickChart()
              ) : showPortfolioHoldings ? (
                renderPortfolioHoldings()
              ) : (
                <>
                  <div className="relative flex items-center mt-4 w-full">
                    <label htmlFor="etf-select" className="block text-sm font-medium text-cyan-600 mr-2 min-w-fit">ETF Name:</label>
                    <select
                      id="etf-select"
                      value={selectedEtf}
                      onChange={handleEtfChange}
                      className="block w-full py-2 pl-3 pr-8 text-base bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md appearance-none cursor-pointer"
                      aria-label="Choose an ETF"
                    >
                      <option value="">Select an ETF from Yahoo Finance</option>
                      {yahooFinanceEtfs.map((etf) => (
                        <option key={etf.symbol} value={etf.symbol}>{etf.symbol} - {etf.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white mr-1">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
                    </div>
                  </div>
                  
                  {/* Amount Input for ETF */}
                  {selectedEtf && (
                    <div className="flex items-center mt-4 w-full">
                      <label htmlFor="amount-input" className="block text-sm font-medium text-cyan-600 mr-2">Amount:</label>
                      <div className="relative rounded-md shadow-sm flex-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="text"
                          id="amount-input"
                          value={amount}
                          onChange={handleAmountChange}
                          className="block w-full rounded-md border-gray-300 pl-7 pr-3 py-2 bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                          placeholder="0.00"
                          aria-label="Amount for transaction"
                          inputMode="numeric"
                          pattern="[0-9]*\.?[0-9]*"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for ETF */}
                  {selectedEtf && (
                    <div className="flex flex-wrap gap-2 mt-4 w-full">
                        <button
                        onClick={handleShowHistoricalPerformanceClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={isLoading}
                        aria-label="Show historical performance"
                        >
                        {isLoading ? 'Loading...' : 'Show Historical Performance'}
                        </button>
                        <button
                        onClick={handleShowPortfolioHoldingsClick}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={portfolioLoading}
                        aria-label="Show portfolio holdings"
                      >
                        {portfolioLoading ? 'Loading...' : 'Show Portfolio Holdings'}
                      </button>
                      <button
                        onClick={() => openBuySellModal('buy')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={isLoading || !isAmountValid(amount)}
                        aria-label="Buy"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => openBuySellModal('sell')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={isLoading || !selectedEtf}
                        aria-label="Sell"
                      >
                        Sell
                      </button>
                      <button
                        onClick={handleTransferClick}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors duration-200"
                        disabled={isLoading || !selectedEtf}
                        aria-label="Transfer"
                      >
                        Transfer
                      </button>
                    </div>
                  )}
                </>
              )
            ) : selectedTradingOption === 'Bonds' ? (
              showBondMarketOverview ? (
                renderBondMarketOverview()
              ) : showYahooFinanceBonds ? (
                renderYahooFinanceBonds()
              ) : (
                <p className="text-gray-600 mt-4 text-center w-full">
                  Please select a bond type from the options above.
                </p>
              )
            ) : selectedTradingOption === 'Mutual Funds' ? (
              <p className="text-gray-600 mt-4 text-center w-full">
                {selectedTradingOption} options coming soon!
              </p>
            ) : (
              <p className="text-gray-600 mt-4 text-center w-full">
                Select a trading option from the dropdown to get started.
              </p>
            )}
          </div>
        ) : activeTab === 'Accounts' ? (
          <div className="flex flex-col flex-grow w-full space-y-4">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Account Management Dashboard</h2>
            {/* Accounts Cards Wrapper */}
            <div className="flex flex-col lg:flex-row gap-4 flex-grow">
              {/* Left Panel: Account Creation and Transactional Management */}
              <div className="flex flex-col p-4 bg-white rounded-lg shadow-md lg:w-1/2 min-h-[300px]">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Account Creation & Funds Management</h3>
                <div className="space-y-3 flex-grow">
                  <button
                    onClick={() => setShowCreateAccountModal(true)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                    aria-label="Create a new investment account"
                  >
                    Create Investment Account
                  </button>
                  <button
                    onClick={() => setShowTransactionalAccountsOverviewModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                    aria-label="Manage your transactional accounts"
                  >
                    Manage Accounts
                  </button>
                  <button
                    onClick={() => setShowAddFundsModal(true)}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                    aria-label="Add funds to an account"
                  >
                    Add Funds
                  </button>
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                    aria-label="Withdraw funds from an account"
                  >
                    Withdrawal
                  </button>
                </div>
              </div>

              {/* Right Panel: Account History */}
              <div className="flex flex-col p-4 bg-white rounded-lg shadow-md lg:w-1/2 min-h-[300px]">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Account History & Maintenance</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setSelectedHistoryFilter('all')}
                    className={`px-3 py-1 text-xs rounded-md ${selectedHistoryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    All History
                  </button>
                  <button
                    onClick={() => setSelectedHistoryFilter('accountCreated')}
                    className={`px-3 py-1 text-xs rounded-md ${selectedHistoryFilter === 'accountCreated' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Account Created
                  </button>
                  <button
                    onClick={() => setSelectedHistoryFilter('addedFunds')}
                    className={`px-3 py-1 text-xs rounded-md ${selectedHistoryFilter === 'addedFunds' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Added Funds
                  </button>
                  <button
                    onClick={() => setSelectedHistoryFilter('withdrawals')}
                    className={`px-3 py-1 text-xs rounded-md ${selectedHistoryFilter === 'withdrawals' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Withdrawals
                  </button>
                </div>

                <div className="overflow-y-auto flex-grow pr-2">
                  {filteredAccountHistory().length === 0 ? (
                    <p className="text-gray-500 text-sm">No history entries for this filter.</p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredAccountHistory().map((entry) => (
                        <li key={entry.id} className="bg-gray-50 p-3 rounded-md shadow-sm text-sm">
                          <p className="font-semibold text-gray-800">{entry.type} on {entry.timestamp.toLocaleDateString()}</p>
                          <p className="text-gray-700">Account: {entry.accountName} (ID: {entry.accountId})</p>
                          <p className="text-gray-600">{entry.description}</p>
                          {entry.amount !== 0 && (
                            <p className={`font-bold ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Amount: ${entry.amount.toFixed(2)}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  *Account updates to modify existing names and properties are privileged and authorized by stakeholders,
                  pertains to a maximum threshold of 5 updates in a month.
                </p>
              </div>
            </div>

            {/* Bottom Panel: Notifications Window */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-md text-sm text-yellow-800 mt-4">
              <p className="font-bold mb-1">Important Account Notifications:</p>
              <ul className="list-disc pl-5 space-y-1">
                {accountNotifications.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : activeTab === 'Transactions' ? (
          <div className="flex flex-col flex-grow w-full space-y-4 p-4 bg-blue-100 rounded-lg shadow-md min-h-full">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-4">Transaction History & Analysis</h2>

            {/* "Account Transactions" Search/Filter */}
            <div className="mb-4">
              <label htmlFor="transaction-filter-input" className="block text-sm font-medium text-gray-700 mb-1">Filter Account Transactions:</label>
              <input
                type="text"
                id="transaction-filter-input"
                value={transactionFilterTerm}
                onChange={(e) => setTransactionFilterTerm(e.target.value)}
                placeholder="Search by description, ticker, account name, type..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Date Range Selection */}
            <div className="flex flex-wrap gap-4 mb-4 items-center">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date:</label>
                <input
                  type="date"
                  id="start-date"
                  value={transactionStartDate}
                  onChange={(e) => setTransactionStartDate(e.target.value)}
                  min="2024-01-01" // Start from current calendar year
                  max="2099-12-31" // To 2099
                  className={`p-2 border rounded-md ${transactionDateRangeError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date:</label>
                <input
                  type="date"
                  id="end-date"
                  value={transactionEndDate}
                  onChange={(e) => setTransactionEndDate(e.target.value)}
                  min="2024-01-01" // Start from current calendar year
                  max="2099-12-31" // To 2099
                  className={`p-2 border rounded-md ${transactionDateRangeError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              {transactionDateRangeError && <p className="text-red-600 text-sm mt-1">{transactionDateRangeError}</p>}
            </div>

            {/* Transaction History Display */}
            <div className="bg-white p-4 rounded-lg shadow-inner flex-grow overflow-y-auto max-h-[400px]">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Account Transaction Records</h3>
              {filterTransactions().length === 0 ? (
                <p className="text-gray-500 text-sm">No transactions found for the selected filters.</p>
              ) : (
                <ul className="space-y-3">
                  {filterTransactions().map((entry) => (
                    <li key={entry.id} className="bg-gray-50 p-3 rounded-md shadow-sm text-sm border-l-4 border-blue-400">
                      <p className="font-semibold text-gray-800">
                        {entry.type} on {entry.timestamp.toLocaleDateString()} {entry.timestamp.toLocaleTimeString()}
                        {entry.status && <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${entry.status === 'Completed' ? 'bg-green-100 text-green-800' : entry.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{entry.status}</span>}
                      </p>
                      <p className="text-gray-700">Account: {entry.accountName} (ID: {entry.accountId})</p>
                      {entry.securityType && <p className="text-gray-600">Security Type: {entry.securityType}</p>}
                      {entry.ticker && <p className="text-gray-600">Ticker: {entry.ticker}</p>}
                      <p className="text-gray-600">Description: {entry.description}</p>
                      <p className={`font-bold ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Amount: ${entry.amount.toFixed(2)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dividends and Profit/Loss Section */}
            <div className="bg-white p-4 rounded-lg shadow-md mt-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Dividends & Profit/Loss Analysis</h3>
              <div className="mb-4">
                <label htmlFor="dividend-security-type" className="block text-sm font-medium text-gray-700 mb-1">Select Security Type:</label>
                <select
                  id="dividend-security-type"
                  value={selectedDividendSecurityType}
                  onChange={(e) => setSelectedDividendSecurityType(e.target.value)}
                  className="block w-full py-2 pl-3 pr-8 text-base bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none cursor-pointer"
                >
                  <option value="All">All Security Types</option>
                  <option value="Stocks">Stocks</option>
                  <option value="ETF">ETF</option>
                  <option value="Bonds">Bonds</option>
                  <option value="Mutual Funds">Mutual Funds</option>
                  <option value="General Investment">General Investment</option>
                </select>
              </div>
              <p className="text-gray-700 text-sm mb-1">Total Dividends (Past 3 Years): <span className="font-bold text-green-600">${totalDividendsPast3Years.toFixed(2)}</span></p>
              <p className="text-gray-700 text-sm">Total Net Profit/Loss (Selected Type): <span className={`font-bold ${totalProfitLossSelectedType >= 0 ? 'text-green-600' : 'text-red-600'}`}>${totalProfitLossSelectedType.toFixed(2)}</span></p>
            </div>

            {/* Download Logs Button */}
            <button
              onClick={handleDownloadLogs}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 mt-4"
              aria-label="Download all transaction logs"
              disabled={filterTransactions().length === 0}
            >
              Download Transaction Logs (CSV)
            </button>
            {showDownloadSuccessNotification && (
              <div className="mt-2 text-center text-green-700 text-sm">
                Logs downloaded successfully!
              </div>
            )}

            {/* Security Message */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-md text-sm text-yellow-800 mt-4">
              <p className="font-bold mb-1">Account Security Reminder:</p>
              <p>Maintaining the security and integrity of your transactional accounts is paramount. All transactions are securely logged and require proper authorization.</p>
            </div>
          </div>
        ) : activeTab === 'Authorization' ? (
          <div className="flex flex-col space-y-4 p-4 bg-blue-100 rounded-lg shadow-md min-h-full items-start">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Application Authorization & Security</h2>
            <p className="text-gray-600 mb-4">
              Securely access your financial aid services with our advanced authorization features.
              Choose your preferred method below.
            </p>

            {/* Authorization Mechanism Dropdown */}
            <div className="relative flex items-center mb-4 w-full max-w-xs">
              <label htmlFor="auth-mechanism-select" className="block text-sm font-medium text-cyan-600 mr-2">Select Mechanism:</label>
              <select
                id="auth-mechanism-select"
                value={selectedAuthMechanism}
                onChange={(e) => setSelectedAuthMechanism(e.target.value)}
                className="block w-full py-2 pl-3 pr-8 text-base bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md appearance-none cursor-pointer"
                aria-label="Choose an authorization mechanism"
              >
                <option value="OAuth 2.0">OAuth 2.0 (Refresh/Auth Tokens)</option>
                <option value="Username/Password">Username/Password (Encrypted Keys)</option>
                <option value="Face Recognition">Face Recognition System</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white mr-1">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
              </div>
            </div>

            {/* Display details based on selected mechanism */}
            <div className="bg-white p-4 rounded-lg shadow-inner w-full">
              {selectedAuthMechanism === 'OAuth 2.0' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">OAuth 2.0 Authorization</h3>
                  <p className="text-gray-700 text-sm">
                    Utilize industry-standard OAuth 2.0 for secure access. This method leverages
                    refresh tokens, authentication tokens, and device codes to keep you logged in
                    for a custom, short period, ensuring enhanced security and convenience.
                  </p>
                  <ul className="list-disc pl-5 text-sm text-gray-600 mt-2">
                    <li>Multi-factor Authentication (MFA) with One-Time Passwords (OTP).</li>
                    <li>Token-based authorization for session management.</li>
                    <li>Python-enabled libraries used for robust backend security.</li>
                  </ul>
                  <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
                    Connect with OAuth
                  </button>
                </div>
              )}
              {selectedAuthMechanism === 'Username/Password' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Username/Password Authorization</h3>
                  <p className="text-gray-700 text-sm">
                    Access your account using automatically encrypted username and password credentials.
                    This system relies on public/private key pairs for secure data exchange, providing
                    a traditional yet fortified login experience.
                  </p>
                  <ul className="list-disc pl-5 text-sm text-gray-600 mt-2">
                    <li>Automated encryption of credentials.</li>
                    <li>Public/private key pair for secure authentication.</li>
                    <li>Designed to be robust against common credential theft methods.</li>
                  </ul>
                  <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200">
                    Login with Encrypted Keys
                  </button>
                </div>
              )}
              {selectedAuthMechanism === 'Face Recognition' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Face Recognition System</h3>
                  <p className="text-gray-700 text-sm">
                    Experience seamless and hassle-free login with our integrated face recognition system.
                    This biometric authentication method eliminates the need for manual inputs, enhancing
                    both security and user convenience.
                  </p>
                  <ul className="list-disc pl-5 text-sm text-gray-600 mt-2">
                    <li>Biometric authentication for quick access.</li>
                    <li>Avoids issues with forgotten passwords.</li>
                    <li>High level of security based on unique facial features.</li>
                  </ul>
                  <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200">
                    Enable Face Recognition
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'Contact' ? (
          <div className="flex flex-col space-y-4 p-4 bg-blue-100 rounded-lg shadow-md min-h-full items-center justify-center text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Contact Our Support Team</h2>
            <p className="text-gray-600 mb-6">
              We are here to help you with any financial challenges or application inquiries.
              Reach out to our dedicated support and admin teams.
            </p>

            <div className="bg-white p-6 rounded-lg shadow-inner w-full max-w-sm space-y-4">
              {/* Support Team */}
              <div>
                <h3 className="flex items-center justify-center text-lg font-bold text-cyan-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.756 3 12c0 2.123.714 4.097 1.904 5.645L3 21l3.523-1.106c.686.91 1.545 1.666 2.477 2.056Z" />
                  </svg>
                  Support Team
                </h3>
                <p className="text-sm font-medium text-gray-800">
                  <span className="text-gray-600">International Toll-Free:</span> +1 (800) 123-4567
                </p>
                <p className="text-sm font-medium text-gray-800">
                  <span className="text-gray-600">Direct Line (DL):</span> +1 (555) 987-6543
                </p>
                <p className="text-sm font-medium text-gray-800">
                  <span className="text-gray-600">Email:</span> support@moneytree.com
                </p>
              </div>

              {/* Admin Team */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="flex items-center justify-center text-lg font-bold text-cyan-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L18.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM17.25 8.25a3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                  </svg>
                  Admin Team
                </h3>
                <p className="text-sm font-medium text-gray-800">
                  <span className="text-gray-600">International Toll-Free:</span> +1 (800) 789-0123
                </p>
                <p className="text-sm font-medium text-gray-800">
                  <span className="text-gray-600">Email:</span> admin@moneytree.com
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Our teams are available 24/7 to ensure consistent and secure assistance for your financial journey.
            </p>
          </div>
        ) : (
          <>
            {/* Original chat message display logic */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.795 2.104c.803.179 1.614.267 2.419.267 1.05 0 1.953-.197 2.81-.502M2.25 18.75V11.25m0 7.5a48.667 48.667 0 007.5 0m-4.5 0h4.5m-7.5 0-.91-.304M15.75 10.5l-3.253 1.085a3 3 0 01-3.007 0L9.75 9.75M4.5 18.75l-.089-.026A8.964 8.964 0 003 16.5M22.5 18.75l-.089-.026A8.964 8.964 0 0121 16.5M16.5 18.75V11.25m0 7.5a48.667 48.667 0 00-7.5 0m7.5 0h-7.5m-9-6.75h9m-9 0a8.964 8.964 0 013-2.25m-9 0v-.375m11.25 0v-.375m0 0a8.964 8.964 0 00-3-2.25M11.25 11.25v-.375M7.5 10.5L4.72 5.59m0 0l-1.637-.428M15.75 10.5l2.78-4.91m0 0 1.637-.428m-4.314 5.337 2.624-.707 2.196-.516M11.25 11.25 13 8.57m-1.75-5.32 2.196-.516" />
                </svg>
                <p>How can Money-Tree help you today?</p>
                <p className="text-sm mt-1">Ask me anything about your financial challenges!</p>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            )}
            {isLoading && (
              <div className="self-start p-3 my-1 rounded-xl rounded-br-xl bg-gray-300 text-gray-800 shadow-md animate-pulse">
                <p className="text-sm">Money-Tree is thinking...</p>
              </div>
            )}
            {error && (
              <div className="self-center p-3 my-2 rounded-lg bg-red-100 text-red-700 border border-red-300 shadow-sm text-sm">
                {error}
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </main>

      {/* Input area - sticky at the bottom, only visible for chat tabs */}
      {/* The chat input area will now only appear if activeTab is explicitly 'Chat'. */}
      {/* If any other tab is active, the input area will be hidden to reflect the app's current state. */}
      {activeTab === 'Chat' && (
        <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200 flex items-center shadow-lg">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your financial question..."
            className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            className="ml-3 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center w-12 h-12"
            disabled={isLoading || input.trim() === ''}
            aria-label="Send message"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Buy/Sell Confirmation Modal */}
      {showBuySellModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-md relative">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {modalActionType === 'buy' ? 'Confirm Buy' : 'Confirm Sale'}
            </h3>
            <button
              onClick={() => setShowBuySellModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <p className="text-gray-700 text-sm mb-1">Ticker: <span className="font-semibold">{activeSymbol}</span></p>
              <p className="text-gray-700 text-sm mb-1">Current Market Price: <span className="font-semibold">${simulatedMarketPrice?.toFixed(2) || 'N/A'}</span></p>
              <p className="text-gray-700 text-sm mb-3">Daily Range: <span className="font-semibold">{simulatedDailyRange || 'N/A'}</span></p>

              <label htmlFor="modal-amount-input" className="block text-sm font-medium text-gray-700 mb-1">Amount to {modalActionType}:</label>
              <div className="relative rounded-md shadow-sm mb-4">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="modal-amount-input"
                  value={amount}
                  onChange={handleAmountChange}
                  className="block w-full rounded-md border-gray-300 pl-7 pr-3 py-2 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                  aria-label={`Amount to ${modalActionType}`}
                  inputMode="numeric"
                  pattern="[0-9]*\.?[0-9]*"
                  disabled={isLoading}
                />
                {modalActionType === 'sell' && maxSellAmount !== null && (
                  <p className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-500">
                    Max available: ${maxSellAmount.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Purchase Type for Buy */}
              {modalActionType === 'buy' && (
                <div className="mb-4">
                  <label htmlFor="purchase-type-select" className="block text-sm font-medium text-gray-700 mb-1">Purchase Type:</label>
                  <select
                    id="purchase-type-select"
                    value={selectedPurchaseType}
                    onChange={(e) => setSelectedPurchaseType(e.target.value as 'market_price' | 'limit_price' | 'next_day_market')}
                    className="block w-full py-2 pl-3 pr-8 text-base bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none cursor-pointer"
                    disabled={isLoading}
                  >
                    <option value="market_price">Current Market Price</option>
                    <option value="limit_price">Limit Price</option>
                    <option value="next_day_market">Execute Trade Next Day (Market Price)</option>
                  </select>
                </div>
              )}

              {/* Limit Price Input Field */}
              {modalActionType === 'buy' && selectedPurchaseType === 'limit_price' && (
                <div className="mb-4">
                  <label htmlFor="limit-price-input" className="block text-sm font-medium text-gray-700 mb-1">Set Limit Price:</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="text"
                      id="limit-price-input"
                      value={limitPrice}
                      onChange={handleLimitPriceChange}
                      className={`block w-full rounded-md border-gray-300 pl-7 pr-3 py-2 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${limitPriceError ? 'border-red-500' : ''}`}
                      placeholder={simulatedMarketPrice ? (simulatedMarketPrice).toFixed(2) : '0.00'}
                      aria-label="Set limit price"
                      inputMode="numeric"
                      pattern="[0-9]*\.?[0-9]*"
                      disabled={isLoading}
                    />
                  </div>
                  {simulatedMarketPrice && (
                    <p className="mt-1 text-xs text-gray-500">
                      Valid range: ${((simulatedMarketPrice || 0) - 2).toFixed(2)} - ${((simulatedMarketPrice || 0) + 2).toFixed(2)}
                    </p>
                  )}
                  {limitPriceError && (
                    <p className="mt-1 text-sm text-red-600">{limitPriceError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBuySellModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmBuySell}
                className={`px-4 py-2 rounded-md transition-colors duration-200
                  ${modalActionType === 'buy' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}
                  text-white focus:outline-none focus:ring-2 focus:ring-offset-2`}
                // Fix: Explicitly convert limitPriceError to boolean for disabled prop
                disabled={isLoading || !isAmountValid(amount) || (modalActionType === 'buy' && selectedPurchaseType === 'limit_price' && (!!limitPriceError || !isAmountValid(limitPrice)))}
              >
                {isLoading ? 'Processing...' : `Confirm ${modalActionType === 'buy' ? 'Buy' : 'Sale'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Confirmation Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-md relative">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Confirm Transfer</h3>
            <button
              onClick={() => setShowTransferModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              {/* From Ticker Selection */}
              <div className="relative flex flex-col mb-4">
                <label htmlFor="from-ticker-select" className="block text-sm font-medium text-gray-700 mb-1">From Ticker:</label>
                <select
                  id="from-ticker-select"
                  value={fromTicker}
                  onChange={handleFromTickerChange}
                  className="block w-full py-2 pl-3 pr-8 text-base bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none cursor-pointer"
                  aria-label="Choose the ticker to transfer from"
                  disabled={isLoading}
                >
                  <option value="">Select From Ticker</option>
                  {portfolioHoldings?.filter(h => h.shares > 0).map((holding) => (
                    <option key={holding.ticker} value={holding.ticker}>{holding.ticker}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 mr-1 mt-6">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
                </div>
                {fromTickerHoldingValue !== null && (
                  <p className="text-xs text-gray-600 mt-1">Current Holding Value: ${fromTickerHoldingValue.toFixed(2)}</p>
                )}
              </div>

              {/* To Ticker Selection */}
              <div className="relative flex flex-col mb-4">
                <label htmlFor="to-ticker-select" className="block text-sm font-medium text-gray-700 mb-1">To Ticker:</label>
                <select
                  id="to-ticker-select"
                  value={toTicker}
                  onChange={handleToTickerChange}
                  className="block w-full py-2 pl-3 pr-8 text-base bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none cursor-pointer"
                  aria-label="Choose the ticker to transfer to"
                  disabled={isLoading}
                >
                  <option value="">Select To Ticker</option>
                  {allTradableTickers.map((ticker) => (
                    <option key={ticker} value={ticker}>{ticker}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 mr-1 mt-6">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
                </div>
                {toTickerCurrentPrice !== null && (
                  <p className="text-xs text-gray-600 mt-1">Current Market Price: ${toTickerCurrentPrice.toFixed(2)}</p>
                )}
              </div>

              {/* Amount to Transfer Input */}
              <label htmlFor="transfer-amount-input" className="block text-sm font-medium text-gray-700 mb-1">Amount to Transfer:</label>
              <div className="relative rounded-md shadow-sm mb-4">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="transfer-amount-input"
                  value={transferAmount}
                  onChange={handleTransferAmountChange}
                  className="block w-full rounded-md border-gray-300 pl-7 pr-3 py-2 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                  aria-label="Amount to transfer"
                  inputMode="numeric"
                  pattern="[0-9]*\.?[0-9]*"
                  disabled={isLoading}
                />
                {maxTransferAmount !== null && (
                  <p className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-500">
                    Max available: ${maxTransferAmount.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmTransfer}
                className={`px-4 py-2 rounded-md transition-colors duration-200 bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white focus:outline-none focus:ring-2 focus:ring-offset-2`}
                disabled={isLoading || !fromTicker || !toTicker || fromTicker === toTicker || !isAmountValid(transferAmount) || (maxTransferAmount !== null && parseFloat(transferAmount) > maxTransferAmount)}
              >
                {isLoading ? 'Processing...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;