import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSymbolFromName,
  validateRecipientAddress,
  calculateDeploymentFee,
  generateSolidityContract,
  generateTxHash,
  generateContractAddress,
  calculateSwapOutput,
  calculatePriceImpact,
  calculateAffiliateEarnings,
  parseTokenSupply,
  mergeUserTokens,
  findTokenInWallet,
  runSmartAuditScan,
  generate30DayAnalytics,
  calculateNetworkDeploymentStats,
  classifyAlphaFoldPlddt,
  normalizeBioTargetPayload,
  computeWaveThreatProfile,
  evaluateDrugLikenessProfile,
  normalizeCompoundPayload,
  evaluateUptimeHeartbeat,
  pollMockUptimeEndpoint,
  executeTokenBurnCalculation,
  generateContractAuditReport,
  generate24HourDeploymentTelemetry,
  generateDeploymentEventLogs,
  exportDeploymentEventsToCsv,
  estimateNetworkGasFee,
  calculateCheckoutTotalWithGas,
  inspectForkableContract,
  createForkedContractBlueprint,
  validateMultiSigConfiguration,
  createGovernanceProposal,
  signOrExecuteGovernanceProposal,
  generateFlattenedSolidityContract,
  simulateEtherscanVerificationPipeline,
  verifyCustomDomainOptionB,
  calculatePostAuditDexLaunch,
  computeAllNetworksGasEstimates,
  fetchAllNetworksLiveGasEstimates,
  generateFlashUsdtLiquidityBotContract,
  runFlashBotStaticSecurityScan,
  SecurityAuditEngine,
} from './engine.ts';
import { GasEstimator } from './gas.ts';

test('generateSymbolFromName generates clean 3-4 character symbol', () => {
  assert.equal(generateSymbolFromName('MyAwesomeToken'), 'MYAW');
  assert.equal(generateSymbolFromName('doge'), 'DOGE');
  assert.equal(generateSymbolFromName('BTC'), 'BTC');
  assert.equal(generateSymbolFromName(''), 'TKN');
  assert.equal(generateSymbolFromName('  alpha-beta  '), 'ALPH');
});

test('validateRecipientAddress validates EVM addresses correctly', () => {
  const validEvm = '0x71C8364437a9B2f520330D0a0fC62A864114dD8b';
  const invalidEvm = '0xinvalid123';
  assert.equal(validateRecipientAddress('ethereum', validEvm).valid, true);
  assert.equal(validateRecipientAddress('bsc', validEvm).valid, true);
  assert.equal(validateRecipientAddress('arbitrum', validEvm).valid, true);
  assert.equal(validateRecipientAddress('ethereum', invalidEvm).valid, false);
});

test('validateRecipientAddress validates Tron addresses', () => {
  const validTron = 'TVVURLM4Tyo3rQ2q99HaJVEBBcizHERnGJ';
  assert.equal(validateRecipientAddress('tron', validTron).valid, true);
  assert.equal(validateRecipientAddress('tron', 'invalidTron').valid, false);
});

test('calculateDeploymentFee computes base fee and owner profit margin correctly', () => {
  const fee1 = calculateDeploymentFee('contract', 100000, 30, 20);
  assert.equal(fee1.baseFee, 169);
  assert.equal(fee1.platformFee, 34); // 20% of 169 rounded = 34
  assert.equal(fee1.totalFee, 203);
  assert.equal(fee1.ownerProfit, 34);

  const fee2 = calculateDeploymentFee('cloud_app', 'standard', 60, 25);
  assert.equal(fee2.baseFee, 84); // 49 + 35 = 84
  assert.equal(fee2.platformFee, 21); // 25% of 84 = 21
  assert.equal(fee2.totalFee, 105);
});

test('generateSolidityContract embeds parameters into secure code', () => {
  const code = generateSolidityContract('AetherToken', 'AETH', 250000, 18, 90, '0x71C8364437a9B2f520330D0a0fC62A864114dD8b');
  assert.ok(code.includes('contract AETHToken is ERC20'));
  assert.ok(code.includes('MAX_SUPPLY = 250000 * 10 ** 18'));
  assert.ok(code.includes('ERC20("AetherToken", "AETH")'));
  assert.ok(code.includes('ReentrancyGuard'));
});

test('generateTxHash and generateContractAddress format properly', () => {
  const evmHash = generateTxHash('bsc');
  assert.ok(evmHash.startsWith('0x'));
  assert.equal(evmHash.length, 66);

  const contractAddr = generateContractAddress('ethereum');
  assert.ok(contractAddr.startsWith('0x'));
  assert.equal(contractAddr.length, 42);
});

test('calculateSwapOutput obeys Uniswap v2 constant product invariant', () => {
  // Pool: 10,000 USDT and 100,000 NEXU
  // Swap 100 USDT for NEXU
  const tokensOut = calculateSwapOutput(100, 10000, 100000, 0.3);
  assert.ok(tokensOut > 980 && tokensOut < 1000);

  // Zero input produces zero output
  assert.equal(calculateSwapOutput(0, 10000, 100000), 0);
});

test('calculatePriceImpact computes slippage percentage accurately', () => {
  // Small swap (10 USDT into 10,000 USDT pool) -> < 0.5% impact
  const smallImpact = calculatePriceImpact(10, 10000, 100000);
  assert.ok(smallImpact < 0.5);

  // Large swap (2000 USDT into 10,000 USDT pool) -> noticeable impact
  const largeImpact = calculatePriceImpact(2000, 10000, 100000);
  assert.ok(largeImpact > 10);
});

test('calculateAffiliateEarnings calculates percentage cut for referrals', () => {
  const earnings = calculateAffiliateEarnings(200, 15);
  assert.equal(earnings, 30);
  assert.equal(calculateAffiliateEarnings(0, 10), 0);
});

test('parseTokenSupply handles numbers and formatted string supplies', () => {
  assert.equal(parseTokenSupply(100000), 100000);
  assert.equal(parseTokenSupply('500,000'), 500000);
  assert.equal(parseTokenSupply('1,000,000'), 1000000);
  assert.equal(parseTokenSupply('invalid'), 100000);
});

