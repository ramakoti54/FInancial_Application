import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { CandlestickData, PortfolioHolding } from "./../types";

// Ensure process.env.API_KEY is available in your environment for this to work.
// In a real-world scenario, for client-side applications, it's safer to proxy
// API calls through a backend to protect your API key.
// For this challenge, we assume process.env.API_KEY is properly configured and accessible.

interface GeminiGenerateContentParams {
  prompt: string;
  history?: { role: string; parts: { text: string; }[] }[];
}

const QUOTA_EXCEEDED_MESSAGE = `You've exceeded your API quota. Please check your Google AI Studio billing and usage to resolve this. More info: https://ai.google.dev/gemini-api/docs/rate-limits`;

// --- MOCK DATA GENERATORS (Fallbacks for API Quota Limits) ---

function getMockFinancialAdvice(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('buy')) {
    return "Based on current simulated market trends, buying now could be a strategic move if you have a long-term horizon. However, volatility is high. Consider dollar-cost averaging rather than a lump sum investment. Always ensure this aligns with your risk tolerance.";
  }
  if (p.includes('sell')) {
    return "Selling at current levels might help realize short-term gains, especially if the asset has reached your target price. However, consider the tax implications and your long-term portfolio balance before executing this trade.";
  }
  if (p.includes('transfer')) {
    return "Transferring funds between assets is a good way to rebalance your portfolio. Ensure that you are moving capital from over-weighted sectors to under-valued opportunities. Watch out for any transaction fees or tax events triggered by the sale of the source asset.";
  }
  return "I am currently operating in simulated mode due to high API traffic. Generally, maintaining a diversified portfolio and focusing on long-term value is recommended. Please review your specific investment goals.";
}

function getMockCandlestickData(ticker: string, timeRange: string): CandlestickData[] {
  const data: CandlestickData[] = [];
  const points = 30;
  let currentPrice = 150 + Math.random() * 100; // Random starting price
  const now = new Date();

  // Adjust interval based on timeRange
  let timeInterval = 24 * 60 * 60 * 1000; // Default 1 day
  if (timeRange === '1hr' || timeRange === '24hrs') timeInterval = 60 * 60 * 1000; 

  for (let i = points; i >= 0; i--) {
    const date = new Date(now.getTime() - i * timeInterval);
    const open = currentPrice;
    const volatility = currentPrice * 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * volatility * 2;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;

    data.push({
      date: date.toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      min: parseFloat(low.toFixed(2)), // Simplified
      max: parseFloat(high.toFixed(2)), // Simplified
      mean: parseFloat(((high + low) / 2).toFixed(2)),
      median: parseFloat(((open + close) / 2).toFixed(2)),
    });
    currentPrice = close;
  }
  return data;
}

function getMockPortfolioHoldings(): PortfolioHolding[] {
  return [
    { securityType: 'Stocks', ticker: 'AAPL', shares: 15, avgCost: 145.50, currentPrice: 175.20, marketValue: 2628.00, gainLoss: 445.50 },
    { securityType: 'Stocks', ticker: 'MSFT', shares: 10, avgCost: 280.00, currentPrice: 310.50, marketValue: 3105.00, gainLoss: 305.00 },
    { securityType: 'ETF', ticker: 'SPY', shares: 5, avgCost: 410.00, currentPrice: 435.00, marketValue: 2175.00, gainLoss: 125.00 },
    { securityType: 'Bonds', ticker: 'BND', shares: 50, avgCost: 75.00, currentPrice: 72.50, marketValue: 3625.00, gainLoss: -125.00 },
    { securityType: 'Mutual Funds', ticker: 'VTSAX', shares: 20, avgCost: 90.00, currentPrice: 105.00, marketValue: 2100.00, gainLoss: 300.00 },
  ];
}


// --- MAIN SERVICE FUNCTIONS ---

/**
 * Initializes the GoogleGenAI client and sends a content generation request.
 * Falls back to mock data if API quota is exceeded.
 */
