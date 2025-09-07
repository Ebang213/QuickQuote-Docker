import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePdfExporter } from '../lib/hooks.js';

// Mock jspdf constructor and instance methods
const save = vi.fn();
const text = vi.fn();
const setFont = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({ save, text, setFont })),
  };
});

function PdfHarness(props) {
  const exportPdf = usePdfExporter(props);
  return <button onClick={exportPdf}>export</button>;
}

describe('usePdfExporter', () => {
  beforeEach(() => {
    save.mockClear();
    text.mockClear();
    setFont.mockClear();
  });

  afterEach(() => {
    // nothing to restore here; vi.mock handles lifecycle
  });

  it('creates a PDF with expected heading and saves file', () => {
    render(
      <PdfHarness
        role="Homeowner"
        projectType="Bathroom Remodel"
        quality="Medium"
        location="US"
        sqft={100}
        labor={2500}
        material={4000}
        total={6500}
        currency="USD"
        fmt={new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })}
      />
    );

    fireEvent.click(screen.getByText('export'));

    // Heading was written
    const firstArgList = text.mock.calls.map(args => args[0]);
    expect(firstArgList).toContain('QuickQuote Estimate');

    // Should save with expected filename
    expect(save).toHaveBeenCalledWith('QuickQuote_Estimate.pdf');
  });
});