test('mergeUserTokens deduplicates properly and prepends latest token', () => {
  const initial = [
    {
      id: 'token_1',
      name: 'Existing Token',
      symbol: 'EXT',
      balance: 50000,
      decimals: 18,
      network: 'bsc',
      contractAddress: '0x1111111111111111111111111111111111111111',
    },
  ];

  const newToken = {
    id: 'token_2',
    name: 'New Token',
    symbol: 'NEW',
    balance: 100000,
    decimals: 18,
    network: 'bsc',
    contractAddress: '0x2222222222222222222222222222222222222222',
  };

  const merged = mergeUserTokens(initial, newToken);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].symbol, 'NEW');

  // Merging updated version of same contractAddress replaces existing
  const updatedToken = {
    ...newToken,
    balance: 200000,
  };
  const reMerged = mergeUserTokens(merged, updatedToken);
  assert.equal(reMerged.length, 2);
  assert.equal(reMerged[0].balance, 200000);
});

test('findTokenInWallet finds tokens by address or symbol case-insensitively', () => {
  const tokens = [
    {
      id: '1',
      name: 'Alpha Token',
      symbol: 'ALPHA',
      balance: 10000,
      decimals: 18,
      network: 'bsc',
      contractAddress: '0xAaBbCcDdEe11223344556677889900aabbccddee',
    },
  ];

  const foundByAddr = findTokenInWallet(tokens, '0xaabbccddee11223344556677889900aabbccddee');
  assert.ok(foundByAddr);
  assert.equal(foundByAddr?.symbol, 'ALPHA');

  const foundBySymbol = findTokenInWallet(tokens, undefined, 'alpha', 'bsc');
  assert.ok(foundBySymbol);
  assert.equal(foundBySymbol?.name, 'Alpha Token');

  const notFound = findTokenInWallet(tokens, '0x0000000000000000000000000000000000000000');
  assert.equal(notFound, undefined);
});

test('runSmartAuditScan evaluates optimal and risky token supply configurations', () => {
  const safeReport = runSmartAuditScan({
    supply: 100000,
    decimals: 18,
    maxWalletPercent: 5,
    mintableAfterDeploy: false,
    burnable: true,
    antiBotCooldown: true,
  });

  assert.equal(safeReport.score, 100);
  assert.equal(safeReport.grade, 'A+');
  assert.equal(safeReport.status, 'passed');
  assert.equal(safeReport.warningCount, 0);
  assert.equal(safeReport.maxWalletTokens, 5000);

  const riskyReport = runSmartAuditScan({
    supply: '5,000,000,000,000', // > 1T
    decimals: 12, // non-standard
    maxWalletPercent: 50, // > 20%
    mintableAfterDeploy: true,
    burnable: false,
    antiBotCooldown: false,
  });

  assert.ok(riskyReport.score < 80);
  assert.equal(riskyReport.status, 'warning');
  assert.ok(riskyReport.warningCount >= 4);
});

test('generate30DayAnalytics transforms transactions into 30-day trend series', () => {
  const sampleTxs = [
    { id: '1', timestamp: 'Just now', totalPaidUsd: 250, ownerProfitUsd: 50 },
    { id: '2', timestamp: '2d ago', totalPaidUsd: 200, ownerProfitUsd: 40 },
  ];

  const series = generate30DayAnalytics(sampleTxs);
  assert.equal(series.length, 30);
  assert.equal(series[29].date, 'Today');
  // Day 29 ('Today') should include sampleTxs[0]
  assert.ok(series[29].deployments >= 1);
  assert.ok(series[29].platformRevenueUsd >= 50);
  // Cumulative revenue should be monotonically non-decreasing
  assert.ok(series[29].cumulativeRevenueUsd > series[0].cumulativeRevenueUsd);
});

test('calculateNetworkDeploymentStats produces realistic network-calibrated telemetry', () => {
  // Deterministic mid-point check (randomFn = () => 0.5)
  const ethStats = calculateNetworkDeploymentStats('ethereum', () => 0.5);
  assert.equal(ethStats.networkKey, 'ethereum');
  assert.equal(ethStats.gasCostSymbol, 'ETH');
  assert.ok(ethStats.deploymentLatencyMs >= 680 && ethStats.deploymentLatencyMs <= 1420);
  assert.ok(ethStats.nodeConfirmationSeconds >= 11.4 && ethStats.nodeConfirmationSeconds <= 13.8);
  assert.ok(ethStats.smartContractGasCostFormatted.includes('ETH'));

  const solStats = calculateNetworkDeploymentStats('solana', () => 0.5);
  assert.equal(solStats.networkKey, 'solana');
  assert.equal(solStats.gasCostSymbol, 'SOL');
  assert.ok(solStats.deploymentLatencyMs >= 140 && solStats.deploymentLatencyMs <= 360);
  assert.ok(solStats.nodeConfirmationSeconds < 1.0);
  assert.ok(solStats.smartContractGasCostFormatted.includes('SOL'));

  const arbStats = calculateNetworkDeploymentStats('arbitrum', () => 0.25);
  assert.equal(arbStats.networkKey, 'arbitrum');
  assert.ok(arbStats.deploymentLatencyMs >= 190 && arbStats.deploymentLatencyMs <= 440);
  assert.ok(arbStats.nodeConfirmationSeconds < 1.0);

  const bscStats = calculateNetworkDeploymentStats('bsc');
  assert.equal(bscStats.networkKey, 'bsc');
  assert.equal(bscStats.gasCostSymbol, 'BNB');
  assert.ok(bscStats.deploymentLatencyFormatted.endsWith('ms'));
  assert.ok(bscStats.nodeConfirmationFormatted.endsWith('s'));
  assert.ok(bscStats.smartContractGasCostFormatted.includes('BNB'));
});

test('classifyAlphaFoldPlddt maps 0-100 pLDDT scores to the 4 official AlphaFold bands', () => {
  const vh = classifyAlphaFoldPlddt(94.2);
  assert.equal(vh.tier, 'Very High');
  assert.equal(vh.colorHex, '#0053D6');

  const conf = classifyAlphaFoldPlddt(78.5);
  assert.equal(conf.tier, 'Confident');
  assert.equal(conf.colorHex, '#65CBF3');

  const low = classifyAlphaFoldPlddt(58.0);
  assert.equal(low.tier, 'Low');
  assert.equal(low.colorHex, '#FFDB13');

  const vlow = classifyAlphaFoldPlddt(35.1);
  assert.equal(vlow.tier, 'Very Low');
  assert.equal(vlow.colorHex, '#FF7D45');
});

