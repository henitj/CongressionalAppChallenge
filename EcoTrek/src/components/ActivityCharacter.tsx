import React from 'react';
import { Image, View } from 'react-native';

type ActivityCharacterProps = {
  mode: 'hike' | 'bike';
  size?: number;
  height?: number;
};

// Locally bundled, AI-generated artwork selected for EcoTrek. The transparent
// cutouts keep the whole figure/bicycle visible in either theme, even offline.
const CHARACTERS = {
  hike: require('../../assets/hiker.png'),
  bike: require('../../assets/biker.png'),
};

export default function ActivityCharacter({ mode, size = 64, height = size }: ActivityCharacterProps) {
  return (
    <View accessible={false} pointerEvents="none" style={{ width: size, height }}>
      <Image source={CHARACTERS[mode]} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessible={false} />
    </View>
  );
}
