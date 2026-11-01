import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  Download,
  FileCheck2,
  FileCode2,
  Layers,
  RefreshCw,
  Shield,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { DeploymentConfig } from '../types';
import { simulateEtherscanVerificationPipeline } from '../utils/engine';

export interface VerifyContractProps {
  config: DeploymentConfig;
  currentSupplyNum: number;
  governedTaxPercent: number;
  requiredSignatures: number;
  totalSigners: number;
  onNotify?: (message: string) => void;
}

export const VerifyContract: React.FC<VerifyContractProps> = ({
  config,
  currentSupplyNum,
  governedTaxPercent,
  requiredSignatures,
  totalSigners,
  onNotify,
}) => {
  const [verifyCompilerVersion, setVerifyCompilerVersion] = useState<string>(
    'v0.8.24+commit.e11b9ed9'
  );
  const [verifyEvmVersion, setVerifyEvmVersion] = useState<string>('cancun');
  const [verifyOptimizationEnabled, setVerifyOptimizationEnabled] = useState<boolean>(true);
  const [verifyOptimizationRuns, setVerifyOptimizationRuns] = useState<number>(200);
  const [verifyLicenseType, setVerifyLicenseType] = useState<string>('MIT');

  const [flattenRunSequence, setFlattenRunSequence] = useState<number>(1);
  const [isFlatteningSource, setIsFlatteningSource] = useState<boolean>(false);
  const [lastFlattenedTimestamp, setLastFlattenedTimestamp] = useState<string>('Just now (Genesis Build)');

  const [isVerifyingContract, setIsVerifyingContract] = useState<boolean>(false);
  const [isContractVerifiedOnExplorer, setIsContractVerifiedOnExplorer] = useState<boolean>(true);
  const [activeSimulationStep, setActiveSimulationStep] = useState<number>(5);
  const [showFlattenedCodeViewer, setShowFlattenedCodeViewer] = useState<boolean>(true);
  const [showExplorerAbiPreview, setShowExplorerAbiPreview] = useState<boolean>(true);

  const [copiedFlattenedSource, setCopiedFlattenedSource] = useState<boolean>(false);
  const [copiedConstructorArgs, setCopiedConstructorArgs] = useState<boolean>(false);
  const [verifyActionNotice, setVerifyActionNotice] = useState<string | null>(null);

  const simulationReport = useMemo(
    () =>
      simulateEtherscanVerificationPipeline({
        name: config.name,
        symbolOrSlug: config.symbolOrSlug,
        supplyOrScale: currentSupplyNum,
        decimals: config.decimals,
        durationDays: config.durationDays,
        recipientOrOwner: config.recipientOrOwner,
        network: config.network || 'ethereum',
        contractAddress: config.contractAddress,
        compilerVersion: verifyCompilerVersion,
        evmVersion: verifyEvmVersion,
        optimizationEnabled: verifyOptimizationEnabled,
        optimizationRuns: verifyOptimizationRuns,
        licenseType: verifyLicenseType,
        transferTaxPercent: governedTaxPercent,
        multiSigThreshold: requiredSignatures,
        multiSigTotalSigners: totalSigners,
        forkedFrom: config.forkedFrom,
        flattenRunSequence,
      }),
    [
      config.name,
      config.symbolOrSlug,
      currentSupplyNum,
      config.decimals,
      config.durationDays,
      config.recipientOrOwner,
      config.network,
      config.contractAddress,
      verifyCompilerVersion,
      verifyEvmVersion,
      verifyOptimizationEnabled,
      verifyOptimizationRuns,
      verifyLicenseType,
      governedTaxPercent,
      requiredSignatures,
      totalSigners,
      config.forkedFrom,
      flattenRunSequence,
    ]
  );

  const { bundle } = simulationReport;

  const handleTriggerAutoFlatten = () => {
    setIsFlatteningSource(true);
    setVerifyActionNotice(null);
    setTimeout(() => {
      const nextRun = flattenRunSequence + 1;
      setFlattenRunSequence(nextRun);
      setIsFlatteningSource(false);
      setShowFlattenedCodeViewer(true);
      const timeLabel = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      setLastFlattenedTimestamp(timeLabel);
      const msg = `Auto-Flattened ${bundle.flattenedFileName} (Pass #${nextRun}): Inlined 6 OpenZeppelin & token contracts (${bundle.lineCount} lines, ${bundle.byteSize.toLocaleString()} bytes) using live deployment parameters (${config.name} / ${bundle.symbol}, Supply: ${currentSupplyNum.toLocaleString()}).`;
      setVerifyActionNotice(msg);
    }, 120);
  };

  const handleRunContractVerification = () => {
    setIsVerifyingContract(true);
    setActiveSimulationStep(2);
    setVerifyActionNotice(null);
    setTimeout(() => {
      setIsVerifyingContract(false);
      setIsContractVerifiedOnExplorer(true);
      setActiveSimulationStep(5);
      const msg = `Exact Bytecode Match Verified on ${bundle.explorerName}! Flattened source (${bundle.flattenedFileName}, ${bundle.lineCount} lines) matched runtime hash ${bundle.runtimeBytecodeHash.slice(0, 14)}... (GUID: ${bundle.verificationGuid.slice(0, 16)}).`;
      setVerifyActionNotice(msg);
    }, 150);
  };

  const handleCopyFlattenedSource = () => {
    navigator.clipboard.writeText(bundle.flattenedSourceCode);
    setCopiedFlattenedSource(true);
    onNotify?.(
      `Flattened Solidity source copied (${bundle.lineCount} lines, ${bundle.byteSize.toLocaleString()} bytes)`
    );
    setTimeout(() => setCopiedFlattenedSource(false), 2500);
  };

  const handleCopyConstructorArgs = () => {
    navigator.clipboard.writeText(bundle.abiEncodedConstructorArgs);
    setCopiedConstructorArgs(true);
    onNotify?.('ABI-Encoded Constructor Arguments copied to clipboard');
    setTimeout(() => setCopiedConstructorArgs(false), 2500);
  };

  const handleDownloadFlattenedSource = () => {
    const blob = new Blob([bundle.flattenedSourceCode], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = bundle.flattenedFileName;
    link.click();
    URL.revokeObjectURL(url);
    const msg = `Downloaded ${bundle.flattenedFileName} (${bundle.byteSize.toLocaleString()} bytes) ready for ${bundle.explorerName} single-file verification.`;
    setVerifyActionNotice(msg);
  };

  return (
    <div
      data-testid="verify-contract-module"
      className="p-6 rounded-3xl bg-slate-900/80 border border-emerald-500/35 space-y-5 shadow-xl"
    >
      {/* Module Header & Primary Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-4 h-4" />
            </span>
            <h3 className="font-heading font-bold text-base text-white">
              Verify Contract ({bundle.explorerName} Flattener & Verification Simulator)
            </h3>
            <span
              data-testid="contract-verification-status-badge"
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                isContractVerifiedOnExplorer
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isContractVerifiedOnExplorer
                ? '✓ Exact Bytecode Match Verified'
                : 'Pending Verification'}
            </span>
            <span
              data-testid="flatten-pass-badge"
              className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 text-[11px] font-mono"
            >
              Flatten Pass #{simulationReport.flattenRunCount}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Automatically flattens current deployment source code (<code>{bundle.flattenedFileName}</code>) using live deployment parameters and simulates the {bundle.explorerName} verification status pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleTriggerAutoFlatten}
            disabled={isFlatteningSource}
            data-testid="trigger-auto-flatten-btn"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isFlatteningSource ? 'animate-spin' : ''}`} />
            <span>
              {isFlatteningSource ? 'Flattening AST...' : 'Auto-Flatten Source Code'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleRunContractVerification}
            disabled={isVerifyingContract}
            data-testid="verify-publish-contract-btn"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>
              {isVerifyingContract
                ? 'Simulating Explorer Match...'
                : `Simulate ${bundle.explorerName} Verification`}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadFlattenedSource}
            data-testid="download-flattened-source-btn"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download Flattened (.sol)</span>
          </button>
        </div>
      </div>

      {/* Compiler, EVM, Optimization & License Configuration Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="space-y-1">
          <label htmlFor="verify-compiler-select" className="text-slate-400 block font-medium">
            Solidity Compiler Version:
          </label>
          <select
            id="verify-compiler-select"
            data-testid="verify-compiler-select"
            value={verifyCompilerVersion}
            onChange={e => setVerifyCompilerVersion(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="v0.8.24+commit.e11b9ed9">v0.8.24+commit.e11b9ed9</option>
            <option value="v0.8.26+commit.8a97fa7a">v0.8.26+commit.8a97fa7a</option>
            <option value="v0.8.20+commit.a1b79de6">v0.8.20+commit.a1b79de6</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="verify-evm-select" className="text-slate-400 block font-medium">
            Target EVM Version:
          </label>
          <select
            id="verify-evm-select"
            data-testid="verify-evm-select"
            value={verifyEvmVersion}
            onChange={e => setVerifyEvmVersion(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="cancun">cancun (Default)</option>
            <option value="shanghai">shanghai</option>
            <option value="paris">paris</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="verify-runs-input" className="text-slate-400 block font-medium">
            Optimization & Runs:
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVerifyOptimizationEnabled(prev => !prev)}
              data-testid="verify-optimization-toggle"
              className={`px-3 py-2 rounded-xl border font-mono text-xs font-semibold cursor-pointer ${
                verifyOptimizationEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {verifyOptimizationEnabled ? 'Yes' : 'No'}
            </button>
            <input
              id="verify-runs-input"
              data-testid="verify-runs-input"
              type="number"
              min="1"
              max="10000"
              value={verifyOptimizationRuns}
              onChange={e =>
                setVerifyOptimizationRuns(Math.max(1, Number(e.target.value) || 200))
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="verify-license-select" className="text-slate-400 block font-medium">
            SPDX License Type:
          </label>
          <select
            id="verify-license-select"
            data-testid="verify-license-select"
            value={verifyLicenseType}
            onChange={e => setVerifyLicenseType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="MIT">MIT License (MIT)</option>
            <option value="GPL-3.0">GNU General Public License v3.0</option>
            <option value="Apache-2.0">Apache License 2.0</option>
          </select>
        </div>
      </div>

      {/* Action Feedback Notice */}
      {verifyActionNotice && (
        <div
          data-testid="verify-contract-notice"
          className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2.5 animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{verifyActionNotice}</span>
        </div>
      )}

      {/* Automatic Flattening Parameter Bindings & Inlined Dependency Tree */}
      <div
        data-testid="auto-flatten-manifest-panel"
        className="p-4 rounded-2xl bg-slate-950/85 border border-indigo-500/25 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-heading font-bold text-white">
              Automatic Flattening Parameter Synthesis & Dependency Graph
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Last Flattened: <strong className="text-indigo-300">{lastFlattenedTimestamp}</strong> • 6 Contracts Inlined
          </span>
        </div>

        {/* Injected Deployment Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {simulationReport.parameterBindings.map(binding => (
            <div
              key={binding.paramKey}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1 font-mono"
            >
              <div className="text-[10px] uppercase text-slate-400 flex items-center justify-between">
                <span>{binding.paramKey}</span>
                <Sparkles className="w-3 h-3 text-indigo-400" />
              </div>
              <div className="text-xs font-bold text-white truncate" title={binding.resolvedValue}>
                {binding.resolvedValue}
              </div>
              <div
                className="text-[10px] text-indigo-300 truncate"
                title={binding.solidityIdentifier}
              >
                {binding.solidityIdentifier}
              </div>
            </div>
          ))}
        </div>

        {/* Inlined OpenZeppelin & Contract Files Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-slate-400">Inlined AST Units:</span>
          {simulationReport.inlinedDependencies.map(dep => (
            <span
              key={dep.id}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
            >
              <FileCode2 className="w-3 h-3 text-emerald-400" />
              <span>{dep.contractOrInterfaceName}</span>
              <span className="text-slate-500">({dep.lineCount}L)</span>
            </span>
          ))}
        </div>
      </div>

      {/* ETHERSCAN VERIFICATION STATUS SIMULATION VIEW */}
      <div
        data-testid="etherscan-verification-simulation-view"
        className="rounded-2xl bg-slate-950 border border-emerald-500/30 overflow-hidden space-y-4 p-4 sm:p-5"
      >
        {/* Simulated Block Explorer Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold">
                {simulationReport.etherscanStatusBadge}
              </span>
              <span className="text-xs font-heading font-bold text-white">
                {bundle.explorerName} Verification Status Simulation View
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Explorer URL:{' '}
                <strong className="text-emerald-300">{simulationReport.explorerUrl}</strong>
              </span>
              <span>
                Receipt GUID:{' '}
                <strong className="text-indigo-300">{bundle.verificationGuid.slice(0, 20)}...</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setShowExplorerAbiPreview(prev => !prev)}
              data-testid="toggle-explorer-abi-preview-btn"
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono cursor-pointer"
            >
              {showExplorerAbiPreview ? 'Hide Read/Write ABI Preview' : 'Show Read/Write ABI Preview'}
            </button>
          </div>
        </div>

        {/* 5-Stage Etherscan Verification Pipeline Simulation */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          {simulationReport.verificationStages.map(stage => {
            const isStepComplete = activeSimulationStep >= stage.stepNumber;
            return (
              <div
                key={stage.stageId}
                data-testid={`etherscan-stage-${stage.stepNumber}`}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  isStepComplete
                    ? 'bg-emerald-950/20 border-emerald-500/35'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                      Stage {stage.stepNumber}/5 • {stage.durationMs}ms
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-xs font-bold text-white leading-snug">{stage.title}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {stage.detailSummary}
                  </p>
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-indigo-300 truncate">
                  {stage.artifactHashOrRef}
                </div>
              </div>
            );
          })}
        </div>

        {/* ABI-Encoded Constructor Arguments & Bytecode Hash Comparison */}
        <div className="p-4 rounded-2xl bg-slate-900/85 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-slate-300 text-[11px] uppercase flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>ABI-Encoded Constructor Arguments (Auto-Generated from Deployment Parameters)</span>
            </span>
            <button
              type="button"
              onClick={handleCopyConstructorArgs}
              data-testid="copy-constructor-args-btn"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-slate-800 text-[11px] font-semibold cursor-pointer self-start sm:self-auto"
            >
              {copiedConstructorArgs ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedConstructorArgs ? 'Copied ABI Hex!' : 'Copy ABI Hex'}</span>
            </button>
          </div>
          <div
            data-testid="verify-abi-constructor-args"
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 break-all"
          >
            {bundle.abiEncodedConstructorArgs}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400">
            <div className="truncate">
              Runtime Bytecode Match:{' '}
              <strong className="text-emerald-300">
                {bundle.runtimeBytecodeHash.slice(0, 18)}... (100%)
              </strong>
            </div>
            <div className="truncate">
              Creation Bytecode Hash:{' '}
              <strong className="text-slate-200">
                {bundle.creationBytecodeHash.slice(0, 18)}...
              </strong>
            </div>
            <div className="truncate">
              Explorer Verification Timestamp:{' '}
              <strong className="text-indigo-300">{bundle.verifiedAtLabel}</strong>
            </div>
          </div>
        </div>

        {/* Simulated Etherscan Read / Write Contract ABI Preview */}
        {showExplorerAbiPreview && (
          <div
            data-testid="etherscan-abi-simulation-grid"
            className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1"
          >
            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Simulated Read Contract ({ bundle.explorerName } #readContract)</span>
                </span>
                <span className="text-[10px] text-slate-400">Live State Bound</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {simulationReport.readContractMethods.map(item => (
                  <div
                    key={item.name}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-[11px] flex items-center justify-between gap-2"
                  >
                    <span className="text-slate-400 truncate">{item.name}()</span>
                    <span className="text-emerald-300 font-semibold truncate">
                      {item.returnValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Simulated Write Contract ({ bundle.explorerName } #writeContract)</span>
                </span>
                <span className="text-[10px] text-slate-400">Verified ABI Selectors</span>
              </div>
              <div className="space-y-1.5">
                {simulationReport.writeContractMethods.map(fn => (
                  <div
                    key={fn.name}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-[11px] flex items-center justify-between gap-2"
                  >
                    <span className="text-slate-200 truncate">{fn.signature}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                      {fn.accessControl}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flattened Contract File Viewer */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">{bundle.flattenedFileName}</span>
            <span className="text-slate-400 text-[11px]">
              ({bundle.lineCount} lines • {bundle.byteSize.toLocaleString()} bytes)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyFlattenedSource}
              data-testid="copy-flattened-source-btn"
              className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedFlattenedSource ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedFlattenedSource ? 'Copied Flattened Code!' : 'Copy Flattened Source'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowFlattenedCodeViewer(prev => !prev)}
              data-testid="toggle-flattened-source-btn"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              {showFlattenedCodeViewer ? 'Collapse Source' : 'Expand Source'}
            </button>
          </div>
        </div>

        {showFlattenedCodeViewer && (
          <pre
            data-testid="flattened-solidity-code-preview"
            className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72 leading-relaxed select-all"
          >
            {bundle.flattenedSourceCode}
          </pre>
        )}
      </div>
    </div>
  );
};
