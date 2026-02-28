import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '../../tsconfig.test.json' }],
  },
  testEnvironment: 'node',
  testTimeout: 60000,
  maxWorkers: 1,
  moduleNameMapper: {
    '^@daltaners/(.*)$': '<rootDir>/../../packages/$1/src',
  },
};

export default config;
