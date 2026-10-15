import React from 'react';
import { render } from '@testing-library/react-native';
import TreeGrowthScene from '../components/TreeGrowthScene';
import { TREE_STAGES } from '../constants/treeGrowth';

describe('age-appropriate tree scenery', () => {
  it.each(TREE_STAGES.filter((stage) => stage.minWeeks < 52).map((stage) => stage.id))('%s does not shed autumn leaves', (id) => {
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
