const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Merge (not replace) Expo's own auto-detected monorepo watchFolders: `getDefaultConfig`
// already inspects the workspace and watches apps/web + apps/mobile + packages/core +
// root node_modules. We ADD the monorepo root as an explicit anchor per design intent,
// without dropping Expo's defaults — `expo-doctor`'s Metro config check requires our
// watchFolders to be a superset of Expo's defaults on SDK < 56.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), monorepoRoot])]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]
// `core` ships raw-TS via package.json "exports" wildcard subpaths — mirrors
// apps/web's tsconfig `moduleResolution: "bundler"` resolution of the same package.
config.resolver.unstable_enablePackageExports = true

module.exports = config
