import { computeEstimate } from '../lib/calc';

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

describe('computeEstimate', () => {
  it('calculates Bathroom Remodel @ 100 sqft, Medium, US', () => {
    const { labor, material, total } = computeEstimate(100, 'Bathroom Remodel', 'Medium', 'US');
    expect(labor).toBe(r2(25 * 100));    // 2500
    expect(material).toBe(r2(40 * 100)); // 4000
    expect(total).toBe(r2(2500 + 4000)); // 6500
  });

  it('throws on invalid square footage', () => {
    expect(() => computeEstimate(0, 'Painting', 'Low', 'US')).toThrow();
    expect(() => computeEstimate(-5, 'Painting', 'Low', 'US')).toThrow();
  });

  it('throws on unknown project type', () => {
    expect(() => computeEstimate(50, 'UnknownThing', 'Low', 'US')).toThrow();
  });

  // --- New tests ---
  it('calculates Ghana multiplier correctly', () => {
    const { total } = computeEstimate(100, 'Bathroom Remodel', 'Medium', 'Ghana');
    // US total @100 sqft = 6500, Ghana multiplier=0.8 => 5200
    expect(total).toBe(5200);
  });

  it('calculates Flooring @ High quality (US)', () => {
    const { labor, material, total } = computeEstimate(60, 'Flooring', 'High', 'US');
    // Labor: 22 * 60 * 1.25 = 1650
    // Material: 35 * 60 * 1.25 = 2625
    expect(labor).toBe(1650);
    expect(material).toBe(2625);
    expect(total).toBe(4275);
  });

  it('rounds consistently to 2 decimals', () => {
    const { total } = computeEstimate(33, 'Painting', 'Low', 'US');
    expect(Number.isFinite(total)).toBe(true);
  });

  it('includes correct currency per location', () => {
    const us = computeEstimate(10, 'Painting', 'Medium', 'US');
    expect(us.currency).toBe('USD');
    const gh = computeEstimate(10, 'Painting', 'Medium', 'Ghana');
    expect(gh.currency).toBe('GHS');
  });
});
