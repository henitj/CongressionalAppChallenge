/**
 * Render smoke tests.
 *
 * These mount real screens inside the real provider stack. Type checking
 * proves the code compiles; this proves it actually runs — which is what
 * catches undefined reads, bad hook order, and crashes on empty state.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/__tests__/**/*.render.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-maps))',
  ],
};
