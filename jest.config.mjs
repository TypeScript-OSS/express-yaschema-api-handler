export default {
  preset: 'ts-jest',
  extensionsToTreatAsEsm: ['.ts'],
  coverageReporters: ['text', 'html'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: true
    }
  },
  moduleNameMapper: {
    'ipaddr\\.js': '$0',
    '(.+)\\.js': '$1'
  },
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 70,
      statements: 70
    }
  }
};
