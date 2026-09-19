import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { arrangeTileSize, computeLayout, nextEmptySlot, pickWordColumns } from './layout.ts';

describe('computeLayout', () => {
  it('gives phone portrait modest taps and width', () => {
    const layout = computeLayout(390, 844);
    assert.equal(layout.isTablet, false);
    assert.equal(layout.isLandscape, false);
    assert.equal(layout.tap, 56);
    assert.equal(layout.maxWidth, 560);
    assert.equal(layout.titleSize, 30);
  });

  it('enlarges type and taps on iPad portrait', () => {
    const layout = computeLayout(820, 1180);
    assert.equal(layout.isTablet, true);
    assert.equal(layout.isLandscape, false);
    assert.equal(layout.tap, 72);
    assert.equal(layout.tile, 84);
    assert.equal(layout.maxWidth, 820);
    assert.equal(layout.titleSize, 40);
    assert.equal(layout.bodySize, 22);
    assert.ok(layout.buttonLabelSize >= 20);
  });

  it('widens content and stays compact on iPad landscape', () => {
    const layout = computeLayout(1180, 820);
    assert.equal(layout.isTablet, true);
    assert.equal(layout.isLandscape, true);
    assert.equal(layout.compact, false);
    assert.equal(layout.maxWidth, 1040);
    assert.equal(layout.tap, 72);
  });

  it('shrinks chrome a bit on short landscape phones', () => {
    const layout = computeLayout(844, 390);
    assert.equal(layout.isLandscape, true);
    assert.equal(layout.compact, true);
    assert.equal(layout.titleSize, 26);
    assert.equal(layout.maxWidth, 680);
  });
});

describe('arrangeTileSize', () => {
  it('keeps short words large on tablet', () => {
    assert.equal(arrangeTileSize(4, 720, true), 88);
  });

  it('shrinks long words so a row still fits', () => {
    const size = arrangeTileSize(12, 600, true);
    assert.ok(size >= 56);
    assert.ok(size * 6 + 12 * 5 <= 600 + 2);
  });

  it('never goes below the kid-friendly minimum', () => {
    assert.equal(arrangeTileSize(20, 200, true), 56);
    assert.equal(arrangeTileSize(20, 200, false), 44);
  });
});

describe('nextEmptySlot', () => {
  it('prefers the selected empty slot then the first hole', () => {
    assert.equal(nextEmptySlot([1, null, 3], 1), 1);
    assert.equal(nextEmptySlot([1, 2, null], 0), 2);
    assert.equal(nextEmptySlot([1, 2, 3], 0), -1);
  });
});

describe('pickWordColumns', () => {
  it('keeps a single column on phones', () => {
    assert.equal(pickWordColumns(false), 1);
    assert.equal(pickWordColumns(computeLayout(390, 844).isTablet), 1);
  });

  it('uses two columns on tablets in both orientations', () => {
    assert.equal(pickWordColumns(true), 2);
    assert.equal(pickWordColumns(computeLayout(820, 1180).isTablet), 2);
    assert.equal(pickWordColumns(computeLayout(1180, 820).isTablet), 2);
  });
});