export async function generateFinancialAdvice(
  params: GeminiGenerateContentParams,
): Promise<string> {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found, using mock data.");
    return getMockFinancialAdvice(params.prompt);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: params.history || [],
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 1024,
        systemInstruction: "You are a helpful and knowledgeable financial aid advisor named Money-Tree. Provide clear, concise, and helpful advice on financial challenges. Keep responses under 200 words unless more detail is explicitly requested. Always be encouraging and understanding.",
      },
    });

    const result: GenerateContentResponse = await chat.sendMessage({ message: params.prompt });
    return result.text;

  } catch (error) {
    console.error("Error generating financial advice (falling back to mock):", error);
    // Fallback for any error, specifically handling 429 implicitly by returning mock
    return getMockFinancialAdvice(params.prompt);
  }
}

/**
 * Generates historical stock data. 
 * Falls back to mock data if API quota is exceeded.
 */
export async function generateHistoricalChartData(
  ticker: string,
  timeRange: string,
): Promise<CandlestickData[]> {
  if (!process.env.API_KEY) {
    return getMockCandlestickData(ticker, timeRange);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Generate mock historical stock data for ${ticker} for the last ${timeRange}. Provide approximately 10-20 data points representing daily/hourly candles depending on the range. Each data point should be an object with 'date' (string, e.g., 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DD'), 'open', 'high', 'low', 'close', 'min', 'max', 'mean', and 'median' prices (all numbers). Ensure 'high' >= 'open', 'high' >= 'close', 'low' <= 'open', 'low' <= 'close'. Ensure 'max' >= 'high' and 'min' <= 'low'.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              open: { type: Type.NUMBER },
              high: { type: Type.NUMBER },
              low: { type: Type.NUMBER },
              close: { type: Type.NUMBER },
              min: { type: Type.NUMBER },
              max: { type: Type.NUMBER },
              mean: { type: Type.NUMBER },
              median: { type: Type.NUMBER },
            },
            required: ['date', 'open', 'high', 'low', 'close', 'min', 'max', 'mean', 'median'],
          },
        },
      },
    });

    const jsonStr = response.text.trim();
    if (!jsonStr.startsWith('[') || !jsonStr.endsWith(']')) {
      throw new Error('API did not return a valid JSON array for historical data.');
    }
    return JSON.parse(jsonStr) as CandlestickData[];
  } catch (error) {
    console.error(`Error generating historical chart data for ${ticker} (falling back to mock):`, error);
    return getMockCandlestickData(ticker, timeRange);
  }
}

/**
 * Generates portfolio holdings data.
 * Falls back to mock data if API quota is exceeded.
 */
export async function generatePortfolioHoldings(): Promise<PortfolioHolding[]> {
  if (!process.env.API_KEY) {
    return getMockPortfolioHoldings();
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Generate mock portfolio holdings data for a typical investment account. Include a mix of 3-5 securities across Stocks, ETFs, Bonds, and Mutual Funds. Each item should have 'securityType' (string), 'ticker' (string, e.g., 'AAPL', 'SPY', 'BND', 'VFINX'), 'shares' (number), 'avgCost' (number), 'currentPrice' (number), 'marketValue' (number), and 'gainLoss' (number). Ensure realistic values where currentPrice is often different from avgCost.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              securityType: { type: Type.STRING, description: 'Type of security, e.g., Stock, ETF, Bond, Mutual Fund.' },
              ticker: { type: Type.STRING, description: 'Ticker symbol or identifier for the security.' },
              shares: { type: Type.NUMBER, description: 'Number of shares or units held.' },
              avgCost: { type: Type.NUMBER, description: 'Average cost per share/unit.' },
              currentPrice: { type: Type.NUMBER, description: 'Current market price per share/unit.' },
              marketValue: { type: Type.NUMBER, description: 'Total market value (shares * currentPrice).' },
              gainLoss: { type: Type.NUMBER, description: 'Unrealized gain or loss.' },
            },
            required: ['securityType', 'ticker', 'shares', 'avgCost', 'currentPrice', 'marketValue', 'gainLoss'],
          },
        },
      },
    });

    const jsonStr = response.text.trim();
    if (!jsonStr.startsWith('[') || !jsonStr.endsWith(']')) {
      throw new Error('API did not return a valid JSON array for portfolio holdings.');
    }
    return JSON.parse(jsonStr) as PortfolioHolding[];
  } catch (error) {
    console.error("Error generating portfolio holdings (falling back to mock):", error);
    return getMockPortfolioHoldings();
  }
}