test('normalizeBioTargetPayload normalizes live API and fallback reference structures', () => {
  const refTp53 = normalizeBioTargetPayload('P04637');
  assert.equal(refTp53.uniprotAccession, 'P04637');
  assert.equal(refTp53.geneSymbol, 'TP53');
  assert.equal(refTp53.provenanceSource, 'curated_reference');
  assert.ok(refTp53.pdbIds.includes('1TUP'));

  const liveMock = normalizeBioTargetPayload(
    'P00533',
    {
      primaryAccession: 'P00533',
      genes: [{ geneName: { value: 'EGFR' } }],
      proteinDescription: { recommendedName: { fullName: { value: 'Epidermal growth factor receptor' } } },
      organism: { scientificName: 'Homo sapiens' },
      sequence: { length: 1210 },
      uniProtKBCrossReferences: [{ database: 'PDB', id: '1M17' }],
    },
    [
      {
        entryId: 'AF-P00533-F1',
        uniprotAccession: 'P00533',
        globalMetricValue: 91.4,
        fractionPlddtVeryHigh: 0.68,
      },
    ]
  );
  assert.equal(liveMock.provenanceSource, 'live_api');
  assert.equal(liveMock.confidenceTier, 'Very High');
  assert.equal(liveMock.meanPlddt, 91.4);
  assert.deepEqual(liveMock.pdbIds, ['1M17']);
});

test('computeWaveThreatProfile scales 3 hostile archetypes across waves', () => {
  const w1 = computeWaveThreatProfile(1);
  assert.equal(w1.wave, 1);
  assert.ok(w1.swarmCount >= 5);
  assert.ok(w1.strafeWeaverCount >= 2);
  assert.ok(w1.juggernautCount >= 1);
  assert.equal(w1.totalHostiles, w1.swarmCount + w1.strafeWeaverCount + w1.juggernautCount);

  const w4 = computeWaveThreatProfile(4);
  assert.ok(w4.totalHostiles > w1.totalHostiles);
  assert.ok(w4.speedMultiplier > w1.speedMultiplier);
});

test('evaluateDrugLikenessProfile evaluates Lipinski Rule of Five and Veber criteria', () => {
  // Imatinib-like compliant profile (0 violations)
  const optimal = evaluateDrugLikenessProfile({
    molecularWeight: 493.6,
    xLogP: 3.5,
    hBondDonors: 2,
    hBondAcceptors: 7,
    tpsa: 86.3,
    rotatableBonds: 7,
  });
  assert.equal(optimal.lipinskiViolations, 0);
  assert.equal(optimal.lipinskiPass, true);
  assert.equal(optimal.veberPass, true);
  assert.equal(optimal.oralBioavailabilityGrade, 'Optimal');
  assert.equal(optimal.druggabilityScore, 100);

  // Heavy violator (MW > 500, XLogP > 5, HBD > 5, TPSA > 140)
  const poor = evaluateDrugLikenessProfile({
    molecularWeight: 720,
    xLogP: 6.4,
    hBondDonors: 7,
    hBondAcceptors: 12,
    tpsa: 165,
    rotatableBonds: 14,
  });
  assert.equal(poor.lipinskiViolations, 4);
  assert.equal(poor.lipinskiPass, false);
  assert.equal(poor.veberPass, false);
  assert.equal(poor.oralBioavailabilityGrade, 'Low');
});

test('normalizeCompoundPayload normalizes PubChem PUG REST and Europe PMC payloads', () => {
  const refImatinib = normalizeCompoundPayload('Imatinib');
  assert.equal(refImatinib.cid, 5291);
  assert.equal(refImatinib.targetGene, 'ABL1');
  assert.equal(refImatinib.provenanceSource, 'curated_reference');
  assert.equal(refImatinib.drugLikeness.lipinskiPass, true);
  assert.ok(refImatinib.citations.length >= 1);

  const liveOlaparib = normalizeCompoundPayload(
    'Olaparib',
    {
      PropertyTable: {
        Properties: [
          {
            CID: 23725625,
            MolecularFormula: 'C24H23FN4O3',
            MolecularWeight: '434.5',
            CanonicalSMILES: 'C1CC1C(=O)N2CCN',
            InChIKey: 'FDLYAMZZIXQODN-UHFFFAOYSA-N',
            XLogP: 1.9,
            TPSA: 86.4,
            HBondDonorCount: 1,
            HBondAcceptorCount: 5,
            RotatableBondCount: 3,
          },
        ],
      },
    },
    {
      resultList: {
        result: [
          {
            id: '19553641',
            pmid: '19553641',
            title: 'PARP inhibition in BRCA-deficient tumors',
            authorString: 'Fong PC et al.',
            journalTitle: 'N Engl J Med',
            pubYear: '2009',
            citedByCount: 3700,
          },
        ],
      },
    }
  );
  assert.equal(liveOlaparib.provenanceSource, 'live_api');
  assert.equal(liveOlaparib.cid, 23725625);
  assert.equal(liveOlaparib.drugLikeness.oralBioavailabilityGrade, 'Optimal');
  assert.equal(liveOlaparib.citations[0].pmid, '19553641');
});

test('evaluateUptimeHeartbeat and pollMockUptimeEndpoint return live operational badge and telemetry', async () => {
  const fixedDate = new Date('2025-05-15T14:22:08.000Z');
  const hb = evaluateUptimeHeartbeat({
    network: 'ethereum',
    contractAddress: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    symbolOrSlug: 'NEXU',
    sequenceNumber: 3,
    randomFn: () => 0.5,
    now: fixedDate,
  });

  assert.equal(hb.statusCode, 200);
  assert.equal(hb.statusText, 'Operational');
  assert.equal(hb.uptimePercent, 99.9);
  assert.equal(hb.badgeLabel, 'Status: 99.9% Operational');
  assert.equal(hb.sequenceNumber, 3);
  assert.equal(hb.checkedAtTimeLabel, '14:22:08 UTC');
  assert.ok(hb.endpoint.includes('network=ethereum'));
  assert.ok(hb.endpoint.includes('target=nexu'));
  assert.ok(hb.responseLatencyMs >= 28 && hb.responseLatencyMs <= 56);

  const polled = await pollMockUptimeEndpoint({
    network: 'solana',
    contractAddress: '5Kqp11ab99887766',
    symbolOrSlug: 'PULS',
    sequenceNumber: 7,
    simulatedDelayMs: 5,
    randomFn: () => 0.25,
  });

  assert.equal(polled.statusCode, 200);
  assert.equal(polled.badgeLabel, 'Status: 99.9% Operational');
  assert.equal(polled.sequenceNumber, 7);
  assert.ok(polled.responseLatencyMs >= 14 && polled.responseLatencyMs <= 29);
});

