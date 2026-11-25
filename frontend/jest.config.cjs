module.exports = {
  testEnvironment: "jsdom",
  transform: { "^.+\\.[tj]sx?$": "babel-jest" },
  moduleNameMapper: { "\\.module\\.css$": "identity-obj-proxy" },
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
};
