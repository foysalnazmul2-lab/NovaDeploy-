import {
  Rocket,
  DollarSign,
  Wallet,
  Coins,
  Dna,
  Gamepad2,
  LogIn,
  LogOut,
  CloudCheck,
  Globe,
} from 'lucide-react';
import { OwnerSettings, WalletTokenAsset } from '../types';
import type { User } from '../firebase';

interface HeaderProps {
  onOpenOwnerSuite: (tab?: 'overview' | 'domain' | 'transactions' | 'affiliate' | 'settings') => void;
  onOpenWalletModal: () => void;
  onScrollToSection: (sectionId: string) => void;
  onLaunch3DGame: () => void;
  walletConnected: boolean;
  walletAddress: string;
  ownerSettings: OwnerSettings;
  userTokens?: WalletTokenAsset[];
  currentUser?: User | null;
  isAuthReady?: boolean;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
}

export function Header({
  onOpenOwnerSuite,
  onOpenWalletModal,
  onScrollToSection,
  onLaunch3DGame,
  walletConnected,
  walletAddress,
  ownerSettings,
  userTokens = [],
  currentUser = null,
  isAuthReady = false,
  onGoogleSignIn,
  onGoogleSignOut,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#080c14]/90 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3">
        {/* Brand logo & navigation */}
        <div className="flex items-center gap-7">
          <button
            onClick={() => onScrollToSection('wizard')}
            className="flex items-center gap-3 group text-left focus:outline-none cursor-pointer"
            aria-label="Deploy Lab Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                <Rocket className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>
            <span className="font-heading font-extrabold text-xl tracking-tight text-white group-hover:text-indigo-200 transition-colors whitespace-nowrap">
              {ownerSettings.brandName || 'Deploy Lab'}
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold text-slate-300 whitespace-nowrap">
            <button
              onClick={() => onScrollToSection('wizard')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Configure Token
            </button>
            <button
              onClick={() => onScrollToSection('recent-deployments')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Recent Deployments
            </button>
            <button
              onClick={() => onScrollToSection('faq')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              FAQ
            </button>
            <button
              onClick={() => onScrollToSection('pricing')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Pricing
            </button>
            <button
              onClick={() => onScrollToSection('bioscience-lab')}
              className="hover:text-cyan-300 text-cyan-400 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Dna className="w-3.5 h-3.5 shrink-0" />
              <span>DeSci Bio-IP Lab</span>
            </button>
            <button
              onClick={onLaunch3DGame}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>3D Bio-Core Defense</span>
            </button>
          </nav>
        </div>

        {/* Right side actions: Domain, 3D Game Quick CTA, Owner Portal, Firebase Auth, Wallet Connect */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          {/* Live Domain novadeploy.cc DNS Manager Button */}
          <button
            type="button"
            data-testid="header-domain-btn"
            onClick={() => onOpenOwnerSuite('domain')}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap"
            title="novadeploy.cc — Option B Hostinger DNS Records Active & Verified"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>novadeploy.cc</span>
            <span className="text-[10px] font-sans font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
              DNS LIVE
            </span>
          </button>

          {/* Compact 3D Game button for non-xl screens */}
          <button
            onClick={onLaunch3DGame}
            className="xl:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
            title="Launch 3D Bio-Core Defense Game"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">3D Defense</span>
          </button>

          {/* Owner Monetization Portal CTA */}
          <button
            onClick={() => onOpenOwnerSuite('overview')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all shadow-sm group cursor-pointer whitespace-nowrap"
            title="Manage platform pricing, payouts, and revenue"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="hidden md:inline">Earnings:</span>
            <span className="font-mono text-emerald-300 font-bold">
              ${ownerSettings.totalRevenue.toLocaleString()}
            </span>
          </button>

          {/* Token Balance Pill when token holdings exist */}
          {userTokens.length > 0 && (
            <button
              onClick={onOpenWalletModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 text-xs font-mono font-semibold transition-colors cursor-pointer shadow-sm whitespace-nowrap"
              title="View your token holdings in wallet"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{userTokens[0].balance.toLocaleString()}</span>
              <span className="text-[10px] text-indigo-400 uppercase font-sans">${userTokens[0].symbol}</span>
            </button>
          )}

          {/* Firebase Cloud Auth Button */}
          {isAuthReady && (
            currentUser ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs whitespace-nowrap">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden md:inline text-slate-200 font-medium max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  title="Sign out of Firebase Cloud"
                  className="text-slate-400 hover:text-rose-400 ml-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                title="Sign in with Google to sync deployments & DeSci Bio-IP to Cloud Firestore"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Cloud Sign In</span>
              </button>
            )
          )}

          {/* Connect Wallet */}
          <button
            onClick={onOpenWalletModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer whitespace-nowrap ${
              walletConnected
                ? 'bg-slate-800 border border-indigo-500/40 text-indigo-300 hover:bg-slate-700'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/25 hover:shadow-indigo-600/40'
            }`}
            aria-label="Connect Web3 Wallet"
          >
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span>
              {walletConnected
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : 'Connect Wallet'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
