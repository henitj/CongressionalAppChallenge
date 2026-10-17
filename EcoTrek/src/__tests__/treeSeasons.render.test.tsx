import React from 'react';
import { render } from '@testing-library/react-native';
import TreeGrowthScene from '../components/TreeGrowthScene';
import { TREE_STAGES } from '../constants/treeGrowth';

describe('age-appropriate tree scenery', () => {
  it.each(TREE_STAGES.filter((stage) => stage.firstImage < 80).map((stage) => stage.id))('%s does not shed autumn leaves', (id) => {
    const view = render(<TreeGrowthScene stageId={id} season="fall" ambient={false} />);
    expect(view.queryByTestId('autumn-leaves')).toBeNull();
    expect(view.queryByTestId('winter-snow')).toBeNull();
  });
  it.each(['mature', 'old', 'sage'] as const)('%s sheds leaves automatically in autumn only', (id) => {
    const view = render(<TreeGrowthScene stageId={id} season="fall" ambient={false} />);
    expect(view.getByTestId('autumn-leaves')).toBeTruthy();
    view.rerender(<TreeGrowthScene stageId={id} season="summer" ambient={false} />);
    expect(view.queryByTestId('autumn-leaves')).toBeNull();
  });
  it.each(TREE_STAGES.map((stage) => stage.id))('%s experiences winter snow scenery', (id) => {
    const view = render(<TreeGrowthScene stageId={id} season="winter" ambient={false} />);
    expect(view.getByTestId('winter-snow')).toBeTruthy();
    expect(view.queryByTestId('autumn-leaves')).toBeNull();
  });
});

describe('natural grove detail', () => {
  it.each(['spring', 'summer', 'fall', 'winter'] as const)('adds four seasonal background trees and grounded detail in %s', (season) => {
    const view = render(<TreeGrowthScene stageId="seed" season={season} ambient={false} />);
    expect(view.getAllByTestId('grove-tree')).toHaveLength(4);
    expect(view.getByTestId('tree-ground-details')).toBeTruthy();
    expect(view.getByTestId('tree-growth-image')).toBeTruthy();
    expect(view.getByLabelText(new RegExp(`New seedling, ${season} scenery`))).toBeTruthy();
  });
});
