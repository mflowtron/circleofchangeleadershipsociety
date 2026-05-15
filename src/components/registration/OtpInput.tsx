import { useRef, useCallback, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into individual digits
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const focusInput = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, length - 1));
    inputRefs.current[clampedIndex]?.focus();
  }, [length]);

  const handleChange = useCallback(
    (index: number, inputValue: string) => {
      // Only allow digits
      const digit = inputValue.replace(/\D/g, '').slice(-1);
      if (!digit) return;

      const newDigits = [...digits];
      newDigits[index] = digit;
      const newValue = newDigits.join('').slice(0, length);
      onChange(newValue);

      // Auto-advance to next input
      if (index < length - 1) {
        focusInput(index + 1);
      }
    },
    [digits, length, onChange, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const newDigits = [...digits];
        if (digits[index]) {
          // Clear current digit
          newDigits[index] = '';
          onChange(newDigits.join(''));
        } else if (index > 0) {
          // Move back and clear previous digit
          newDigits[index - 1] = '';
          onChange(newDigits.join(''));
          focusInput(index - 1);
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [digits, length, onChange, focusInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (pasted) {
        onChange(pasted);
        // Focus the last filled input or the next empty one
        focusInput(Math.min(pasted.length, length - 1));
      }
    },
    [length, onChange, focusInput]
  );

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className="h-14 w-12 rounded-lg border-2 text-center text-2xl font-mono transition-all focus:outline-none disabled:opacity-50"
          style={{
            borderColor: digits[index] ? '#6B1D3A' : '#d4c5b9',
            backgroundColor: disabled ? '#f5f0ea' : '#FFFFFF',
            color: '#2D0A18',
          }}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
