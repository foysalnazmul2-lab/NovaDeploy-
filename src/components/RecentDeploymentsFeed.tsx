import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

export interface DeploymentFeedItem {
  id: string;
  address: string;
  amount: string;
  network: string;
  timeAgo: string;
  status: 'Live' | 'Verified';
}

export const INITIAL_RECENT_DEPLOYMENTS: DeploymentFeedItem[] = [
  {
    id: 'deploy_feed_1',
    address: '0xb3c3...61b0',
    amount: '250,000',
    network: 'Polygon',
    timeAgo: '8m ago',
    status: 'Verified',
  },
  {
    id: 'deploy_feed_2',
    address: '0x844b...6e80',
    amount: '100,000',
    network: 'Polygon',
    timeAgo: '43m ago',
    status: 'Verified',
  },
  {
    id: 'deploy_feed_3',
    address: '0x87fe...2fdb',
    amount: '50,000',
    network: 'BNB Chain',
    timeAgo: '15m ago',
    status: 'Live',
  },
];

export function RecentDeploymentsFeed() {
  const [items, setItems] = useState<DeploymentFeedItem[]>(INITIAL_RECENT_DEPLOYMENTS);

  // Periodically add new deployments while keeping the 3 verified seed entries visible
  useEffect(() => {
    const networks = ['Polygon', 'BNB Chain', 'Ethereum', 'Solana', 'Arbitrum', 'TRON'];
    const amounts = ['50,000', '100,000', '250,000', '500,000'];

    const interval = setInterval(() => {
      const net = networks[Math.floor(Math.random() * networks.length)];
      const amt = amounts[Math.floor(Math.random() * amounts.length)];
      const hex = () =>
        '0x' +
        Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('') +
        '...' +
        Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      const newItem: DeploymentFeedItem = {
        id: Math.random().toString(),
        address: hex(),
        amount: amt,
        network: net,
        timeAgo: 'Just now',
        status: 'Live',
      };

      setItems(prev => [
        ...INITIAL_RECENT_DEPLOYMENTS,
        newItem,
        ...prev.filter(p => !p.id.startsWith('deploy_feed_')).slice(0, 2),
      ]);
    }, 24000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div id="recent-deployments" className="w-full max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <h3 className="text-base font-heading font-bold text-white tracking-tight">
            Recent Deployments
          </h3>
        </div>
        <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live On-Chain Feed</span>
        </span>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-xl">
        {items.map(item => (
          <div
            key={item.id}
            data-testid={`recent-deploy-${item.address}`}
            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="font-mono text-slate-200 font-semibold">{item.address}</span>
              <span className="text-slate-300">
                deployed <strong className="text-white font-mono tabular-nums">{item.amount}</strong> tokens on{' '}
                <span className="text-indigo-400 font-semibold">{item.network}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-slate-400 font-mono tabular-nums text-[11px]">{item.timeAgo}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

