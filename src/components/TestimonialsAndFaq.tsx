import { useState } from 'react';
import {
  ChevronDown,
  Star,
  X,
  ShieldCheck,
} from 'lucide-react';
import { OwnerSettings } from '../types';

interface TestimonialsAndFaqProps {
  ownerSettings: OwnerSettings;
}

export const DEPLOY_LAB_TESTIMONIALS = [
  {
    name: 'Alex K.',
    title: 'Deployed 3 tokens',
    avatar: 'AK',
    quote:
      '"Deployed my ERC-20 token in under a minute. The whole process was seamless and the contract was verified on Etherscan automatically."',
    rating: 5,
  },
  {
    name: 'Maria R.',
    title: 'Deployed 1 token',
    avatar: 'MR',
    quote:
      '"I had zero blockchain experience. Deploy Lab made it simple — picked BSC, named my token, and it was live. Support answered in 5 minutes."',
    rating: 5,
  },
  {
    name: 'James S.',
    title: 'Deployed 5 tokens',
    avatar: 'JS',
    quote:
      '"Used it for multiple projects across Ethereum and Solana. Consistent results every time. The compiler output is a nice touch — feels professional."',
    rating: 5,
  },
  {
    name: 'Lisa T.',
    title: 'Deployed 2 tokens',
    avatar: 'LT',
    quote:
      '"Activation fee is very reasonable for what you get. My token was trading on PancakeSwap the same day. Highly recommend."',
    rating: 5,
  },
];

export const DEPLOY_LAB_COMPLIANCE_BADGES = [
  { title: 'CertiK', subtitle: 'Audited' },
  { title: 'KYC', subtitle: 'Verified' },
  { title: 'On-Chain', subtitle: 'Transparent' },
  { title: 'AES-256', subtitle: 'Encrypted' },
  { title: '99.9%', subtitle: 'Uptime SLA' },
  { title: 'GDPR', subtitle: 'Compliant' },
];

