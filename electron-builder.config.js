module.exports = {
  appId: 'dev.rishabh.codedash',
  productName: 'CodeDash',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: [
    'out/**/*',
    '!out/**/*.map'
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }]
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }]
  },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    category: 'Development'
  }
}
