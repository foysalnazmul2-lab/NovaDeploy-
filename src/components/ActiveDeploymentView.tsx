import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Server,
  Shield,
  Activity,
  Download,
  Share2,
  Globe,
  Sliders,
  Terminal,
  Zap,
  ArrowRightLeft,
  Coins,
  Send,
  Eye,
  DollarSign,
  TrendingUp,
  Plus,
  Wallet,
  Clock,
  Cpu,
  Fuel,
  Flame,
  FileText,
  Lock,
  Database,
  AlertTriangle,
  X,
  BarChart3,
  FileSpreadsheet,
  Users,
  KeyRound,
  Code2,
  FileCheck2,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { DeploymentConfig, WalletTokenAsset } from '../types';
import {
  generateSolidityContract,
  calculateSwapOutput,
  calculatePriceImpact,
  findTokenInWallet,
  parseTokenSupply,
  calculateNetworkDeploymentStats,
  evaluateUptimeHeartbeat,
  pollMockUptimeEndpoint,
  UptimeHeartbeatResponse,
  executeTokenBurnCalculation,
  generateContractAuditReport,
  TokenBurnCalculationResult,
  generate24HourDeploymentTelemetry,
  generateDeploymentEventLogs,
  exportDeploymentEventsToCsv,
  SmartContractEventLogEntry,
  validateMultiSigConfiguration,
  createGovernanceProposal,
  signOrExecuteGovernanceProposal,
  GovernanceActionKind,
  GovernanceProposalCreationResult,
  calculatePostAuditDexLaunch,
} from '../utils/engine';
import { VerifyContract } from './VerifyContract';

interface ActiveDeploymentViewProps {
  config: DeploymentConfig;
  onNewDeployment: () => void;
  userTokens?: WalletTokenAsset[];
  onAddToWallet?: (token: WalletTokenAsset) => void;
  onBurnTokenSupply?: (params: {
    newSupply: number;
    burnedAmount: number;
    burnTxHash: string;
  }) => Promise<void> | void;
  isCloudAuthenticated?: boolean;
}

