'use client';

import React from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Brain,
  BarChart3,
  Search,
  Building2,
  PhoneCall,
  Mail,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';

interface PenguinInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection?: string;
}

export const PenguinInfoModal: React.FC<PenguinInfoModalProps> = ({
  isOpen,
  onClose,
  activeSection = 'about',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200/90 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header with Official Logo */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/penguin-international-logo.png"
              alt="Penguin International Logo"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company Overview (Verified from penguin-international.com) */}
        <div className="space-y-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-teal-50/40 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm sm:text-base">
              <Brain className="w-4 h-4 text-indigo-600" />
              <span>Strategic Intelligence | AI × Human</span>
            </div>
            <p>
              Founded in 2006, <b>Penguin International</b> is a premier strategic and business intelligence firm headquartered in Gurugram, India. We act as a full-spectrum partner for enterprise decision-making, merging artificial intelligence, speech automation, and machine learning with deep contextual research and human expertise.
            </p>
            <p className="text-slate-600 text-xs">
              Trusted by <b>Fortune 500 enterprises</b>, <b>top global management consulting firms</b>, <b>private equity & investment banks</b>, and <b>Global Capability Centers (GCCs)</b> across the US, Europe, and Asia.
            </p>
          </div>

          {/* Official Services Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Core Solutions & Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Strategic Intelligence & Analytics</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Transforming unstructured voice calls, expert interviews, and complex datasets into directional insights.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Data to Dashboards (D2D)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Real-time visualization portals designed for corporate executive tracking and KPI intelligence.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-600" />
                  <span>Research & Knowledge Services</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  In-depth market landscaping, competitive benchmarking, and analyst synthesis.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>GCC Setup & Optimization</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Assisting international corporations in establishing and scaling Global Capability Centers.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Direct Links to Official Website Pages */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Official Corporate Resources
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="https://www.penguin-international.com/about-us"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center justify-between text-xs group"
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-indigo-600">
                    About Us
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Firm heritage, leadership, and AI × Human ethos
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </a>

              <a
                href="https://www.penguin-international.com/services"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 transition-all flex items-center justify-between text-xs group"
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-teal-700">
                    Services
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Strategic intelligence, D2D, and knowledge pods
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 shrink-0" />
              </a>

              <a
                href="https://www.penguin-international.com/case-studies"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/30 transition-all flex items-center justify-between text-xs group"
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-purple-700">
                    Case Studies
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Proven client transformations & success stories
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 shrink-0" />
              </a>

              <a
                href="https://www.penguin-international.com/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex items-center justify-between text-xs group"
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-blue-700">
                    Contact Us
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Gurugram headquarters & global advisory team
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </a>
            </div>
          </div>

          {/* Verified Contact Details Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Headquarters Contact Information</span>
            </div>
            <div className="text-slate-600 space-y-1 text-[11px]">
              <div><b>Address:</b> DLF Corporate Greens, Southern Peripheral Rd, Sector 74A, Gurugram, Haryana 122004, India</div>
              <div><b>Phone:</b> +91 124-5181075 / 0124-5181075</div>
              <div><b>Email:</b> info@penguin-international.com</div>
            </div>
          </div>

          {/* Official Website Banner */}
          <div className="p-4 rounded-2xl bg-[#0f172a] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                Official Website
              </div>
              <div className="text-sm font-semibold text-slate-100">
                www.penguin-international.com
              </div>
            </div>

            <a
              href="https://www.penguin-international.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
            >
              <span>Visit Official Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
