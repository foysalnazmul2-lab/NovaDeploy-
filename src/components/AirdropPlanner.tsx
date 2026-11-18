import { useEffect, useMemo, useState } from 'react';
import { Download, Upload, Users, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import {
  AIRDROP_MAX_IMPORT_ROWS, AIRDROP_TARGET_ROWS, analyzeRecipients, formatTokenUnits,
  makeRecipientTemplate, makeReviewCsv, parseRecipientCsv, parseTokenUnits,
  type RecipientRow,
} from '../utils/airdrop';

function downloadText(name: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AirdropPlanner() {
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [tokenAmount, setTokenAmount] = useState('300000');
  const [decimals, setDecimals] = useState(18);
  const [contract, setContract] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [holderIndexedAt, setHolderIndexedAt] = useState('');
  const [poolPrice, setPoolPrice] = useState<number | null>(null);
  const [poolCheckedAt, setPoolCheckedAt] = useState('');
  const [monitorStatus, setMonitorStatus] = useState('Enter a BNB Chain token contract to monitor blockchain data.');
  const validContract = /^0x[0-9a-fA-F]{40}$/.test(contract);

  // Hostinger exposes server-side adapters for GeckoTerminal and DEX Screener.
  // Only blockchain/indexer responses are displayed; the imported CSV never counts as holders.
  useEffect(() => {
    setLiveCount(null);
    setHolderIndexedAt('');
    setPoolPrice(null);
    setPoolCheckedAt('');
    if (!/^0x[0-9a-fA-F]{40}$/.test(contract)) {
      setMonitorStatus('Enter a valid BNB Chain contract to start live monitoring.');
      return;
    }
    let disposed = false;
    const token = contract.toLowerCase();
    const reloadCount = async () => {
      try {
        const response = await fetch('/market-tools.php?api=holder-count&token=' + token, { cache: 'no-store' });
        if (!response.ok) throw new Error('Holder provider unavailable');
        const data: { count?: unknown; updatedAt?: unknown } = await response.json();
        if (disposed) return;
        setLiveCount(typeof data.count === 'number' && Number.isSafeInteger(data.count) && data.count >= 0 ? data.count : null);
        setHolderIndexedAt(typeof data.updatedAt === 'string' ? data.updatedAt : '');
        setMonitorStatus('GeckoTerminal indexed holder data. Results may lag behind on-chain transfers.');
      } catch {
        if (!disposed) setMonitorStatus('Holder index unavailable on this host. Open the live Hostinger checker below.');
      }
    };
    const reloadMarket = async () => {
      try {
        const response = await fetch('/market-tools.php?api=market&token=' + token, { cache: 'no-store' });
        if (!response.ok) throw new Error('Market provider unavailable');
        const data: { pools?: { price?: unknown; liquidity?: unknown }[]; checkedAt?: unknown } = await response.json();
        if (disposed) return;
        const best = Array.isArray(data.pools) ? data.pools[0] : undefined;
        setPoolPrice(typeof best?.price === 'number' && Number.isFinite(best.price) && best.price > 0 ? best.price : null);
        setPoolCheckedAt(typeof data.checkedAt === 'string' ? data.checkedAt : '');
      } catch {
        if (!disposed) { setPoolPrice(null); setPoolCheckedAt(''); }
      }
    };
    void reloadCount();
    void reloadMarket();
    const holderTimer = window.setInterval(() => { if (!document.hidden) void reloadCount(); }, 180000);
    const marketTimer = window.setInterval(() => { if (!document.hidden) void reloadMarket(); }, 60000);
    return () => {
      disposed = true;
      window.clearInterval(holderTimer);
      window.clearInterval(marketTimer);
    };
  }, [contract]);
  const stats = useMemo(() => analyzeRecipients(rows), [rows]);
  const amount = useMemo(() => parseTokenUnits(tokenAmount, decimals), [tokenAmount, decimals]);
  const divisor = BigInt(stats.provisionalCount);
  const per = amount !== null && divisor > 0n ? amount / divisor : null;
  const remainder = amount !== null && divisor > 0n ? amount % divisor : null;

  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      if (file.size > 64 * 1024 * 1024) throw new Error('File exceeds the 64 MiB import limit.');
      const parsed = parseRecipientCsv(await file.text());
      setRows(parsed);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import CSV.');
      setRows([]);
      setFileName('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="airdrop-planner" className="rounded-3xl border border-indigo-500/30 bg-slate-900/70 p-5 sm:p-8 space-y-6 shadow-2xl">
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
            <Users className="w-4 h-4" /> Genuine community distribution
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">300,000-recipient allocation workspace</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-3xl">
            Download an empty 300,000-row template and import genuine opt-in BNB Smart Chain wallets.
            This workspace only plans allocations. It does not create wallets, send tokens, or increase the on-chain holder count.
          </p>
        </div>
        <button type="button" onClick={() => downloadText('novadeploy-' + AIRDROP_TARGET_ROWS + '-recipient-template.csv', makeRecipientTemplate())}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm rounded-xl px-4 py-3">
          <Download className="w-4 h-4" /> Download 300,000-row CSV
        </button>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200 flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          A CSV claim of consent or signature verification is not independently verified. Imported addresses are
          provisional until a trusted backend verifies wallet-control signatures, opt-in records, and anti-sybil review.
          Never send funds based solely on imported flags. The BscScan holder count changes only after confirmed
          on-chain token balances exist.
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <label className="text-xs text-slate-300 font-semibold space-y-2 block">
          <span>BEP-20 contract address (optional reference)</span>
          <input value={contract} onChange={e => setContract(e.target.value)}
            placeholder="0x... token contract" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-xs text-white" />
        </label>
        <label className="text-xs text-slate-300 font-semibold space-y-2 block">
          <span>Total tokens to allocate</span>
          <input value={tokenAmount} onChange={e => setTokenAmount(e.target.value)}
            inputMode="decimal" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm text-white" />
        </label>
        <label className="text-xs text-slate-300 font-semibold space-y-2 block">
          <span>Token decimals</span>
          <input type="number" min={0} max={36} value={decimals}
            onChange={e => setDecimals(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm text-white" />
        </label>
      </div>

      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5 space-y-3" aria-live="polite">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-white text-base">Live BNB Chain monitor</h3>
          <span className="text-xs text-cyan-200">Holder index: 3 min · DEX pools: 1 min while page is open</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-950 p-3">
            <div className="text-xs text-slate-400">Indexed token holders (not CSV recipients)</div>
            <div className="text-xl font-mono text-white font-bold">{liveCount === null ? 'Unavailable' : liveCount.toLocaleString('en-US')}</div>
            <div className="text-xs text-slate-400">{holderIndexedAt ? 'Source updated: ' + new Date(holderIndexedAt).toLocaleString() : 'No index timestamp available'}</div>
          </div>
          <div className="rounded-lg bg-slate-950 p-3">
            <div className="text-xs text-slate-400">Highest-liquidity pool USD price</div>
            <div className="text-xl font-mono text-white font-bold">{poolPrice === null ? 'No indexed quote' : '$' + poolPrice.toPrecision(8)}</div>
            <div className="text-xs text-slate-400">{poolCheckedAt ? 'Checked: ' + new Date(poolCheckedAt).toLocaleString() : 'No pool timestamp available'}</div>
          </div>
        </div>
        <p className="text-xs text-slate-300">{monitorStatus} Counts come from GeckoTerminal; pools come from DEX Screener. Neither figure is guaranteed to be real-time or a transferable token value.</p>
        {validContract && <a href={'https://novadeploy.cc/market-tools.php?token=' + encodeURIComponent(contract)} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-cyan-300 underline">Open the live wallet-balance and holder checker</a>}
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-400 p-5 cursor-pointer text-sm text-slate-200">
        <Upload className="w-5 h-5 text-indigo-300" />
        <span>{busy ? 'Reading CSV…' : fileName ? 'Loaded: ' + fileName : 'Import opt-in recipient CSV (up to ' + AIRDROP_MAX_IMPORT_ROWS.toLocaleString('en-US') + ' rows)'}</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => { void importFile(e.target.files?.[0]); }} />
      </label>
      {error && <p role="alert" className="text-rose-400 text-sm">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Planned target', AIRDROP_TARGET_ROWS.toLocaleString()],
          ['Additional addresses to target', Math.max(0, AIRDROP_TARGET_ROWS - stats.validUnique).toLocaleString()],
          ['Unique valid addresses', stats.validUnique.toLocaleString()],
          ['Provisional eligible', stats.provisionalCount.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-700 bg-slate-950/80 p-4">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="text-xl text-white font-bold font-mono mt-1">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-400">
        <span>Invalid / empty: <strong className="text-rose-300">{stats.invalid}</strong></span>
        <span>Duplicates: <strong className="text-amber-300">{stats.duplicates}</strong></span>
        <span>Claimed opt-ins: <strong className="text-slate-200">{stats.claimedOptedIn}</strong></span>
        <span>Claimed verified signatures: <strong className="text-slate-200">{stats.claimedSigned}</strong></span>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-5 space-y-2">
        <h3 className="text-sm font-semibold text-white">Equal allocation preview</h3>
        {amount === null ? (
          <p className="text-rose-300 text-sm">Enter a valid amount with no more than {decimals} decimal places.</p>
        ) : per === null ? (
          <p className="text-slate-400 text-sm">Import approved opt-in recipients to calculate allocations. For a planning example, {tokenAmount || '0'} tokens ÷ 300,000 recipients is {formatTokenUnits(amount / BigInt(AIRDROP_TARGET_ROWS), decimals)} tokens per recipient.</p>
        ) : (
          <>
            <p className="text-xl font-mono font-bold text-emerald-300">{formatTokenUnits(per, decimals)} tokens per provisional recipient</p>
            <p className="text-xs text-slate-400">Remainder: {formatTokenUnits(remainder!, decimals)} tokens. Export is a review-only preview; it is not a transaction or verified eligibility list.</p>
          </>
        )}
        <div className="flex flex-wrap gap-3 pt-3">
          <button type="button" disabled={per === null || per === 0n}
            onClick={() => { if (per !== null) downloadText('novadeploy-allocation-review.csv', makeReviewCsv(stats.provisionalRows, per, decimals)); }}
            className="disabled:opacity-40 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-semibold">
            <FileSpreadsheet className="w-4 h-4" /> Export review-only allocation CSV
          </button>
          {/^0x[0-9a-fA-F]{40}$/.test(contract) && (
            <a href={'https://bscscan.com/token/' + contract} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-lg border border-slate-600 text-sm text-slate-200 hover:bg-slate-800">
              View actual token holders on BscScan
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
