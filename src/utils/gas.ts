import { BlockchainNetwork, GasPriorityTier } from '../types';
import {
  AllChainsNetworkFeeEstimatorReport,
  ChainRealtimeGasQuote,
  computeAllNetworksGasEstimates,
  fetchAllNetworksLiveGasEstimates,
} from './engine';

export type ChainGasCostQuote = ChainRealtimeGasQuote;
export type GasEstimatorReport = AllChainsNetworkFeeEstimatorReport;

export interface GasEstimatorOptions {
  priorityTier?: GasPriorityTier;
  isForkedContract?: boolean;
  tickSeed?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: Date;
}

/**
 * GasEstimator utility that fetches real-time gas costs for ETH, BSC, TRON,
 * Polygon, Arbitrum, and Solana from public APIs (CoinGecko price feed +
 * public JSON-RPC eth_gasPrice endpoints) with deterministic fallback.
 */
export const GasEstimator = {
  supportedNetworks: [
    'ethereum',
    'bsc',
    'tron',
    'polygon',
    'arbitrum',
    'solana',
  ] as BlockchainNetwork[],

  /**
   * Synchronously computes baseline/fallback gas estimates for all 6 blockchains.
   */
  getBaselineEstimates(options?: GasEstimatorOptions): GasEstimatorReport {
    return computeAllNetworksGasEstimates({
      priorityTier: options?.priorityTier || 'standard',
      isForkedContract: options?.isForkedContract || false,
      tickSeed: options?.tickSeed ?? 0,
      sourceMode: 'FALLBACK_ORACLE',
      now: options?.now,
    });
  },

  /**
   * Fetches real-time gas costs for ETH, BSC, TRON, Polygon, Arbitrum, and Solana
   * from public APIs with automatic timeout and fallback protection.
   */
  async fetchRealtimeGasCosts(options?: GasEstimatorOptions): Promise<GasEstimatorReport> {
    return fetchAllNetworksLiveGasEstimates({
      priorityTier: options?.priorityTier || 'standard',
      isForkedContract: options?.isForkedContract || false,
      tickSeed: options?.tickSeed ?? 0,
      fetchImpl: options?.fetchImpl,
      timeoutMs: options?.timeoutMs ?? 2400,
    });
  },

  /**
   * Retrieves the gas quote for a specific blockchain from a 6-chain report.
   */
  getQuoteForNetwork(
    report: GasEstimatorReport,
    network: BlockchainNetwork
  ): ChainGasCostQuote {
    const found = report.chains.find(c => c.network === network);
    if (found) return found;
    return report.chains[0];
  },
};

export default GasEstimator;
