export type DeploymentCategory = 'contract' | 'cloud_app' | 'database';

export type BlockchainNetwork = 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'solana' | 'tron';

export type CloudRegion = 'us-east' | 'us-west' | 'eu-central' | 'ap-southeast';

export type GasPriorityTier = 'standard' | 'fast' | 'instant';

export type NetworkCongestionLevel = 'Low' | 'Moderate' | 'High' | 'Surge';

export interface GasFeeEstimate {
  network: BlockchainNetwork;
  networkLabel: string;
  nativeSymbol: string;
  nativeTokenPriceUsd: number;
  congestionLevel: NetworkCongestionLevel;
  congestionPercent: number;
  priorityTier: GasPriorityTier;
  baseFeeGwei: number;
  priorityTipGwei: number;
  effectiveGwei: number;
  estimatedGasUnits: number;
  gasCostNative: number;
  gasCostFormatted: string;
  networkCongestionFeeUsd: number;
  estimatedConfirmationSec: number;
  blockNumber: number;
  updatedAtIso: string;
}

export interface ForkedContractMetadata {
  sourceAddress: string;
  sourceChain: 'ethereum' | 'bsc';
  sourceChainLabel: string;
  originalName: string;
  originalSymbol: string;
  originalDecimals: number;
  originalSupply: number;
  compilerVersion: string;
  bytecodeHash: string;
  detectedModules: string[];
  customTransferTaxPercent: number;
  burnableEnabled: boolean;
  mintableEnabled: boolean;
  provenance: 'live_rpc' | 'verified_registry';
}

export interface DeploymentConfig {
  id: string;
  category: DeploymentCategory;
  name: string;
  symbolOrSlug: string;
  network?: BlockchainNetwork;
  cloudRegion?: CloudRegion;
  supplyOrScale: number | string;
  recipientOrOwner: string;
  durationDays: number;
  decimals: number;
  createdAt: string;
  status: 'draft' | 'compiling' | 'pending_payment' | 'deploying' | 'live' | 'failed';
  txHash?: string;
  contractAddress?: string;
  liveUrl?: string;
  feeUsd: number;
  platformMarginUsd: number;
  baseDeploymentFeeUsd?: number;
  networkCongestionFeeUsd?: number;
  gasPriorityTier?: GasPriorityTier;
  gasEstimate?: GasFeeEstimate;
  forkedFrom?: ForkedContractMetadata;
}

export interface CryptoTicker {
  id: string;
  name: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
}

export interface OwnerSettings {
  brandName: string;
  ownerWallet: string;
  payoutCurrency: 'USDT' | 'ETH' | 'SOL' | 'USD';
  platformFeePercent: number; // e.g. 20%
  baseFeeUsd: number; // e.g. $49
  totalRevenue: number;
  withdrawnRevenue: number;
  totalDeploymentsCount: number;
  allowCustomDomains: boolean;
}

export interface PaymentOption {
  id: string;
  name: string;
  symbol: string;
  network: string;
  walletAddress: string;
  qrData: string;
  rateUsd: number;
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  customerWallet: string;
  itemName: string;
  category: DeploymentCategory;
  network: string;
  totalPaidUsd: number;
  ownerProfitUsd: number;
  txHash: string;
}

export interface WithdrawalReceipt {
  id: string;
  timestamp: string;
  walletAddress: string;
  amountUsd: number;
  currency: string;
  txHash: string;
}

export interface WalletTokenAsset {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  decimals: number;
  network: string;
  contractAddress: string;
  iconBg?: string;
}

export interface SmartAuditInput {
  supply: number | string;
  decimals: number;
  maxWalletPercent: number;
  mintableAfterDeploy: boolean;
  burnable: boolean;
  antiBotCooldown: boolean;
  network?: string;
}

export interface SmartAuditFinding {
  id: string;
  code: string;
  title: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  severity: 'Informational' | 'Low' | 'Medium' | 'High';
  detail: string;
  recommendation: string;
}

export interface SmartAuditReport {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C';
  status: 'passed' | 'warning' | 'critical';
  normalizedSupply: number;
  maxWalletTokens: number;
  findings: SmartAuditFinding[];
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  estimatedGasUnits: number;
}

export interface DailyAnalyticsPoint {
  date: string;
  shortDate: string;
  dayOffset: number;
  deployments: number;
  cumulativeDeployments: number;
  grossVolumeUsd: number;
  platformRevenueUsd: number;
  cumulativeRevenueUsd: number;
}

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin';
  walletAddress?: string;
  createdAt: string;
}

export interface BioTargetRecord {
  id: string;
  ownerUid: string;
  uniprotAccession: string;
  geneSymbol: string;
  proteinName: string;
  organismName: string;
  sequenceLength: number;
  meanPlddt: number;
  confidenceTier: 'Very High' | 'Confident' | 'Low' | 'Very Low';
  pdbCount: number;
  tokenSymbol: string;
  contractAddress: string;
  createdAt: string;
}

export interface GameRunScoreRecord {
  id: string;
  ownerUid: string;
  playerName: string;
  score: number;
  waveReached: number;
  enemiesNeutralized: number;
  bioCoresProtected: number;
  createdAt: string;
}

export type GovernanceActionType =
  | 'SET_TAX_FEE'
  | 'MINT_TOKENS'
  | 'UPDATE_MAX_WALLET'
  | 'EMERGENCY_PAUSE';

export interface GovernanceSettingsConfig {
  requiredSignatures: number;
  totalSigners: number;
  signers: string[];
  timelockHours: number;
  multiSigVaultAddress: string;
  configDigest: string;
  quorumPercentage: number;
  quorumLabel: string;
  securityTier: 'Institutional Multi-Sig' | 'High-Security Quorum' | 'Single-Signer Admin';
  currentTaxPercent: number;
  maxWalletPercent: number;
  mintingPaused: boolean;
  updatedAtIso: string;
}

export interface GovernanceAdminProposal {
  proposalId: string;
  actionType: GovernanceActionType;
  actionLabel: string;
  parameterSummary: string;
  calldataHex: string;
  requiredSignatures: number;
  totalSigners: number;
  signaturesCollected: number;
  signedBy: string[];
  status: 'AWAITING_SIGNATURES' | 'READY_TO_EXECUTE' | 'EXECUTED';
  proposedTaxPercent?: number;
  mintAmount?: number;
  mintRecipient?: string;
  maxWalletPercent?: number;
  executionTxHash?: string;
  createdAtIso: string;
  createdAtLabel: string;
}

export interface FlattenedContractVerificationBundle {
  contractName: string;
  symbol: string;
  contractAddress: string;
  network: string;
  explorerName: string;
  compilerVersion: string;
  evmVersion: string;
  optimizationEnabled: boolean;
  optimizationRuns: number;
  licenseType: string;
  flattenedSourceCode: string;
  flattenedFileName: string;
  lineCount: number;
  byteSize: number;
  abiEncodedConstructorArgs: string;
  creationBytecodeHash: string;
  runtimeBytecodeHash: string;
  verificationGuid: string;
  verifiedAtIso: string;
  verifiedAtLabel: string;
}



