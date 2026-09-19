import React from 'react';
import { render } from '@testing-library/react-native';

import Icon, { ICON_NAMES } from '../components/Icon';

/**
 * The icon set was compacted into a string table. If a name or path
 * dropped out, every screen that uses it would draw a blank.
 */
describe('icon catalogue', () => {
  it('still has the full 76-icon set', () => {
    // 74 originals + `sparkles` (AI chat button) + `image` (trail photos).
    expect(ICON_NAMES).toHaveLength(76);
    expect(new Set(ICON_NAMES).size).toBe(76);
  });

  it('renders every icon, including filled variants', () => {
    const tree = render(
      <>
        {ICON_NAMES.map((name) => (
          <Icon key={name} name={name} />
        ))}
        <Icon name="star" filled />
        <Icon name="pencil" filled />
        <Icon name="shield" filled />
        <Icon name="play" filled />
        <Icon name="stop" filled />
        <Icon name="pause" filled />
      </>
    );
    expect(tree.toJSON()).toBeTruthy();
  });
});
