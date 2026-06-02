import { useState } from 'react';
import { X } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  referenceId: string | number;
}

export function ShareModal({ isOpen, onClose, label, referenceId }: ShareModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const handleSend = () => {
    // TODO: wire up send logic
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-[520px] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#8fcf74] px-6 py-4 flex items-center justify-center relative">
          <h2 className="text-xl font-bold">Share {label}</h2>
          <button onClick={onClose} className="absolute right-6 hover:opacity-70">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-14 py-10 flex flex-col gap-4">
          <p className="text-center text-base">
            Share a PDF version of {label} (#{referenceId})
          </p>

          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <input
            type="email"
            placeholder="Contact Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />

          <div className="flex justify-center mt-2">
            <button
              onClick={handleSend}
              className="bg-[#2c628d] hover:bg-[#24527a] text-white font-bold py-3 px-16 rounded transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}