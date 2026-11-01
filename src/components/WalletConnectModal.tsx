import { useState } from 'react';
import {
  X,
  CheckCircle2,
  Shield,
  ArrowUpRight,
  Copy,
  Check,
  Coins,
  Send,
  Plus,
  ExternalLink,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { WalletTokenAsset } from '../types';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  currentAddress: string;
  userTokens?: WalletTokenAsset[];
  onAddCustomToken?: (contractAddress: string, symbol: string) => void;
}

const WALLET_PROVIDERS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    desc: 'Ethereum & EVM Chains (BSC, Polygon, Arbitrum)',
    iconBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    mockAddr: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    desc: 'Solana & Multi-Chain ecosystem',
    iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    mockAddr: 'DNTi7U8g1X4Q9wP5k7V9y4mZ1tG3x8oP9sW4kL2qqts',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    desc: 'Self-custody Web3 & Smart Wallets',
    iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    mockAddr: '0x3A9E8892dC48D4b50d99318a221f1A7f12e87311',
  },
  {
    id: 'tronlink',
    name: 'TronLink',
    desc: 'TRON TRC-20 & SunSwap Ecosystem',
    iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    mockAddr: 'TVVURLM4Tyo3rQ2q99HaJVEBBcizHERnGJ',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    desc: 'Connect with 100+ mobile and desktop wallets',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    mockAddr: '0x82d6C70dC5a1F2231A9bb892f33A03B0F0224b5',
  },
];

export function WalletConnectModal({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  isConnected,
  currentAddress,
  userTokens = [],
  onAddCustomToken,
}: WalletModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedTokenAddr, setCopiedTokenAddr] = useState<string | null>(null);
  const [showAddToken, setShowAddToken] = useState(false);
  const [customContract, setCustomContract] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyToken = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedTokenAddr(addr);
    setTimeout(() => setCopiedTokenAddr(null), 2000);
  };

  const handleImportToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customContract.trim()) return;
    onAddCustomToken?.(customContract.trim(), customSymbol.trim() || 'CUSTOM');
    setCustomContract('');
    setCustomSymbol('');
    setShowAddToken(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-2xl my-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-heading font-bold text-lg text-white">
              {isConnected ? 'Connected Web3 Wallet' : 'Connect a Wallet'}
            </h3>
            <p className="text-xs text-slate-400">
              {isConnected
                ? 'Manage your wallet balances, minted tokens, and assets'
                : 'Select your preferred Web3 wallet provider'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isConnected ? (
          <div className="py-4 space-y-4">
            {/* Active Address Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Active Connected Wallet</span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Connected</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="font-mono text-xs text-indigo-300 break-all select-all flex-1">
                  {currentAddress}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 transition-colors cursor-pointer"
                  title="Copy Wallet Address"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Token Balances / Assets Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                    Wallet Token Balances ({userTokens.length + 1})
                  </h4>
                </div>
                <button
                  onClick={() => setShowAddToken(!showAddToken)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showAddToken ? 'Cancel' : 'Import Token'}</span>
                </button>
              </div>

              {/* Import form */}
              {showAddToken && (
                <form onSubmit={handleImportToken} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 animate-fadeIn">
                  <span className="text-xs font-semibold text-slate-300">Import Custom Token Address</span>
                  <input
                    type="text"
                    value={customContract}
                    onChange={e => setCustomContract(e.target.value)}
                    placeholder="Contract Address (0x...)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSymbol}
                      onChange={e => setCustomSymbol(e.target.value)}
                      placeholder="Symbol (optional)"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Import
                    </button>
                  </div>
                </form>
              )}

              {/* Asset List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {/* Native Gas Token */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                      BNB
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">BNB Chain Native</div>
                      <div className="text-[10px] text-slate-400">Gas & Network Asset</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-white">2.4500 BNB</div>
                    <div className="text-[10px] text-emerald-400">~$1,580.20 USD</div>
                  </div>
                </div>

                {/* Newly Minted / Deployed Tokens */}
                {userTokens.map(token => (
                  <div
                    key={token.id}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900/90 to-indigo-950/30 border border-indigo-500/30 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center font-mono">
                        {token.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{token.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                            ${token.symbol}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <span>{token.contractAddress.slice(0, 6)}...{token.contractAddress.slice(-4)}</span>
                          <button
                            onClick={() => handleCopyToken(token.contractAddress)}
                            className="text-slate-400 hover:text-white cursor-pointer ml-1"
                            title="Copy Contract Address"
                          >
                            {copiedTokenAddr === token.contractAddress ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-emerald-400">
                        {token.balance.toLocaleString()} {token.symbol}
                      </div>
                      <div className="text-[10px] text-indigo-300 font-sans flex items-center justify-end gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        <span>100% Owned</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                Disconnect
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-2.5">
            {WALLET_PROVIDERS.map(wallet => (
              <button
                key={wallet.id}
                onClick={() => {
                  onConnect(wallet.mockAddr);
                  onClose();
                }}
                className="w-full p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${wallet.iconBg}`}>
                    {wallet.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {wallet.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">{wallet.desc}</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </button>
            ))}

            <div className="pt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secured by non-custodial TLS & AES-256 standard</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
