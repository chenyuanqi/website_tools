export default {
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts}',
    '<rootDir>/src/**/*.test.{js,ts}'
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ['js', 'ts', 'json'],
  
  // TypeScript转换
  preset: 'ts-jest',
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@content/(.*)$': '<rootDir>/src/content/$1',
    '^@background/(.*)$': '<rootDir>/src/background/$1'
  },
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/manifest.json'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 清除模拟
  clearMocks: true,
  restoreMocks: true,
  
  // ts-jest配置
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false
    }]
  },
  
  // 全局变量
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
}; 