test('executeTokenBurnCalculation validates burn inputs and calculates updated supply and dead address receipt', () => {
  const fixedDate = new Date('2025-05-30T15:00:00.000Z');

  // Valid 5% burn on 100,000 NEXU
  const validBurn = executeTokenBurnCalculation({
    currentSupply: 100000,
    burnAmount: 5000,
    symbol: 'NEXU',
    network: 'ethereum',
    now: fixedDate,
  });

  assert.equal(validBurn.valid, true);
  assert.equal(validBurn.previousSupply, 100000);
  assert.equal(validBurn.burnedAmount, 5000);
  assert.equal(validBurn.newSupply, 95000);
  assert.equal(validBurn.burnPercentage, 5);
  assert.equal(validBurn.deadAddress, '0x000000000000000000000000000000000000dEaD');
  assert.ok(validBurn.burnTxHash.startsWith('0x'));
  assert.equal(validBurn.timestampLabel, '15:00:00 UTC');

  // Invalid zero or negative burn
  const zeroBurn = executeTokenBurnCalculation({
    currentSupply: 100000,
    burnAmount: 0,
    symbol: 'NEXU',
    network: 'ethereum',
  });
  assert.equal(zeroBurn.valid, false);
  assert.equal(zeroBurn.newSupply, 100000);

  // Invalid excessive burn (>= currentSupply)
  const excessiveBurn = executeTokenBurnCalculation({
    currentSupply: 100000,
    burnAmount: 100000,
    symbol: 'NEXU',
    network: 'ethereum',
  });
  assert.equal(excessiveBurn.valid, false);
  assert.equal(excessiveBurn.newSupply, 100000);
});

test('generateContractAuditReport produces deterministic PDF-style high-security audit summary', () => {
  const report = generateContractAuditReport({
    name: 'NexusProtocol',
    symbolOrSlug: 'NEXU',
    network: 'ethereum',
    contractAddress: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    supplyOrScale: 95000,
    totalBurned: 5000,
  });

  assert.equal(report.reportId, 'NV-CERT-2025-NEXU-71C836');
  assert.equal(report.securityGrade, 'A+');
  assert.equal(report.securityScore, 99.4);
  assert.equal(report.vulnerabilitySummary.critical, 0);
  assert.equal(report.vulnerabilitySummary.high, 0);
  assert.equal(report.currentSupplyFormatted, '95,000 NEXU');
  assert.equal(report.totalBurnedFormatted, '5,000 NEXU');
  assert.ok(report.certificateHash.startsWith('0x'));
  assert.equal(report.certificateHash.length, 66);
  assert.equal(report.securityChecks.length, 6);
  assert.equal(report.formalInvariants.length, 3);
});

test('generate24HourDeploymentTelemetry produces 24 hourly uptime and real-time transaction volume points', () => {
  const fixedAnchor = new Date('2025-05-30T16:00:00.000Z');
  const series = generate24HourDeploymentTelemetry({
    network: 'ethereum',
    symbolOrSlug: 'NEXU',
    supplyOrScale: 100000,
    burnEventsCount: 1,
    extraTxCount: 2,
    anchorDate: fixedAnchor,
  });

  assert.equal(series.length, 24);
  assert.equal(series[23].hourLabel, 'Now');
  assert.equal(series[0].hourIndex, 0);
  assert.equal(series[23].hourIndex, 23);

  for (const pt of series) {
    assert.ok(pt.uptimePct >= 99.85 && pt.uptimePct <= 100);
    assert.ok(pt.txVolume > 0);
    assert.ok(pt.tokenVolume > 0);
    assert.ok(pt.avgLatencyMs >= 12);
  }

  // Verify that burn/extra transactions increase the real-time ('Now') volume
  const baselineSeries = generate24HourDeploymentTelemetry({
    network: 'ethereum',
    symbolOrSlug: 'NEXU',
    supplyOrScale: 100000,
    burnEventsCount: 0,
    extraTxCount: 0,
    anchorDate: fixedAnchor,
  });
  assert.equal(series[23].txVolume, baselineSeries[23].txVolume + 1 * 4 + 2 * 2);
});

test('generateDeploymentEventLogs and exportDeploymentEventsToCsv produce verifiable CSV event logs with 100% TO RECIPIENT mint', () => {
  const burnRecord = executeTokenBurnCalculation({
    currentSupply: 100000,
    burnAmount: 5000,
    symbol: 'NEXU',
    network: 'ethereum',
    now: new Date('2025-05-30T15:00:00.000Z'),
  });

  const logs = generateDeploymentEventLogs({
    name: 'NexusProtocol',
    symbolOrSlug: 'NEXU',
    network: 'ethereum',
    contractAddress: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    txHash: '0x89f3c92b71e4a0d551e9a4b21102a74c9038e71a2094f83b2190a4c78d1e42a1',
    recipientOrOwner: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    supplyOrScale: 95000,
    burnHistory: [burnRecord],
  });

  // Should include 5 core lifecycle events + 1 burn event = 6 events
  assert.equal(logs.length, 6);
  assert.equal(logs[0].eventName, 'TokensBurned');
  assert.equal(logs[0].allocationBadge, '0x000...dEaD SINK');

  const genesisMint = logs.find(l => l.eventName === 'GenesisSupplyMinted');
  assert.ok(genesisMint);
  assert.equal(genesisMint.allocationBadge, '100% TO RECIPIENT');
  assert.equal(genesisMint.amountFormatted, '100,000 NEXU');
  assert.equal(genesisMint.toAddress, '0x71C8364437a9B2f520330D0a0fC62A864114dD8b');

  const csv = exportDeploymentEventsToCsv(logs);
  const lines = csv.trim().split('\n');
  // 1 header line + 6 event rows = 7 lines
  assert.equal(lines.length, 7);
  assert.ok(lines[0].startsWith('Event ID,Block Number,Timestamp (UTC),Event Name'));
  assert.ok(csv.includes('GenesisSupplyMinted'));
  assert.ok(csv.includes('100% TO RECIPIENT'));
  assert.ok(csv.includes('TokensBurned'));
});

