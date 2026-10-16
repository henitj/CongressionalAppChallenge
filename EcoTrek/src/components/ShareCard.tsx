import React from 'react';

import PostcardSheet from './PostcardSheet';

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  miles: string;
  unit: string;
  trees: number;
  streak: number;
  level: string;
  trails?: number;
};

/**
 * Progress postcard — captured and shared as a real image (with a text
 * fallback), instead of the old text-only summary.
 */
export default function ShareCard({
  visible,
  onClose,
  name,
  miles,
  unit,
  trees,
  streak,
  level,
  trails = 0,
}: Props) {
  const first = name.trim().split(/\s+/)[0] || 'I';
  return (
    <PostcardSheet
      visible={visible}
      onClose={onClose}
      title="Share your progress"
      headline={`${first} is out exploring 🌲`}
      subline={level}
      stats={[
        { value: miles, label: unit },
        { value: String(trees), label: trees === 1 ? 'tree earned' : 'trees earned' },
        { value: String(streak), label: 'week streak' },
        { value: String(trails), label: 'trails done' },
      ]}
      shareMessage={`${first} has covered ${miles} ${unit}, earned ${trees} tree${trees === 1 ? '' : 's'} and finished ${trails} trail${trails === 1 ? '' : 's'} with EcoTrek. 🌲`}
    />
  );
}
