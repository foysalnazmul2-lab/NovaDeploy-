import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CryptoTicker } from '../types';

export interface FormattedCryptoTicker extends CryptoTicker {
  priceDisplay: string;
  changeDisplay: string;
}

export const INITIAL_DEPLOY_LAB_TICKERS: FormattedCryptoTicker[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    priceUsd: 2252.86,
    change24h: 1.13,
    priceDisplay: '$2,252.86',
    changeDisplay: '+1.13%',
  },
  {
    id: 'binancecoin',
    name: 'BNB Chain',
    symbol: 'BNB',
    priceUsd: 706.2,
    change24h: 1.37,
    priceDisplay: '$706.2',
    changeDisplay: '+1.37%',
  },
  {
    id: 'matic-network',
    name: 'Polygon',
    symbol: 'MATIC',
    priceUsd: 0.1262,
    change24h: 0.0,
    priceDisplay: '$0.1262',
    changeDisplay: '+0.00%',
  },
  {
    id: 'tron',
    name: 'TRON',
    symbol: 'TRX',
    priceUsd: 0.3072,
    change24h: -7.49,
    priceDisplay: '$0.3072',
    changeDisplay: '-7.49%',
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    priceUsd: 95.88,
    change24h: 1.67,
    priceDisplay: '$95.88',
    changeDisplay: '+1.67%',
  },
];

export function TickerBar() {
  const [tickers, setTickers] = useState<FormattedCryptoTicker[]>(INITIAL_DEPLOY_LAB_TICKERS);

  // Subtle live market pulse after initial render while preserving exact baseline format
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev =>
        prev.map(t => {
          const delta = (Math.random() - 0.49) * 0.12;
          const nextPrice = t.priceUsd * (1 + delta / 100);
          let priceDisplay = t.priceDisplay;
          if (t.symbol === 'ETH') {
            priceDisplay = `$${nextPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else if (t.symbol === 'BNB') {
            priceDisplay = `$${nextPrice.toFixed(1)}`;
          } else if (t.symbol === 'MATIC' || t.symbol === 'TRX') {
            priceDisplay = `$${nextPrice.toFixed(4)}`;
          } else if (t.symbol === 'SOL') {
            priceDisplay = `$${nextPrice.toFixed(2)}`;
          }
          return {
            ...t,
            priceUsd: nextPrice,
            priceDisplay,
          };
        })
      );
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      data-testid="crypto-ticker-bar"
      className="w-full bg-[#060a12] border-b border-slate-800/80 text-xs py-2.5 px-4 select-none overflow-hidden"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="hidden md:flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">Deploy Lab Mainnet Oracles</span>
          <span className="text-slate-600">·</span>
          <span>6 Blockchains Operational</span>
        </div>

        <div className="flex items-center justify-center md:justify-end gap-5 sm:gap-7 overflow-x-auto py-0.5 scrollbar-none w-full md:w-auto">
          {tickers.map(ticker => {
            const isUp = ticker.change24h >= 0;
            return (
              <div
                key={ticker.id}
                data-testid={`ticker-item-${ticker.symbol.toLowerCase()}`}
                className="flex items-center gap-2 font-mono tabular-nums text-xs shrink-0"
              >
                <span className="text-slate-300 font-bold">{ticker.symbol}</span>
                <span className="text-white font-semibold">{ticker.priceDisplay}</span>
                <span
                  className={`inline-flex items-center text-[11px] font-semibold ${
                    isUp ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                  )}
                  {ticker.changeDisplay}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