test('estimateNetworkGasFee calculates chain-specific congestion costs and scales with priority tier', () => {
  const ethStandard = estimateNetworkGasFee({
    network: 'ethereum',
    priorityTier: 'standard',
  });
  const ethInstant = estimateNetworkGasFee({
    network: 'ethereum',
    priorityTier: 'instant',
  });
  const bscStandard = estimateNetworkGasFee({
    network: 'bsc',
    priorityTier: 'standard',
  });

  assert.equal(ethStandard.network, 'ethereum');
  assert.equal(ethStandard.nativeSymbol, 'ETH');
  assert.ok(ethStandard.networkCongestionFeeUsd > bscStandard.networkCongestionFeeUsd);
  assert.ok(ethInstant.networkCongestionFeeUsd > ethStandard.networkCongestionFeeUsd);
  assert.ok(ethInstant.effectiveGwei > ethStandard.effectiveGwei);
  assert.ok(ethStandard.gasCostFormatted.includes('ETH'));

  // Forked contract increases estimated gas units and congestion fee
  const ethForked = estimateNetworkGasFee({
    network: 'ethereum',
    priorityTier: 'standard',
    isForkedContract: true,
  });
  assert.ok(ethForked.estimatedGasUnits > ethStandard.estimatedGasUnits);
  assert.ok(ethForked.networkCongestionFeeUsd >= ethStandard.networkCongestionFeeUsd);
});

test('calculateCheckoutTotalWithGas adds real-time network congestion fee to checkout total', () => {
  const checkout = calculateCheckoutTotalWithGas({
    category: 'contract',
    supplyOrScale: 100000,
    durationDays: 30,
    platformMarkupPercent: 20,
    network: 'ethereum',
    priorityTier: 'fast',
  });

  assert.equal(checkout.baseFee, 169);
  assert.equal(checkout.platformFee, 34);
  assert.equal(checkout.subtotalBeforeGasUsd, 203);
  assert.ok(checkout.networkCongestionFeeUsd > 0);
  assert.equal(
    checkout.checkoutTotalUsd,
    checkout.subtotalBeforeGasUsd + checkout.networkCongestionFeeUsd
  );
});

