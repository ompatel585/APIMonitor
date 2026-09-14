module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@workers/(.*)$': '<rootDir>/workers/$1',
    '^@health/(.*)$': '<rootDir>/health/$1',
  },
  testEnvironment: 'node',
};
