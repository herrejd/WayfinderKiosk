/**
 * Keyboard Context
 * Manages virtual keyboard state globally across the application
 * Supports both React-controlled inputs and native DOM inputs (e.g., SDK inputs)
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface KeyboardContextType {
  isVisible: boolean;
  inputValue: string;
  showKeyboard: (input: HTMLInputElement, value: string) => void;
  hideKeyboard: () => void;
  updateValue: (value: string) => void;
}

const KeyboardContext = createContext<KeyboardContextType | null>(null);

// Selectors for inputs that should trigger the keyboard
const KEYBOARD_INPUT_SELECTORS = [
  'input[data-cy="SearchNavInput"]',           // SDK map search
  'input[placeholder*="Search Departures"]',   // SDK departures search
  'input[data-keyboard="true"]',               // Custom attribute for opt-in
];

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  const showKeyboard = useCallback((input: HTMLInputElement, value: string) => {
    activeInputRef.current = input;
    setInputValue(value);
    setIsVisible(true);
  }, []);

  const hideKeyboard = useCallback(() => {
    setIsVisible(false);
    activeInputRef.current = null;
  }, []);

  const updateValue = useCallback((value: string) => {
    setInputValue(value);
    // Update the actual input element
    if (activeInputRef.current) {
      const input = activeInputRef.current;
      // Use native setter to properly trigger React/SDK change handlers
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

  // Global focus listener for SDK inputs
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;

      if (target.tagName !== 'INPUT') return;

      const input = target as HTMLInputElement;

      // Check if this input matches any of our selectors
      const shouldShowKeyboard = KEYBOARD_INPUT_SELECTORS.some(selector => {
        try {
          return input.matches(selector);
        } catch {
          return false;
        }
      });

      if (shouldShowKeyboard) {
        showKeyboard(input, input.value);
      }
    };

    // Listen for focus events on the document (capture phase to catch SDK inputs)
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [showKeyboard]);

  return (
    <KeyboardContext.Provider
      value={{
        isVisible,
        inputValue,
        showKeyboard,
        hideKeyboard,
        updateValue,
      }}
    >
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
}

/**
 * Hook to connect a React input field to the virtual keyboard
 */
export function useKeyboardInput(
  inputRef: React.RefObject<HTMLInputElement | null>,
  value: string,
  onChange: (value: string) => void
) {
  const { showKeyboard, isVisible, inputValue } = useKeyboard();
  const lastValueRef = useRef(value);

  const handleFocus = useCallback(() => {
    if (inputRef.current) {
      showKeyboard(inputRef.current, value);
    }
  }, [showKeyboard, inputRef, value]);

  // Sync keyboard value changes back to the input's onChange
  useEffect(() => {
    if (isVisible && inputRef.current && inputValue !== lastValueRef.current) {
      lastValueRef.current = inputValue;
      onChange(inputValue);
    }
  }, [isVisible, inputRef, inputValue, onChange]);

  // Update lastValueRef when external value changes
  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  return { handleFocus };
}
