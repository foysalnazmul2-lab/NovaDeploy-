import { useState, useEffect } from 'react';
import {
  Rocket,
  Shield,
  Server,
  ArrowRight,
  AlertCircle,
  Clock,
  Coins,
  Flame,
  GitFork,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Zap,
  Activity,
  X,
} from 'lucide-react';
import {
  DeploymentCategory,
  BlockchainNetwork,
  DeploymentConfig,
  OwnerSettings,
  GasPriorityTier,
  ForkedContractMetadata,
} from '../types';
import {
  generateSymbolFromName,
  validateRecipientAddress,
  calculateCheckoutTotalWithGas,
  inspectForkableContract,
  createForkedContractBlueprint,
  CURATED_FORKABLE_CONTRACTS,
  ForkableContractInspection,
  parseTokenSupply,
} from '../utils/engine';
import { GasEstimator, GasEstimatorReport } from '../utils/gas';

interface DeployWizardProps {
  ownerSettings: OwnerSettings;
  walletConnected: boolean;
  walletAddress: string;
  onStartCompilation: (config: DeploymentConfig) => void;
}

const NETWORKS: {
  id: BlockchainNetwork;
  name: string;
  standard: string;
  decimals: number;
  badge: string;
  iconLetter: string;
  color: string;
  placeholder: string;
}[] = [
  {
    id: 'bsc',
    name: 'BNB Chain',
    standard: 'BEP-20',
    decimals: 18,
    badge: 'Low Gas & High Speed',
    iconLetter: 'B',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    placeholder: '0x... (BEP-20 wallet address)',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    standard: 'ERC-20',
    decimals: 18,
    badge: 'DeFi Standard',
    iconLetter: 'Ξ',
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
    placeholder: '0x... (ERC-20 wallet address)',
  },
  {
    id: 'solana',
    name: 'Solana',
    standard: 'SPL Token',
    decimals: 9,
    badge: 'Sub-second Finality',
    iconLetter: 'S',
    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
    placeholder: 'Solana wallet address (Base58)',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    standard: 'ERC-20',
    decimals: 18,
    badge: 'Scalable POS',
    iconLetter: 'P',
    color: 'from-violet-500/20 to-indigo-500/10 border-violet-500/30 text-violet-400',
    placeholder: '0x... (Polygon wallet address)',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    standard: 'L2 Nitro',
    decimals: 18,
    badge: 'Low-cost Rollup',
    iconLetter: 'A',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400',
    placeholder: '0x... (Arbitrum wallet address)',
  },
  {
    id: 'tron',
    name: 'TRON',
    standard: 'TRC-20',
    decimals: 6,
    badge: 'High Throughput',
    iconLetter: 'T',
    color: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400',
    placeholder: 'T... (TRC-20 wallet address)',
  },
];

const TOKEN_SUPPLY_OPTIONS = [50000, 100000, 250000, 500000];
const DURATION_OPTIONS = [7, 30, 60, 90];

