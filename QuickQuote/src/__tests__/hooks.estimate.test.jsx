import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useEstimate } from '../lib/hooks.js';

function EstimateHarness({ sqft, projectType = 'Painting', quality = 'Low', location = 'US' }) {
  const { labor, material, total, currency, error } = useEstimate(sqft, projectType, quality, location);
  return (
    <div>
      <div data-testid="labor">{labor}</div>
      <div data-testid="material">{material}</div>
      <div data-testid="total">{total}</div>
      <div data-testid="currency">{currency}</div>
      <div data-testid="error">{error}</div>
    </div>
  );
}

describe('useEstimate', () => {
  it('returns error for invalid sqft', () => {
    render(<EstimateHarness sqft={0} />);
    expect(screen.getByTestId('error').textContent).toMatch(/Invalid room size/i);
  });

  it('returns error for unknown project type', () => {
    render(<EstimateHarness sqft={50} projectType="UnknownThing" />);
    expect(screen.getByTestId('error').textContent).toMatch(/Unknown project type/i);
  });

  it('propagates currency from computeEstimate (Ghana)', () => {
    render(<EstimateHarness sqft={100} projectType="Bathroom Remodel" quality="Medium" location="Ghana" />);
    expect(screen.getByTestId('error').textContent).toBe('');
    expect(screen.getByTestId('currency').textContent).toBe('GHS');
  });
});