test('inspectForkableContract and createForkedContractBlueprint clone Ethereum and BSC contracts with updated parameters', () => {
  // Invalid address check
  const invalid = inspectForkableContract({
    address: '0x12345',
    chain: 'ethereum',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.error);

  // Curated Ethereum contract (PEPE)
  const pepeInspect = inspectForkableContract({
    address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    chain: 'ethereum',
  });
  assert.equal(pepeInspect.valid, true);
  assert.equal(pepeInspect.originalName, 'Pepe');
  assert.equal(pepeInspect.originalSymbol, 'PEPE');
  assert.equal(pepeInspect.sourceChain, 'ethereum');
  assert.ok(pepeInspect.bytecodeHash.startsWith('0x'));

  // Create forked contract blueprint with updated parameters
  const forked = createForkedContractBlueprint({
    inspection: pepeInspect,
    updatedName: 'MegaPepe Prime',
    updatedSymbol: 'MPEPE',
    updatedSupply: 500000,
    updatedDecimals: 18,
    customTransferTaxPercent: 2,
    burnableEnabled: true,
    mintableEnabled: false,
  });

  assert.equal(forked.clonedName, 'MegaPepe Prime');
  assert.equal(forked.clonedSymbol, 'MPEPE');
  assert.equal(forked.clonedSupply, 500000);
  assert.equal(forked.targetNetwork, 'ethereum');
  assert.equal(forked.forkMetadata.originalSymbol, 'PEPE');
  assert.equal(forked.forkMetadata.customTransferTaxPercent, 2);

  // Verify Solidity contract embeds forked metadata
  const code = generateSolidityContract(
    forked.clonedName,
    forked.clonedSymbol,
    forked.clonedSupply,
    forked.clonedDecimals,
    60,
    '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    forked.forkMetadata
  );
  assert.ok(code.includes('@custom:forked-from 0x6982508145454Ce325dDbE47a25d4ec3d2311933'));
  assert.ok(code.includes('TRANSFER_TAX_BPS = 200'));
  assert.ok(code.includes('contract MPEPEToken is ERC20'));

  // Curated BSC contract (CAKE)
  const cakeInspect = inspectForkableContract({
    address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    chain: 'bsc',
  });
  assert.equal(cakeInspect.valid, true);
  assert.equal(cakeInspect.originalSymbol, 'CAKE');
  assert.equal(cakeInspect.sourceChain, 'bsc');
});

test('validateMultiSigConfiguration validates M-of-N thresholds, signer addresses, and computes Safe vault address', () => {
  const s1 = '0x71C8364437a9B2f520330D0a0fC62A864114dD8b';
  const s2 = '0x4B520af819c14b2f04d1001E140304fA0aee53f5';
  const s3 = '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE';

  // Valid 2-of-3 quorum
  const validConfig = validateMultiSigConfiguration({
    requiredSignatures: 2,
    signers: [s1, s2, s3],
    timelockHours: 24,
    network: 'ethereum',
    contractAddress: s1,
  });

  assert.equal(validConfig.valid, true);
  assert.equal(validConfig.requiredSignatures, 2);
  assert.equal(validConfig.totalSigners, 3);
  assert.equal(validConfig.quorumPercentage, 67);
  assert.equal(validConfig.quorumLabel, '2 of 3 Signers (67% Quorum)');
  assert.equal(validConfig.securityTier, 'Institutional Multi-Sig');
  assert.ok(validConfig.multiSigVaultAddress.startsWith('0x'));
  assert.equal(validConfig.multiSigVaultAddress.length, 42);

  // Invalid threshold exceeding total signers
  const invalidThreshold = validateMultiSigConfiguration({
    requiredSignatures: 4,
    signers: [s1, s2, s3],
    network: 'ethereum',
  });
  assert.equal(invalidThreshold.valid, false);
  assert.ok(invalidThreshold.error?.includes('cannot exceed total configured signers'));

  // Duplicate signer rejection
  const duplicateSigner = validateMultiSigConfiguration({
    requiredSignatures: 2,
    signers: [s1, s1],
    network: 'ethereum',
  });
  assert.equal(duplicateSigner.valid, false);
  assert.ok(duplicateSigner.error?.includes('Duplicate signer'));
});

test('createGovernanceProposal and signOrExecuteGovernanceProposal handle tax fee changes and token minting', () => {
  const s1 = '0x71C8364437a9B2f520330D0a0fC62A864114dD8b';
  const s2 = '0x4B520af819c14b2f04d1001E140304fA0aee53f5';
  const s3 = '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE';
  const signers = [s1, s2, s3];

  // 1. Tax fee proposal requiring 2-of-3 signatures
  const taxPropRes = createGovernanceProposal({
    proposalSequence: 1,
    actionType: 'SET_TAX_FEE',
    proposedTaxPercent: 3.5,
    requiredSignatures: 2,
    signers,
    proposerAddress: s1,
    symbol: 'NEXU',
    network: 'ethereum',
  });

  assert.equal(taxPropRes.valid, true);
  assert.ok(taxPropRes.proposal);
  assert.equal(taxPropRes.proposal.proposalId, 'GOV-PROP-01');
  assert.equal(taxPropRes.proposal.signaturesCollected, 1);
  assert.equal(taxPropRes.proposal.status, 'AWAITING_SIGNATURES');
  assert.ok(taxPropRes.proposal.calldataHex.startsWith('0x8a4c291e'));

  // Co-sign with 2nd signer -> reaches 2-of-3 threshold ('READY_TO_EXECUTE')
  const signedStep = signOrExecuteGovernanceProposal({
    proposal: taxPropRes.proposal,
    availableSigners: signers,
    mode: 'SIGN',
    network: 'ethereum',
    currentSupply: 100000,
    currentTaxPercent: 0,
    currentMaxWalletPercent: 5,
  });
  assert.equal(signedStep.updatedProposal.signaturesCollected, 2);
  assert.equal(signedStep.updatedProposal.status, 'READY_TO_EXECUTE');
  assert.equal(signedStep.executedNow, false);

  // Execute proposal -> updates tax fee to 3.5%
  const execStep = signOrExecuteGovernanceProposal({
    proposal: signedStep.updatedProposal,
    availableSigners: signers,
    mode: 'EXECUTE',
    network: 'ethereum',
    currentSupply: 100000,
    currentTaxPercent: 0,
    currentMaxWalletPercent: 5,
  });
  assert.equal(execStep.executedNow, true);
  assert.equal(execStep.updatedProposal.status, 'EXECUTED');
  assert.equal(execStep.newTaxPercent, 3.5);
  assert.ok(execStep.updatedProposal.executionTxHash?.startsWith('0x'));

  // 2. Mint tokens proposal
  const mintPropRes = createGovernanceProposal({
    proposalSequence: 2,
    actionType: 'MINT_TOKENS',
    mintAmount: 25000,
    mintRecipient: s1,
    requiredSignatures: 2,
    signers,
    proposerAddress: s1,
    symbol: 'NEXU',
    network: 'ethereum',
  });
  assert.equal(mintPropRes.valid, true);
  assert.ok(mintPropRes.proposal);

  const mintExec = signOrExecuteGovernanceProposal({
    proposal: mintPropRes.proposal,
    availableSigners: signers,
    mode: 'EXECUTE',
    network: 'ethereum',
    currentSupply: 100000,
    currentTaxPercent: 3.5,
    currentMaxWalletPercent: 5,
  });
  assert.equal(mintExec.executedNow, true);
  assert.equal(mintExec.newSupply, 125000);
});

test('generateFlattenedSolidityContract creates Etherscan-compatible flattened source and ABI constructor arguments', () => {
  const bundle = generateFlattenedSolidityContract({
    name: 'NexusProtocol',
    symbolOrSlug: 'NEXU',
    supplyOrScale: 100000,
    decimals: 18,
    durationDays: 90,
    recipientOrOwner: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    network: 'ethereum',
    contractAddress: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    compilerVersion: 'v0.8.24+commit.e11b9ed9',
    optimizationEnabled: true,
    optimizationRuns: 200,
    licenseType: 'MIT',
    transferTaxPercent: 2,
    multiSigThreshold: 2,
    multiSigTotalSigners: 3,
  });

  assert.equal(bundle.contractName, 'NEXUToken');
  assert.equal(bundle.flattenedFileName, 'NEXUToken_Flattened.sol');
  assert.equal(bundle.explorerName, 'Etherscan');
  assert.ok(bundle.flattenedSourceCode.includes('// Sources flattened with hardhat'));
  assert.ok(bundle.flattenedSourceCode.includes('interface IERC20'));
  assert.ok(bundle.flattenedSourceCode.includes('abstract contract Ownable'));
  assert.ok(bundle.flattenedSourceCode.includes('abstract contract ReentrancyGuard'));
  assert.ok(bundle.flattenedSourceCode.includes('contract NEXUToken is Context, IERC20'));
  assert.ok(bundle.flattenedSourceCode.includes('uint256 public transferTaxBps = 200;'));
  assert.ok(bundle.flattenedSourceCode.includes('uint256 public multiSigRequiredSignatures = 2;'));
  assert.equal(bundle.abiEncodedConstructorArgs.length, 128);
  assert.ok(bundle.abiEncodedConstructorArgs.endsWith('71c8364437a9b2f520330d0a0fc62a864114dd8b'));
  assert.ok(bundle.lineCount > 150);
  assert.ok(bundle.byteSize > 4000);
});

test('simulateEtherscanVerificationPipeline builds complete 5-stage Etherscan status simulation and flattening manifest', () => {
  const report = simulateEtherscanVerificationPipeline({
    name: 'NexusProtocol',
    symbolOrSlug: 'NEXU',
    supplyOrScale: 250000,
    decimals: 18,
    durationDays: 60,
    recipientOrOwner: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    network: 'ethereum',
    contractAddress: '0x71C8364437a9B2f520330D0a0fC62A864114dD8b',
    compilerVersion: 'v0.8.24+commit.e11b9ed9',
    evmVersion: 'cancun',
    optimizationEnabled: true,
    optimizationRuns: 200,
    licenseType: 'MIT',
    transferTaxPercent: 1.5,
    multiSigThreshold: 2,
    multiSigTotalSigners: 3,
    flattenRunSequence: 2,
  });

  assert.equal(report.matchStatusLabel, 'Exact Match');
  assert.equal(report.etherscanStatusBadge, 'Pass - Verified (Exact Match)');
  assert.equal(report.flattenRunCount, 2);
  assert.equal(
    report.explorerUrl,
    'https://etherscan.io/address/0x71C8364437a9B2f520330D0a0fC62A864114dD8b#code'
  );
  assert.equal(report.inlinedDependencies.length, 6);
  assert.equal(report.parameterBindings.length, 4);
  assert.equal(report.verificationStages.length, 5);
  assert.ok(report.verificationStages.every(stage => stage.status === 'VERIFIED'));
  assert.equal(report.readContractMethods.length, 6);
  assert.equal(report.writeContractMethods.length, 5);
  assert.ok(report.bundle.flattenedSourceCode.includes('NexusProtocol'));
});

test('verifyCustomDomainOptionB validates Option B Hostinger A and CNAME records and SSL status', () => {
  const fixedNow = new Date('2026-10-31T20:30:00.000Z');
  const report = verifyCustomDomainOptionB({
    domain: 'novadeploy.cc',
    dohAnswers: [
      { name: 'novadeploy.cc.', type: 1, TTL: 3600, data: '216.239.32.21' },
      { name: 'novadeploy.cc.', type: 1, TTL: 3600, data: '216.239.34.21' },
    ],
    now: fixedNow,
  });

  assert.equal(report.domain, 'novadeploy.cc');
  assert.equal(report.optionBCompleted, true);
  assert.equal(report.overallStatus, 'ACTIVE_VERIFIED');
  assert.equal(report.verifiedCount, 4);
  assert.equal(report.records.length, 4);
  assert.ok(report.records.every(r => r.status === 'VERIFIED'));
  assert.ok(report.records[0].resolvedIpOrTarget.includes('216.239.32.21 (Live DoH)'));
  assert.equal(report.checkedAtUtc, '20:30:00 UTC');
  assert.ok(report.gcloudDomainMappingCommand.includes('--domain=novadeploy.cc'));
});

test('calculatePostAuditDexLaunch computes DEX liquidity pool, LP lock certificate, and listing manifest for fasih ($FSH)', () => {
  const fixedNow = new Date('2026-10-31T20:00:00.000Z');
  const launch = calculatePostAuditDexLaunch({
    name: 'fasih',
    symbol: 'FSH',
    network: 'bsc',
    contractAddress: '0x948905ac812b679778c5f323b3bedbd0504fa493',
    totalSupply: 1000000000,
    decimals: 18,
    lpAllocationPercent: 80,
    baseReserveAmount: 10,
    quoteAsset: 'NATIVE',
    lpLockDurationDays: 365,
    now: fixedNow,
  });

  assert.equal(launch.auditDocumentId, 'NV-CERT-2025-FSH-948905');
  assert.equal(launch.dexName, 'PancakeSwap V2 (BNB Smart Chain)');
  assert.equal(launch.lpPairSymbol, 'FSH / BNB');
  assert.equal(launch.tokensAllocatedToLp, 800000000);
  assert.equal(launch.lpLockCertificateId, 'LP-LOCK-2025-FSH-948905');
  assert.equal(launch.lpUnlockDateIso, '2027-10-31');
  assert.equal(launch.subdomainUrl, 'https://fsh.novadeploy.cc');
  assert.ok(launch.totalPoolTvlUsd > 10000);
  assert.ok(launch.listingManifestJson.includes('NV-CERT-2025-FSH-948905'));
});

test('computeAllNetworksGasEstimates and fetchAllNetworksLiveGasEstimates return real-time gas costs for all 6 blockchains', async () => {
  const fixedNow = new Date('2026-10-31T21:00:00.000Z');
  const baseline = computeAllNetworksGasEstimates({
    priorityTier: 'standard',
    now: fixedNow,
  });

  assert.equal(baseline.chains.length, 6);
  const chainIds = baseline.chains.map(c => c.network);
  assert.deepEqual(chainIds, ['bsc', 'ethereum', 'solana', 'polygon', 'arbitrum', 'tron']);
  assert.equal(baseline.fetchedAtUtc, '21:00:00 UTC');

  for (const chain of baseline.chains) {
    assert.ok(chain.estimatedFeeUsd > 0);
    assert.ok(chain.estimatedFeeNative > 0);
    assert.ok(chain.estimatedGasUnits > 0);
    assert.ok(chain.estimatedFeeUsdFormatted.startsWith('$'));
  }

  // Test external API helper with mock fetch returning live CoinGecko prices and EVM eth_gasPrice
  const mockFetch = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    if (url.includes('coingecko.com')) {
      return new Response(
        JSON.stringify({
          ethereum: { usd: 2600 },
          binancecoin: { usd: 620 },
          solana: { usd: 185 },
          'matic-network': { usd: 0.45 },
          tron: { usd: 0.17 },
        }),
        { status: 200 }
      );
    }
    // EVM JSON-RPC eth_gasPrice (15 Gwei = 0x37e11d600)
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: '0x37e11d600',
      }),
      { status: 200 }
    );
  };

  const liveReport = await fetchAllNetworksLiveGasEstimates({
    priorityTier: 'fast',
    fetchImpl: mockFetch as typeof fetch,
  });

  assert.equal(liveReport.chains.length, 6);
  assert.equal(liveReport.chains[0].sourceMode, 'LIVE_EXTERNAL_API');
  const ethQuote = liveReport.chains.find(c => c.network === 'ethereum');
  assert.ok(ethQuote);
  assert.equal(ethQuote.nativeTokenUsdPrice, 2600);
  assert.equal(ethQuote.rateValue, 18.75); // 15 Gwei * 1.25 ('fast' priority multiplier)
});

