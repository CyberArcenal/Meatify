// src/components/UI/LicenseModal.tsx
import React, { useState } from 'react';
import { Shield, ExternalLink, Mail, Check, X } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import packageJson from '../../../../package.json';

interface LicenseModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onCommercialRequest: () => void;
}

const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onAccept,
  onCommercialRequest,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    setScrollTop(scrollTop);
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
  };

  const version = packageJson.version || 'v1.0.0-beta.2';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing by backdrop/ESC
      size="lg"
      minHeight="min-h-[60vh]"
      showCloseButton={false}
      closeOnClickOutside={false}
      closeOnEsc={false}
      preventScroll={true}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-color)]">
          <div className="p-3 rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] flex-shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              GNU General Public License v3.0
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Please read the license terms before using Meatify
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Version {version}
            </p>
          </div>
        </div>

        {/* Scrollable License Content */}
        <div
          className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar"
          style={{ maxHeight: '50vh' }}
          onScroll={handleScroll}
        >
          <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
            <p className="font-semibold text-[var(--text-primary)]">
              Copyright (C) 2024 CyberArcenal
            </p>

            <p>
              This program is free software: you can redistribute it and/or modify
              it under the terms of the GNU General Public License as published by
              the Free Software Foundation, either version 3 of the License, or
              (at your option) any later version.
            </p>

            <p>
              This program is distributed in the hope that it will be useful,
              but WITHOUT ANY WARRANTY; without even the implied warranty of
              MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
              GNU General Public License for more details.
            </p>

            <div className="bg-[var(--background-color)] rounded-lg p-4 border border-[var(--border-color)]">
              <p className="font-semibold text-[var(--text-primary)] text-sm">
                🔑 Key Requirements:
              </p>
              <ul className="list-disc list-inside text-xs space-y-1 mt-1 text-[var(--text-secondary)]">
                <li>You must include the original copyright and license notices</li>
                <li>You must share your modifications under the same GPL license</li>
                <li>You must disclose the source code when distributing the software</li>
                <li>You must state your changes clearly</li>
              </ul>
            </div>

            <p>
              You should have received a copy of the GNU General Public License
              along with this program. If not, see{' '}
              <a
                href="https://www.gnu.org/licenses/gpl-3.0.en.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-gold)] hover:underline"
              >
                https://www.gnu.org/licenses/gpl-3.0.en.html
              </a>.
            </p>

            <div className="bg-[var(--accent-amber)]/5 border border-[var(--accent-amber)]/20 rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                <span className="text-[var(--accent-amber)] font-semibold">💼 Commercial Use:</span>
                <span>
                  If you need to use Meatify in a proprietary product, distribute it
                  without sharing source code, or require dedicated support, you can
                  purchase a commercial exception license.
                </span>
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          {!isAtBottom && (
            <div className="text-center text-xs text-[var(--text-tertiary)] animate-pulse">
              Scroll to read the full license terms
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            onClick={onCommercialRequest}
            className="text-sm text-[var(--accent-amber)] hover:text-[var(--accent-amber-hover)] flex items-center gap-1.5 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Request Commercial Exception
            <ExternalLink className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-3">
            <a
              href="https://www.gnu.org/licenses/gpl-3.0.en.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Read Full License
            </a>
            <Button
              variant="primary"
              size="md"
              onClick={onAccept}
              icon={Check}
              iconPosition="left"
            >
              I Accept the License Terms
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LicenseModal;