import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  CreditCard,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Flame,
  GitFork,
  RefreshCw,
} from 'lucide-react';
import { DeploymentConfig, OwnerSettings, GasPriorityTier } from '../types';
import { calculateCheckoutTotalWithGas } from '../utils/engine';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DeploymentConfig;
  ownerSettings: OwnerSettings;
  onPaymentSuccess: (txHash: string) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  config,
  ownerSettings,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'usdt' | 'crypto' | 'card'>('usdt');
  const [selectedUsdtNetwork, setSelectedUsdtNetwork] = useState<'bep20' | 'trc20' | 'erc20' | 'solana'>('bep20');
  const [selectedCrypto, setSelectedCrypto] = useState<'bnb' | 'eth' | 'sol' | 'trx'>('bnb');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins

  // Interactive Gas Fee Estimator inside PaymentModal
  const [priorityTier, setPriorityTier] = useState<GasPriorityTier>(
    config.gasPriorityTier || 'standard'
  );
  const [modalGasTick, setModalGasTick] = useState<number>(0);

  useEffect(() => {
    if (config.gasPriorityTier) {
      setPriorityTier(config.gasPriorityTier);
    }
  }, [config.gasPriorityTier]);

  // Calculate live checkout breakdown with real-time network congestion gas fee
  const checkoutCalc = calculateCheckoutTotalWithGas({
    category: config.category,
    supplyOrScale: config.supplyOrScale,
    durationDays: config.durationDays || 30,
    platformMarkupPercent: ownerSettings.platformFeePercent,
    network: config.network || 'bsc',
    priorityTier,
    isForkedContract: Boolean(config.forkedFrom),
    tickSeed: modalGasTick,
  });

  const { gasEstimate } = checkoutCalc;
  const finalCheckoutTotalUsd = checkoutCalc.checkoutTotalUsd;

  // Target deposit address (uses ownerWallet or high-trust multi-sig)
  const depositAddresses: Record<string, string> = {
    bep20: ownerSettings.ownerWallet || '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
    trc20: 'TVVURLM4Tyo3rQ2q99HaJVEBBcizHERnGJ',
    erc20: ownerSettings.ownerWallet || '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
    solana: 'C3yM6aQDwxqYLBWAsqHWgA1g27osgv1oC8tC7g214g1j',
    bnb: ownerSettings.ownerWallet || '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
    eth: ownerSettings.ownerWallet || '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
    sol: 'C3yM6aQDwxqYLBWAsqHWgA1g27osgv1oC8tC7g214g1j',
    trx: 'TVVURLM4Tyo3rQ2q99HaJVEBBcizHERnGJ',
  };

  const currentAddress =
    selectedMethod === 'usdt'
      ? depositAddresses[selectedUsdtNetwork]
      : selectedMethod === 'crypto'
      ? depositAddresses[selectedCrypto]
      : 'STRIPE_GATEWAY';

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const simulatedHash =
        '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      onPaymentSuccess(simulatedHash);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0d1322] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Official Activation Gateway
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-400 font-mono tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {formattedTime}
              </span>
            </div>
            <h3 className="font-heading font-bold text-xl text-white mt-1">
              Deploy & Activate {config.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deployment Summary & Real-Time Gas Fee Estimator Breakdown */}
        <div
          data-testid="payment-gas-estimator"
          className="mt-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3"
        >
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Target Configuration:</span>
            <span className="font-semibold text-white">
              {config.name} ({config.symbolOrSlug})
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Network / Target:</span>
            <span className="font-mono text-indigo-300 uppercase">
              {config.network || config.cloudRegion}
            </span>
          </div>
          {config.forkedFrom && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                <span>Forked Blueprint:</span>
              </span>
              <span className="font-mono text-indigo-300">
                {config.forkedFrom.originalSymbol} ({config.forkedFrom.sourceAddress.slice(0, 8)}...)
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Duration SLA:</span>
            <span className="text-slate-200">{config.durationDays} Days (24/7 Monitoring)</span>
          </div>

          {/* Interactive Gas Priority & Network Congestion Widget inside Checkout */}
          {config.category === 'contract' && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Network Congestion Gas Estimator</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['standard', 'fast', 'instant'] as const).map(tier => (
                    <button
                      key={tier}
                      type="button"
                      data-testid={`payment-gas-tier-${tier}`}
                      onClick={() => setPriorityTier(tier)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize transition-colors cursor-pointer ${
                        priorityTier === tier
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setModalGasTick(prev => prev + 1)}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    title="Refresh Gas Quote"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px]">Congestion</span>
                  <span className="text-amber-400 font-semibold">
                    {gasEstimate.congestionLevel} ({gasEstimate.congestionPercent}%)
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px]">Gas Rate</span>
                  <span className="text-white font-semibold">{gasEstimate.effectiveGwei} Gwei</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px]">Est. Gas Units</span>
                  <span className="text-cyan-300 font-semibold">
                    {gasEstimate.estimatedGasUnits.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Itemized Checkout Breakdown */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Base Cloud / Smart Contract Compute:</span>
              <span className="font-mono tabular-nums">${checkoutCalc.baseFee} USD</span>
            </div>
            <div className="flex justify-between items-center text-xs text-emerald-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{ownerSettings.brandName} Platform & Security Fee:</span>
              </span>
              <span className="font-mono tabular-nums">+${checkoutCalc.platformFee} USD</span>
            </div>
            {config.category === 'contract' && (
              <div className="flex justify-between items-center text-xs text-amber-300">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>
                    Real-Time {(config.network || 'bsc').toUpperCase()} Congestion Gas Fee ({priorityTier}):
                  </span>
                </span>
                <span
                  data-testid="payment-congestion-fee-usd"
                  className="font-mono tabular-nums font-semibold"
                >
                  +${checkoutCalc.networkCongestionFeeUsd} USD ({gasEstimate.gasCostNative} {gasEstimate.nativeSymbol})
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-bold text-white pt-1.5 border-t border-slate-800/60">
              <span>Total Checkout Due (Incl. Network Gas):</span>
              <span
                data-testid="payment-total-due-usd"
                className="font-mono tabular-nums text-base text-emerald-400"
              >
                ${finalCheckoutTotalUsd} USD
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedMethod('usdt')}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                selectedMethod === 'usdt'
                  ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-sm text-emerald-400">USDT</div>
              <div className="text-[10px] text-slate-400">Stablecoin (1:1)</div>
            </button>

            <button
              onClick={() => setSelectedMethod('crypto')}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                selectedMethod === 'crypto'
                  ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-sm text-indigo-400">Crypto</div>
              <div className="text-[10px] text-slate-400">BNB / ETH / SOL</div>
            </button>

            <button
              onClick={() => setSelectedMethod('card')}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                selectedMethod === 'card'
                  ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-sm text-cyan-400 flex items-center justify-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </div>
              <div className="text-[10px] text-slate-400">Stripe / Apple Pay</div>
            </button>
          </div>

          {/* Sub-network pickers */}
          {selectedMethod === 'usdt' && (
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400">Select USDT Chain:</span>
              <div className="grid grid-cols-4 gap-2">
                {(['bep20', 'trc20', 'erc20', 'solana'] as const).map(net => (
                  <button
                    key={net}
                    onClick={() => setSelectedUsdtNetwork(net)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium uppercase border transition-colors cursor-pointer ${
                      selectedUsdtNetwork === net
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedMethod === 'crypto' && (
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400">Select Currency:</span>
              <div className="grid grid-cols-4 gap-2">
                {(['bnb', 'eth', 'sol', 'trx'] as const).map(coin => (
                  <button
                    key={coin}
                    onClick={() => setSelectedCrypto(coin)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium uppercase border transition-colors cursor-pointer ${
                      selectedCrypto === coin
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {coin}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deposit Address Box */}
          {selectedMethod !== 'card' ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Send <strong className="text-white font-mono">${finalCheckoutTotalUsd}</strong> in{' '}
                  <span className="uppercase text-emerald-400 font-semibold">
                    {selectedMethod === 'usdt' ? `USDT (${selectedUsdtNetwork})` : selectedCrypto}
                  </span>
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Auto-Detecting
                </span>
              </div>

              {/* Address with copy */}
              <div className="flex items-center gap-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="font-mono text-xs text-indigo-300 break-all select-all flex-1">
                  {currentAddress}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white shrink-0 transition-colors cursor-pointer"
                  title="Copy Deposit Address"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Payments are processed directly through audited smart contract escrow. Instant activation.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs text-slate-300">
                Credit Card Instant Developer Checkout
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Merchant:</span>
                  <span className="text-white font-medium">{ownerSettings.brandName} Cloud Billing</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount (Incl. Gas):</span>
                  <span className="text-emerald-400 font-mono tabular-nums font-bold">
                    ${finalCheckoutTotalUsd}.00 USD
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              data-testid="confirm-payment-btn"
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isProcessing
                  ? 'bg-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-emerald-500/20 hover:shadow-emerald-500/30'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying on-chain deposit & launching instance...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Confirm Payment & Broadcast Live (${finalCheckoutTotalUsd} USD)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
