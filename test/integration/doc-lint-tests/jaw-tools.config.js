// Minimal jaw-tools.config.js for integration testing doc-lint
module.exports = {
  // docLint configuration will use defaults from config-manager.js
  // unless overridden here for specific tests.
  // For now, relying on default behavior.
  docLint: {
    // For testing --fix behavior consistently:
    // Ensure 'version' is auto-fixable for missing_version.md test
    // 'lastUpdated' is already in default autoFixFields
    autoFixFields: ['lastUpdated', 'version', 'docType'],
    // Add 'unknown' so that when docType is auto-fixed to 'unknown', it's considered valid.
    validDocTypes: ['mini-prd', 'adr', 'sppg', 'prompt', 'reference', 'unknown'],

  }
};
