// test/e2e/jaw-tools.config.js
module.exports = {
  workflows: {
    'e2e-echo': [
      { command: 'echo "E2E test message: $E2E_VAR"', description: 'Echoes a var' }
    ],
    'e2e-dry-run-test': [
      { command: 'echo "This should not execute in dry run"', description: 'Dry run step' }
    ],
    'e2e-fail-no-continue': [
      { command: 'node -e "process.exit(1);"', description: 'Failing step' }
    ],
    'e2e-fail-with-continue': [
      { command: 'node -e "process.exit(1);"', description: 'Failing step with continue', continueOnError: true },
      { command: 'echo "Second step after continue"', description: 'Second step' }
    ]
  }
};