export function DeployWizard({
  ownerSettings,
  walletConnected,
  walletAddress,
  onStartCompilation,
}: DeployWizardProps) {
  const [activeCategory, setActiveCategory] = useState<DeploymentCategory>('contract');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Core Form States
  const [tokenName, setTokenName] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<BlockchainNetwork>('bsc');
  const [selectedSupply, setSelectedSupply] = useState<number>(100000);
  const [customDecimals, setCustomDecimals] = useState<number | null>(null);
  const [recipientAddress, setRecipientAddress] = useState(
    walletAddress || '0x71C8364437a9B2f520330D0a0fC62A864114dD8b'
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Gas Fee Estimator States
  const [gasPriorityTier, setGasPriorityTier] = useState<GasPriorityTier>('standard');
  const [gasTickSeed, setGasTickSeed] = useState<number>(0);

  // Contract Forking States (Ethereum & BSC)
  const [isForkPanelOpen, setIsForkPanelOpen] = useState<boolean>(false);
  const [forkChain, setForkChain] = useState<'ethereum' | 'bsc'>('ethereum');
  const [forkAddressInput, setForkAddressInput] = useState<string>('');
  const [forkError, setForkError] = useState<string | null>(null);
  const [isFetchingFork, setIsFetchingFork] = useState<boolean>(false);
  const [forkInspection, setForkInspection] = useState<ForkableContractInspection | null>(null);
  const [forkTransferTax, setForkTransferTax] = useState<number>(0);
  const [forkBurnable, setForkBurnable] = useState<boolean>(true);
  const [forkMintable, setForkMintable] = useState<boolean>(false);

  // Sync wallet address if connected
  useEffect(() => {
    if (walletConnected && walletAddress) {
      setRecipientAddress(walletAddress);
    }
  }, [walletConnected, walletAddress]);

  // Periodic live gas mempool tick every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setGasTickSeed(prev => prev + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentNetworkObj = NETWORKS.find(n => n.id === selectedNetwork) || NETWORKS[0];
  const effectiveSymbol =
    customSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) ||
    generateSymbolFromName(tokenName);
  const effectiveDecimals = customDecimals ?? currentNetworkObj.decimals;

  // Build active ForkedContractMetadata if a source contract is cloned
  const activeForkMetadata: ForkedContractMetadata | undefined =
    forkInspection && forkInspection.valid
      ? createForkedContractBlueprint({
          inspection: forkInspection,
          updatedName: tokenName,
          updatedSymbol: effectiveSymbol,
          updatedSupply: selectedSupply,
          updatedDecimals: effectiveDecimals,
          customTransferTaxPercent: forkTransferTax,
          burnableEnabled: forkBurnable,
          mintableEnabled: forkMintable,
        }).forkMetadata
      : undefined;

  // Real-time Gas Fee Estimator + Total Checkout calculation
  const checkoutCalc = calculateCheckoutTotalWithGas({
    category: activeCategory,
    supplyOrScale: selectedSupply,
    durationDays: selectedDuration,
    platformMarkupPercent: ownerSettings.platformFeePercent,
    network: selectedNetwork,
    priorityTier: gasPriorityTier,
    isForkedContract: Boolean(activeForkMetadata),
    tickSeed: gasTickSeed,
  });

  const { gasEstimate } = checkoutCalc;

  // 6-Blockchain Real-Time Network Fee Estimator via GasEstimator (src/utils/gas.ts)
  const [allChainsGasReport, setAllChainsGasReport] = useState<GasEstimatorReport>(() =>
    GasEstimator.getBaselineEstimates({
      priorityTier: 'standard',
      isForkedContract: false,
      tickSeed: 0,
    })
  );
  const [isFetchingAllChainsGas, setIsFetchingAllChainsGas] = useState<boolean>(false);

  const handleRefreshAllChainsGas = async (nextSeed?: number) => {
    const seedToUse = typeof nextSeed === 'number' ? nextSeed : gasTickSeed + 1;
    setGasTickSeed(seedToUse);
    setIsFetchingAllChainsGas(true);
    try {
      const liveReport = await GasEstimator.fetchRealtimeGasCosts({
        priorityTier: gasPriorityTier,
        isForkedContract: Boolean(activeForkMetadata),
        tickSeed: seedToUse,
      });
      setAllChainsGasReport(liveReport);
    } finally {
      setIsFetchingAllChainsGas(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsFetchingAllChainsGas(true);
    GasEstimator.fetchRealtimeGasCosts({
      priorityTier: gasPriorityTier,
      isForkedContract: Boolean(activeForkMetadata),
      tickSeed: gasTickSeed,
    })
      .then(report => {
        if (!cancelled) {
          setAllChainsGasReport(report);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetchingAllChainsGas(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gasPriorityTier, Boolean(activeForkMetadata), gasTickSeed]);

  // Helper to decode simple ABI string or uint8/uint256 from eth_call if live RPC responds
  const tryFetchLiveEvmMetadata = async (
    address: string,
    chain: 'ethereum' | 'bsc'
  ): Promise<{ name?: string; symbol?: string; decimals?: number } | undefined> => {
    const rpcUrl =
      chain === 'ethereum'
        ? 'https://ethereum-rpc.publicnode.com'
        : 'https://bsc-rpc.publicnode.com';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1100);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: address, data: '0x313ce567' }, 'latest'], // decimals()
          },
        ]),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return undefined;
      const json = await response.json();
      const decHex = Array.isArray(json) ? json[0]?.result : json?.result;
      if (typeof decHex === 'string' && decHex.startsWith('0x') && decHex.length >= 4) {
        const parsedDec = parseInt(decHex, 16);
        if (Number.isFinite(parsedDec) && parsedDec >= 0 && parsedDec <= 36) {
          return { decimals: parsedDec };
        }
      }
      return undefined;
    } catch {
      clearTimeout(timeoutId);
      return undefined;
    }
  };

  const handleInspectAndForkContract = async (
    overrideAddr?: string,
    overrideChain?: 'ethereum' | 'bsc'
  ) => {
    const targetAddr = (overrideAddr ?? forkAddressInput).trim();
    const targetChain = overrideChain ?? forkChain;

    setForkError(null);
    const initialCheck = inspectForkableContract({
      address: targetAddr,
      chain: targetChain,
    });

    if (!initialCheck.valid) {
      setForkError(initialCheck.error || 'Invalid Ethereum / BSC contract address');
      setForkInspection(null);
      return;
    }

    setIsFetchingFork(true);
    const liveData = await tryFetchLiveEvmMetadata(targetAddr, targetChain);
    const finalInspection = inspectForkableContract({
      address: targetAddr,
      chain: targetChain,
      liveRpcOverride: liveData,
    });
    setIsFetchingFork(false);

    setForkInspection(finalInspection);
    setActiveCategory('contract');
    setSelectedNetwork(targetChain);
    setTokenName(finalInspection.recommendedCloneName);
    setCustomSymbol(finalInspection.recommendedCloneSymbol);
    setSelectedSupply(finalInspection.originalSupply);
    setCustomDecimals(finalInspection.originalDecimals);
  };

  const handleClearFork = () => {
    setForkInspection(null);
    setForkAddressInput('');
    setForkError(null);
    setCustomSymbol('');
    setCustomDecimals(null);
    setForkTransferTax(0);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;
    setCurrentStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveAddress =
      recipientAddress.trim() || walletAddress || '0x71C8364437a9B2f520330D0a0fC62A864114dD8b';
    const validation = validateRecipientAddress(selectedNetwork, effectiveAddress);
    if (!validation.valid) {
      setAddressError(validation.error || 'Invalid address');
      return;
    }
    setAddressError(null);

    const config: DeploymentConfig = {
      id: Math.random().toString(36).substring(2, 10),
      category: activeCategory,
      name: tokenName.trim(),
      symbolOrSlug: effectiveSymbol,
      network: selectedNetwork,
      supplyOrScale: selectedSupply,
      recipientOrOwner: effectiveAddress,
      durationDays: selectedDuration,
      decimals: effectiveDecimals,
      createdAt: new Date().toISOString(),
      status: 'compiling',
      feeUsd: checkoutCalc.checkoutTotalUsd,
      platformMarginUsd: checkoutCalc.ownerProfit,
      baseDeploymentFeeUsd: checkoutCalc.subtotalBeforeGasUsd,
      networkCongestionFeeUsd: checkoutCalc.networkCongestionFeeUsd,
      gasPriorityTier,
      gasEstimate: checkoutCalc.gasEstimate,
      forkedFrom: activeForkMetadata,
    };

    onStartCompilation(config);
  };

  return (
    <div id="wizard" className="w-full max-w-4xl mx-auto py-8">
      {/* Category Tabs: Smart Contracts vs Cloud Container Apps */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setActiveCategory('contract');
              setCurrentStep(1);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeCategory === 'contract'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Smart Contract & Token</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('cloud_app');
              setCurrentStep(1);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeCategory === 'cloud_app'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Cloud App & Microservice</span>
          </button>
        </div>

        {/* 1-Click Quick Templates & Contract Forking Trigger Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-[11px] text-slate-500 font-medium">Quick Templates:</span>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('contract');
              setTokenName('NexusCore');
              setCustomSymbol('NEXU');
              setSelectedNetwork('bsc');
              setSelectedSupply(100000);
              setSelectedDuration(30);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-amber-300 font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            BSC Token
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('contract');
              setTokenName('Solara');
              setCustomSymbol('SOLA');
              setSelectedNetwork('solana');
              setSelectedSupply(250000);
              setSelectedDuration(60);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-purple-300 font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Solana SPL
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('contract');
              setTokenName('EtherPulse');
              setCustomSymbol('EPUL');
              setSelectedNetwork('ethereum');
              setSelectedSupply(50000);
              setSelectedDuration(90);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-blue-300 font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Ethereum ERC-20
          </button>
          <button
            type="button"
            data-testid="toggle-fork-panel-btn"
            onClick={() => {
              setActiveCategory('contract');
              setCurrentStep(1);
              setIsForkPanelOpen(prev => !prev);
            }}
            className={`px-3 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isForkPanelOpen || forkInspection
                ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                : 'bg-slate-900 hover:bg-slate-800 border-indigo-500/40 text-indigo-300'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fork Existing ETH / BSC Contract</span>
          </button>
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="relative rounded-3xl bg-[#0c1322]/90 border border-slate-700/80 p-6 sm:p-10 shadow-2xl glass-panel-elevated">
        {/* Step indicator breadcrumbs */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}
            >
              1
            </span>
            <span className={`text-xs font-semibold ${currentStep === 1 ? 'text-white' : 'text-slate-400'}`}>
              Configuration
            </span>
            <span className="text-slate-600">—</span>
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={`text-xs font-semibold ${currentStep === 2 ? 'text-white' : 'text-slate-400'}`}>
              Recipient & Gas Checkout
            </span>
            <span className="text-slate-600">—</span>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-slate-800 text-slate-500">
              3
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Compile & Launch
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>OpenZeppelin v5 Audited</span>
          </div>
        </div>

        {/* STEP 1: Configure Project, Fork Existing Contract & Blockchain Network */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-7 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
                  Configure Your{' '}
                  <span className="text-indigo-400">
                    {activeCategory === 'contract' ? 'Token' : 'Cloud App'}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Enter your project specifications or fork an existing Ethereum / BSC smart contract with updated tokenomics.
                </p>
              </div>

              {activeCategory === 'contract' && (
                <button
                  type="button"
                  onClick={() => setIsForkPanelOpen(prev => !prev)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isForkPanelOpen || forkInspection
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-indigo-500/40'
                  }`}
                >
                  <GitFork className="w-4 h-4" />
                  <span>{isForkPanelOpen ? 'Hide Contract Forker' : 'Fork ETH / BSC Contract'}</span>
                </button>
              )}
            </div>

            {/* CONTRACT FORKING ENGINE (Ethereum & BSC) */}
            {activeCategory === 'contract' && (isForkPanelOpen || forkInspection) && (
              <div
                data-testid="contract-fork-panel"
                className="p-5 rounded-2xl bg-slate-950/95 border border-indigo-500/40 space-y-4 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/90">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <GitFork className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-heading font-bold text-white">
                        Smart Contract Forking Engine — Ethereum & BNB Smart Chain
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Input any verified ERC-20 (Ethereum) or BEP-20 (BSC) contract address to clone its bytecode blueprint and customize supply, symbol, and tax parameters.
                      </p>
                    </div>
                  </div>
                  {forkInspection && (
                    <button
                      type="button"
                      onClick={handleClearFork}
                      className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset Fork</span>
                    </button>
                  )}
                </div>

                {/* Source Chain + Contract Address Input Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Source Chain
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                      <button
                        type="button"
                        data-testid="fork-chain-ethereum"
                        onClick={() => setForkChain('ethereum')}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          forkChain === 'ethereum'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Ethereum
                      </button>
                      <button
                        type="button"
                        data-testid="fork-chain-bsc"
                        onClick={() => setForkChain('bsc')}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          forkChain === 'bsc'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        BSC
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label
                      htmlFor="forkContractAddressInput"
                      className="block text-[11px] font-semibold text-slate-400 mb-1"
                    >
                      Existing Contract Address (0x...)
                    </label>
                    <input
                      id="forkContractAddressInput"
                      data-testid="fork-address-input"
                      type="text"
                      value={forkAddressInput}
                      onChange={e => {
                        setForkAddressInput(e.target.value);
                        setForkError(null);
                      }}
                      placeholder={
                        forkChain === 'ethereum'
                          ? '0x6982508145454Ce325dDbE47a25d4ec3d2311933 (e.g. PEPE / USDT / UNI)'
                          : '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82 (e.g. CAKE / WBNB)'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <button
                      type="button"
                      data-testid="fork-fetch-btn"
                      disabled={isFetchingFork}
                      onClick={() => handleInspectAndForkContract()}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFork ? 'animate-spin' : ''}`} />
                      <span>{isFetchingFork ? 'Inspecting...' : 'Fork Contract'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick-Select Verified Mainnet Contracts for 1-Click Forking */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 mr-1">Verified Mainnet Contracts:</span>
                  {CURATED_FORKABLE_CONTRACTS.map(preset => (
                    <button
                      key={preset.address}
                      type="button"
                      data-testid={`fork-preset-${preset.symbol.toLowerCase()}`}
                      onClick={() => {
                        setForkChain(preset.chain);
                        setForkAddressInput(preset.address);
                        handleInspectAndForkContract(preset.address, preset.chain);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {preset.symbol} ({preset.chain.toUpperCase()})
                    </button>
                  ))}
                </div>

                {forkError && (
                  <p
                    data-testid="fork-error-msg"
                    className="text-xs text-rose-400 flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{forkError}</span>
                  </p>
                )}

                {/* Cloned Contract Blueprint Inspector & Parameter Overrides */}
                {forkInspection && forkInspection.valid && (
                  <div
                    data-testid="forked-blueprint-card"
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 animate-fadeIn"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-white">
                          Cloned Source:{' '}
                          <strong className="text-indigo-300">
                            {forkInspection.originalName} ({forkInspection.originalSymbol})
                          </strong>
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-[11px] font-mono text-emerald-400">
                          {forkInspection.sourceChainLabel}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Bytecode: {forkInspection.bytecodeHash.slice(0, 14)}...
                      </span>
                    </div>

                    {/* Editable Cloned Token Parameters */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label
                          htmlFor="forkCloneNameInput"
                          className="block text-[11px] font-medium text-slate-400 mb-1"
                        >
                          Cloned Token Name
                        </label>
                        <input
                          id="forkCloneNameInput"
                          data-testid="fork-clone-name-input"
                          type="text"
                          value={tokenName}
                          onChange={e => setTokenName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="forkCloneSymbolInput"
                          className="block text-[11px] font-medium text-slate-400 mb-1"
                        >
                          Cloned Symbol
                        </label>
                        <input
                          id="forkCloneSymbolInput"
                          data-testid="fork-clone-symbol-input"
                          type="text"
                          value={customSymbol}
                          onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
                          placeholder={effectiveSymbol}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700/80 font-mono uppercase text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="forkCloneSupplyInput"
                          className="block text-[11px] font-medium text-slate-400 mb-1"
                        >
                          Cloned Initial Supply
                        </label>
                        <input
                          id="forkCloneSupplyInput"
                          data-testid="fork-clone-supply-input"
                          type="number"
                          min={1}
                          step={1}
                          value={selectedSupply}
                          onChange={e => setSelectedSupply(parseTokenSupply(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700/80 font-mono tabular-nums text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="forkTransferTaxSelect"
                          className="block text-[11px] font-medium text-slate-400 mb-1"
                        >
                          Transfer Tax / Burn Fee
                        </label>
                        <select
                          id="forkTransferTaxSelect"
                          data-testid="fork-transfer-tax-select"
                          value={forkTransferTax}
                          onChange={e => setForkTransferTax(Number(e.target.value))}
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700/80 font-mono tabular-nums text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value={0}>0% (Zero-Tax Standard)</option>
                          <option value={1}>1% Auto-LP & Burn</option>
                          <option value={2}>2% Treasury & Burn</option>
                          <option value={5}>5% High-Yield Reflection</option>
                        </select>
                      </div>
                    </div>

                    {/* Inherited Modules & Custom Extensions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">Inherited Modules:</span>
                        {forkInspection.detectedModules.map((mod, idx) => (
                          <span key={mod} className="font-mono text-indigo-300">
                            {mod}
                            {idx < forkInspection.detectedModules.length - 1 ? ' ·' : ''}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={forkBurnable}
                            onChange={e => setForkBurnable(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-950 text-indigo-500"
                          />
                          <span>Burnable</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={forkMintable}
                            onChange={e => setForkMintable(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-950 text-indigo-500"
                          />
                          <span>Mintable</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Token Name, Ticker & Token Decimals */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
              <div className="sm:col-span-6 flex flex-col">
                <label htmlFor="tokenNameInput" className="block text-xs font-semibold text-white">
                  {activeCategory === 'contract' ? 'Token Name' : 'Application Name'}
                </label>
                <p className="text-[11px] text-slate-400 mt-1 min-h-[3.25rem]">
                  A custom name for your token. This will appear on the blockchain and exchanges.
                </p>
                <div className="relative mt-1.5">
                  <input
                    id="tokenNameInput"
                    type="text"
                    value={tokenName}
                    onChange={e => setTokenName(e.target.value)}
                    placeholder={
                      activeCategory === 'contract'
                        ? 'e.g. MyCoin, StarToken...'
                        : 'e.g. MySaaSApp, ApiGateway...'
                    }
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-3 flex flex-col">
                <label htmlFor="tokenDecimalsInput" className="block text-xs font-semibold text-white">
                  Token Decimals
                </label>
                <p className="text-[11px] text-slate-400 mt-1 min-h-[3.25rem]">
                  Number of decimal places for your token. Standard for most networks is 18.
                </p>
                <div className="relative mt-1.5">
                  <input
                    id="tokenDecimalsInput"
                    data-testid="wizard-decimals-input"
                    type="number"
                    min={0}
                    max={36}
                    value={effectiveDecimals}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setCustomDecimals(Number.isFinite(val) ? Math.max(0, Math.min(36, val)) : null);
                    }}
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 font-mono tabular-nums text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-emerald-400 font-medium mt-1.5">
                  Auto-configured per network
                </p>
              </div>

              <div className="sm:col-span-3 flex flex-col">
                <label htmlFor="tokenSymbolInput" className="block text-xs font-semibold text-white">
                  {activeCategory === 'contract' ? 'Token Symbol' : 'Instance Slug'}
                </label>
                <p className="text-[11px] text-slate-400 mt-1 min-h-[3.25rem]">
                  Auto-generated ticker symbol or custom 3–8 character code.
                </p>
                <div className="relative mt-1.5">
                  <input
                    id="tokenSymbolInput"
                    data-testid="wizard-symbol-input"
                    type="text"
                    value={customSymbol}
                    onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
                    placeholder={effectiveSymbol || 'TKN'}
                    maxLength={8}
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 font-mono uppercase text-indigo-300 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-1.5">
                  Ticker: ${effectiveSymbol}
                </p>
              </div>
            </div>

            {/* Blockchain Network Selector (Grid of 6 networks) */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-white">
                  Blockchain Network
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select the blockchain where your token will be deployed.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {NETWORKS.map(net => {
                  const isSelected = selectedNetwork === net.id;
                  return (
                    <button
                      key={net.id}
                      type="button"
                      data-testid={`network-select-${net.id}`}
                      onClick={() => {
                        setSelectedNetwork(net.id);
                        setCustomDecimals(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-gradient-to-tr ${net.color} border`}
                        >
                          {net.iconLetter}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {net.standard}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {net.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{net.badge}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Token Supply Selector */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="block text-xs font-semibold text-white">
                    Token Supply
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Choose the total number of tokens to mint at deployment.
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {selectedSupply.toLocaleString()} {effectiveSymbol} · {effectiveDecimals} Decimals
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TOKEN_SUPPLY_OPTIONS.map(amt => {
                  const isSelected = selectedSupply === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedSupply(amt)}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-b from-indigo-600/20 to-indigo-900/40 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono tabular-nums font-bold text-sm">
                        {amt.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Tokens</div>
                    </button>
                  );
                })}
              </div>
              {/* Custom Manual Supply Entry */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                <label htmlFor="customSupplyInput" className="text-[11px] text-slate-400 font-medium shrink-0">
                  Or enter custom supply amount manually:
                </label>
                <input
                  id="customSupplyInput"
                  data-testid="wizard-custom-supply-input"
                  type="number"
                  min={1}
                  step={1}
                  value={selectedSupply}
                  onChange={e => setSelectedSupply(parseTokenSupply(e.target.value))}
                  className="w-full sm:w-56 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono tabular-nums text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* REAL-TIME NETWORK GAS FEE ESTIMATOR (Step 1 Preview) */}
            {activeCategory === 'contract' && (
              <div
                data-testid="wizard-gas-estimator"
                className="p-4 sm:p-5 rounded-2xl bg-slate-950/95 border border-slate-800 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Real-Time Network Gas Fee Estimator
                        </span>
                        <span className="text-[11px] text-slate-500">·</span>
                        <span
                          data-testid="wizard-congestion-level"
                          className={`text-[11px] font-mono font-semibold ${
                            gasEstimate.congestionLevel === 'Surge' ||
                            gasEstimate.congestionLevel === 'High'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {gasEstimate.congestionLevel} Congestion ({gasEstimate.congestionPercent}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {gasEstimate.networkLabel} · Block #{gasEstimate.blockNumber.toLocaleString()} · Est. Confirmation ~{gasEstimate.estimatedConfirmationSec}s
                      </p>
                    </div>
                  </div>

                  {/* Execution Priority Speed Selector */}
                  <div className="flex items-center gap-1.5">
                    <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800">
                      {(['standard', 'fast', 'instant'] as const).map(tier => (
                        <button
                          key={tier}
                          type="button"
                          data-testid={`wizard-gas-tier-${tier}`}
                          onClick={() => setGasPriorityTier(tier)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                            gasPriorityTier === tier
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      data-testid="refresh-gas-btn"
                      onClick={() => handleRefreshAllChainsGas()}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Refresh Live 6-Chain Gas Quotes"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isFetchingAllChainsGas ? 'animate-spin text-indigo-400' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Telemetry & Checkout Addition Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400">Effective Gas Rate</span>
                    <div className="font-mono tabular-nums font-bold text-white mt-0.5">
                      {gasEstimate.effectiveGwei} Gwei
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Base {gasEstimate.baseFeeGwei} + Tip {gasEstimate.priorityTipGwei}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400">Estimated Gas Units</span>
                    <div className="font-mono tabular-nums font-bold text-cyan-300 mt-0.5">
                      {gasEstimate.estimatedGasUnits.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {activeForkMetadata ? 'Forked Blueprint Bytecode' : 'Standard ERC20/BEP20'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400">Congestion Gas Cost</span>
                    <div
                      data-testid="wizard-gas-fee-usd"
                      className="font-mono tabular-nums font-bold text-amber-400 mt-0.5"
                    >
                      +${checkoutCalc.networkCongestionFeeUsd} USD
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ~{gasEstimate.gasCostNative} {gasEstimate.nativeSymbol}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-[11px] text-emerald-300">Est. Checkout Total</span>
                    <div
                      data-testid="wizard-checkout-total-usd"
                      className="font-mono tabular-nums font-bold text-base text-emerald-400 mt-0.5"
                    >
                      ${checkoutCalc.checkoutTotalUsd} USD
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Base ${checkoutCalc.subtotalBeforeGasUsd} + Gas ${checkoutCalc.networkCongestionFeeUsd}
                    </span>
                  </div>
                </div>

                {/* 6-BLOCKCHAIN NETWORK FEE ESTIMATOR MATRIX */}
                <div
                  data-testid="network-fee-estimator-6chains"
                  className="pt-3 border-t border-slate-800/80 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Network Fee Estimator — Live 6-Blockchain Comparison</span>
                      </span>
                      <span
                        data-testid="network-fee-estimator-source-badge"
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                      >
                        {allChainsGasReport.chains[0]?.sourceMode === 'LIVE_EXTERNAL_API'
                          ? 'LIVE RPC + COINGECKO API'
                          : 'MULTI-CHAIN ORACLE ACTIVE'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>Updated {allChainsGasReport.fetchedAtUtc}</span>
                      <button
                        type="button"
                        data-testid="refresh-all-chains-gas-btn"
                        onClick={() => handleRefreshAllChainsGas()}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${isFetchingAllChainsGas ? 'animate-spin' : ''}`}
                        />
                        <span>Fetch Live API</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {allChainsGasReport.chains.map(chainQuote => {
                      const isSelected = selectedNetwork === chainQuote.network;
                      const isCheapest = allChainsGasReport.cheapestChain === chainQuote.network;
                      return (
                        <button
                          key={chainQuote.network}
                          type="button"
                          data-testid={`estimator-chain-card-${chainQuote.network}`}
                          onClick={() => handleNetworkChange(chainQuote.network)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-indigo-600/15 border-indigo-500/70 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-white truncate">
                                {chainQuote.networkLabel}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0">
                                {chainQuote.standard}
                              </span>
                            </div>
                            {isCheapest ? (
                              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                                Lowest Fee
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                                  chainQuote.congestionLevel === 'High' ||
                                  chainQuote.congestionLevel === 'Surge'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {chainQuote.congestionLevel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-800/60">
                            <div>
                              <div
                                data-testid={`estimator-chain-usd-${chainQuote.network}`}
                                className="font-mono tabular-nums text-sm font-bold text-emerald-400"
                              >
                                {chainQuote.estimatedFeeUsdFormatted} USD
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                                ~{chainQuote.estimatedFeeNativeFormatted}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-mono tabular-nums text-slate-200">
                                {chainQuote.rateValue} {chainQuote.rateUnitLabel}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                ~{chainQuote.estimatedConfirmationSec}s · {chainQuote.nativeSymbol} ${chainQuote.nativeTokenUsdPrice}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Continue to Step 2 */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                data-testid="wizard-continue-step2-btn"
                disabled={!tokenName.trim()}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${
                  tokenName.trim()
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/25 cursor-pointer transform hover:scale-[1.02]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Recipient Wallet, Duration & Live Gas Checkout Summary */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-7 animate-fadeIn">
            <div>
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
                Recipient & <span className="text-emerald-400">Gas Fee Breakdown</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Designate the recipient wallet to receive 100% of the minted supply and review real-time network congestion costs.
              </p>
            </div>

            {activeForkMetadata && (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-slate-200">
                    Forking{' '}
                    <strong className="text-white">
                      {activeForkMetadata.originalName} ({activeForkMetadata.originalSymbol})
                    </strong>{' '}
                    from <span className="font-mono text-indigo-300">{activeForkMetadata.sourceAddress.slice(0, 10)}...</span>
                  </span>
                </div>
                <span className="font-mono text-emerald-400">
                  Cloned as {tokenName} (${effectiveSymbol})
                </span>
              </div>
            )}

            {/* Recipient Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="recAddrInput" className="block text-xs font-semibold text-slate-300">
                  Recipient Wallet Address *
                </label>
                {walletConnected && (
                  <button
                    type="button"
                    onClick={() => setRecipientAddress(walletAddress)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Use Connected Wallet
                  </button>
                )}
              </div>
              <input
                id="recAddrInput"
                type="text"
                value={recipientAddress}
                onChange={e => {
                  setRecipientAddress(e.target.value);
                  setAddressError(null);
                }}
                placeholder={currentNetworkObj.placeholder}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
              {addressError && (
                <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{addressError}</span>
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                100% of the {selectedSupply.toLocaleString()} {effectiveSymbol} tokens will be minted and transferred to this address.
              </p>
            </div>

            {/* Token Duration Selector (7, 30, 60, 90 Days) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Trading & Hosting Duration SLA *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DURATION_OPTIONS.map(days => {
                  const isSelected = selectedDuration === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setSelectedDuration(days)}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-b from-emerald-600/20 to-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono font-bold text-base flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span>{days} Days</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Full SLA & Monitoring</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Itemized Fee & Gas Estimator Summary */}
            <div
              data-testid="step2-gas-checkout-summary"
              className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Live Gas Fee Estimator & Checkout Summary ({currentNetworkObj.name})</span>
                </span>
                <span className="font-mono text-[11px] text-amber-400">
                  {gasEstimate.congestionLevel} Congestion ({gasEstimate.congestionPercent}%) · {gasEstimate.effectiveGwei} Gwei
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Base Contract Compilation & Security Audit:</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    ${checkoutCalc.subtotalBeforeGasUsd} USD
                  </span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>
                    Real-Time {currentNetworkObj.name} Congestion Gas ({gasPriorityTier.toUpperCase()} — {gasEstimate.estimatedGasUnits.toLocaleString()} gas):
                  </span>
                  <span className="font-mono tabular-nums font-semibold">
                    +${checkoutCalc.networkCongestionFeeUsd} USD ({gasEstimate.gasCostNative} {gasEstimate.nativeSymbol})
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-sm font-bold text-white">
                  <span>Total Checkout Amount (Base + Network Gas):</span>
                  <span
                    data-testid="step2-total-fee-usd"
                    className="font-mono tabular-nums text-xl text-emerald-400"
                  >
                    ${checkoutCalc.checkoutTotalUsd} USD
                  </span>
                </div>
              </div>

              {/* Compact 6-Chain GasEstimator Strip in Step 2 before proceeding */}
              <div
                data-testid="step2-gas-estimator-6chains"
                className="pt-3 border-t border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    GasEstimator Live 6-Chain Comparison (Switch network before compiling):
                  </span>
                  <span className="font-mono text-[10px] text-cyan-300">
                    {allChainsGasReport.apiSourceLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {allChainsGasReport.chains.map(c => {
                    const active = c.network === selectedNetwork;
                    return (
                      <button
                        key={c.network}
                        type="button"
                        onClick={() => handleNetworkChange(c.network)}
                        className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase truncate">
                          {c.network} ({c.nativeSymbol})
                        </div>
                        <div className="font-mono tabular-nums text-xs font-bold text-emerald-400">
                          {c.estimatedFeeUsdFormatted}
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 truncate">
                          {c.rateValue} {c.rateUnitLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                type="submit"
                data-testid="wizard-compile-submit-btn"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-lg shadow-emerald-600/25 cursor-pointer transform hover:scale-[1.02] transition-all"
              >
                <Rocket className="w-4 h-4" />
                <span>Compile & Deploy Token (${checkoutCalc.checkoutTotalUsd} USD)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