const LEGAL_POLICIES: Record<string, { title: string; updated: string; content: string[] }> = {
  terms: {
    title: 'Terms of Service',
    updated: 'Effective January 1, 2025 · Deploy Lab Technologies Pte. Ltd.',
    content: [
      '1. Scope of Service: Deploy Lab Technologies Pte. Ltd. (Reg. No. 202318472K, Singapore) provides automated smart contract compilation, static security verification, and multi-chain token deployment infrastructure across Ethereum, BNB Smart Chain, TRON, Polygon, Arbitrum, and Solana.',
      '2. Non-Custodial Execution: Deploy Lab operates strictly as a non-custodial software engine. 100% of the minted token supply and ownership privileges are assigned directly to the recipient wallet address specified by the user during configuration.',
      '3. Activation & Network Gas Fees: Activation fees cover compiler execution, automated OpenZeppelin AST verification, block explorer source flattening, and validator gas fees for the selected hosting/trading SLA duration (7 to 90 days).',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'GDPR & PDPA (Singapore) Compliant · AES-256 Encrypted',
    content: [
      '1. Zero Private Key Collection: Deploy Lab never requests, accesses, or stores wallet seed phrases or private keys.',
      '2. Minimal Telemetry: Public wallet addresses and on-chain deployment transaction hashes are processed solely to deliver live compilation status, block explorer verification, and customer support.',
      '3. Data Protection: All platform sessions are secured via 256-bit TLS/AES encryption in compliance with the Singapore Personal Data Protection Act (PDPA) and EU GDPR.',
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    updated: 'Essential Session & Preferences Storage',
    content: [
      '1. Essential Local Storage: Deploy Lab uses browser localStorage strictly to preserve your active token configuration, connected wallet indicator, and deployment receipts across page reloads.',
      '2. Zero Third-Party Ad Trackers: We do not sell user data or embed third-party behavioral advertising cookies.',
    ],
  },
  aml: {
    title: 'AML/KYC Policy',
    updated: 'Licensed Digital Asset Service Provider Compliance',
    content: [
      '1. Regulatory Alignment: Deploy Lab Technologies Pte. Ltd. (71 Robinson Road, #14-01, Singapore 068895) maintains automated OFAC/MAS sanctions screening on target recipient addresses.',
      '2. Transparent On-Chain Provenance: Every deployed contract is deterministically verifiable on public block explorers with immutable constructor parameters and supply invariants.',
    ],
  },
};

export function TestimonialsAndFaq({ ownerSettings }: TestimonialsAndFaqProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activePolicyKey, setActivePolicyKey] = useState<string | null>(null);

  const faqs = [
    {
      question: 'How does Deploy Lab launch my token in under 60 seconds?',
      answer:
        'Deploy Lab uses pre-audited OpenZeppelin v5 smart contract templates and dedicated mainnet RPC nodes across all 6 supported blockchains. Once you pick a token name, choose your network, and select your supply, our automated compiler builds the bytecode, verifies the contract, and broadcasts it on-chain within seconds.',
    },
    {
      question: 'Do I need any coding or smart contract development skills?',
      answer:
        'No coding, no smart contract development, and no technical skills are required. Deploy Lab automatically configures token decimals (18 standard), constructor parameters, and exchange compatibility — just pick a name, choose your network, and we handle the rest.',
    },
    {
      question: 'Which blockchain networks are supported?',
      answer:
        'Deploy Lab supports 6 major blockchains out of the box: Ethereum (ERC-20), BNB Chain / BSC (BEP-20), TRON (TRC-20), Polygon (ERC-20), Arbitrum (L2 Nitro), and Solana (SPL Token).',
    },
    {
      question: 'Are the deployed tokens exchange-listed and tradeable?',
      answer:
        'Yes. Tokens deployed via Deploy Lab follow official exchange-ready standards and are tradeable for 7–90 days (configurable per plan) on major decentralized exchanges including Uniswap, PancakeSwap, Raydium, and SunSwap.',
    },
    {
      question: 'Are the smart contracts audited and verified?',
      answer:
        'Yes. Every contract is CertiK-standard audited, blockchain verified, and comes with automatic Etherscan/BscScan flattened source code verification so holders and exchanges can inspect the contract transparently.',
    },
    {
      question: 'What does the activation fee include?',
      answer:
        'Our competitive low activation fee covers automated Solidity/SPL compilation, security verification, network gas fees, 100% minted supply delivery to your recipient wallet, and 99.8%+ uptime SLA monitoring.',
    },
  ];

  const activePolicy = activePolicyKey ? LEGAL_POLICIES[activePolicyKey] : null;

  return (
    <div className="w-full max-w-5xl mx-auto py-12 space-y-16">
      {/* What Our Users Say */}
      <div id="testimonials">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-heading font-extrabold text-white">
            What Our Users Say
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            14,202+ tokens created across 6 blockchains with 99.8% uptime
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEPLOY_LAB_TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              data-testid={`testimonial-card-${t.avatar.toLowerCase()}`}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center font-mono">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{t.name}</h4>
                    <p className="text-[11px] text-slate-400">{t.title}</p>
                  </div>
                </div>

                <div className="flex text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-300 italic leading-relaxed">
                {t.quote}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div id="faq">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-heading font-extrabold text-white">
            Frequently Asked Questions
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Everything you need to know about automated token deployment on {ownerSettings.brandName || 'Deploy Lab'}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800 overflow-hidden">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="transition-colors">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left focus:outline-none cursor-pointer hover:bg-slate-850/40"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-white pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-400 leading-relaxed animate-fadeIn">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Compliance */}
      <div id="security-compliance" className="pt-4 border-t border-slate-800">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-center mb-6">
          Security & Compliance
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DEPLOY_LAB_COMPLIANCE_BADGES.map((badge, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-center"
            >
              <div className="text-xs font-bold text-white">{badge.title}</div>
              <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">{badge.subtitle}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-10 border-t border-slate-800/80 text-xs text-slate-400 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="font-heading font-bold text-base text-white">
              Deploy Lab
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Smart Deployment Platform
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setActivePolicyKey('terms')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setActivePolicyKey('privacy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setActivePolicyKey('cookies')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Cookie Policy
            </button>
            <button
              type="button"
              onClick={() => setActivePolicyKey('aml')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              AML/KYC Policy
            </button>
          </div>
        </div>

        <div className="space-y-1 text-[11px] text-center sm:text-left text-slate-400">
          <p>
            © 2025 Deploy Lab Technologies Pte. Ltd. (<span className="font-mono text-emerald-400">novadeploy.cc</span>) All rights reserved. Reg. No. 202318472K
          </p>
          <p className="text-slate-500">
            71 Robinson Road, #14-01, Singapore 068895 · Licensed Digital Asset Service Provider
          </p>
        </div>
      </footer>

      {/* Interactive Legal Policy Modal */}
      {activePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-base font-heading font-bold text-white">
                    {activePolicy.title}
                  </h4>
                  <p className="text-[11px] text-slate-400">{activePolicy.updated}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePolicyKey(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              {activePolicy.content.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActivePolicyKey(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

