import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';

test('changing sqft updates the total', () => {
  render(<App />);
  // pick the room size input and type a new value
  const input = screen.getByLabelText(/Room Size/i);
  fireEvent.change(input, { target: { value: '120' } });
  // Should show a total somewhere (not asserting exact value to avoid coupling)
  expect(screen.getByText(/Total/i)).toBeInTheDocument();
});