export function ActiveDeploymentView({
  config,
  onNewDeployment,
  userTokens = [],
  onAddToWallet,
  onBurnTokenSupply,
  isCloudAuthenticated = false,
}: ActiveDeploymentViewProps) {
  const [copiedContract, setCopiedContract] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [copiedRecipient, setCopiedRecipient] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'swap' | 'abi' | 'site'>('overview');
  const [addedToWallet, setAddedToWallet] = useState(false);
  const [importingToWallet, setImportingToWallet] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [statsRefreshTick, setStatsRefreshTick] = useState(0);

  // Token Burn Sequence & Audit Report Modal state
  const [burnAmountInput, setBurnAmountInput] = useState<string>('5000');
  const [isBurning, setIsBurning] = useState<boolean>(false);
  const [burnError, setBurnError] = useState<string | null>(null);
  const [burnSuccessNotice, setBurnSuccessNotice] = useState<string | null>(null);
  const [burnHistory, setBurnHistory] = useState<TokenBurnCalculationResult[]>([]);
  const [totalBurned, setTotalBurned] = useState<number>(0);
  const [isAuditReportOpen, setIsAuditReportOpen] = useState<boolean>(false);

  // 24-Hour Recharts Telemetry & CSV Event Logs state
  const [telemetryChartMode, setTelemetryChartMode] = useState<'combined' | 'uptime' | 'volume'>('combined');
  const [eventFilter, setEventFilter] = useState<'ALL' | 'MINT_DEPLOY' | 'SECURITY_SLA' | 'BURN'>('ALL');
  const [csvExportNotice, setCsvExportNotice] = useState<string | null>(null);
  const [extraSimulatedTxCount, setExtraSimulatedTxCount] = useState<number>(0);

  const isContract = config.category === 'contract';
  const networkName = config.network ? config.network.toUpperCase() : 'CLOUD REGION';

  // Simulated network-calibrated deployment telemetry ('Deployment Latency', 'Node Confirmation Time', 'Smart Contract Gas Cost')
  const networkTelemetry = useMemo(
    () => calculateNetworkDeploymentStats(config.network || config.cloudRegion),
    [config.id, config.network, config.cloudRegion, statsRefreshTick]
  );

  // Real-time Uptime Monitor state polling mock health endpoint
  const pollSeqRef = useRef<number>(1);
  const [uptimeHeartbeat, setUptimeHeartbeat] = useState<UptimeHeartbeatResponse>(() =>
    evaluateUptimeHeartbeat({
      network: config.network || config.cloudRegion,
      contractAddress: config.contractAddress,
      symbolOrSlug: config.symbolOrSlug,
      sequenceNumber: 1,
    })
  );
  const [heartbeatHistory, setHeartbeatHistory] = useState<number[]>(() => [28, 31, 26, 29, 24, 30, 27, 25, 29, 26, 28, 24]);
  const [isPollingHeartbeat, setIsPollingHeartbeat] = useState<boolean>(false);

  const triggerUptimePoll = useCallback(async () => {
    setIsPollingHeartbeat(true);
    const nextSeq = pollSeqRef.current + 1;
    pollSeqRef.current = nextSeq;
    try {
      const response = await pollMockUptimeEndpoint({
        network: config.network || config.cloudRegion,
        contractAddress: config.contractAddress,
        symbolOrSlug: config.symbolOrSlug,
        sequenceNumber: nextSeq,
        simulatedDelayMs: 60,
      });
      setUptimeHeartbeat(response);
      setHeartbeatHistory(prev => [...prev.slice(-11), response.responseLatencyMs]);
    } finally {
      setIsPollingHeartbeat(false);
    }
  }, [config.network, config.cloudRegion, config.contractAddress, config.symbolOrSlug]);

  useEffect(() => {
    let isMounted = true;
    pollSeqRef.current = 1;
    const initial = evaluateUptimeHeartbeat({
      network: config.network || config.cloudRegion,
      contractAddress: config.contractAddress,
      symbolOrSlug: config.symbolOrSlug,
      sequenceNumber: 1,
    });
    setUptimeHeartbeat(initial);

    const intervalId = window.setInterval(async () => {
      if (!isMounted) return;
      setIsPollingHeartbeat(true);
      const nextSeq = pollSeqRef.current + 1;
      pollSeqRef.current = nextSeq;
      try {
        const res = await pollMockUptimeEndpoint({
          network: config.network || config.cloudRegion,
          contractAddress: config.contractAddress,
          symbolOrSlug: config.symbolOrSlug,
          sequenceNumber: nextSeq,
          simulatedDelayMs: 50,
        });
        if (isMounted) {
          setUptimeHeartbeat(res);
          setHeartbeatHistory(prev => [...prev.slice(-11), res.responseLatencyMs]);
        }
      } finally {
        if (isMounted) {
          setIsPollingHeartbeat(false);
        }
      }
    }, 4000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [config.id, config.network, config.cloudRegion, config.contractAddress, config.symbolOrSlug]);

  // Subscribed reactive token lookup from parent state (no stale closures or out-of-sync local data)
  const activeToken = findTokenInWallet(
    userTokens,
    config.contractAddress,
    config.symbolOrSlug,
    config.network
  );

  const currentSupplyNum = parseTokenSupply(config.supplyOrScale);
  const tokenBalanceNum = activeToken ? activeToken.balance : currentSupplyNum;

  const supplyFormatted = currentSupplyNum.toLocaleString();
  const isTokenImported = Boolean(activeToken || addedToWallet);

  // High-security PDF-style Audit Report data memoized from current contract config and burn state
  const auditReport = useMemo(
    () =>
      generateContractAuditReport({
        id: config.id,
        name: config.name,
        symbolOrSlug: config.symbolOrSlug,
        network: config.network || 'ethereum',
        contractAddress: config.contractAddress,
        supplyOrScale: currentSupplyNum,
        decimals: config.decimals,
        totalBurned,
      }),
    [
      config.id,
      config.name,
      config.symbolOrSlug,
      config.network,
      config.contractAddress,
      currentSupplyNum,
      config.decimals,
      totalBurned,
    ]
  );

  const handleApplyBurnPreset = (percent: number) => {
    setBurnError(null);
    const presetAmount = Math.max(1, Math.floor((currentSupplyNum * percent) / 100));
    setBurnAmountInput(String(presetAmount));
  };

  const handleInitiateTokenBurn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBurnError(null);
    setBurnSuccessNotice(null);

    const calc = executeTokenBurnCalculation({
      currentSupply: currentSupplyNum,
      burnAmount: burnAmountInput,
      symbol: config.symbolOrSlug,
      network: config.network || 'ethereum',
      contractAddress: config.contractAddress,
    });

    if (!calc.valid) {
      setBurnError(calc.error || 'Invalid token burn amount.');
      return;
    }

    setIsBurning(true);
    try {
      await onBurnTokenSupply?.({
        newSupply: calc.newSupply,
        burnedAmount: calc.burnedAmount,
        burnTxHash: calc.burnTxHash,
      });

      setTotalBurned(prev => Number((prev + calc.burnedAmount).toFixed(4)));
      setBurnHistory(prev => [calc, ...prev].slice(0, 6));
      setBalanceResult(`${calc.newSupply.toLocaleString()} ${config.symbolOrSlug}`);
      setBurnSuccessNotice(
        `Burn Sequence Finalized: ${calc.burnedAmount.toLocaleString()} ${config.symbolOrSlug} (-${calc.burnPercentage}%) sent to ${calc.deadAddress.slice(0, 10)}...${calc.deadAddress.slice(-4)}. Active total supply updated to ${calc.newSupply.toLocaleString()} ${config.symbolOrSlug} in Cloud Firestore.`
      );
    } finally {
      setIsBurning(false);
    }
  };

  const handleDownloadAuditReport = () => {
    const content = [
      `====================================================================`,
      `NOVADEPLOY & CERTIK-STANDARD SMART CONTRACT SECURITY AUDIT DOSSIER`,
      `====================================================================`,
      `Document ID:       ${auditReport.reportId}`,
      `Classification:    ${auditReport.classification}`,
      `Contract Name:     ${auditReport.contractName} ($${auditReport.symbol})`,
      `Target Network:    ${auditReport.networkLabel}`,
      `Contract Address:  ${auditReport.contractAddress}`,
      `Compiler & EVM:    ${auditReport.compilerVersion} | ${auditReport.evmTarget}`,
      `Security Score:    ${auditReport.securityScore} / 100 (Grade ${auditReport.securityGrade})`,
      `Active Supply:     ${auditReport.currentSupplyFormatted}`,
      `Total Burned:      ${auditReport.totalBurnedFormatted}`,
      `SHA-256 Digest:    ${auditReport.certificateHash}`,
      ``,
      `VULNERABILITY SUMMARY:`,
      `- Critical: ${auditReport.vulnerabilitySummary.critical} | High: ${auditReport.vulnerabilitySummary.high} | Medium: ${auditReport.vulnerabilitySummary.medium} | Low: ${auditReport.vulnerabilitySummary.low}`,
      ``,
      `STATIC & SYMBOLIC ANALYSIS VERIFICATION:`,
      ...auditReport.securityChecks.map(
        c => `[${c.status}] ${c.code} - ${c.title} (${c.category}): ${c.description}`
      ),
      ``,
      `FORMAL INVARIANT PROOFS:`,
      ...auditReport.formalInvariants.map(
        inv => `[${inv.status}] ${inv.expression} — ${inv.note}`
      ),
      `====================================================================`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${auditReport.reportId}_Security_Audit.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 24-Hour Deployment Uptime Trends & Real-Time Transaction Volume series for Recharts
  const telemetry24h = useMemo(
    () =>
      generate24HourDeploymentTelemetry({
        network: config.network || config.cloudRegion || 'ethereum',
        symbolOrSlug: config.symbolOrSlug,
        supplyOrScale: currentSupplyNum,
        baseLatencyMs: uptimeHeartbeat.responseLatencyMs,
        burnEventsCount: burnHistory.length,
        extraTxCount: extraSimulatedTxCount,
      }),
    [
      config.network,
      config.cloudRegion,
      config.symbolOrSlug,
      currentSupplyNum,
      uptimeHeartbeat.responseLatencyMs,
      burnHistory.length,
      extraSimulatedTxCount,
    ]
  );

  const total24hTransactions = useMemo(
    () => telemetry24h.reduce((sum, pt) => sum + pt.txVolume, 0),
    [telemetry24h]
  );
  const average24hUptimePct = useMemo(() => {
    if (telemetry24h.length === 0) return 99.95;
    const sum = telemetry24h.reduce((acc, pt) => acc + pt.uptimePct, 0);
    return Number((sum / telemetry24h.length).toFixed(2));
  }, [telemetry24h]);
  const peakHourlyTx = useMemo(
    () => telemetry24h.reduce((max, pt) => Math.max(max, pt.txVolume), 0),
    [telemetry24h]
  );

  // Structured Smart Contract Deployment Event Logs for local CSV auditing
  const deploymentEventLogs = useMemo<SmartContractEventLogEntry[]>(
    () =>
      generateDeploymentEventLogs({
        id: config.id,
        name: config.name,
        symbolOrSlug: config.symbolOrSlug,
        network: config.network || 'ethereum',
        contractAddress: config.contractAddress,
        txHash: config.txHash,
        recipientOrOwner: config.recipientOrOwner,
        supplyOrScale: currentSupplyNum,
        decimals: config.decimals,
        burnHistory,
        latestHeartbeat: uptimeHeartbeat,
      }),
    [
      config.id,
      config.name,
      config.symbolOrSlug,
      config.network,
      config.contractAddress,
      config.txHash,
      config.recipientOrOwner,
      currentSupplyNum,
      config.decimals,
      burnHistory,
      uptimeHeartbeat,
    ]
  );

  const filteredEventLogs = useMemo(() => {
    if (eventFilter === 'ALL') return deploymentEventLogs;
    if (eventFilter === 'MINT_DEPLOY') {
      return deploymentEventLogs.filter(
        e => e.eventName === 'GenesisSupplyMinted' || e.eventName === 'ContractDeployed'
      );
    }
    if (eventFilter === 'SECURITY_SLA') {
      return deploymentEventLogs.filter(
        e =>
          e.eventName === 'OwnershipTransferred' ||
          e.eventName === 'DEXRouterWhitelisted' ||
          e.eventName === 'UptimeHeartbeatCheckpoint'
      );
    }
    return deploymentEventLogs.filter(e => e.eventName === 'TokensBurned');
  }, [deploymentEventLogs, eventFilter]);

  const handleDownloadEventLogsCsv = () => {
    const csvContent = exportDeploymentEventsToCsv(deploymentEventLogs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = `${config.symbolOrSlug.toUpperCase()}_Deployment_Event_Logs.csv`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    const noticeMsg = `Exported ${deploymentEventLogs.length} verified on-chain event logs to ${filename} (${csvContent.length.toLocaleString()} bytes) for local auditing.`;
    setCsvExportNotice(noticeMsg);
    setCopiedNotice(`CSV Downloaded: ${filename} (${deploymentEventLogs.length} events)`);
    setTimeout(() => setCopiedNotice(null), 3500);
  };

  // ============================================================================
  // 1. MULTI-SIGNATURE GOVERNANCE SETTINGS STATE & HANDLERS
  // ============================================================================
  const defaultPrimaryOwner =
    config.recipientOrOwner && config.recipientOrOwner.startsWith('0x')
      ? config.recipientOrOwner
      : '0x71C8364437a9B2f520330D0a0fC62A864114dD8b';

  const [multiSigSigners, setMultiSigSigners] = useState<string[]>(() => [
    defaultPrimaryOwner,
    '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
    '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
  ]);
  const [requiredSignatures, setRequiredSignatures] = useState<number>(2);
  const [timelockHours, setTimelockHours] = useState<number>(24);
  const [newSignerInput, setNewSignerInput] = useState<string>('');
  const [governanceConfigError, setGovernanceConfigError] = useState<string | null>(null);
  const [governanceConfigNotice, setGovernanceConfigNotice] = useState<string | null>(null);

  // Live governed contract parameters
  const [governedTaxPercent, setGovernedTaxPercent] = useState<number>(
    config.forkedFrom?.customTransferTaxPercent ?? 1.5
  );
  const [governedMaxWalletPercent, setGovernedMaxWalletPercent] = useState<number>(5);
  const [governedEmergencyPaused, setGovernedEmergencyPaused] = useState<boolean>(false);

  // Governance Proposal Builder state
  const [selectedGovAction, setSelectedGovAction] = useState<GovernanceActionKind>('SET_TAX_FEE');
  const [proposedTaxInput, setProposedTaxInput] = useState<string>('2.5');
  const [proposedMintAmountInput, setProposedMintAmountInput] = useState<string>('25000');
  const [proposedMintRecipientInput, setProposedMintRecipientInput] = useState<string>(defaultPrimaryOwner);
  const [proposedMaxWalletInput, setProposedMaxWalletInput] = useState<string>('10');
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSuccessNotice, setProposalSuccessNotice] = useState<string | null>(null);

  type GovProposalItem = NonNullable<GovernanceProposalCreationResult['proposal']>;
  const [governanceProposals, setGovernanceProposals] = useState<GovProposalItem[]>(() => {
    const initialProp = createGovernanceProposal({
      proposalSequence: 1,
      actionType: 'SET_TAX_FEE',
      proposedTaxPercent: 1.0,
      requiredSignatures: 2,
      signers: [
        defaultPrimaryOwner,
        '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
        '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
      ],
      proposerAddress: defaultPrimaryOwner,
      symbol: config.symbolOrSlug,
      network: 'ethereum',
    });
    return initialProp.proposal ? [initialProp.proposal] : [];
  });

  const multiSigValidation = useMemo(
    () =>
      validateMultiSigConfiguration({
        requiredSignatures,
        signers: multiSigSigners,
        timelockHours,
        network: 'ethereum',
        contractAddress: config.contractAddress,
      }),
    [requiredSignatures, multiSigSigners, timelockHours, config.contractAddress]
  );

  const handleApplyMultiSigPreset = (reqSigs: number, totalCount: number) => {
    setGovernanceConfigError(null);
    const presetPool = [
      defaultPrimaryOwner,
      '0x4B520af819c14b2f04d1001E140304fA0aee53f5',
      '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    ];
    const nextSigners = presetPool.slice(0, totalCount);
    setMultiSigSigners(nextSigners);
    setRequiredSignatures(reqSigs);
    setGovernanceConfigNotice(
      `Multi-Signature threshold updated to ${reqSigs}-of-${totalCount} signers (${Math.round(
        (reqSigs / totalCount) * 100
      )}% quorum).`
    );
  };

  const handleAddCoSigner = () => {
    setGovernanceConfigError(null);
    setGovernanceConfigNotice(null);
    const trimmed = newSignerInput.trim();
    if (!trimmed) {
      setGovernanceConfigError('Enter a valid 42-character EVM wallet address (0x...) to add as a co-signer.');
      return;
    }
    const candidateSigners = [...multiSigSigners, trimmed];
    const check = validateMultiSigConfiguration({
      requiredSignatures,
      signers: candidateSigners,
      timelockHours,
      network: 'ethereum',
      contractAddress: config.contractAddress,
    });
    if (!check.valid) {
      setGovernanceConfigError(check.error || 'Invalid co-signer wallet address.');
      return;
    }
    setMultiSigSigners(candidateSigners);
    setNewSignerInput('');
    setGovernanceConfigNotice(
      `Added co-signer ${trimmed.slice(0, 10)}...${trimmed.slice(-4)}. Active quorum is now ${requiredSignatures} of ${candidateSigners.length} signers.`
    );
  };

  const handleRemoveCoSigner = (idxToRemove: number) => {
    if (multiSigSigners.length <= 1) {
      setGovernanceConfigError('At least 1 owner signer must remain in the governance vault.');
      return;
    }
    const updated = multiSigSigners.filter((_, idx) => idx !== idxToRemove);
    const clampedReq = Math.min(requiredSignatures, updated.length);
    setMultiSigSigners(updated);
    setRequiredSignatures(clampedReq);
    setGovernanceConfigError(null);
    setGovernanceConfigNotice(
      `Removed signer #${idxToRemove + 1}. Quorum adjusted to ${clampedReq} of ${updated.length} signers.`
    );
  };

  const handleSaveMultiSigQuorum = () => {
    setGovernanceConfigError(null);
    if (!multiSigValidation.valid) {
      setGovernanceConfigError(multiSigValidation.error || 'Invalid multi-signature configuration.');
      return;
    }
    setGovernanceConfigNotice(
      `Saved Multi-Sig Vault (${multiSigValidation.multiSigVaultAddress.slice(0, 10)}...${multiSigValidation.multiSigVaultAddress.slice(-6)}) with ${multiSigValidation.quorumLabel} and ${timelockHours}h timelock.`
    );
  };

  const handleCreateGovernanceProposal = (e: React.FormEvent) => {
    e.preventDefault();
    setProposalError(null);
    setProposalSuccessNotice(null);

    const nextSeq = governanceProposals.length + 1;
    const creation = createGovernanceProposal({
      proposalSequence: nextSeq,
      actionType: selectedGovAction,
      proposedTaxPercent: proposedTaxInput,
      mintAmount: proposedMintAmountInput,
      mintRecipient: proposedMintRecipientInput,
      maxWalletPercent: proposedMaxWalletInput,
      requiredSignatures,
      signers: multiSigSigners,
      proposerAddress: multiSigSigners[0] || defaultPrimaryOwner,
      symbol: config.symbolOrSlug,
      network: 'ethereum',
    });

    if (!creation.valid || !creation.proposal) {
      setProposalError(creation.error || 'Unable to create governance proposal.');
      return;
    }

    setGovernanceProposals(prev => [creation.proposal!, ...prev]);
    setProposalSuccessNotice(
      `Queued ${creation.proposal.proposalId} (${creation.proposal.actionLabel}): ${creation.proposal.signaturesCollected}/${creation.proposal.requiredSignatures} signature(s) collected.`
    );
  };

  const handleCoSignProposal = (proposalId: string) => {
    setProposalError(null);
    setGovernanceProposals(prev =>
      prev.map(prop => {
        if (prop.proposalId !== proposalId) return prop;
        const res = signOrExecuteGovernanceProposal({
          proposal: prop,
          availableSigners: multiSigSigners,
          mode: 'SIGN',
          network: config.network || 'ethereum',
          currentSupply: currentSupplyNum,
          currentTaxPercent: governedTaxPercent,
          currentMaxWalletPercent: governedMaxWalletPercent,
          currentPausedState: governedEmergencyPaused,
        });
        setProposalSuccessNotice(
          `Co-signed ${prop.proposalId}: ${res.updatedProposal.signaturesCollected}/${res.updatedProposal.requiredSignatures} signatures collected (${
            res.updatedProposal.status === 'READY_TO_EXECUTE' ? 'Quorum Reached — Ready to Execute' : 'Awaiting Remaining Signers'
          }).`
        );
        return res.updatedProposal;
      })
    );
  };

  const handleExecuteGovernanceProposal = async (proposalId: string) => {
    setProposalError(null);
    const targetProp = governanceProposals.find(p => p.proposalId === proposalId);
    if (!targetProp || targetProp.status === 'EXECUTED') return;

    const res = signOrExecuteGovernanceProposal({
      proposal: targetProp,
      availableSigners: multiSigSigners,
      mode: 'EXECUTE',
      network: config.network || 'ethereum',
      currentSupply: currentSupplyNum,
      currentTaxPercent: governedTaxPercent,
      currentMaxWalletPercent: governedMaxWalletPercent,
      currentPausedState: governedEmergencyPaused,
    });

    setGovernanceProposals(prev =>
      prev.map(p => (p.proposalId === proposalId ? res.updatedProposal : p))
    );

    if (res.executedNow) {
      setGovernedTaxPercent(res.newTaxPercent);
      setGovernedMaxWalletPercent(res.newMaxWalletPercent);
      setGovernedEmergencyPaused(res.newPausedState);

      if (targetProp.actionType === 'MINT_TOKENS' && res.newSupply !== currentSupplyNum) {
        await onBurnTokenSupply?.({
          newSupply: res.newSupply,
          burnedAmount: 0,
          burnTxHash: res.updatedProposal.executionTxHash || '',
        });
        setBalanceResult(`${res.newSupply.toLocaleString()} ${config.symbolOrSlug}`);
      }

      setProposalSuccessNotice(
        res.executionSummary || `Proposal ${proposalId} executed on-chain.`
      );
    }
  };

  // Etherscan-Style Verify Contract Module is rendered via dedicated <VerifyContract /> component

  // EIP-747 wallet_watchAsset integration: directly prompts MetaMask / injected Web3 provider
  const handleImportTokenToWallet = async () => {
    if (!config.contractAddress) {
      setImportNotice('Smart contract address is not ready yet.');
      return;
    }

    setImportingToWallet(true);
    setImportNotice(null);

    // 1. Immediately ensure internal app state & local storage is populated with this token
    const supplyNum = parseTokenSupply(config.supplyOrScale);
    const tokenAsset: WalletTokenAsset = {
      id: activeToken?.id || `token_${Date.now()}`,
      name: config.name,
      symbol: config.symbolOrSlug,
      balance: supplyNum,
      decimals: config.decimals || 18,
      network: config.network || 'bsc',
      contractAddress: config.contractAddress,
    };

    onAddToWallet?.(tokenAsset);
    setAddedToWallet(true);

    // 2. Trigger Ethereum provider's wallet_watchAsset call (MetaMask, Coinbase, Brave, etc.)
    const eth = typeof window !== 'undefined' ? (window as any).ethereum : undefined;

    if (eth && typeof eth.request === 'function') {
      try {
        const wasAdded = await eth.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: config.contractAddress,
              symbol: config.symbolOrSlug.slice(0, 11), // EIP-747 recommends max 11 chars
              decimals: config.decimals || 18,
              image: '',
            },
          },
        });

        if (wasAdded) {
          setImportSuccess(true);
          setImportNotice(`Token ${config.symbolOrSlug} successfully added to your MetaMask wallet!`);
          setTimeout(() => setImportSuccess(false), 5000);
        } else {
          setImportNotice('Token watch request was closed in MetaMask.');
        }
      } catch (err: any) {
        console.warn('wallet_watchAsset call result:', err);
        // Fallback: Copy address to clipboard for simple manual import
        navigator.clipboard.writeText(config.contractAddress);
        if (err?.code === 4001 || err?.message?.toLowerCase().includes('reject') || err?.message?.toLowerCase().includes('denied')) {
          setImportNotice('Import prompt cancelled in wallet. Contract address copied to clipboard for manual paste.');
        } else {
          setImportNotice('Contract address copied! Paste into MetaMask -> "Import Tokens" -> "Custom Token".');
        }
      } finally {
        setImportingToWallet(false);
      }
    } else {
      // Injected window.ethereum not available in this browser window / iframe
      navigator.clipboard.writeText(config.contractAddress);
      setImportingToWallet(false);
      setImportSuccess(true);
      setImportNotice(
        `Added ${supplyFormatted} ${config.symbolOrSlug} to your NovaDeploy balance! Contract address copied: Paste into MetaMask -> "Import tokens" -> Custom Token.`
      );
      setTimeout(() => setImportSuccess(false), 6000);
    }
  };

  // Swap simulator state
  const [usdtInput, setUsdtInput] = useState<number>(100);
  const [usdtReserve, setUsdtReserve] = useState<number>(10000);
  const [tokenReserve, setTokenReserve] = useState<number>(100000);
  const [swapSuccessMessage, setSwapSuccessMessage] = useState<string | null>(null);

  // ABI interaction state: auto-initialize with recipient and supply
  const [queryAddress, setQueryAddress] = useState(config.recipientOrOwner || '0x71C8364437a9B2f520330D0a0fC62A864114dD8b');
  const [balanceResult, setBalanceResult] = useState<string | null>(
    `${supplyFormatted} ${config.symbolOrSlug}`
  );
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const tokensOut = calculateSwapOutput(usdtInput, usdtReserve, tokenReserve);
  const priceImpact = calculatePriceImpact(usdtInput, usdtReserve, tokenReserve);
  const estimatedTokenPriceUsd = usdtReserve / tokenReserve;

  // Post-Audit DEX Liquidity Provisioning, LP Time-Lock & Listing Suite state
  const [lpAllocationPercent, setLpAllocationPercent] = useState<number>(80);
  const [lpQuoteAsset, setLpQuoteAsset] = useState<'NATIVE' | 'USDT'>('NATIVE');
  const [lpBaseReserveAmount, setLpBaseReserveAmount] = useState<number>(10);
  const [lpLockDurationDays, setLpLockDurationDays] = useState<number>(365);
  const [isLpProvisioned, setIsLpProvisioned] = useState<boolean>(false);
  const [lpProvisionNotice, setLpProvisionNotice] = useState<string | null>(null);

  const postAuditLaunchPlan = useMemo(
    () =>
      calculatePostAuditDexLaunch({
        name: config.name,
        symbol: config.symbolOrSlug,
        network: config.network || 'bsc',
        contractAddress: config.contractAddress,
        totalSupply: currentSupplyNum,
        decimals: config.decimals || 18,
        lpAllocationPercent,
        baseReserveAmount: lpBaseReserveAmount,
        quoteAsset: lpQuoteAsset,
        lpLockDurationDays,
        auditDocumentId: auditReport.reportId,
        auditSha256Digest: auditReport.certificateHash,
      }),
    [
      config.name,
      config.symbolOrSlug,
      config.network,
      config.contractAddress,
      currentSupplyNum,
      config.decimals,
      lpAllocationPercent,
      lpBaseReserveAmount,
      lpQuoteAsset,
      lpLockDurationDays,
      auditReport.reportId,
      auditReport.certificateHash,
    ]
  );

  const handleInitializeLpAndLock = () => {
    setUsdtReserve(Math.max(100, Math.round(postAuditLaunchPlan.initialLiquidityUsd)));
    setTokenReserve(Math.max(100, postAuditLaunchPlan.tokensAllocatedToLp));
    setIsLpProvisioned(true);
    setLpProvisionNotice(
      `Liquidity Pool initialized on ${postAuditLaunchPlan.dexName} (${postAuditLaunchPlan.lpPairSymbol}) with $${postAuditLaunchPlan.totalPoolTvlUsd.toLocaleString()} TVL. 100% of LP tokens locked under ${postAuditLaunchPlan.lpLockCertificateId} until ${postAuditLaunchPlan.lpUnlockDateIso}.`
    );
  };

  const handleDownloadListingManifest = () => {
    const blob = new Blob([postAuditLaunchPlan.listingManifestJson], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${postAuditLaunchPlan.tokenSymbol}_${postAuditLaunchPlan.auditDocumentId}_Listing_Manifest.json`;
    link.click();
    URL.revokeObjectURL(url);
    setCopiedNotice(
      `Downloaded ${postAuditLaunchPlan.tokenSymbol} Exchange Listing & Audit Manifest (.json)`
    );
    setTimeout(() => setCopiedNotice(null), 3500);
  };

  // Explorer link based on network
  const getExplorerUrl = (txOrAddr: string, type: 'tx' | 'address') => {
    const net = config.network || 'bsc';
    if (net === 'ethereum') return `https://etherscan.io/${type}/${txOrAddr}`;
    if (net === 'bsc') return `https://bscscan.com/${type}/${txOrAddr}`;
    if (net === 'polygon') return `https://polygonscan.com/${type}/${txOrAddr}`;
    if (net === 'arbitrum') return `https://arbiscan.io/${type}/${txOrAddr}`;
    if (net === 'solana') return `https://solscan.io/${type}/${txOrAddr}`;
    if (net === 'tron') return `https://tronscan.org/#/${type}/${txOrAddr}`;
    return `#`;
  };

  const handleCopy = (text: string, type: 'contract' | 'tx' | 'recipient') => {
    navigator.clipboard.writeText(text);
    if (type === 'contract') {
      setCopiedContract(true);
      setCopiedNotice(`Smart contract address copied: ${text.slice(0, 10)}...${text.slice(-6)}`);
      setTimeout(() => setCopiedContract(false), 2500);
    } else if (type === 'tx') {
      setCopiedTx(true);
      setCopiedNotice(`Transaction hash copied: ${text.slice(0, 12)}...${text.slice(-6)}`);
      setTimeout(() => setCopiedTx(false), 2500);
    } else {
      setCopiedRecipient(true);
      setCopiedNotice(`Recipient address copied: ${text.slice(0, 10)}...${text.slice(-6)}`);
      setTimeout(() => setCopiedRecipient(false), 2500);
    }
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  const handleDownloadSource = () => {
    const source = generateSolidityContract(
      config.name,
      config.symbolOrSlug,
      typeof config.supplyOrScale === 'number' ? config.supplyOrScale : 100000,
      config.decimals || 18,
      config.durationDays || 30,
      config.recipientOrOwner || '0x00'
    );
    const blob = new Blob([source], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.symbolOrSlug}Token_Verified.sol`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteSwap = () => {
    if (usdtInput <= 0) return;
    setUsdtReserve(prev => prev + usdtInput);
    setTokenReserve(prev => Math.max(1, prev - tokensOut));
    setSwapSuccessMessage(`Successfully swapped ${usdtInput} USDT for ${tokensOut.toLocaleString()} ${config.symbolOrSlug}!`);
    setTimeout(() => setSwapSuccessMessage(null), 4000);
  };

  const handleCheckBalance = () => {
    if (!queryAddress) return;
    if (queryAddress.toLowerCase() === config.recipientOrOwner.toLowerCase()) {
      setBalanceResult(`${typeof config.supplyOrScale === 'number' ? config.supplyOrScale.toLocaleString() : config.supplyOrScale} ${config.symbolOrSlug}`);
    } else {
      setBalanceResult(`0 ${config.symbolOrSlug}`);
    }
  };

  const handleSimulateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTo || !transferAmount) return;
    setTransferSuccess(`Transferred ${transferAmount} ${config.symbolOrSlug} to ${transferTo.slice(0, 8)}... (Tx: 0x${Math.random().toString(16).slice(2, 10)})`);
    setTransferAmount('');
    setTimeout(() => setTransferSuccess(null), 4000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn py-6 relative">
      {/* Floating Copied Toast */}
      {copiedNotice && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 shadow-2xl backdrop-blur-xl animate-fadeIn font-mono text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Top Banner: Success & Active Status */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1626] to-[#08101d] border border-emerald-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                    LIVE & BROADCASTED ON-CHAIN
                  </span>
                </div>

                {/* Live Heartbeat Uptime Badge */}
                <button
                  type="button"
                  onClick={triggerUptimePoll}
                  data-testid="live-uptime-heartbeat-badge"
                  title={`Polling ${uptimeHeartbeat.endpoint} • Click to ping now`}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 ${
                        isPollingHeartbeat ? 'opacity-100' : 'opacity-75'
                      }`}
                    />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span>{uptimeHeartbeat.badgeLabel}</span>
                  <span className="text-[10px] text-emerald-400/80 border-l border-emerald-500/30 pl-2 tabular-nums">
                    {uptimeHeartbeat.responseLatencyMs}ms • #{uptimeHeartbeat.sequenceNumber}
                  </span>
                </button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white mt-1.5">
                {config.name} ({config.symbolOrSlug})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Deployed via NovaDeploy engine on {networkName} • Active duration:{' '}
                <strong className="text-slate-200">{config.durationDays} Days</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Primary One-Click Copy Address Button in Header */}
            {config.contractAddress && (
              <button
                onClick={() => handleCopy(config.contractAddress || '', 'contract')}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  copiedContract
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-2 ring-emerald-500/30'
                    : 'bg-emerald-600/15 hover:bg-emerald-600/25 border-emerald-500/40 text-emerald-300 hover:text-emerald-200'
                }`}
                title="One-click copy contract address to clipboard"
              >
                {copiedContract ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
                <span>{copiedContract ? 'Address Copied!' : 'Copy Contract Address'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAuditReportOpen(true)}
              data-testid="view-audit-report-btn"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>View Audit Report</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadEventLogsCsv}
              data-testid="header-download-event-logs-csv-btn"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Download CSV of smart contract deployment event logs for local auditing"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span>Export Event Logs (.CSV)</span>
            </button>

            <button
              onClick={handleDownloadSource}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Verified Source (.sol)</span>
            </button>
            <button
              onClick={onNewDeployment}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Deploy Another</span>
            </button>
          </div>
        </div>
      </div>

      {/* Network Summary Stats Row: Deployment Latency, Node Confirmation Time, Smart Contract Gas Cost */}
      <div
        data-testid="deployment-network-stats-row"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Stat 1: Deployment Latency */}
        <div className="p-5 rounded-2xl bg-[#0b1322]/90 border border-slate-800/90 hover:border-indigo-500/40 transition-all shadow-lg relative overflow-hidden group flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Deployment Latency
              </span>
              <div className="text-2xl font-heading font-extrabold text-white font-mono tabular-nums mt-1.5">
                {networkTelemetry.deploymentLatencyFormatted}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
            <span>RPC Propagated ({networkName})</span>
            <span className="text-emerald-400 font-mono font-semibold">99.98% SLA</span>
          </div>
        </div>

        {/* Stat 2: Node Confirmation Time */}
        <div className="p-5 rounded-2xl bg-[#0b1322]/90 border border-slate-800/90 hover:border-emerald-500/40 transition-all shadow-lg relative overflow-hidden group flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Node Confirmation Time
              </span>
              <div className="text-2xl font-heading font-extrabold text-emerald-400 font-mono tabular-nums mt-1.5">
                {networkTelemetry.nodeConfirmationFormatted}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
            <span>{networkTelemetry.blockFinalityLabel}</span>
            <span className="text-slate-300 font-mono">12/12 Nodes</span>
          </div>
        </div>

        {/* Stat 3: Smart Contract Gas Cost */}
        <div className="p-5 rounded-2xl bg-[#0b1322]/90 border border-slate-800/90 hover:border-amber-500/40 transition-all shadow-lg relative overflow-hidden group flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Smart Contract Gas Cost
              </span>
              <div className="flex items-baseline gap-2 mt-1.5 whitespace-nowrap">
                <span className="text-2xl font-heading font-extrabold text-amber-300 font-mono tabular-nums">
                  {networkTelemetry.gasCostNative} {networkTelemetry.gasCostSymbol}
                </span>
                <span className="text-xs font-mono tabular-nums text-amber-400/80">
                  (${networkTelemetry.gasCostUsd.toFixed(2)})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatsRefreshTick((t) => t + 1)}
              title="Resample live network telemetry"
              aria-label="Resample live network telemetry"
              className="w-10 h-10 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 transition-colors cursor-pointer"
            >
              <Fuel className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
            <span>{networkTelemetry.networkLabel}</span>
            <button
              type="button"
              onClick={() => setStatsRefreshTick((t) => t + 1)}
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-mono cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Ping RPC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Row: Overview, DEX Swap Simulator, Read/Write Contract, Live Subdomain */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview & Explorer</span>
        </button>

        {isContract && (
          <button
            onClick={() => setActiveTab('swap')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'swap'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>PancakeSwap / DEX Pool</span>
          </button>
        )}

        {isContract && (
          <button
            onClick={() => setActiveTab('abi')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'abi'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Read/Write Contract</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('site')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'site'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Subdomain & DApp</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Prominent Verified Token Balance in Wallet Banner */}
          {isContract && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/70 border border-indigo-500/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                    <Coins className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">
                        Token Balance in Connected Wallet
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ✓ CREDITED TO RECIPIENT
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-heading font-black text-white mt-1 flex items-baseline gap-2">
                      <span>{supplyFormatted}</span>
                      <span className="text-indigo-400 font-mono text-xl">{config.symbolOrSlug}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      100% of genesis supply allocated to recipient wallet:{' '}
                      <span className="font-mono text-slate-300">{config.recipientOrOwner}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Primary 'Import Token to Wallet' button requesting EIP-747 wallet_watchAsset */}
                  <button
                    onClick={handleImportTokenToWallet}
                    disabled={importingToWallet}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                      importSuccess || isTokenImported
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
                    }`}
                    title="Import token into MetaMask or Web3 wallet using EIP-747 wallet_watchAsset"
                  >
                    {importingToWallet ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : importSuccess || isTokenImported ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Wallet className="w-4 h-4 text-slate-950" />
                    )}
                    <span>
                      {importingToWallet
                        ? 'Connecting MetaMask...'
                        : importSuccess
                        ? 'Imported to MetaMask!'
                        : isTokenImported
                        ? 'Import Token to Wallet (Added)'
                        : 'Import Token to Wallet'}
                    </span>
                  </button>
                </div>
              </div>

              {/* In-Card Dynamic Notice for wallet_watchAsset status & instructions */}
              {importNotice && (
                <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/90 border border-indigo-500/40 text-xs font-mono text-indigo-200 flex items-center justify-between gap-3 animate-fadeIn shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="leading-relaxed">{importNotice}</span>
                  </div>
                  <button
                    onClick={() => setImportNotice(null)}
                    className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer text-xs"
                    aria-label="Dismiss notice"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="flex items-center justify-between sm:justify-start gap-2 text-slate-400">
                  <span className="text-slate-500">Holdings Share:</span>
                  <strong className="text-emerald-400 font-semibold">100.00% (Genesis Creator)</strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 text-slate-400">
                  <span className="text-slate-500">Decimals:</span>
                  <strong className="text-white">{config.decimals || 18}</strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 text-slate-400">
                  <span className="text-slate-500">Target Network:</span>
                  <strong className="text-indigo-300 uppercase">{networkName}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Contract / Endpoint Address */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {isContract ? 'Smart Contract Address' : 'Cloud Service Endpoint'}
                </span>
                <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                  EIP-20 Compliant
                </span>
              </div>

              {/* Click-to-copy address bar */}
              <div
                onClick={() => handleCopy(config.contractAddress || '', 'contract')}
                className="group flex items-center justify-between gap-2 bg-slate-950 hover:bg-slate-950/80 p-3 rounded-xl border border-slate-800/90 hover:border-indigo-500/50 cursor-pointer transition-all"
                title="Click anywhere to copy contract address"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-mono text-xs text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                    {config.contractAddress}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleCopy(config.contractAddress || '', 'contract')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      copiedContract
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30'
                    }`}
                    title="Copy Address"
                  >
                    {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{copiedContract ? 'Copied!' : 'Copy Address'}</span>
                  </button>
                  <a
                    href={getExplorerUrl(config.contractAddress || '', 'address')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="View on Block Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>1-Click Copy enabled</span>
                <span className="font-mono text-[10px] text-slate-400">Mainnet Verified</span>
              </div>
            </div>

            {/* Transaction Broadcast Hash */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Transaction Hash</span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                  CONFIRMED
                </span>
              </div>

              {/* Click-to-copy TX hash bar */}
              <div
                onClick={() => handleCopy(config.txHash || '', 'tx')}
                className="group flex items-center justify-between gap-2 bg-slate-950 hover:bg-slate-950/80 p-3 rounded-xl border border-slate-800/90 hover:border-emerald-500/50 cursor-pointer transition-all"
                title="Click anywhere to copy transaction hash"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-mono text-xs text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                    {config.txHash}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleCopy(config.txHash || '', 'tx')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      copiedTx
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30'
                    }`}
                    title="Copy TX Hash"
                  >
                    {copiedTx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{copiedTx ? 'Copied!' : 'Copy Hash'}</span>
                  </button>
                  <a
                    href={getExplorerUrl(config.txHash || '', 'tx')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="View on Block Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>1-Click Copy enabled</span>
                <span className="font-mono text-[10px] text-emerald-400">Broadcast Success</span>
              </div>
            </div>

            {/* Recipient & Supply (REGISTERED Minted Supply & Recipient • 100% TO RECIPIENT) */}
            <div
              data-testid="minted-supply-recipient-card"
              className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 hover:border-purple-500/50 transition-all space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    REGISTERED
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
                    Minted Supply & Recipient
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-semibold">
                  100% TO RECIPIENT
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-white font-bold tabular-nums">
                    {typeof config.supplyOrScale === 'number'
                      ? config.supplyOrScale.toLocaleString()
                      : config.supplyOrScale}{' '}
                    {config.symbolOrSlug}
                  </div>
                  <div className="text-slate-400 text-[11px] truncate max-w-[165px]" title={config.recipientOrOwner}>
                    {config.recipientOrOwner}
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(config.recipientOrOwner || '', 'recipient')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    copiedRecipient
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30'
                  }`}
                  title="Copy Recipient Address"
                >
                  {copiedRecipient ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                  <span>{copiedRecipient ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-[10px] text-purple-300">
                  Genesis Event #EVT-002 Verified
                </span>
                <button
                  type="button"
                  onClick={handleDownloadEventLogsCsv}
                  data-testid="recipient-card-export-csv-btn"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-mono text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Download CSV Audit Log of Genesis Mint & Deployment Events"
                >
                  <Download className="w-3 h-3 text-cyan-400" />
                  <span>Audit CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Telemetry & Liquidity Gateway + Recharts 24-Hour Uptime & Real-Time Transaction Volume */}
          <div
            data-testid="uptime-monitor-panel"
            className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="font-heading font-bold text-sm text-white">
                  Real-time Node Telemetry & 24-Hour Uptime / Volume Analytics
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{uptimeHeartbeat.badgeLabel}</span>
                </span>
                <span className="text-slate-400">HTTP {uptimeHeartbeat.statusCode} OK</span>
                <button
                  type="button"
                  onClick={triggerUptimePoll}
                  data-testid="uptime-ping-now-btn"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isPollingHeartbeat ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Ping Heartbeat</span>
                </button>
              </div>
            </div>

            {/* Live Mock Endpoint Polling Strip */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-mono text-xs">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    GET 200
                  </span>
                  <span className="truncate text-slate-300" data-testid="uptime-endpoint-url">
                    {uptimeHeartbeat.endpoint}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                  <span>
                    Last Heartbeat: <strong className="text-slate-300 tabular-nums">{uptimeHeartbeat.checkedAtTimeLabel}</strong>
                  </span>
                  <span>
                    Roundtrip: <strong className="text-emerald-400 tabular-nums">{uptimeHeartbeat.responseLatencyMs} ms</strong>
                  </span>
                  <span>
                    Quorum: <strong className="text-indigo-300">{uptimeHeartbeat.activeValidators}</strong>
                  </span>
                  <span>
                    Poll Seq: <strong className="text-slate-300 tabular-nums">#{uptimeHeartbeat.sequenceNumber}</strong>
                  </span>
                </div>
              </div>

              {/* 12-Tick Live Heartbeat Pulse Bars */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-end gap-1 h-7 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800" title="Last 12 Heartbeat Pings (100% Operational)">
                  {heartbeatHistory.map((latency, idx) => {
                    const heightPct = Math.max(35, Math.min(100, Math.round((latency / 60) * 100)));
                    return (
                      <span
                        key={idx}
                        style={{ height: `${heightPct}%` }}
                        className="w-1.5 rounded-sm bg-emerald-400/90 transition-all duration-300"
                      />
                    );
                  })}
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-emerald-400 tabular-nums">
                    {uptimeHeartbeat.uptimeFormatted} SLA
                  </div>
                  <div className="text-[10px] text-slate-500">4s Poll Interval</div>
                </div>
              </div>
            </div>

            {/* Recharts 24-Hour Uptime Trends & Real-Time Transaction Volume Dashboard */}
            <div
              data-testid="recharts-24h-telemetry-dashboard"
              className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-4"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h4 className="font-heading font-bold text-xs sm:text-sm text-white">
                      24-Hour Deployment Uptime Trends & Real-Time Transaction Volume
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-semibold whitespace-nowrap">
                      LIVE 24H WINDOW
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Hourly SLA availability (%) and on-chain contract transaction throughput for {config.name} (${config.symbolOrSlug}) over the last 24 hours.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setTelemetryChartMode('combined')}
                      data-testid="chart-mode-combined-btn"
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        telemetryChartMode === 'combined'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Dual View
                    </button>
                    <button
                      type="button"
                      onClick={() => setTelemetryChartMode('uptime')}
                      data-testid="chart-mode-uptime-btn"
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        telemetryChartMode === 'uptime'
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Uptime SLA %
                    </button>
                    <button
                      type="button"
                      onClick={() => setTelemetryChartMode('volume')}
                      data-testid="chart-mode-volume-btn"
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        telemetryChartMode === 'volume'
                          ? 'bg-cyan-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Tx Volume
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExtraSimulatedTxCount(prev => prev + 1)}
                    data-testid="simulate-live-block-tx-btn"
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>+ Simulate Block Traffic</span>
                  </button>
                </div>
              </div>

              {/* 24-Hour KPI Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase block">24h Mean Uptime SLA</span>
                  <strong
                    data-testid="telemetry-24h-mean-uptime"
                    className="text-base font-bold text-emerald-400 tabular-nums mt-0.5 block"
                  >
                    {average24hUptimePct.toFixed(2)}%
                  </strong>
                  <span className="text-[10px] text-slate-500">21,598 / 21,600 Polls OK</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase block">24h Transaction Volume</span>
                  <strong
                    data-testid="telemetry-24h-total-tx"
                    className="text-base font-bold text-cyan-400 tabular-nums mt-0.5 block"
                  >
                    {total24hTransactions.toLocaleString()} Txs
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Current Hour: {telemetry24h[23]?.txVolume ?? 104} Txs
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase block">Peak Hourly Throughput</span>
                  <strong className="text-base font-bold text-indigo-300 tabular-nums mt-0.5 block">
                    {peakHourlyTx.toLocaleString()} Txs/hr
                  </strong>
                  <span className="text-[10px] text-slate-500">Zero Dropped Calls</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase block">Genesis Allocation</span>
                  <strong className="text-base font-bold text-purple-300 tabular-nums mt-0.5 block">
                    100% Recipient
                  </strong>
                  <span className="text-[10px] text-emerald-400">Verified On-Chain</span>
                </div>
              </div>

              {/* Recharts Canvas Grid */}
              <div
                className={`grid grid-cols-1 ${
                  telemetryChartMode === 'combined' ? 'lg:grid-cols-2' : ''
                } gap-4`}
              >
                {(telemetryChartMode === 'combined' || telemetryChartMode === 'uptime') && (
                  <div
                    data-testid="recharts-uptime-trend-card"
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Deployment Uptime Trend (Last 24h %)</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        Target SLA: ≥ 99.90%
                      </span>
                    </div>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={telemetry24h} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                          <defs>
                            <linearGradient id="activeUptimeGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis
                            dataKey="hourLabel"
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            interval={3}
                          />
                          <YAxis
                            domain={[99.8, 100]}
                            ticks={[99.8, 99.85, 99.9, 99.95, 100]}
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            tickFormatter={val => `${Number(val).toFixed(2)}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#090e1a',
                              borderColor: '#10b981',
                              borderRadius: '0.75rem',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              color: '#e2e8f0',
                            }}
                            formatter={(value: any, name: any) => {
                              if (name === 'uptimePct') return [`${Number(value).toFixed(2)}%`, 'Uptime SLA'];
                              return [`${value} ms`, 'Avg RPC Latency'];
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="uptimePct"
                            stroke="#10b981"
                            strokeWidth={2.2}
                            fillOpacity={1}
                            fill="url(#activeUptimeGradient)"
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {(telemetryChartMode === 'combined' || telemetryChartMode === 'volume') && (
                  <div
                    data-testid="recharts-tx-volume-card"
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span>Real-Time Transaction Volume (Last 24h)</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        Live Window: {telemetry24h[23]?.txVolume ?? 104} Txs/hr
                      </span>
                    </div>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={telemetry24h} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis
                            dataKey="hourLabel"
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            interval={3}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#090e1a',
                              borderColor: '#06b6d4',
                              borderRadius: '0.75rem',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              color: '#e2e8f0',
                            }}
                            formatter={(value: any, name: any) => {
                              if (name === 'txVolume') return [`${value} Txs`, 'Hourly Tx Volume'];
                              return [`${value} ms`, 'RPC Roundtrip'];
                            }}
                          />
                          <Bar
                            dataKey="txVolume"
                            fill="#06b6d4"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="avgLatencyMs"
                            stroke="#818cf8"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-slate-400">Decentralized Exchanges:</span>
                <div className="font-semibold text-white">Ready for Uniswap / PancakeSwap Pool</div>
                <p className="text-[11px] text-slate-500">
                  Liquidity pair can be initialized immediately with USDT or BNB/ETH.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="text-slate-400">Automated Audit:</span>
                  <div className="font-semibold text-emerald-400">Grade A+ (CertiK Certified Standard)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clean Slither and Mythril static analysis reports generated.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuditReportOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open PDF Audit Dossier →</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-slate-400">Subdomain & SSL:</span>
                <div className="font-semibold text-indigo-300">
                  https://{config.symbolOrSlug.toLowerCase()}.novadeploy.app
                </div>
                <p className="text-[11px] text-slate-500">
                  Edge routing and TLS 1.3 certificates provisioned globally.
                </p>
              </div>
            </div>
          </div>

          {/* Smart Contract Deployment Event Logs & Local CSV Audit Exporter */}
          <div
            data-testid="deployment-event-logs-panel"
            className="p-6 rounded-3xl bg-slate-900/75 border border-cyan-500/30 space-y-4 shadow-xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </span>
                  <h3 className="font-heading font-bold text-base text-white">
                    Smart Contract Deployment Event Logs (CSV Local Audit Ledger)
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono font-semibold text-purple-300">
                    100% TO RECIPIENT VERIFIED
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Cryptographic on-chain event log trace including Genesis Mint allocation, bytecode verification, ownership attestation, and deflationary burns.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadEventLogsCsv}
                  data-testid="download-event-logs-csv-btn"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Event Logs (.CSV)</span>
                </button>
              </div>
            </div>

            {csvExportNotice && (
              <div
                data-testid="csv-export-confirmation"
                className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 font-mono animate-fadeIn"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{csvExportNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCsvExportNotice(null)}
                  className="text-slate-400 hover:text-white text-[11px] px-2 py-0.5 rounded bg-slate-900/80 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Filter Pills & Event Counter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                {(
                  [
                    { id: 'ALL', label: `All Events (${deploymentEventLogs.length})` },
                    { id: 'MINT_DEPLOY', label: 'Genesis Mint & Deploy' },
                    { id: 'SECURITY_SLA', label: 'Ownership & SLA' },
                    { id: 'BURN', label: `Burn Events (${burnHistory.length})` },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEventFilter(tab.id)}
                    className={`px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                      eventFilter === tab.id
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-mono text-slate-400">
                Schema: RFC-4180 CSV • Recipient:{' '}
                <strong className="text-purple-300">
                  {(config.recipientOrOwner || '').slice(0, 8)}...{(config.recipientOrOwner || '').slice(-4)}
                </strong>
              </span>
            </div>

            {/* Event Log Audit Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-950/90">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3.5">Event ID / Block</th>
                    <th className="py-3 px-3.5">Event Signature</th>
                    <th className="py-3 px-3.5">Allocation / Badge</th>
                    <th className="py-3 px-3.5">Amount</th>
                    <th className="py-3 px-3.5">Recipient / Target</th>
                    <th className="py-3 px-3.5">Audit Verification Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredEventLogs.map(evt => (
                    <tr
                      key={evt.eventId}
                      data-testid={`event-log-row-${evt.eventName}`}
                      className="hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-200">{evt.eventId}</div>
                        <div className="text-[10px] text-slate-500 tabular-nums">
                          #{evt.blockNumber} • {evt.timestampLabel}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-semibold text-cyan-300">{evt.eventName}</span>
                        <div className="text-[10px] text-slate-500">
                          Tx: {evt.txHash.slice(0, 10)}...{evt.txHash.slice(-6)}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            evt.allocationBadge === '100% TO RECIPIENT'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : evt.eventName === 'TokensBurned'
                              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {evt.allocationBadge}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-white tabular-nums">
                        {evt.amountFormatted}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-300">
                        {evt.toAddress.slice(0, 10)}...{evt.toAddress.slice(-6)}
                      </td>
                      <td className="py-3 px-3.5 text-[11px] text-slate-400 min-w-[260px]">
                        {evt.auditNotes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deflationary Token Burn Sequence & Firestore Total Supply Controller */}
          {isContract && (
            <div
              data-testid="token-burn-sequence-panel"
              className="p-6 rounded-3xl bg-gradient-to-br from-[#160d18] via-[#0f1322] to-[#0b101d] border border-orange-500/30 space-y-5 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/90">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                      <Flame className="w-4 h-4" />
                    </span>
                    <h3 className="font-heading font-bold text-base text-white">
                      Deflationary Token Burn Sequence (ERC20Burnable)
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-[10px] font-mono font-semibold text-orange-300">
                      0x000...dEaD SINK
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Permanently retire {config.symbolOrSlug} tokens from circulation and synchronize the updated total supply directly to Cloud Firestore.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isCloudAuthenticated ? 'Firestore Live Sync' : 'Local + Firestore Ready'}</span>
                  </span>
                </div>
              </div>

              {/* Supply Telemetry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90">
                  <span className="text-[11px] text-slate-400 uppercase block">Active Total Supply</span>
                  <div
                    data-testid="active-total-supply-value"
                    className="text-lg font-bold text-white mt-1 tabular-nums"
                  >
                    {currentSupplyNum.toLocaleString()} {config.symbolOrSlug}
                  </div>
                  <span className="text-[10px] text-emerald-400">Synced with deployments/{config.id}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90">
                  <span className="text-[11px] text-slate-400 uppercase block">Cumulative Burned</span>
                  <div
                    data-testid="cumulative-burned-value"
                    className="text-lg font-bold text-orange-400 mt-1 tabular-nums"
                  >
                    {totalBurned.toLocaleString()} {config.symbolOrSlug}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {burnHistory.length} Burn Sequence{burnHistory.length === 1 ? '' : 's'} Executed
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90">
                  <span className="text-[11px] text-slate-400 uppercase block">Null Sink Address</span>
                  <div className="text-xs font-bold text-slate-300 mt-1.5 truncate">
                    0x000000000000000000000000000000000000dEaD
                  </div>
                  <span className="text-[10px] text-orange-300/80">Irreversible Cryptographic Lock</span>
                </div>
              </div>

              {/* Burn Controls & Form */}
              <form
                onSubmit={handleInitiateTokenBurn}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label
                    htmlFor="token-burn-amount-input"
                    className="text-xs font-semibold text-slate-300"
                  >
                    Burn Amount ({config.symbolOrSlug} to permanently destroy):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 mr-1">Quick Presets:</span>
                    {[1, 5, 10, 25].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplyBurnPreset(pct)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-orange-500/20 text-slate-300 hover:text-orange-300 border border-slate-800 hover:border-orange-500/40 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                      >
                        Burn {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex items-center bg-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-800 focus-within:border-orange-500/50">
                    <input
                      id="token-burn-amount-input"
                      data-testid="token-burn-amount-input"
                      type="number"
                      min="1"
                      step="any"
                      value={burnAmountInput}
                      onChange={e => {
                        setBurnAmountInput(e.target.value);
                        setBurnError(null);
                      }}
                      placeholder="Enter token amount to burn"
                      className="w-full bg-transparent text-sm font-mono text-white focus:outline-none"
                    />
                    <span className="text-xs font-mono font-bold text-orange-400 ml-2">
                      {config.symbolOrSlug}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isBurning}
                    data-testid="initiate-token-burn-btn"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all cursor-pointer shrink-0"
                  >
                    <Flame className={`w-4 h-4 ${isBurning ? 'animate-bounce' : ''}`} />
                    <span>{isBurning ? 'Executing Burn Sequence...' : 'Initiate Token Burn Sequence'}</span>
                  </button>
                </div>

                {burnError && (
                  <div
                    data-testid="token-burn-error"
                    className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{burnError}</span>
                  </div>
                )}

                {burnSuccessNotice && (
                  <div
                    data-testid="token-burn-success"
                    className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold">{burnSuccessNotice}</div>
                      {burnHistory[0] && (
                        <div className="text-[11px] font-mono text-emerald-400/90">
                          Burn Proof Tx: {burnHistory[0].burnTxHash.slice(0, 18)}...{burnHistory[0].burnTxHash.slice(-8)} • Recorded at {burnHistory[0].timestampLabel}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>

              {/* Recent On-Chain Burn Ledger */}
              {burnHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Verified Burn Sequence Ledger
                  </div>
                  <div className="space-y-2">
                    {burnHistory.map((item, idx) => (
                      <div
                        key={item.burnTxHash + idx}
                        className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold">
                            -{item.burnedAmount.toLocaleString()} {item.symbol} ({item.burnPercentage}%)
                          </span>
                          <span className="text-slate-400">
                            Supply: {item.previousSupply.toLocaleString()} →{' '}
                            <strong className="text-emerald-400">{item.newSupply.toLocaleString()}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Tx: {item.burnTxHash.slice(0, 10)}...{item.burnTxHash.slice(-6)}</span>
                          <span className="text-slate-400">{item.timestampLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multi-Signature Governance Settings Card */}
          {isContract && (
            <div
              data-testid="governance-settings-card"
              className="p-6 rounded-3xl bg-slate-900/80 border border-indigo-500/35 space-y-6 shadow-xl"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <Users className="w-4 h-4" />
                    </span>
                    <h3 className="font-heading font-bold text-base text-white">
                      Governance Settings (Multi-Signature Admin Threshold)
                    </h3>
                    <span
                      data-testid="multisig-quorum-badge"
                      className="px-2.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-mono font-semibold text-indigo-300"
                    >
                      {multiSigValidation.quorumLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Configure an M-of-N multi-signature quorum and timelock threshold required before executing privileged administrative actions such as changing transfer tax fees or minting new tokens.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs">
                  <span className="text-slate-400">Quorum Presets:</span>
                  {[
                    { label: '1-of-1', req: 1, total: 1 },
                    { label: '2-of-3 Safe', req: 2, total: 3 },
                    { label: '3-of-5 Institutional', req: 3, total: 5 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyMultiSigPreset(preset.req, preset.total)}
                      data-testid={`multisig-preset-${preset.req}-of-${preset.total}`}
                      className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        requiredSignatures === preset.req && multiSigSigners.length === preset.total
                          ? 'bg-indigo-600/30 border-indigo-400 text-white font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Governed Contract State Telemetry Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90">
                  <span className="text-[10px] text-slate-400 uppercase block">Multi-Sig Safe Vault</span>
                  <div
                    data-testid="multisig-vault-address"
                    className="text-xs font-bold text-indigo-300 mt-1 truncate"
                    title={multiSigValidation.multiSigVaultAddress}
                  >
                    {multiSigValidation.multiSigVaultAddress.slice(0, 12)}...
                    {multiSigValidation.multiSigVaultAddress.slice(-6)}
                  </div>
                  <span className="text-[10px] text-emerald-400">{multiSigValidation.securityTier}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90">
                  <span className="text-[10px] text-slate-400 uppercase block">Active Transfer Tax Fee</span>
                  <div
                    data-testid="governance-current-tax"
                    className="text-base font-bold text-white mt-0.5 tabular-nums"
                  >
                    {governedTaxPercent}% ({Math.round(governedTaxPercent * 100)} BPS)
                  </div>
                  <span className="text-[10px] text-slate-500">Protected by {requiredSignatures}-of-{multiSigSigners.length} Quorum</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90">
                  <span className="text-[10px] text-slate-400 uppercase block">Governed Token Supply</span>
                  <div
                    data-testid="governance-current-supply"
                    className="text-base font-bold text-emerald-400 mt-0.5 tabular-nums"
                  >
                    {currentSupplyNum.toLocaleString()} {config.symbolOrSlug}
                  </div>
                  <span className="text-[10px] text-slate-500">Max Wallet Cap: {governedMaxWalletPercent}%</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90">
                  <span className="text-[10px] text-slate-400 uppercase block">Timelock & Circuit State</span>
                  <div className="text-base font-bold text-cyan-300 mt-0.5 tabular-nums">
                    {timelockHours}h Timelock
                  </div>
                  <span
                    className={`text-[10px] ${
                      governedEmergencyPaused ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {governedEmergencyPaused ? 'Transfers Paused' : 'Transfers Active'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Column: Multi-Sig Threshold & Co-Signer Roster */}
                <div className="p-5 rounded-2xl bg-slate-950/85 border border-slate-800/90 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                      <span>1. Multi-Signature Threshold & Signers</span>
                    </h4>
                    <span className="text-[11px] font-mono text-indigo-300">
                      Threshold: {requiredSignatures} / {multiSigSigners.length}
                    </span>
                  </div>

                  {/* Required Signatures & Timelock Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="multisig-threshold-select"
                        className="text-slate-400 block font-medium"
                      >
                        Required Signatures (M of {multiSigSigners.length}):
                      </label>
                      <select
                        id="multisig-threshold-select"
                        data-testid="multisig-threshold-select"
                        value={requiredSignatures}
                        onChange={e => setRequiredSignatures(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {multiSigSigners.map((_, idx) => {
                          const count = idx + 1;
                          return (
                            <option key={count} value={count}>
                              {count} of {multiSigSigners.length} Signer{count > 1 ? 's' : ''} ({Math.round((count / multiSigSigners.length) * 100)}%)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="multisig-timelock-select"
                        className="text-slate-400 block font-medium"
                      >
                        Execution Timelock Delay:
                      </label>
                      <select
                        id="multisig-timelock-select"
                        data-testid="multisig-timelock-select"
                        value={timelockHours}
                        onChange={e => setTimelockHours(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={0}>0h (Immediate Quorum)</option>
                        <option value={6}>6h Timelock Delay</option>
                        <option value={12}>12h Timelock Delay</option>
                        <option value={24}>24h Standard Timelock</option>
                        <option value={48}>48h Institutional Lock</option>
                      </select>
                    </div>
                  </div>

                  {/* Authorized Co-Signer Wallet List */}
                  <div className="space-y-2">
                    <span className="text-[11px] text-slate-400 block">
                      Authorized Multi-Sig Signer Wallets ({multiSigSigners.length}):
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {multiSigSigners.map((signer, idx) => (
                        <div
                          key={signer + idx}
                          className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 font-mono text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-slate-200 truncate" title={signer}>
                              {signer}
                            </span>
                          </div>
                          {multiSigSigners.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCoSigner(idx)}
                              aria-label={`Remove signer ${idx + 1}`}
                              className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Co-Signer Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      aria-label="New co-signer wallet address"
                      data-testid="new-cosigner-address-input"
                      value={newSignerInput}
                      onChange={e => {
                        setNewSignerInput(e.target.value);
                        setGovernanceConfigError(null);
                      }}
                      placeholder="Add co-signer 0x... wallet address"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCoSigner}
                      data-testid="add-cosigner-btn"
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Signer</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveMultiSigQuorum}
                    data-testid="save-multisig-quorum-btn"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    Save Multi-Signature Threshold Policy
                  </button>

                  {governanceConfigError && (
                    <div
                      data-testid="governance-config-error"
                      className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{governanceConfigError}</span>
                    </div>
                  )}

                  {governanceConfigNotice && (
                    <div
                      data-testid="governance-config-notice"
                      className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{governanceConfigNotice}</span>
                    </div>
                  )}
                </div>

                {/* Right Column: Administrative Action Proposal Builder (Tax Fee / Minting / Max Wallet) */}
                <form
                  onSubmit={handleCreateGovernanceProposal}
                  className="p-5 rounded-2xl bg-slate-950/85 border border-slate-800/90 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        <span>2. Queue Multi-Sig Administrative Action</span>
                      </h4>
                      <span className="text-[11px] font-mono text-cyan-300">
                        Requires {requiredSignatures} Sig{requiredSignatures > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Action Type Selector */}
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      {(
                        [
                          { id: 'SET_TAX_FEE', label: 'Change Tax Fee', testId: 'gov-action-tax-btn' },
                          { id: 'MINT_TOKENS', label: 'Mint New Tokens', testId: 'gov-action-mint-btn' },
                          { id: 'UPDATE_MAX_WALLET', label: 'Max Wallet Cap %', testId: 'gov-action-maxwallet-btn' },
                          { id: 'EMERGENCY_PAUSE', label: 'Emergency Pause', testId: 'gov-action-pause-btn' },
                        ] as const
                      ).map(act => (
                        <button
                          key={act.id}
                          type="button"
                          data-testid={act.testId}
                          onClick={() => {
                            setSelectedGovAction(act.id);
                            setProposalError(null);
                          }}
                          className={`px-3 py-2 rounded-xl border text-center whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                            selectedGovAction === act.id
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>

                    {/* Dynamic Parameter Inputs by Selected Action */}
                    {selectedGovAction === 'SET_TAX_FEE' && (
                      <div className="space-y-2">
                        <label
                          htmlFor="gov-tax-percent-input"
                          className="text-xs text-slate-300 block font-medium"
                        >
                          New Transfer Tax Fee (% — Max 15%):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id="gov-tax-percent-input"
                            data-testid="gov-tax-percent-input"
                            type="number"
                            min="0"
                            max="15"
                            step="0.1"
                            value={proposedTaxInput}
                            onChange={e => setProposedTaxInput(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                          />
                          <div className="flex gap-1 font-mono text-xs">
                            {['0', '1', '2.5', '5'].map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setProposedTaxInput(preset)}
                                className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
                              >
                                {preset}%
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Calldata: <code>setTransferTaxBps(uint256)</code> • Current: {governedTaxPercent}%
                        </p>
                      </div>
                    )}

                    {selectedGovAction === 'MINT_TOKENS' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label
                            htmlFor="gov-mint-amount-input"
                            className="text-xs text-slate-300 block font-medium"
                          >
                            Amount of {config.symbolOrSlug} to Mint:
                          </label>
                          <input
                            id="gov-mint-amount-input"
                            data-testid="gov-mint-amount-input"
                            type="number"
                            min="1"
                            step="any"
                            value={proposedMintAmountInput}
                            onChange={e => setProposedMintAmountInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label
                            htmlFor="gov-mint-recipient-input"
                            className="text-xs text-slate-300 block font-medium"
                          >
                            Destination Treasury / Recipient Wallet:
                          </label>
                          <input
                            id="gov-mint-recipient-input"
                            data-testid="gov-mint-recipient-input"
                            type="text"
                            value={proposedMintRecipientInput}
                            onChange={e => setProposedMintRecipientInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    )}

                    {selectedGovAction === 'UPDATE_MAX_WALLET' && (
                      <div className="space-y-2">
                        <label
                          htmlFor="gov-max-wallet-input"
                          className="text-xs text-slate-300 block font-medium"
                        >
                          Anti-Whale Max Wallet Holding (% of Supply):
                        </label>
                        <input
                          id="gov-max-wallet-input"
                          data-testid="gov-max-wallet-input"
                          type="number"
                          min="1"
                          max="100"
                          step="0.5"
                          value={proposedMaxWalletInput}
                          onChange={e => setProposedMaxWalletInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                        <p className="text-[11px] text-slate-500 font-mono">
                          Calldata: <code>setMaxWalletBps(uint256)</code> • Current: {governedMaxWalletPercent}%
                        </p>
                      </div>
                    )}

                    {selectedGovAction === 'EMERGENCY_PAUSE' && (
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                        <div className="font-semibold">Emergency Circuit Breaker Proposal</div>
                        <p className="text-[11px] text-slate-400">
                          Queues an OpenZeppelin Pausable state transition requiring {requiredSignatures} of {multiSigSigners.length} multi-sig approvals.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      type="submit"
                      data-testid="create-governance-proposal-btn"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-600/20 cursor-pointer"
                    >
                      Queue Multi-Sig Proposal (Sign 1/{requiredSignatures})
                    </button>

                    {proposalError && (
                      <div
                        data-testid="governance-proposal-error"
                        className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{proposalError}</span>
                      </div>
                    )}

                    {proposalSuccessNotice && (
                      <div
                        data-testid="governance-proposal-notice"
                        className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{proposalSuccessNotice}</span>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Active Multi-Sig Proposal Queue & Execution Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-400">
                    Multi-Signature Governance Proposal Queue ({governanceProposals.length})
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Quorum Required: {requiredSignatures} of {multiSigSigners.length} Signers
                  </span>
                </div>

                <div className="space-y-2.5">
                  {governanceProposals.map(prop => (
                    <div
                      key={prop.proposalId}
                      data-testid={`governance-proposal-item-${prop.proposalId}`}
                      className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-mono text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                            {prop.proposalId}
                          </span>
                          <span className="font-semibold text-white">{prop.actionLabel}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              prop.status === 'EXECUTED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : prop.status === 'READY_TO_EXECUTE'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {prop.status} ({prop.signaturesCollected}/{prop.requiredSignatures} Sigs)
                          </span>
                        </div>
                        <div className="text-slate-300 text-xs">{prop.parameterSummary}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Calldata: {prop.calldataHex.slice(0, 34)}... • Created {prop.createdAtLabel}
                          {prop.executionTxHash
                            ? ` • Executed Tx: ${prop.executionTxHash.slice(0, 12)}...`
                            : ''}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {prop.status !== 'EXECUTED' &&
                          prop.signaturesCollected < prop.requiredSignatures && (
                            <button
                              type="button"
                              onClick={() => handleCoSignProposal(prop.proposalId)}
                              data-testid={`cosign-proposal-btn-${prop.proposalId}`}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              + Co-Sign ({prop.signaturesCollected + 1}/{prop.requiredSignatures})
                            </button>
                          )}

                        {prop.status !== 'EXECUTED' && (
                          <button
                            type="button"
                            onClick={() => handleExecuteGovernanceProposal(prop.proposalId)}
                            data-testid={`execute-proposal-btn-${prop.proposalId}`}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md cursor-pointer"
                          >
                            Execute Multi-Sig Action
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Etherscan-Style Verify Contract Component (Flattened Source & Verification Status Simulator) */}
          {isContract && (
            <VerifyContract
              config={config}
              currentSupplyNum={currentSupplyNum}
              governedTaxPercent={governedTaxPercent}
              requiredSignatures={requiredSignatures}
              totalSigners={multiSigSigners.length}
              onNotify={msg => {
                setCopiedNotice(msg);
                setTimeout(() => setCopiedNotice(null), 3500);
              }}
            />
          )}

          {/* Post-Audit Next Steps: DEX Liquidity Pool, LP Time-Lock & Exchange Listing Manifest */}
          {isContract && (
            <div
              data-testid="post-audit-launch-card"
              className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1626] via-[#09111e] to-[#0a1324] border border-emerald-500/35 shadow-2xl space-y-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>POST-AUDIT LAUNCH PIPELINE • {postAuditLaunchPlan.auditDocumentId}</span>
                  </div>
                  <h3 className="text-xl font-heading font-extrabold text-white">
                    Next Step: DEX Liquidity Pool, LP Time-Lock & Exchange Listing
                  </h3>
                  <p className="text-xs text-slate-400">
                    Your smart contract passed static & symbolic verification (<strong className="text-emerald-400">Grade A+ · 99.4/100</strong>). Provision initial DEX liquidity, lock LP tokens, and export your verified listing manifest for BscScan, CoinGecko, and CoinMarketCap.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    data-testid="download-listing-manifest-btn"
                    onClick={handleDownloadListingManifest}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Listing Manifest (.json)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="execute-lp-lock-btn"
                    onClick={handleInitializeLpAndLock}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {isLpProvisioned
                        ? 'Update Pool & Renew LP Lock'
                        : 'Initialize DEX Liquidity & Lock LP'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 3-Step Post-Audit Status Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">1. Security Audit Dossier</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                      VERIFIED A+ (99.4)
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold text-white">
                    {postAuditLaunchPlan.auditDocumentId}
                  </div>
                  <p className="font-mono text-[11px] text-slate-400 truncate">
                    SHA-256: {postAuditLaunchPlan.auditSha256Digest.slice(0, 18)}...
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">2. Target DEX Router</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-[10px] font-bold">
                      {postAuditLaunchPlan.lpPairSymbol}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {postAuditLaunchPlan.dexName}
                  </div>
                  <p className="font-mono text-[11px] text-slate-400 truncate">
                    Router: {postAuditLaunchPlan.dexRouterAddress}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">3. LP Time-Lock Vault</span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        isLpProvisioned
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isLpProvisioned ? '100% LP LOCKED' : 'READY TO LOCK'}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold text-white">
                    {postAuditLaunchPlan.lpLockCertificateId}
                  </div>
                  <p className="font-mono text-[11px] text-slate-400">
                    Unlocks: {postAuditLaunchPlan.lpUnlockDateIso} ({postAuditLaunchPlan.lpLockDurationDays}d)
                  </p>
                </div>
              </div>

              {/* Interactive Liquidity & LP Lock Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Configure Initial AMM Liquidity Parameters
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Supply Allocated to LP ({lpAllocationPercent}%)
                      </label>
                      <div className="flex items-center gap-2">
                        {[50, 70, 80, 90, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setLpAllocationPercent(pct)}
                            className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-semibold border transition-colors cursor-pointer ${
                              lpAllocationPercent === pct
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Paired Base Asset
                      </label>
                      <div className="flex items-center gap-2">
                        {(['NATIVE', 'USDT'] as const).map(asset => (
                          <button
                            key={asset}
                            type="button"
                            onClick={() => {
                              setLpQuoteAsset(asset);
                              setLpBaseReserveAmount(asset === 'USDT' ? 5000 : 10);
                            }}
                            className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-semibold border transition-colors cursor-pointer ${
                              lpQuoteAsset === asset
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {asset === 'NATIVE'
                              ? `Native (${postAuditLaunchPlan.dexName.includes('BNB') ? 'BNB' : 'ETH/SOL'})`
                              : 'USDT Stablecoin'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Initial {postAuditLaunchPlan.baseAssetSymbol} Liquidity Deposit
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={lpBaseReserveAmount}
                        onChange={e =>
                          setLpBaseReserveAmount(Math.max(0.1, Number(e.target.value) || 1))
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        LP Time-Lock Duration
                      </label>
                      <div className="flex items-center gap-2">
                        {[90, 180, 365].map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setLpLockDurationDays(days)}
                            className={`flex-1 py-2 rounded-xl font-mono text-xs font-semibold border transition-colors cursor-pointer ${
                              lpLockDurationDays === days
                                ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {days}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculated Valuation & Listing Output */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Calculated DEX Launch Valuation ({postAuditLaunchPlan.lpPairSymbol})
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Tokens in LP Pool</span>
                      <strong className="text-white text-sm">
                        {postAuditLaunchPlan.tokensAllocatedToLp.toLocaleString()}{' '}
                        {postAuditLaunchPlan.tokenSymbol}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total Pool TVL (USD)</span>
                      <strong className="text-emerald-400 text-sm">
                        ${postAuditLaunchPlan.totalPoolTvlUsd.toLocaleString()} USD
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Initial Listing Price</span>
                      <strong className="text-indigo-300 text-sm">
                        ${postAuditLaunchPlan.initialTokenPriceUsd.toFixed(8)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Initial Market Cap</span>
                      <strong className="text-cyan-300 text-sm">
                        ${postAuditLaunchPlan.initialMarketCapUsd.toLocaleString()} USD
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400 truncate">
                      Official Subdomain: <strong className="text-emerald-300">{postAuditLaunchPlan.subdomainUrl}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(postAuditLaunchPlan.subdomainUrl, 'contract')}
                      className="text-indigo-400 hover:text-indigo-300 font-sans font-semibold shrink-0 cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>

              {lpProvisionNotice && (
                <div
                  data-testid="lp-provision-success-banner"
                  className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2.5 animate-fadeIn"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{lpProvisionNotice}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEX SWAP SIMULATOR */}
      {activeTab === 'swap' && isContract && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                <span>PancakeSwap / Uniswap Liquidity Pool Simulator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Test trading {config.name} (${config.symbolOrSlug}) using the live automated market maker (AMM) formula.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-500">Spot Price:</span>
              <strong className="text-emerald-400">${estimatedTokenPriceUsd.toFixed(4)} USDT</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Swap Form */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Instant Token Swap
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">You Pay (USDT):</label>
                <div className="flex items-center bg-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-800">
                  <input
                    type="number"
                    min="1"
                    value={usdtInput}
                    onChange={e => setUsdtInput(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent text-sm font-mono text-white focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-emerald-400 font-mono">USDT</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">You Receive (Estimated):</label>
                <div className="flex items-center justify-between bg-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-800 font-mono text-sm text-indigo-300">
                  <span>{tokensOut.toLocaleString()}</span>
                  <span className="text-xs font-semibold text-indigo-400 font-mono">{config.symbolOrSlug}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Price Impact:</span>
                  <span className={priceImpact > 5 ? 'text-amber-400' : 'text-emerald-400'}>{priceImpact}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Liquidity Provider Fee (0.3%):</span>
                  <span>{(usdtInput * 0.003).toFixed(2)} USDT</span>
                </div>
              </div>

              <button
                onClick={handleExecuteSwap}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                Simulate Swap Transaction
              </button>

              {swapSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{swapSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* Liquidity Pool Stats */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Pool Liquidity Reserves
              </h4>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">USDT In Pool:</span>
                  <strong className="text-white">${usdtReserve.toLocaleString()} USDT</strong>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">{config.symbolOrSlug} In Pool:</span>
                  <strong className="text-white">{tokenReserve.toLocaleString()} {config.symbolOrSlug}</strong>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Total Value Locked (TVL):</span>
                  <strong className="text-emerald-400">${(usdtReserve * 2).toLocaleString()} USD</strong>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                When you deploy liquidity on PancakeSwap or Uniswap, users will trade against this smart contract pair. The owner receives 0.25% on every swap transaction.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: READ / WRITE CONTRACT ABI */}
      {activeTab === 'abi' && isContract && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <span>Smart Contract Direct Interface (ABI)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Interact directly with on-chain methods without leaving NovaDeploy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Read Methods */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                Read Contract (Public Views)
              </span>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">1. name()</span>
                  <strong className="text-white">{config.name}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">2. symbol()</span>
                  <strong className="text-white">{config.symbolOrSlug}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">3. totalSupply()</span>
                  <strong className="text-white">
                    {typeof config.supplyOrScale === 'number' ? config.supplyOrScale.toLocaleString() : config.supplyOrScale}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">4. isTradingActive()</span>
                  <strong className="text-emerald-400">true (Active)</strong>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label className="text-xs text-slate-300">5. balanceOf(address account):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={queryAddress}
                    onChange={e => setQueryAddress(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white"
                  />
                  <button
                    onClick={handleCheckBalance}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Query
                  </button>
                </div>
                {balanceResult && (
                  <p className="text-xs font-mono text-emerald-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    Balance: {balanceResult}
                  </p>
                )}
              </div>
            </div>

            {/* Write Methods */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Write Contract (State Transactions)
              </span>

              <form onSubmit={handleSimulateTransfer} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">1. transfer(recipient, amount)</label>
                  <input
                    type="text"
                    value={transferTo}
                    onChange={e => setTransferTo(e.target.value)}
                    placeholder="Recipient 0x..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    placeholder="Amount to send"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Broadcast Transfer Transaction
                </button>
              </form>

              {transferSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{transferSuccess}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUBDOMAIN & DAPP LANDING PAGE */}
      {activeTab === 'site' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                <span>Live Subdomain & DApp Gateway</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your token is provisioned with an automated SSL landing page and swap interface.
              </p>
            </div>
            <a
              href={`https://${config.symbolOrSlug.toLowerCase()}.novadeploy.cc`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30 transition-colors"
            >
              <span>Visit External URL</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950/30 border border-indigo-500/20 text-center space-y-4">
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">
              https://{config.symbolOrSlug.toLowerCase()}.novadeploy.cc
            </span>
            <h4 className="text-2xl font-heading font-extrabold text-white">
              Official {config.name} (${config.symbolOrSlug}) Portal
            </h4>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Automated public landing page featuring real-time contract audits, tokenomics breakdown, Pancakeswap/Uniswap direct widget, and developer documentation.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => handleCopy(`https://${config.symbolOrSlug.toLowerCase()}.novadeploy.cc`, 'contract')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Share Public DApp Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Security PDF-Style Smart Contract Audit Report Modal */}
      {isAuditReportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-report-modal-title"
          data-testid="audit-report-pdf-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-4xl rounded-3xl bg-[#0a101d] border border-amber-500/40 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Top Document Control Bar */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold">
                  PDF SECURITY DOSSIER
                </span>
                <span className="text-xs font-mono text-slate-400">{auditReport.reportId}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadAuditReport}
                  data-testid="download-audit-report-btn"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Dossier (.txt)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAuditReportOpen(false)}
                  aria-label="Close Audit Report"
                  data-testid="close-audit-report-btn"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable PDF-Style Certificate Sheet Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-gradient-to-b from-[#0d1526] to-[#080d18] text-slate-200">
              {/* Document Header & Security Seal */}
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-amber-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{auditReport.classification}</span>
                  </div>
                  <h3
                    id="audit-report-modal-title"
                    className="text-2xl sm:text-3xl font-heading font-extrabold text-white"
                  >
                    {auditReport.contractName} (${auditReport.symbol}) — Cryptographic Audit Certificate
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Target Network: <strong className="text-slate-200">{auditReport.networkLabel}</strong> • Compiler:{' '}
                    <strong className="text-indigo-300">{auditReport.compilerVersion}</strong>
                  </p>
                </div>

                <div className="px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center shrink-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                    FINAL SECURITY RATING
                  </div>
                  <div
                    data-testid="audit-report-grade"
                    className="text-3xl font-heading font-extrabold text-emerald-400 mt-0.5"
                  >
                    Grade {auditReport.securityGrade}
                  </div>
                  <div className="text-xs font-mono text-emerald-300/90">
                    {auditReport.securityScore} / 100 Verified
                  </div>
                </div>
              </div>

              {/* Contract Attestation Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">On-Chain Address</span>
                  <span className="text-slate-200 font-semibold truncate block mt-1">
                    {auditReport.contractAddress}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Verified Active Supply</span>
                  <span className="text-emerald-400 font-bold block mt-1">
                    {auditReport.currentSupplyFormatted}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Retired / Burned Supply</span>
                  <span className="text-orange-400 font-bold block mt-1">
                    {auditReport.totalBurnedFormatted}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">EVM Runtime Standard</span>
                  <span className="text-indigo-300 font-semibold block mt-1">
                    {auditReport.evmTarget}
                  </span>
                </div>
              </div>

              {/* Zero-Vulnerability Distribution Matrix */}
              <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Static & Symbolic Vulnerability Severity Matrix
                  </h4>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
                    {auditReport.staticAnalysisEngines.map(eng => (
                      <span
                        key={eng}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300"
                      >
                        {eng}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 font-mono text-center">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-lg font-extrabold text-emerald-400">
                      {auditReport.vulnerabilitySummary.critical}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Critical</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-lg font-extrabold text-emerald-400">
                      {auditReport.vulnerabilitySummary.high}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">High</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-lg font-extrabold text-emerald-400">
                      {auditReport.vulnerabilitySummary.medium}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Medium</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-lg font-extrabold text-emerald-400">
                      {auditReport.vulnerabilitySummary.low}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Low</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-lg font-extrabold text-cyan-400">
                      {auditReport.vulnerabilitySummary.informational}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Info Notes</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-lg font-extrabold text-indigo-400">
                      {auditReport.vulnerabilitySummary.gasOptimizations}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Gas Opts</div>
                  </div>
                </div>
              </div>

              {/* 6-Point Security Control Verification Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  SWC Registry & EIP-20 Compliance Verification Table
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {auditReport.securityChecks.map(check => (
                    <div
                      key={check.code}
                      className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800/90 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          [{check.code}] {check.title}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                          {check.status}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-indigo-400 uppercase">
                        Category: {check.category}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{check.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formal Verification & Cryptographic Signature Footer */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Formal Symbolic Invariants & SHA-256 Certificate Digest
                </div>
                <div className="space-y-1.5">
                  {auditReport.formalInvariants.map(inv => (
                    <div
                      key={inv.expression}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80"
                    >
                      <code className="text-emerald-300 font-semibold">{inv.expression}</code>
                      <span className="text-[11px] text-slate-400">{inv.note}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="truncate">
                    SHA-256 Digest: <strong className="text-slate-200">{auditReport.certificateHash}</strong>
                  </span>
                  <span className="text-emerald-400 shrink-0">✓ Digitally Signed by NovaShield Verifier</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

