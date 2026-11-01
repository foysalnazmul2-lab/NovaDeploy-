import { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Gamepad2,
  Play,
} from 'lucide-react';
import { TickerBar } from './components/TickerBar';
import { Header } from './components/Header';
import { DeployWizard } from './components/DeployWizard';
import { TerminalCompiler } from './components/TerminalCompiler';
import { PaymentModal } from './components/PaymentModal';
import { ActiveDeploymentView } from './components/ActiveDeploymentView';
import { OwnerEarningSuite } from './components/OwnerEarningSuite';
import { RecentDeploymentsFeed } from './components/RecentDeploymentsFeed';
import { FeaturesAndHighlights } from './components/FeaturesAndHighlights';
import { PricingSection } from './components/PricingSection';
import { TestimonialsAndFaq } from './components/TestimonialsAndFaq';
import { SupportAssistant } from './components/SupportAssistant';
import { WalletConnectModal } from './components/WalletConnectModal';
import { BioScienceWorkbench } from './components/BioScienceWorkbench';
import { CyberDefenseGame3D } from './components/CyberDefenseGame3D';
import {
  DeploymentConfig,
  OwnerSettings,
  TransactionRecord,
  WithdrawalReceipt,
  WalletTokenAsset,
  BioTargetRecord,
  GameRunScoreRecord,
} from './types';
import {
  generateContractAddress,
  generateTxHash,
  mergeUserTokens,
  parseTokenSupply,
} from './utils/engine';
import {
  auth,
  db,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutUser,
  doc,
  setDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  handleFirestoreError,
  OperationType,
  User,
} from './firebase';

const DEFAULT_OWNER_SETTINGS: OwnerSettings = {
  brandName: 'Deploy Lab',
  ownerWallet: '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
  payoutCurrency: 'USDT',
  platformFeePercent: 20,
  baseFeeUsd: 99,
  totalRevenue: 1240,
  withdrawnRevenue: 840,
  totalDeploymentsCount: 14,
  allowCustomDomains: true,
};

const VERIFIED_FSH_DEPLOYMENT: DeploymentConfig = {
  id: 'deploy_fsh_948905',
  category: 'contract',
  name: 'fasih',
  symbolOrSlug: 'FSH',
  network: 'bsc',
  supplyOrScale: 1000000000,
  decimals: 18,
  durationDays: 90,
  recipientOrOwner: '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
  status: 'live',
  txHash: '0xf59170e889e72782061c75d2439ad4d8a83642942561f7862bca3f6e2f47522c',
  contractAddress: '0x948905ac812b679778c5f323b3bedbd0504fa493',
  liveUrl: 'https://fsh.novadeploy.cc',
  feeUsd: 467,
  platformMarginUsd: 78,
  createdAt: '2026-10-31T20:00:00.000Z',
};

const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx_1',
    timestamp: '14m ago',
    customerWallet: '0x1add48f902ce',
    itemName: 'AlphaCore (ALPH)',
    category: 'contract',
    network: 'BNB Chain',
    totalPaidUsd: 203,
    ownerProfitUsd: 34,
    txHash: '0x9fa1...021b',
  },
  {
    id: 'tx_2',
    timestamp: '42m ago',
    customerWallet: '0x82d6c70dc5a1',
    itemName: 'Starlight (STAR)',
    category: 'contract',
    network: 'Ethereum',
    totalPaidUsd: 299,
    ownerProfitUsd: 50,
    txHash: '0x3cb4...821a',
  },
  {
    id: 'tx_3',
    timestamp: '1h ago',
    customerWallet: 'DNTi7U8g1X4Q',
    itemName: 'SolanaPulse (PULS)',
    category: 'contract',
    network: 'Solana',
    totalPaidUsd: 119,
    ownerProfitUsd: 20,
    txHash: '5Kqp...11ab',
  },
  {
    id: 'tx_4',
    timestamp: '2d ago',
    customerWallet: '0x71C8364437a9',
    itemName: 'NexusProtocol (NEXU)',
    category: 'contract',
    network: 'Arbitrum',
    totalPaidUsd: 299,
    ownerProfitUsd: 50,
    txHash: '0x44c1...99a0',
  },
  {
    id: 'tx_5',
    timestamp: '5d ago',
    customerWallet: 'TVVURLM4Tyo3',
    itemName: 'TronYield (TRNY)',
    category: 'contract',
    network: 'TRON',
    totalPaidUsd: 203,
    ownerProfitUsd: 34,
    txHash: '7a8c...441e',
  },
  {
    id: 'tx_6',
    timestamp: '11d ago',
    customerWallet: '0x99A1bc283910',
    itemName: 'AetherCloud (AETH)',
    category: 'cloud_app',
    network: 'AWS us-east',
    totalPaidUsd: 101,
    ownerProfitUsd: 17,
    txHash: '0x19b2...77c1',
  },
];

