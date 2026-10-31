'use client';

import React from 'react';
import { ExternalLink, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  onOpenStudio: (sampleId?: string) => void;
  onOpenPenguinInfo: (section?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenStudio,
  onOpenPenguinInfo,
}) => {
  return (
    <footer className="bg-white border-t border-slate-200/90 pt-14 pb-12 text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-100">
          {/* Brand Column (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/penguin-international-logo.png"
                alt="Penguin International — Strategic Intelligence | AI × Human"
                className="h-10 sm:h-12 w-auto max-w-[210px] sm:max-w-[240px] object-contain"
              />
              <div className="h-6 w-px bg-slate-200" />
              <span className="text-base font-black tracking-tight text-slate-800">
                VoxSphere
              </span>
            </div>

            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Founded in 2006, <b>Penguin International</b> powers <b>VoxSphere</b> — an enterprise speech intelligence suite combining state-of-the-art neural transcription models with deep contextual research and human expertise (AI × Human).
            </p>

            <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100 max-w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Fortune 500 Trusted • ISO Certified Knowledge Security</span>
            </div>
          </div>

          {/* Links Column 1: Penguin International Links (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Penguin International
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://www.penguin-international.com/about-us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  <span>About Us</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.penguin-international.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  <span>Contact Us</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.penguin-international.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 font-bold hover:text-teal-900 flex items-center gap-1 transition-colors"
                >
                  <span>Official Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Verified Contact Info (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Headquarters Contact
            </div>
            <div className="text-xs text-slate-500 space-y-2.5 leading-relaxed">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  DLF Corporate Greens, Southern Peripheral Rd, Sector 74A, Gurugram, Haryana 122004, India
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>+91 124-5181075</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>info@penguin-international.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 VoxSphere • Penguin International. All rights reserved. Strategic Intelligence | AI × Human.
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="https://www.penguin-international.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              penguin-international.com
            </a>
            <span>•</span>
            <span className="text-teal-700 font-semibold">Enterprise Encrypted • Confidential</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
