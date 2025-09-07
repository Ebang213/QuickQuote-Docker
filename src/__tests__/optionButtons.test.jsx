import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OptionButtons from '../lib/OptionButtons.jsx';

describe('OptionButtons', () => {
  it('renders selected state with correct classes and aria', () => {
    const onChange = vi.fn();
    render(<OptionButtons options={['Low','Medium','High']} value={'Medium'} onChange={onChange} />);
    const group = screen.getByRole('radiogroup');
    expect(group).toBeInTheDocument();
    const medium = screen.getByRole('radio', { name: 'Medium' });
    expect(medium).toHaveAttribute('aria-checked', 'true');
    expect(medium.className).toMatch(/bg-sky-600/);
    const low = screen.getByRole('radio', { name: 'Low' });
    expect(low).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking an option triggers onChange with value', () => {
    const onChange = vi.fn();
    render(<OptionButtons options={['Low','Medium','High']} value={'Low'} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'High' }));
    expect(onChange).toHaveBeenCalledWith('High');
  });

  it('keyboard arrows move selection and call onChange', () => {
    const onChange = vi.fn();
    render(<OptionButtons options={['Low','Medium','High']} value={'Medium'} onChange={onChange} />);
    const medium = screen.getByRole('radio', { name: 'Medium' });
    fireEvent.keyDown(medium, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('High');
    fireEvent.keyDown(medium, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('Low');
  });
});

