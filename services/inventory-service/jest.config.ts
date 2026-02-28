import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['\\.integration\\.spec\\.ts$'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '../../tsconfig.test.json' }],
  },
  collectCoverageFrom: [
    'modules/**/*.{service,controller,repository}.ts',
    '!modules/**/tests/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@daltaners/(.*)$': '<rootDir>/../../packages/$1/src',
  },
};

export default config;