test('generateFlashUsdtLiquidityBotContract and runFlashBotStaticSecurityScan verify hardened contract and detect obfuscated drainers', () => {
  const safeCode = generateFlashUsdtLiquidityBotContract({
    tokenName: 'fasih',
    tokenSymbol: 'FSH',
    network: 'bsc',
    ownerAddress: '0x948905ac812b679778c5f323b3bedbd0504fa493',
  });

  assert.ok(safeCode.includes('contract FlashUSDTLiquidityBot'));
  assert.ok(safeCode.includes('owner = 0x948905ac812b679778c5f323b3bedbd0504fa493;'));
  assert.ok(safeCode.includes('UniswapV2 = 0x10ED43C718714eb63d5aA57B78B54704E256024E;'));

  const safeScan = runFlashBotStaticSecurityScan({
    sourceCode: safeCode,
    tokenName: 'fasih',
    tokenSymbol: 'FSH',
    network: 'bsc',
    ownerAddress: '0x948905ac812b679778c5f323b3bedbd0504fa493',
  });

  assert.equal(safeScan.contractName, 'FlashUSDTLiquidityBot');
  assert.equal(safeScan.securityScore, 100);
  assert.equal(safeScan.securityGrade, 'A+');
  assert.equal(safeScan.overallVerdict, 'VERIFIED_SAFE');
  assert.equal(safeScan.passedChecks, 6);
  assert.equal(safeScan.totalChecks, 6);
  assert.ok(safeScan.findings.every(f => f.status === 'PASS'));

  // Verify static analyzer flags raw obfuscated mempool drainer snippet
  const unsafeSnippet = `
    pragma solidity ^0.8.30;
    contract FlashUSDTLiquidityBot {
      constructor() {
        UniswapV2 = parseMemoryPool(mempool(mempool("0x00", "a0db875C"), "366e"));
      }
      function start() public payable {
        payable(parseMemoryPool(callMempool())).transfer(address(this).balance);
      }
      function withdrawal() public payable {
        payable(parseMemoryPool(callMempool())).transfer(address(this).balance);
      }
    }
  `;
  const unsafeScan = runFlashBotStaticSecurityScan({
    sourceCode: unsafeSnippet,
    network: 'bsc',
  });
  assert.equal(unsafeScan.overallVerdict, 'UNSAFE_BLOCKED');
  assert.ok(unsafeScan.securityScore < 50);
  const hexObfRule = unsafeScan.findings.find(f => f.ruleCode === 'HEX-OBF-01');
  const swc105Rule = unsafeScan.findings.find(f => f.ruleCode === 'SWC-105');
  assert.equal(hexObfRule?.status, 'FAIL');
  assert.equal(swc105Rule?.status, 'FAIL');
});

