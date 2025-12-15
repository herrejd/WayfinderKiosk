/**
 * Virtual Keyboard Component
 * On-screen QWERTY keyboard for touch kiosk input
 * Supports localization for EN, ES, FR
 */

import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyboard } from '@/context/KeyboardContext';

type KeyboardLayout = 'letters' | 'numbers';

// QWERTY keyboard layout
const LETTER_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// Number and symbol layout
const NUMBER_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
  ['.', ',', '?', '!', "'", '#', '%', '*'],
];

interface KeyButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

const KeyButton = memo(function KeyButton({
  label,
  onClick,
  className = '',
  ariaLabel
}: KeyButtonProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel || label}
      tabIndex={0}
      className={`
        flex items-center justify-center
        bg-white hover:bg-gray-50 active:bg-gray-100
        border border-gray-300 rounded-lg
        text-gray-800 font-semibold
        transition-all duration-150
        min-h-[56px] min-w-[48px]
        shadow-md hover:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      {label}
    </button>
  );
});

export const VirtualKeyboard = memo(function VirtualKeyboard() {
  const { t } = useTranslation();
  const { isVisible, inputValue, updateValue, hideKeyboard } = useKeyboard();
  const [layout, setLayout] = useState<KeyboardLayout>('letters');
  const [isShift, setIsShift] = useState(false);

  const handleKeyPress = useCallback((key: string) => {
    const newValue = inputValue + (isShift ? key.toUpperCase() : key.toLowerCase());
    updateValue(newValue);
    if (isShift) setIsShift(false);
  }, [inputValue, updateValue, isShift]);

  const handleBackspace = useCallback(() => {
    updateValue(inputValue.slice(0, -1));
  }, [inputValue, updateValue]);

  const handleSpace = useCallback(() => {
    updateValue(inputValue + ' ');
  }, [inputValue, updateValue]);

  const handleDone = useCallback(() => {
    hideKeyboard();
  }, [hideKeyboard]);

  const toggleLayout = useCallback(() => {
    setLayout(prev => prev === 'letters' ? 'numbers' : 'letters');
  }, []);

  const toggleShift = useCallback(() => {
    setIsShift(prev => !prev);
  }, []);

  if (!isVisible) return null;

  const rows = layout === 'letters' ? LETTER_ROWS : NUMBER_ROWS;

  return (
    <>
      {/* Backdrop - click to dismiss keyboard */}
      <div
        className="fixed inset-0 z-40"
        onClick={hideKeyboard}
        aria-hidden="true"
      />

      {/* Keyboard Modal */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-gray-300 rounded-2xl shadow-2xl max-w-2xl w-auto"
        role="application"
        aria-label={t('keyboard.title')}
      >
        {/* Keyboard rows */}
        <div className="p-4 space-y-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {/* Shift key on last letter row */}
            {layout === 'letters' && rowIndex === 2 && (
              <KeyButton
                label={isShift ? '⬆' : '⇧'}
                onClick={toggleShift}
                ariaLabel={t('keyboard.shift')}
                className={`w-16 text-xl ${isShift ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-800' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-800'}`}
              />
            )}

            {row.map((key) => (
              <KeyButton
                key={key}
                label={layout === 'letters' ? (isShift ? key : key.toLowerCase()) : key}
                onClick={() => handleKeyPress(key)}
                className="w-12 text-xl"
              />
            ))}

            {/* Backspace on last row */}
            {rowIndex === 2 && (
              <KeyButton
                label="⌫"
                onClick={handleBackspace}
                ariaLabel={t('keyboard.backspace')}
                className="w-16 text-xl bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-800"
              />
            )}
          </div>
        ))}

        {/* Bottom row: layout toggle, space, done */}
        <div className="flex justify-center gap-1.5 mt-2">
          <KeyButton
            label={layout === 'letters' ? '123' : 'ABC'}
            onClick={toggleLayout}
            ariaLabel={layout === 'letters' ? t('keyboard.numbers') : t('keyboard.letters')}
            className="w-20 text-lg bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-800"
          />

          <KeyButton
            label={t('keyboard.space')}
            onClick={handleSpace}
            ariaLabel={t('keyboard.space')}
            className="flex-1 max-w-md text-lg bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-800"
          />

          <KeyButton
            label={t('keyboard.done')}
            onClick={handleDone}
            ariaLabel={t('keyboard.done')}
            className="w-24 text-lg bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-800"
          />
        </div>
        </div>
      </div>
    </>
  );
});

export default VirtualKeyboard;
