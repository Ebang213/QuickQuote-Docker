import React from 'react';
import { useSelectableOptions } from './hooks.js';

export default function OptionButtons({ options = [], value, onChange, keyboard = true, label }) {
  const { getButtonProps } = useSelectableOptions(options, value, onChange);
  return (
    <div className="flex gap-2" role={keyboard ? 'radiogroup' : undefined} aria-label={label}>
      {options.map((opt, idx) => {
        const selected = value === opt;
        const btnProps = keyboard ? getButtonProps(opt, idx, selected) : {};
        return (
          <button
            key={opt}
            {...btnProps}
            role={keyboard ? 'radio' : undefined}
            aria-checked={keyboard ? selected : undefined}
            aria-pressed={!keyboard ? selected : undefined}
            className={`px-3 py-1.5 rounded border text-sm ${selected ? 'bg-sky-600 text-white border-sky-600' : 'hover:bg-slate-50'}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
