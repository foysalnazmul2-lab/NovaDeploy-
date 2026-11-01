import { Zap, Globe, ShieldCheck, DollarSign } from 'lucide-react';

export function FeaturesAndHighlights() {
  const features = [
    {
      icon: Zap,
      title: 'Instant Deploy',
      description: 'Your token is live on-chain within seconds',
      color: 'from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30',
    },
    {
      icon: Globe,
      title: 'Multi-Chain',
      description: 'ETH, BSC, TRON, Polygon, Arbitrum, Solana',
      color: 'from-indigo-500/20 to-blue-500/10 text-indigo-400 border-indigo-500/30',
    },
    {
      icon: ShieldCheck,
      title: 'Audited',
      description: 'Smart contracts verified and secured',
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    },
    {
      icon: DollarSign,
      title: 'Low Fees',
      description: 'Competitive activation pricing',
      color: 'from-cyan-500/20 to-sky-500/10 text-cyan-400 border-cyan-500/30',
    },
  ];

  return (
    <div id="features" className="w-full max-w-5xl mx-auto py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition-all group"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border bg-gradient-to-tr ${feat.color} mb-3.5 group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-heading font-bold text-white group-hover:text-indigo-200 transition-colors">
                {feat.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {feat.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

