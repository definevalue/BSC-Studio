const os = require('os')
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const {
  override,
  addWebpackExternals,
  addWebpackAlias,
  addWebpackPlugin,
} = require('customize-cra')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')

function findWebpackPlugin (plugins, pluginName) {
  return plugins.find(plugin => plugin.constructor.name === pluginName)
}

function overrideProcessEnv (value) {
  return config => {
    const plugin = findWebpackPlugin(config.plugins, 'DefinePlugin')
    const processEnv = plugin.definitions['process.env'] || {}
    plugin.definitions['process.env'] = {
      ...processEnv,
      ...value
    }
    return config
  }
}

function turnOffMangle () {
  return config => {
    config.optimization.minimizer = config.optimization.minimizer.map(
      minimizer => {
        if (minimizer instanceof TerserPlugin) {
          minimizer.options.terserOptions.mangle = false
        }
        return minimizer
      }
    )
    return config
  }
}

function addWasmLoader (options) {
  return config => {
    config.resolve.extensions.push('.wasm')
    config.module.rules.forEach(rule => {
      (rule.oneOf || []).forEach(oneOf => {
        if (oneOf.loader && oneOf.loader.indexOf('file-loader') >= 0) {
          oneOf.exclude.push(/\.wasm$/);
        }
      })
    })
    return config
  }
}

const overrides = [
  addWebpackAlias({
    crypto: 'crypto-browserify',
    '@solidity-parser/parser': '@solidity-parser/parser/dist/index.cjs.js',
    '@': path.resolve(__dirname, 'src/lib'),
    '@obsidians/welcome': `@obsidians/${process.env.BUILD}-welcome`,
    '@obsidians/header': `@obsidians/${process.env.BUILD}-header`,
    '@obsidians/bottombar': `@obsidians/${process.env.BUILD}-bottombar`,
    '@obsidians/compiler': `@obsidians/${process.env.BUILD}-compiler`,
    '@obsidians/project': `@obsidians/${process.env.BUILD}-project`,
    '@obsidians/contract': `@obsidians/${process.env.BUILD}-contract`,
    '@obsidians/explorer': `@obsidians/${process.env.BUILD}-explorer`,
    '@obsidians/network': `@obsidians/${process.env.BUILD}-network`,
    '@obsidians/node': `@obsidians/${process.env.BUILD}-node`,
    '@obsidians/premium-editor': path.resolve(__dirname, process.env.PREMIUM_EDITOR || 'empty.js'),
  }),
  overrideProcessEnv({
    CDN: JSON.stringify(!!process.env.CDN),
    BUILD: JSON.stringify(process.env.BUILD),
    PROJECT: JSON.stringify(process.env.PROJECT || process.env.BUILD),
    PROJECT_NAME: JSON.stringify(process.env.PROJECT_NAME),
    PROJECT_WEB_URL: JSON.stringify('https://bsc.ide.black'),
    PROJECT_DESKTOP_URL: JSON.stringify('https://app.obsidians.io/bsc'),
    PROJECT_GITHUB_REPO: JSON.stringify('https://github.com/ObsidianLabs/BSC-Studio'),
    OS_IS_LINUX: JSON.stringify(os.type() === 'Linux'),
    OS_IS_WINDOWS: JSON.stringify(os.type() === 'Windows_NT'),
    OS_IS_MAC: JSON.stringify(os.type() === 'Darwin'),
    CHAIN_NAME: '"Binance Smart Chain"',
    CHAIN_SHORT_NAME: '"BSC"',
    CHAIN_EXECUTABLE_NAME: '"BSC Node"',
    CHAIN_EXECUTABLE_NAME_IN_LABEL: '"BSC node"',
    COMPILER_NAME: '"Truffle"',
    COMPILER_NAME_IN_LABEL: '"Truffle"',
    COMPILER_EXECUTABLE_NAME: '"truffle"',
    COMPILER_VERSION_KEY: '"truffle"',
    DOCKER_IMAGE_NODE: '"obsidians/bsc"',
    DOCKER_IMAGE_COMPILER: '"obsidians/truffle"',
    ENABLE_AUTH: true,
  }),
  turnOffMangle(),
  addWasmLoader(),
]

if (process.env.CDN) {
  overrides.unshift(addWebpackExternals({
    react: 'React',
    'react-dom': 'ReactDOM',
    'monaco-editor': 'monaco'
  }))
} else {
  overrides.push(addWebpackPlugin(
    new MonacoWebpackPlugin({
      languages: ['json', 'javascript', 'typescript', 'css', 'html', 'markdown', 'c', 'cpp', 'shell']
    })
  ))
}

module.exports = {
  webpack: override(...overrides),
  devServer: function (configFunction) {
    return function (proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);
      config.headers = {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      }
      return config
    }
  },
}
