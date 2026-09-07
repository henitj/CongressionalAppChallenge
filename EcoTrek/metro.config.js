const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const extraBlock = [/\/server\/.*/, /\/db\/.*/];
const existing = config.resolver.blockList;
if (existing) {
    config.resolver.blockList = Array.isArray(existing)
        ? [...existing, ...extraBlock]
        : [existing, ...extraBlock];
} else {
    config.resolver.blockList = extraBlock;
}

module.exports = config;
