// src/renderer/pages/help/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  FileText,
  Mail,
  Heart,
  Scale,
  AlertTriangle,
  BookOpen,
  Github,
  ExternalLink,
  Info,
  Copy,
  CheckCircle,
} from 'lucide-react';
import packageJson from '../../../../package.json';

const electron = (window as any).electron;

export function Help() {
  const navigate = useNavigate();
  const [licenseType, setLicenseType] = useState<'gpl' | 'commercial'>('gpl');
  const [licensedTo, setLicensedTo] = useState<string | null>(null);

  useEffect(() => {
    // Check if commercial license is stored
    const stored = localStorage.getItem('meatify_license_type');
    if (stored === 'commercial') {
      setLicenseType('commercial');
      setLicensedTo(localStorage.getItem('meatify_licensed_to'));
    }
  }, []);

  const openExternal = (url: string) => {
    if (electron?.openExternal) {
      electron.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  const version = packageJson.version || 'v1.0.0-beta.2';

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-10 bg-[var(--card-secondary-bg)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={goBack}
            className="p-2 hover:bg-[var(--card-hover-bg)] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Help & Legal Information</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* License Status Card */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-6 shadow-sm hover:border-[var(--accent-gold)]/30 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">License Status</h2>
          </div>
          <div className="bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <span className="text-2xl">📄</span>
              </div>
              <div>
                <p className="text-[var(--accent-gold)] font-semibold flex items-center gap-2">
                  GNU GENERAL PUBLIC LICENSE v3.0
                </p>
                <p className="text-[var(--text-secondary)] text-sm mt-1">
                  Meatify is free software: you can redistribute it and/or modify it under the terms
                  of the GNU General Public License as published by the Free Software Foundation,
                  either version 3 of the License, or (at your option) any later version.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs bg-[var(--accent-green)]/10 text-[var(--accent-green)] px-2.5 py-1 rounded-full border border-[var(--accent-green)]/20">
                    <CheckCircle className="w-3 h-3" />
                    Free to use
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] px-2.5 py-1 rounded-full border border-[var(--accent-gold)]/20">
                    <Copy className="w-3 h-3" />
                    Share modifications
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-2.5 py-1 rounded-full border border-[var(--accent-blue)]/20">
                    <Heart className="w-3 h-3" />
                    Protect software freedom
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GPL License Explanation */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-6 shadow-sm hover:border-[var(--accent-gold)]/30 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">GNU GPL v3.0 – What It Means</h2>
          </div>

          <div className="space-y-3">
            <div className="bg-[var(--background-color)] rounded-lg p-3 border border-[var(--border-color)]">
              <p className="text-[var(--text-secondary)] text-sm">
                <span className="font-semibold text-[var(--accent-gold)]">✅ You CAN:</span>
              </p>
              <ul className="list-disc list-inside text-[var(--text-tertiary)] text-sm ml-2 space-y-1">
                <li>Use Meatify for any purpose, personal or commercial</li>
                <li>Modify the source code to suit your needs</li>
                <li>Share and distribute the software to others</li>
                <li>Use it for your business without paying royalties</li>
              </ul>
            </div>

            <div className="bg-[var(--background-color)] rounded-lg p-3 border border-[var(--border-color)]">
              <p className="text-[var(--text-secondary)] text-sm">
                <span className="font-semibold text-[var(--accent-amber)]">⚠️ You MUST:</span>
              </p>
              <ul className="list-disc list-inside text-[var(--text-tertiary)] text-sm ml-2 space-y-1">
                <li>Include the original license and copyright notice</li>
                <li>
                  Share any modifications or derivative works under the{' '}
                  <span className="text-[var(--accent-gold)]">same GPL license</span>
                </li>
                <li>Disclose the source code if you distribute the software</li>
                <li>State your changes clearly in the source code</li>
              </ul>
            </div>

            <div className="bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20 rounded-lg p-3">
              <p className="text-[var(--text-secondary)] text-sm flex items-start gap-2">
                <span className="text-[var(--accent-red)] font-semibold">❌ You CANNOT:</span>
                <span className="text-[var(--text-tertiary)]">
                  Close-source Meatify or distribute it under a proprietary license.
                  If you need a commercial exception, please contact the author.
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => openExternal('https://www.gnu.org/licenses/gpl-3.0.en.html')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 border border-[var(--accent-gold)]/30 rounded-lg transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Read the full GPL v3.0 License
            </button>
            <button
              onClick={() => openExternal('https://github.com/CyberArcenal/Meatify/blob/main/LICENSE')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </button>
          </div>
        </div>

        {/* Commercial License Inquiry */}
        {licenseType === 'gpl' && (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--accent-amber)]/30 p-6 shadow-sm hover:border-[var(--accent-amber)]/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Need a Commercial Exception?</h3>
                <p className="text-[var(--text-secondary)] text-sm mt-1">
                  If you need to use Meatify in a proprietary product, distribute it without
                  sharing source code, or require dedicated support, you can purchase
                  a commercial exception license.
                </p>
                <button
                  onClick={() => openExternal('mailto:cyberarcenal1@gmail.com?subject=Meatify%20Commercial%20License%20Inquiry')}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-amber)] hover:bg-[var(--accent-amber-hover)] text-[#1a1a1a] rounded-lg transition-colors text-sm font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Contact for Commercial License
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-6 shadow-sm hover:border-[var(--accent-gold)]/30 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]">
              <Scale className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Disclaimer of Warranty & Liability</h2>
          </div>
          <div className="bg-[var(--background-color)] rounded-lg p-4 text-sm font-mono text-[var(--text-tertiary)] border border-[var(--border-color)] leading-relaxed">
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
            INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
            IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
            DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
            ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE.
          </div>
        </div>

        {/* Attribution */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-6 shadow-sm hover:border-[var(--accent-gold)]/30 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]">
              <Heart className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Attribution</h2>
          </div>
          <p className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">Meatify</strong> – Meat Shop POS System
          </p>
          <p className="text-[var(--text-secondary)]">
            Original author:{' '}
            <span className="text-[var(--text-primary)]">CyberArcenal</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={() => openExternal('https://github.com/CyberArcenal/Meatify')}
              className="inline-flex items-center gap-2 text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              github.com/CyberArcenal/Meatify
            </button>
          </div>
        </div>

        {/* Support & Contact */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-6 shadow-sm hover:border-[var(--accent-gold)]/30 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Support & Inquiries</h2>
          </div>
          <p className="text-[var(--text-secondary)]">
            Email:{' '}
            <a
              href="mailto:cyberarcenal1@gmail.com"
              className="text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] transition-colors"
            >
              cyberarcenal1@gmail.com
            </a>
          </p>
          <p className="text-[var(--text-tertiary)] text-sm mt-3">
            For bug reports, feature requests, or general questions, please open an issue on GitHub
            or send an email. Contributions are welcome!
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => openExternal('https://github.com/CyberArcenal/Meatify/issues')}
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-4 flex items-center gap-3 hover:border-[var(--accent-gold)]/50 hover:bg-[var(--card-hover-bg)] transition-all group"
          >
            <div className="p-2 rounded-lg bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[var(--text-primary)]">Report an Issue</p>
              <p className="text-sm text-[var(--text-tertiary)]">Open a GitHub issue</p>
            </div>
            <ExternalLink className="w-4 h-4 ml-auto text-[var(--text-tertiary)] group-hover:text-[var(--accent-gold)] transition-colors" />
          </button>

          <button
            onClick={() => openExternal('https://github.com/CyberArcenal/Meatify#readme')}
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-4 flex items-center gap-3 hover:border-[var(--accent-gold)]/50 hover:bg-[var(--card-hover-bg)] transition-all group"
          >
            <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[var(--text-primary)]">Documentation</p>
              <p className="text-sm text-[var(--text-tertiary)]">Read the full README</p>
            </div>
            <ExternalLink className="w-4 h-4 ml-auto text-[var(--text-tertiary)] group-hover:text-[var(--accent-gold)] transition-colors" />
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-[var(--text-tertiary)] text-sm border-t border-[var(--border-color)] pt-6 mt-4 space-y-2">
          <p>
            Meatify <span className="text-[var(--accent-gold)]">{version}</span>
          </p>
          <p className="flex items-center justify-center gap-1">
            <span className="inline-flex items-center gap-1">
              <span className="text-[var(--accent-gold)]">♥</span>
              Made with passion by CyberArcenal
            </span>
          </p>
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[var(--accent-gold)]/70">
              <Copy className="w-3 h-3" />
              GNU GENERAL PUBLIC LICENSE v3.0
            </span>
            <span className="text-[var(--border-color)]">|</span>
            <span className="text-[var(--text-tertiary)]/70 text-xs">
              Free Software. Share it. Improve it.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}