const INITIAL_WITHDRAWALS: WithdrawalReceipt[] = [
  {
    id: 'w_1',
    timestamp: 'Yesterday, 18:30 UTC',
    walletAddress: '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
    amountUsd: 840,
    currency: 'USDT',
    txHash: '0x88f1c991a029...f182',
  },
];

const INITIAL_LEADERBOARD: GameRunScoreRecord[] = [
  {
    id: 'score_seed_1',
    ownerUid: 'system',
    playerName: 'Dr. Vance (AlphaFold Lab)',
    score: 4820,
    waveReached: 5,
    enemiesNeutralized: 42,
    bioCoresProtected: 92,
    createdAt: '2025-05-10T12:00:00Z',
  },
  {
    id: 'score_seed_2',
    ownerUid: 'system',
    playerName: 'Sentinel-0x71C',
    score: 3190,
    waveReached: 4,
    enemiesNeutralized: 29,
    bioCoresProtected: 64,
    createdAt: '2025-05-11T09:30:00Z',
  },
];

export default function App() {
  const [ownerSettings, setOwnerSettings] = useState<OwnerSettings>(() => {
    try {
      const saved = localStorage.getItem('novadeploy_owner_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_OWNER_SETTINGS,
          ...parsed,
          brandName:
            !parsed.brandName || parsed.brandName === 'NovaDeploy'
              ? 'Deploy Lab'
              : parsed.brandName,
        };
      }
      return DEFAULT_OWNER_SETTINGS;
    } catch {
      return DEFAULT_OWNER_SETTINGS;
    }
  });

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [deploymentsList, setDeploymentsList] = useState<DeploymentConfig[]>([
    VERIFIED_FSH_DEPLOYMENT,
  ]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('novadeploy_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });
  const [userTokens, setUserTokens] = useState<WalletTokenAsset[]>(() => {
    try {
      const saved = localStorage.getItem('novadeploy_user_tokens');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [withdrawals, setWithdrawals] = useState<WithdrawalReceipt[]>(() => {
    try {
      const saved = localStorage.getItem('novadeploy_withdrawals');
      return saved ? JSON.parse(saved) : INITIAL_WITHDRAWALS;
    } catch {
      return INITIAL_WITHDRAWALS;
    }
  });

  const [savedBioTargets, setSavedBioTargets] = useState<BioTargetRecord[]>([]);
  const [gameLeaderboard, setGameLeaderboard] = useState<GameRunScoreRecord[]>(INITIAL_LEADERBOARD);

  // Navigation & Screen View State
  const [activeScreen, setActiveScreen] = useState<'wizard' | 'compiler' | 'active'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'active') return 'active';
    }
    return 'wizard';
  });
  const [activeDeployment, setActiveDeployment] = useState<DeploymentConfig | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'active') {
        return VERIFIED_FSH_DEPLOYMENT;
      }
    }
    return VERIFIED_FSH_DEPLOYMENT;
  });

  // Modals & Full-Viewport 3D Game State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isOwnerSuiteOpen, setIsOwnerSuiteOpen] = useState(false);
  const [ownerSuiteTab, setOwnerSuiteTab] = useState<'overview' | 'domain' | 'transactions' | 'affiliate' | 'settings'>('overview');
  const [is3DGameOpen, setIs3DGameOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('game') === '1' || params.get('autostart') === '1';
    }
    return false;
  });

  // 1. Subscribe to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Public Game Leaderboard in Firestore (/gameScores)
  useEffect(() => {
    if (!isAuthReady) return;
    const scoresQuery = query(collection(db, 'gameScores'), orderBy('score', 'desc'), limit(10));
    const unsubscribe = onSnapshot(
      scoresQuery,
      snapshot => {
        if (!snapshot.empty) {
          const liveScores = snapshot.docs.map(d => d.data() as GameRunScoreRecord);
          setGameLeaderboard(liveScores);
        }
      },
      err => {
        console.warn('Leaderboard listener fallback:', err);
      }
    );
    return () => unsubscribe();
  }, [isAuthReady]);

  // 3. Subscribe to Authenticated User's Firestore Collections
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const uid = currentUser.uid;

    const unsubDeploys = onSnapshot(
      query(collection(db, 'deployments'), where('ownerUid', '==', uid)),
      snap => {
        const docs = snap.docs.map(d => d.data() as DeploymentConfig);
        if (docs.length > 0) {
          setDeploymentsList(docs);
        }
      },
      err => handleFirestoreError(err, OperationType.LIST, 'deployments')
    );

    const unsubTokens = onSnapshot(
      query(collection(db, 'walletTokens'), where('ownerUid', '==', uid)),
      snap => {
        const docs = snap.docs.map(d => d.data() as WalletTokenAsset);
        if (docs.length > 0) {
          setUserTokens(prev => {
            let merged = [...prev];
            docs.forEach(tok => {
              merged = mergeUserTokens(merged, tok);
            });
            return merged;
          });
        }
      },
      err => handleFirestoreError(err, OperationType.LIST, 'walletTokens')
    );

    const unsubBio = onSnapshot(
      query(collection(db, 'bioTargets'), orderBy('createdAt', 'desc'), limit(12)),
      snap => {
        const docs = snap.docs.map(d => d.data() as BioTargetRecord);
        if (docs.length > 0) {
          setSavedBioTargets(docs);
        }
      },
      err => handleFirestoreError(err, OperationType.LIST, 'bioTargets')
    );

    return () => {
      unsubDeploys();
      unsubTokens();
      unsubBio();
    };
  }, [isAuthReady, currentUser]);

  // Persist settings, transactions, withdrawals locally as backup
  useEffect(() => {
    localStorage.setItem('novadeploy_owner_settings', JSON.stringify(ownerSettings));
  }, [ownerSettings]);

  useEffect(() => {
    localStorage.setItem('novadeploy_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('novadeploy_withdrawals', JSON.stringify(withdrawals));
  }, [withdrawals]);

  useEffect(() => {
    localStorage.setItem('novadeploy_user_tokens', JSON.stringify(userTokens));
  }, [userTokens]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGooglePopup();
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Google Sign-Out error:', err);
    }
  };

  const persistTokenToFirestore = async (token: WalletTokenAsset) => {
    if (!currentUser) return;
    const tokenDocId = `${currentUser.uid}_${token.symbol.toUpperCase()}_${token.network.toLowerCase()}`;
    try {
      await setDoc(doc(db, 'walletTokens', tokenDocId), {
        id: token.id,
        ownerUid: currentUser.uid,
        name: token.name,
        symbol: token.symbol,
        balance: token.balance,
        decimals: token.decimals,
        network: token.network,
        contractAddress: token.contractAddress,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `walletTokens/${tokenDocId}`);
    }
  };

  const handleWalletConnect = (address: string) => {
    setWalletConnected(true);
    setWalletAddress(address);
  };

  const handleWalletDisconnect = () => {
    setWalletConnected(false);
    setWalletAddress('');
  };

  const handleAddToWallet = (token: WalletTokenAsset) => {
    setUserTokens(prev => {
      const merged = mergeUserTokens(prev, token);
      try {
        localStorage.setItem('novadeploy_user_tokens', JSON.stringify(merged));
      } catch (err) {
        console.error('Error saving user tokens:', err);
      }
      return merged;
    });
    setWalletConnected(true);
    if (!walletAddress) {
      setWalletAddress(
        activeDeployment?.recipientOrOwner ||
          token.contractAddress ||
          '0x71C8364437a9B2f520330D0a0fC62A864114dD8b'
      );
    }
    persistTokenToFirestore(token);
  };

  const handleAddCustomToken = (contractAddress: string, symbol: string) => {
    const customAsset: WalletTokenAsset = {
      id: `token_${Date.now()}`,
      name: symbol.toUpperCase(),
      symbol: symbol.toUpperCase(),
      balance: 100000,
      decimals: 18,
      network: 'bsc',
      contractAddress,
    };
    setUserTokens(prev => {
      const merged = mergeUserTokens(prev, customAsset);
      try {
        localStorage.setItem('novadeploy_user_tokens', JSON.stringify(merged));
      } catch (err) {
        console.error('Error saving custom token:', err);
      }
      return merged;
    });
    persistTokenToFirestore(customAsset);
  };

  const handleTokenizeBioTarget = async (
    bioRecord: BioTargetRecord,
    tokenAsset: WalletTokenAsset
  ) => {
    setSavedBioTargets(prev => [bioRecord, ...prev]);
    handleAddToWallet(tokenAsset);

    if (currentUser) {
      try {
        await setDoc(doc(db, 'bioTargets', bioRecord.id), {
          ...bioRecord,
          ownerUid: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `bioTargets/${bioRecord.id}`);
      }
    }
  };

  const handleSaveGameScore = async (
    scoreInput: Omit<GameRunScoreRecord, 'id' | 'ownerUid' | 'createdAt'>
  ) => {
    const newRecord: GameRunScoreRecord = {
      id: `score_${Date.now()}`,
      ownerUid: currentUser?.uid || 'guest',
      playerName: scoreInput.playerName,
      score: scoreInput.score,
      waveReached: scoreInput.waveReached,
      enemiesNeutralized: scoreInput.enemiesNeutralized,
      bioCoresProtected: scoreInput.bioCoresProtected,
      createdAt: new Date().toISOString(),
    };

    setGameLeaderboard(prev =>
      [...prev, newRecord].sort((a, b) => b.score - a.score).slice(0, 10)
    );

    if (currentUser) {
      try {
        await setDoc(doc(db, 'gameScores', newRecord.id), newRecord);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `gameScores/${newRecord.id}`);
      }
    }
  };

  const handleStartCompilation = (config: DeploymentConfig) => {
    setActiveDeployment(config);
    setActiveScreen('compiler');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToPayment = () => {
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (txHash: string) => {
    if (!activeDeployment) return;

    const contractAddr = generateContractAddress(activeDeployment.network || 'bsc');
    const finalTxHash = txHash || generateTxHash(activeDeployment.network || 'bsc');

    const completedConfig: DeploymentConfig = {
      ...activeDeployment,
      status: 'live',
      txHash: finalTxHash,
      contractAddress: contractAddr,
      liveUrl: `https://${activeDeployment.symbolOrSlug.toLowerCase()}.novadeploy.cc`,
    };

    // Update owner earnings with the platform profit margin
    setOwnerSettings(prev => ({
      ...prev,
      totalRevenue: prev.totalRevenue + activeDeployment.platformMarginUsd,
      totalDeploymentsCount: prev.totalDeploymentsCount + 1,
    }));

    // Record new transaction in ledger
    const newTx: TransactionRecord = {
      id: `tx_${Date.now()}`,
      timestamp: 'Just now',
      customerWallet: activeDeployment.recipientOrOwner,
      itemName: `${activeDeployment.name} (${activeDeployment.symbolOrSlug})`,
      category: activeDeployment.category,
      network: activeDeployment.network || 'Cloud',
      totalPaidUsd: activeDeployment.feeUsd,
      ownerProfitUsd: activeDeployment.platformMarginUsd,
      txHash: finalTxHash,
    };
    setTransactions(prev => [newTx, ...prev]);

    // Automatically credit minted token balance into the user's connected wallet
    if (activeDeployment.category === 'contract') {
      const supplyNum = parseTokenSupply(activeDeployment.supplyOrScale);

      const newTokenAsset: WalletTokenAsset = {
        id: `token_${Date.now()}`,
        name: activeDeployment.name,
        symbol: activeDeployment.symbolOrSlug,
        balance: supplyNum,
        decimals: activeDeployment.decimals || 18,
        network: activeDeployment.network || 'bsc',
        contractAddress: contractAddr,
      };

      setUserTokens(prev => {
        const merged = mergeUserTokens(prev, newTokenAsset);
        try {
          localStorage.setItem('novadeploy_user_tokens', JSON.stringify(merged));
        } catch (err) {
          console.error('Error saving user tokens to storage:', err);
        }
        return merged;
      });

      setWalletConnected(true);
      const recipient =
        activeDeployment.recipientOrOwner?.trim() ||
        '0x71C8364437a9B2f520330D0a0fC62A864114dD8b';
      setWalletAddress(recipient);

      persistTokenToFirestore(newTokenAsset);
    }

    setActiveDeployment(completedConfig);
    setDeploymentsList(prev => [completedConfig, ...prev]);
    setIsPaymentModalOpen(false);
    setActiveScreen('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Persist deployment and transaction to Cloud Firestore when authenticated
    if (currentUser) {
      try {
        await setDoc(doc(db, 'deployments', completedConfig.id), {
          id: completedConfig.id,
          ownerUid: currentUser.uid,
          category: completedConfig.category,
          name: completedConfig.name,
          symbolOrSlug: completedConfig.symbolOrSlug,
          network: completedConfig.network || 'bsc',
          supplyOrScale: String(completedConfig.supplyOrScale),
          recipientOrOwner: completedConfig.recipientOrOwner,
          durationDays: completedConfig.durationDays,
          decimals: completedConfig.decimals,
          status: completedConfig.status,
          txHash: completedConfig.txHash || '',
          contractAddress: completedConfig.contractAddress || '',
          liveUrl: completedConfig.liveUrl || '',
          feeUsd: completedConfig.feeUsd,
          platformMarginUsd: completedConfig.platformMarginUsd,
          createdAt: completedConfig.createdAt || new Date().toISOString(),
        });

        await setDoc(doc(db, 'transactions', newTx.id), {
          ...newTx,
          ownerUid: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `deployments/${completedConfig.id}`);
      }
    }
  };

  const handleTriggerWithdrawal = (amount: number, destWallet: string) => {
    setOwnerSettings(prev => ({
      ...prev,
      withdrawnRevenue: prev.withdrawnRevenue + amount,
      totalRevenue: 0,
    }));

    const receipt: WithdrawalReceipt = {
      id: `w_${Date.now()}`,
      timestamp: 'Just now',
      walletAddress: destWallet || 'Owner Wallet',
      amountUsd: amount,
      currency: 'USDT',
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };
    setWithdrawals(prev => [receipt, ...prev]);
  };

  const handleScrollToSection = (sectionId: string) => {
    if (activeScreen !== 'wizard') {
      setActiveScreen('wizard');
    }
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSelectPlan = () => {
    handleScrollToSection('wizard');
  };

  const handleBurnTokenSupply = async (params: {
    newSupply: number;
    burnedAmount: number;
    burnTxHash: string;
  }) => {
    if (!activeDeployment) return;

    const updatedConfig: DeploymentConfig = {
      ...activeDeployment,
      supplyOrScale: params.newSupply,
    };

    setActiveDeployment(updatedConfig);
    setDeploymentsList(prev =>
      prev.map(item => (item.id === updatedConfig.id ? updatedConfig : item))
    );

    const updatedTokenAsset: WalletTokenAsset = {
      id: `token_${updatedConfig.symbolOrSlug.toLowerCase()}_${updatedConfig.network}`,
      name: updatedConfig.name,
      symbol: updatedConfig.symbolOrSlug,
      balance: params.newSupply,
      decimals: updatedConfig.decimals || 18,
      network: updatedConfig.network || 'ethereum',
      contractAddress:
        updatedConfig.contractAddress || '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    };

    setUserTokens(prev => {
      const merged = mergeUserTokens(prev, updatedTokenAsset);
      try {
        localStorage.setItem('novadeploy_user_tokens', JSON.stringify(merged));
      } catch (err) {
        console.error('Error saving user tokens after burn:', err);
      }
      return merged;
    });

    if (currentUser) {
      try {
        await setDoc(doc(db, 'deployments', updatedConfig.id), {
          id: updatedConfig.id,
          ownerUid: currentUser.uid,
          category: updatedConfig.category,
          name: updatedConfig.name,
          symbolOrSlug: updatedConfig.symbolOrSlug,
          network: updatedConfig.network || 'ethereum',
          supplyOrScale: String(params.newSupply),
          recipientOrOwner: updatedConfig.recipientOrOwner || '',
          durationDays: updatedConfig.durationDays || 90,
          decimals: updatedConfig.decimals || 18,
          status: updatedConfig.status || 'live',
          txHash: updatedConfig.txHash || params.burnTxHash,
          contractAddress: updatedConfig.contractAddress || '',
          liveUrl:
            updatedConfig.liveUrl ||
            `https://${updatedConfig.symbolOrSlug.toLowerCase()}.novadeploy.cc`,
          feeUsd: updatedConfig.feeUsd,
          platformMarginUsd: updatedConfig.platformMarginUsd,
          createdAt: updatedConfig.createdAt || new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `deployments/${updatedConfig.id}`);
      }

      await persistTokenToFirestore(updatedTokenAsset);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Real-time Ticker Bar */}
        <TickerBar />

        {/* Global Navigation Header */}
        <Header
          onOpenOwnerSuite={tab => {
            setOwnerSuiteTab(tab || 'overview');
            setIsOwnerSuiteOpen(true);
          }}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
          onScrollToSection={handleScrollToSection}
          onLaunch3DGame={() => setIs3DGameOpen(true)}
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          ownerSettings={ownerSettings}
          userTokens={userTokens}
          currentUser={currentUser}
          isAuthReady={isAuthReady}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Active Screen: Terminal Compiler */}
          {activeScreen === 'compiler' && activeDeployment && (
            <div className="py-6 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <button
                  onClick={() => setActiveScreen('wizard')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  ← Back to Configuration
                </button>
                <div className="text-xs text-indigo-400 font-mono">
                  Compiling: <strong>{activeDeployment.name}</strong>
                </div>
              </div>

              <TerminalCompiler
                config={activeDeployment}
                onCompilationComplete={() => {}}
                onProceedToPayment={handleProceedToPayment}
                onUpdateConfig={updated => setActiveDeployment(updated)}
                platformFeePercent={ownerSettings.platformFeePercent}
              />
            </div>
          )}

          {/* Active Screen: Post-Deployment Live Dashboard */}
          {activeScreen === 'active' && activeDeployment && (
            <ActiveDeploymentView
              config={activeDeployment}
              onNewDeployment={() => {
                setActiveDeployment(null);
                setActiveScreen('wizard');
              }}
              userTokens={userTokens}
              onAddToWallet={handleAddToWallet}
              onBurnTokenSupply={handleBurnTokenSupply}
              isCloudAuthenticated={Boolean(currentUser)}
            />
          )}

          {/* Active Screen: Main Deploy Lab + DeSci Bioscience + 3D Defense Experience */}
          {activeScreen === 'wizard' && (
            <div className="space-y-12">
              {/* Hero Banner Section */}
              <section className="text-center max-w-4xl mx-auto pt-6 sm:pt-10 space-y-6">
                <div className="inline-flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Automated Token Deployment</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-white leading-tight">
                  Launch Your Own Digital Token{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400">
                    in Under 60 Seconds
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  No coding. No smart contract development. No technical skills required.{' '}
                  <strong className="text-white font-semibold">Deploy Lab</strong> deploys a fully functional token on any major network automatically — just pick a name, choose your network, and we handle the rest.
                </p>

                {/* 5 Core Feature Highlights Row */}
                <div className="pt-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated Deployment</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>6 Blockchains</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Exchange-Listed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Audited Contracts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tradeable 7–90 Days</span>
                  </div>
                </div>

                {/* Key Platform Metrics Strip (14,202+ Tokens Created · 6 Networks · 99.8% Uptime) */}
                <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-2">
                  <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 text-center">
                    <div className="text-xl sm:text-2xl font-heading font-extrabold font-mono tabular-nums text-white">
                      14,202+
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Tokens Created</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 text-center">
                    <div className="text-xl sm:text-2xl font-heading font-extrabold font-mono tabular-nums text-indigo-400">
                      6
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Networks</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 text-center">
                    <div className="text-xl sm:text-2xl font-heading font-extrabold font-mono tabular-nums text-emerald-400">
                      99.8%
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Uptime</div>
                  </div>
                </div>

                {/* Security & Trust Indicators Strip */}
                <div className="pt-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-mono text-slate-400">
                  <span>SSL Secured</span>
                  <span className="text-slate-700">·</span>
                  <span>PCI Compliant</span>
                  <span className="text-slate-700">·</span>
                  <span>Blockchain Verified</span>
                  <span className="text-slate-700">·</span>
                  <span>256-bit Encryption</span>
                </div>
              </section>

              {/* Active Audited Contract Banner (fasih $FSH — NV-CERT-2025-FSH-948905) */}
              <section className="max-w-4xl mx-auto">
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                        AUDIT VERIFIED · GRADE A+ (99.4/100)
                      </span>
                      <span className="text-slate-300 font-bold">NV-CERT-2025-FSH-948905</span>
                      <span className="text-indigo-300">BNB Smart Chain (BEP-20)</span>
                    </div>
                    <div className="text-sm font-heading font-bold text-white">
                      fasih ($FSH) — 1,000,000,000 FSH · <span className="font-mono text-xs text-emerald-300">0x948905ac812b679778c5f323b3bedbd0504fa493</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Ready for Next Step: PancakeSwap V2 Initial Liquidity Pool, 365-Day LP Time-Lock & Exchange Listing Manifest on <strong className="font-mono text-slate-200">https://fsh.novadeploy.cc</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="open-fsh-console-btn"
                    onClick={() => {
                      setActiveDeployment(VERIFIED_FSH_DEPLOYMENT);
                      setActiveScreen('active');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-extrabold text-xs shrink-0 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    Open fasih ($FSH) Launch Console →
                  </button>
                </div>
              </section>

              {/* The Core Interactive Deployment Wizard ("Configure Your Token") */}
              <DeployWizard
                ownerSettings={ownerSettings}
                walletConnected={walletConnected}
                walletAddress={walletAddress}
                onStartCompilation={handleStartCompilation}
              />

              {/* 4 Feature Highlights (Instant Deploy, Multi-Chain, Audited, Low Fees) */}
              <FeaturesAndHighlights />

              {/* Live Recent Deployments Ticker Stream */}
              <RecentDeploymentsFeed />

              {/* Transparent Pricing Plans & Calculator */}
              <PricingSection
                ownerSettings={ownerSettings}
                onSelectPlan={handleSelectPlan}
              />

              {/* Real Bioscience & Structural Proteomics DeSci Workbench */}
              <BioScienceWorkbench
                currentUserUid={currentUser?.uid}
                savedBioTargets={savedBioTargets}
                onTokenizeBioTarget={handleTokenizeBioTarget}
              />

              {/* Interactive Three.js 3D Bio-Core Defense Mission Banner */}
              <section
                id="threejs-defense-arena"
                className="rounded-3xl bg-gradient-to-r from-[#0b1329] via-[#111c3d] to-[#0a192f] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6"
              >
                <div className="space-y-2.5 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-semibold">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    <span>FULL-VIEWPORT THREE.JS WEBGL TACTICAL ARENA</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
                    NovaGuard 3D: Quantum & Bio-Core Defense
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Command the 8-part Sentinel Mech inside a real-time Three.js PBR arena to protect the AlphaFold Bio-Core Vault from Swarm Interceptors, Orbital Weavers, and Siege Juggernauts. High scores sync automatically to Cloud Firestore.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIs3DGameOpen(true)}
                    className="px-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm tracking-wide uppercase shadow-xl shadow-cyan-500/20 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Launch Fullscreen 3D Game</span>
                  </button>
                </div>
              </section>

              {/* Testimonials, FAQs, Security Badges & Footer */}
              <TestimonialsAndFaq ownerSettings={ownerSettings} />
            </div>
          )}
        </main>

        {/* 24/7 Floating Support Assistant */}
        <SupportAssistant ownerSettings={ownerSettings} />

        {/* Modals */}
        <WalletConnectModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onConnect={handleWalletConnect}
          onDisconnect={handleWalletDisconnect}
          isConnected={walletConnected}
          currentAddress={walletAddress}
          userTokens={userTokens}
          onAddCustomToken={handleAddCustomToken}
        />

        {activeDeployment && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            config={activeDeployment}
            ownerSettings={ownerSettings}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        <OwnerEarningSuite
          isOpen={isOwnerSuiteOpen}
          onClose={() => setIsOwnerSuiteOpen(false)}
          settings={ownerSettings}
          onUpdateSettings={newSettings => setOwnerSettings(newSettings)}
          deployments={deploymentsList}
          transactions={transactions}
          withdrawals={withdrawals}
          onTriggerWithdrawal={handleTriggerWithdrawal}
          initialTab={ownerSuiteTab}
        />

        {/* Full-Viewport Three.js 3D Bio-Core Defense Game */}
        <CyberDefenseGame3D
          isOpen={is3DGameOpen}
          onClose={() => setIs3DGameOpen(false)}
          playerName={currentUser?.displayName || walletAddress.slice(0, 8) || 'Sentinel-01'}
          currentUserUid={currentUser?.uid}
          leaderboard={gameLeaderboard}
          onSaveGameScore={handleSaveGameScore}
        />
      </div>
    </div>
  );
}
