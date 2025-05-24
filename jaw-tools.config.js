// jaw-tools.config.js for Scenario 3: LLM Audit Command Fails
module.exports = {
  promptAudit: {
    defaultPromptPath: '_docs/prompts/heuristics/', 
    requiredFields: ['docType', 'version', 'lastUpdated'], 
    llmAudit: {
      enabled: true,
      command: 'non_existent_command_xyz_123 --option {PROMPT_FILE}', // This command will fail
      // command: 'node -e "console.error(\\"LLM mock error output\\"); process.exit(1);"', // Alternative for controlled error
      timeoutMs: 2000, // Shorter timeout
      auditPromptTemplate: "Audit this please:\n{RAW_PROMPT_CONTENT}"
    }
  }
};