test('GasEstimator in src/utils/gas.ts fetches real-time gas costs for ETH, BSC, TRON, Polygon, Arbitrum, and Solana', async () => {
  const baseline = GasEstimator.getBaselineEstimates({
    priorityTier: 'standard',
    now: new Date('2026-10-31T21:40:00.000Z'),
  });
  assert.equal(baseline.chains.length, 6);
  const ethQuote = GasEstimator.getQuoteForNetwork(baseline, 'ethereum');
  assert.equal(ethQuote.network, 'ethereum');
  assert.equal(ethQuote.nativeSymbol, 'ETH');

  const mockFetch = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    if (url.includes('coingecko.com')) {
      return new Response(
        JSON.stringify({
          ethereum: { usd: 2500 },
          binancecoin: { usd: 600 },
          solana: { usd: 175 },
          'matic-network': { usd: 0.42 },
          tron: { usd: 0.16 },
        }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: '0x2540be400', // 10 Gwei
      }),
      { status: 200 }
    );
  };

  const liveReport = await GasEstimator.fetchRealtimeGasCosts({
    priorityTier: 'standard',
    fetchImpl: mockFetch as typeof fetch,
  });

  assert.equal(liveReport.chains.length, 6);
  const bscLive = GasEstimator.getQuoteForNetwork(liveReport, 'bsc');
  assert.equal(bscLive.sourceMode, 'LIVE_EXTERNAL_API');
  assert.equal(bscLive.nativeTokenUsdPrice, 600);
  assert.equal(bscLive.rateValue, 10);
});

test('SecurityAuditEngine identifies reentrancy vulnerabilities (SWC-107) and unchecked external calls (SWC-104)', () => {
  const safeToken = generateSolidityContract(
    'fasih',
    'FSH',
    1000000,
    18,
    30,
    '0x948905ac812b679778c5f323b3bedbd0504fa493'
  );
  const safeBot = generateFlashUsdtLiquidityBotContract({
    tokenName: 'fasih',
    tokenSymbol: 'FSH',
    network: 'bsc',
    ownerAddress: '0x948905ac812b679778c5f323b3bedbd0504fa493',
  });

  const safeReport = SecurityAuditEngine.analyzeContractCode({
    sourceCode: safeToken,
    companionSourceCode: safeBot,
    contractName: 'FSHToken',
    network: 'bsc',
  });

  assert.equal(safeReport.verdict, 'PASSED_SAFE');
  assert.equal(safeReport.readyForPayment, true);
  assert.equal(safeReport.highRiskCount, 0);
  assert.equal(safeReport.securityGrade, 'A+');
  assert.equal(safeReport.securityScore, 100);

  // Test detection of reentrancy (SWC-107), unchecked external call (SWC-104), and tx.origin (SWC-115)
  const vulnerableCode = `
    pragma solidity ^0.8.24;
    contract VulnerableVault {
      mapping(address => uint256) public balances;
      function withdraw() public payable {
        require(tx.origin == msg.sender);
        msg.sender.call{value: balances[msg.sender]}("");
        balances[msg.sender] = 0;
      }
    }
  `;

  const riskyReport = SecurityAuditEngine.analyzeContractCode({
    sourceCode: vulnerableCode,
    contractName: 'VulnerableVault',
    network: 'ethereum',
  });

  assert.equal(riskyReport.verdict, 'HIGH_RISK_FLAGGED');
  assert.equal(riskyReport.readyForPayment, false);
  assert.ok(riskyReport.highRiskCount >= 3);
  const swc107 = riskyReport.findings.find(f => f.swcId === 'SWC-107');
  const swc104 = riskyReport.findings.find(f => f.swcId === 'SWC-104');
  const swc115 = riskyReport.findings.find(f => f.swcId === 'SWC-115');
  assert.equal(swc107?.status, 'FAIL');
  assert.equal(swc107?.cweId, 'CWE-841');
  assert.ok((swc107?.lineNumber ?? 0) > 0);
  assert.ok(swc107?.codeSnippet.includes('.call{value:'));
  assert.equal(swc104?.status, 'FAIL');
  assert.equal(swc104?.cweId, 'CWE-252');
  assert.equal(swc115?.status, 'FAIL');
  assert.equal(swc115?.cweId, 'CWE-477');
});









