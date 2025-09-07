import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useClampedNumber } from '../lib/hooks.js';

function ClampHarness({ min = 1, max = 100000, initial = 100 }) {
  const { value, onChange } = useClampedNumber(initial, { min, max });
  return (
    <label>
      N
      <input aria-label="n" value={value} onChange={onChange} />
      <output data-testid="value">{String(value)}</output>
    </label>
  );
}

describe('useClampedNumber', () => {
  it('clamps below min', () => {
    render(<ClampHarness />);
    const input = screen.getByLabelText('n');
    const out = screen.getByTestId('value');
    fireEvent.change(input, { target: { value: '0' } });
    expect(out.textContent).toBe('1');
  });

  it('clamps above max', () => {
    render(<ClampHarness />);
    const input = screen.getByLabelText('n');
    const out = screen.getByTestId('value');
    fireEvent.change(input, { target: { value: '100001' } });
    expect(out.textContent).toBe('100000');
  });

  it('sanitizes non-numeric to min', () => {
    render(<ClampHarness />);
    const input = screen.getByLabelText('n');
    const out = screen.getByTestId('value');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(out.textContent).toBe('1');
  });

  it('strips characters and parses number', () => {
    render(<ClampHarness />);
    const input = screen.getByLabelText('n');
    const out = screen.getByTestId('value');
    fireEvent.change(input, { target: { value: '12abc34' } });
    expect(out.textContent).toBe('1234');
  });
});

