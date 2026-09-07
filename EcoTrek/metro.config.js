const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const extraBlock = [/\/server\/.*/, /\/db\/.*/];
const existing = config.resolver.blockList;
config.resolver.blockList = existing ? [existing, ...extraBlock] : extraBlock;

module.exports = config;
