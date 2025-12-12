/**
 * QR Code Modal Component
 * Displays a QR code for a URL so kiosk users can scan with their phone
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  url: string;
  onClose: () => void;
  title?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  url,
  onClose,
  title,
}) => {
  const { t } = useTranslation();
  const displayTitle = title || t('qrCode.scanToVisit');

  // Extract domain for display
  const displayUrl = (() => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  })();

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="qr-modal-title" className="text-2xl font-bold text-gray-900">
            {displayTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code with Logo Overlay */}
        <div className="bg-white p-4 rounded-xl inline-block mb-6 border-2 border-gray-100 relative">
          <QRCodeSVG
            value={url}
            size={220}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#1f2937"
          />
          {/* Logo overlay in center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-full p-2 shadow-sm">
              <img
                src="/assets/symbol-black.svg"
                alt=""
                className="w-10 h-12"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <p className="text-gray-600 text-lg">
            {t('qrCode.scanInstructions')}
          </p>
          <p className="text-blue-600 font-semibold text-lg break-all">
            {displayUrl}
          </p>
        </div>

        {/* Phone icon hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">{t('qrCode.openCamera')}</span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-8 w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
};

export default QRCodeModal;
