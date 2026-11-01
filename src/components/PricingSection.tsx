import { useState } from 'react';
import { Check, Zap, Sparkles, Shield, Server, ArrowRight } from 'lucide-react';
import { OwnerSettings } from '../types';

interface PricingProps {
  ownerSettings: OwnerSettings;
  onSelectPlan: (planName: string, price: number) => void;
}

export function PricingSection({ ownerSettings, onSelectPlan }: PricingProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Pay-Per-Deploy',
      badge: 'Most Popular',
      price: 'From $99',
      period: 'per token / app',
      desc: 'Ideal for launching a single token or production microservice with zero recurring commitments.',
      features: [
        'Automated OpenZeppelin v5 Compilation',
        'Multi-Chain (ETH, BSC, SOL, POLY, ARB)',
        'Etherscan & BscScan Contract Verification',
        '7 to 90 Days SLA Live Hosting & Monitoring',
        'Automated DEX Liquidity Pool Compatibility',
        'Download Verified .sol Source & ABI',
      ],
      highlight: true,
      buttonText: 'Deploy Now',
      planPrice: 99,
    },
    {
      name: 'Developer Pro',
      badge: 'For Builders',
      price: billingCycle === 'monthly' ? '$29' : '$24',
      period: 'per month',
      desc: 'For active web3 developers & cloud teams running multiple deployments every month.',
      features: [
        'Everything in Pay-Per-Deploy',
        'Unlimited Testnet Deployments (Goerli, Sepolia, BSC Test)',
        '3 Free Production Mainnet Launches per month',
        'Custom Subdomain (yourproject.novadeploy.app)',
        'Zero-Latency Dedicated RPC Relay Nodes',
        'Real-time Discord & Telegram Webhook Alerts',
      ],
      highlight: false,
      buttonText: 'Subscribe to Pro',
      planPrice: 29,
    },
    {
      name: 'Enterprise Agency',
      badge: 'High Scale',
      price: billingCycle === 'monthly' ? '$199' : '$159',
      period: 'per month',
      desc: 'Full white-label deployment portal, custom branding, and custom smart contract templates.',
      features: [
        'Unlimited Mainnet & Cloud Deployments',
        'White-Label Portal (Run under your custom domain)',
        'Set Your Own Client Pricing & Retain 100% Margin',
        'Multi-Sig Gnosis Safe & Timelock Vault Support',
        'Dedicated DevOps Engineer on Slack/Telegram',
        'SOC2 & CertiK Priority Audit Fast-Track',
      ],
      highlight: false,
      buttonText: 'Contact Enterprise',
      planPrice: 199,
    },
  ];

  return (
    <div id="pricing" className="w-full max-w-5xl mx-auto py-12">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          Transparent Developer Pricing
        </span>
        <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-white mt-2">
          Simple, Predictable Deployment Plans
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Pay as you go or choose an all-inclusive plan for continuous cloud & blockchain rollouts.
        </p>

        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-xs ${billingCycle === 'monthly' ? 'text-white font-semibold' : 'text-slate-400'}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 rounded-full bg-slate-800 p-1 flex items-center transition-colors cursor-pointer"
            aria-label="Toggle Annual Billing"
          >
            <div
              className={`w-4 h-4 rounded-full bg-indigo-500 transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs ${billingCycle === 'yearly' ? 'text-white font-semibold' : 'text-slate-400'}`}>
            Annual (Save 20%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`p-6 sm:p-7 rounded-3xl border transition-all flex flex-col justify-between relative ${
              plan.highlight
                ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/50 shadow-2xl ring-1 ring-indigo-500/30'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider">
                {plan.badge}
              </span>
            )}

            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-heading font-bold text-lg text-white">
                    {plan.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{plan.desc}</p>
                </div>
              </div>

              <div className="mt-5 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-extrabold text-white">
                    {plan.price}
                  </span>
                  <span className="text-xs text-slate-400">{plan.period}</span>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-slate-800 pt-5">
                {plan.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onSelectPlan(plan.name, plan.planPrice)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer ${
                  plan.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
