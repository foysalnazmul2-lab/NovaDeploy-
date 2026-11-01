import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Shield,
  HelpCircle,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { OwnerSettings } from '../types';

interface SupportProps {
  ownerSettings: OwnerSettings;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
}

export function SupportAssistant({ ownerSettings }: SupportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: `Hello! Welcome to ${ownerSettings.brandName} 24/7 DevOps & Deployment Support. How can we assist you with launching your smart contract or cloud application today?`,
      time: 'Just now',
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: query.trim(),
      time: 'Just now',
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Formulate helpful response based on query
    setTimeout(() => {
      let reply = `Thank you for your question. Our automated deployment pipeline compiles with solc 0.8.24 and OpenZeppelin v5 standards. All deployments are verified on block explorers immediately upon transaction confirmation.`;
      const q = query.toLowerCase();

      if (q.includes('liquidity') || q.includes('pancakeswap') || q.includes('uniswap') || q.includes('trade')) {
        reply = `To trade your token, navigate to Uniswap (for ETH/Arbitrum/Polygon) or PancakeSwap (for BNB Chain). Select "Add Liquidity", paste your contract address, and pair your token with USDT or BNB/ETH. Once liquidity is deposited, anyone worldwide can trade your token instantly!`;
      } else if (q.includes('fee') || q.includes('cost') || q.includes('price')) {
        reply = `Our activation fees include all on-chain validator gas costs, compiler server runtime, automated security scanning with Slither/Mythril, and block explorer contract code verification. There are no surprise gas spikes.`;
      } else if (q.includes('solana') || q.includes('spl')) {
        reply = `For Solana deployments, we create an audited SPL Token Mint with associated token accounts and metadata automatically uploaded to decentralized IPFS storage.`;
      } else if (q.includes('refund') || q.includes('safe') || q.includes('audit')) {
        reply = `Security is our highest priority. All smart contracts use standard OpenZeppelin implementations with reentrancy protection. In the event a network failure prevents broadcast, our engine automatically retries or refunds the activation within 24h.`;
      } else if (q.includes('cloud') || q.includes('docker') || q.includes('nextjs')) {
        reply = `For cloud deployments, our engine spins up container clusters with global CDN edge routing and free automatic TLS 1.3 certificates for your custom subdomains.`;
      }

      const botMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: reply,
        time: 'Just now',
      };
      setMessages(prev => [...prev, botMsg]);
    }, 600);
  };

  const quickPrompts = [
    'How do I add liquidity on PancakeSwap?',
    'What does the activation fee include?',
    'Is the contract verified on Etherscan?',
  ];

  return (
    <>
      {/* Floating Action Button (FAB) matching DeployLab */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 group"
        aria-label="Open 24/7 Support Desk"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 uppercase tracking-wider">
          24/7
        </span>
      </button>

      {/* Support Drawer */}
      {isOpen && (
        <div className="fixed bottom-22 right-6 z-50 w-full max-w-[380px] bg-[#0d1424] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col h-[520px]">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{ownerSettings.brandName} Support</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                </h4>
                <p className="text-[10px] text-slate-400">DevOps & Cloud Engineers Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[82%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-xs'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="block text-[9px] text-slate-400 mt-1 text-right">
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompt suggestions */}
          <div className="px-3 py-2 bg-slate-950/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp)}
                className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask a technical or deployment question..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
