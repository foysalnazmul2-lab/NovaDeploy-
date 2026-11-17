// CSV planning utilities. A CSV is NOT proof of consent, ownership, or on-chain holders.
export const AIRDROP_TARGET_ROWS = 300000;
export const AIRDROP_MAX_IMPORT_ROWS = AIRDROP_TARGET_ROWS;
export const AIRDROP_COLUMNS = [
  'recipient_id', 'wallet_address', 'consent_status', 'consent_timestamp_utc',
  'network', 'validation_status', 'signature_status', 'sybil_review_status',
  'allocation', 'distribution_status', 'tx_hash_or_claim_id', 'source', 'notes',
] as const;

export type RecipientRow = Record<string, string>;
export interface RecipientAnalysis {
  total: number;
  validUnique: number;
  invalid: number;
  duplicates: number;
  claimedOptedIn: number;
  claimedSigned: number;
  provisionalCount: number;
  provisionalRows: RecipientRow[];
}

export function validBscAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim()) &&
    !/^0x0{40}$/i.test(value.trim());
}

function csvCell(value: string): string {
  // Prevent spreadsheet formula injection when the exported CSV is opened.
  const safe = /^[\s]*[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function makeRecipientTemplate(count = AIRDROP_TARGET_ROWS): string {
  if (!Number.isInteger(count) || count < 1 || count > AIRDROP_MAX_IMPORT_ROWS) {
    throw new Error('Recipient count is out of range.');
  }
  const lines = [AIRDROP_COLUMNS.join(',')];
  for (let i = 1; i <= count; i++) {
    const row: RecipientRow = {
      recipient_id: 'recipient_' + String(i).padStart(5, '0'),
      wallet_address: '',
      consent_status: 'pending',
      consent_timestamp_utc: '',
      network: 'bsc',
      validation_status: 'pending',
      signature_status: 'pending',
      sybil_review_status: 'pending',
      allocation: '',
      distribution_status: 'not_started',
      tx_hash_or_claim_id: '',
      source: 'opt_in',
      notes: '',
    };
    lines.push(AIRDROP_COLUMNS.map(column => csvCell(row[column])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

export function parseRecipientCsv(text: string): RecipientRow[] {
  const input = text.replace(/^\uFEFF/, '');
  const raw: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(value => value.trim() !== '')) raw.push(row);
      if (raw.length > AIRDROP_MAX_IMPORT_ROWS + 1) {
        throw new Error(`CSV exceeds the ${AIRDROP_MAX_IMPORT_ROWS.toLocaleString('en-US')}-row limit.`);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (cell !== '' || row.length) {
    row.push(cell);
    if (row.some(value => value.trim() !== '')) raw.push(row);
  }
  const [header, ...data] = raw;
  if (!header) throw new Error('CSV is empty.');
  const columns = header.map(value => value.trim().toLowerCase());
  if (!columns.includes('wallet_address')) {
    throw new Error('CSV needs a wallet_address column.');
  }
  if (data.length > AIRDROP_MAX_IMPORT_ROWS) {
    throw new Error(`CSV exceeds the ${AIRDROP_MAX_IMPORT_ROWS.toLocaleString('en-US')}-row limit.`);
  }
  return data.map((cells, index) => {
    const result: RecipientRow = {};
    columns.forEach((name, position) => { result[name] = (cells[position] || '').trim(); });
    result.recipient_id ||= 'recipient_' + String(index + 1).padStart(5, '0');
    return result;
  });
}

export function analyzeRecipients(rows: RecipientRow[]): RecipientAnalysis {
  const seen = new Set<string>();
  const provisionalRows: RecipientRow[] = [];
  let validUnique = 0;
  let invalid = 0;
  let duplicates = 0;
  let claimedOptedIn = 0;
  let claimedSigned = 0;

  for (const row of rows) {
    const address = (row.wallet_address || '').trim();
    const network = (row.network || 'bsc').trim().toLowerCase();
    if (!validBscAddress(address) || (network !== 'bsc' && network !== '56' && network !== 'bnb smart chain')) {
      invalid++;
      continue;
    }
    const normalized = address.toLowerCase();
    if (seen.has(normalized)) {
      duplicates++;
      continue;
    }
    seen.add(normalized);
    validUnique++;
    const consent = (row.consent_status || row.consent || '').toLowerCase();
    const optedIn = ['opted_in', 'granted', 'yes', 'true', '1'].includes(consent);
    const signed = (row.signature_status || '').toLowerCase() === 'verified';
    const reviewed = (row.sybil_review_status || '').toLowerCase() === 'approved';
    if (optedIn) claimedOptedIn++;
    if (signed) claimedSigned++;
    if (optedIn && signed && reviewed) provisionalRows.push(row);
  }

  return {
    total: rows.length, validUnique, invalid, duplicates,
    claimedOptedIn, claimedSigned,
    provisionalCount: provisionalRows.length, provisionalRows,
  };
}

export function parseTokenUnits(input: string, decimals: number): bigint | null {
  const trimmed = input.trim();
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36 ||
      trimmed.length > 90 || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, fractional = ''] = trimmed.split('.');
  if (fractional.length > decimals) return null;
  const scale = 10n ** BigInt(decimals);
  return BigInt(whole) * scale + BigInt(fractional.padEnd(decimals, '0') || '0');
}

export function formatTokenUnits(value: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fractional = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return whole.toString() + (fractional ? '.' + fractional : '');
}

export function makeReviewCsv(rows: RecipientRow[], perRecipient: bigint, decimals: number): string {
  const header = ['recipient_id', 'wallet_address', 'allocation_tokens', 'network', 'verification_state'];
  const allocation = formatTokenUnits(perRecipient, decimals);
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([
      row.recipient_id || '',
      row.wallet_address || '',
      allocation,
      'bsc',
      'UNVERIFIED_CSV_PREVIEW_NOT_FOR_DISTRIBUTION',
    ].map(csvCell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
