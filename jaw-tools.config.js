// jaw-tools configuration
module.exports = {
  "directories": {
    "repomixProfiles": ".repomix-profiles",
    "docs": "_docs",
    "prompts": "_docs/prompts",
    "compiledPrompts": "_docs/prompts-compiled"
  },
  "repomix": {
    "defaultProfiles": {
      "full-codebase": {
        "include": "**",
        "ignore": ".git/**,node_modules/**,.next/**,out/**,build/**,coverage/**",
        "style": "xml",
        "compress": false
      },
      "docs-only": {
        "include": "_docs/**",
        "ignore": "_docs/prompts-compiled/**",
        "style": "xml",
        "compress": false
      }
    },
    "env": {}
  },
  "promptCompiler": {
    "variables": {},
    "useNumberedOutputs": true
  },
  "workflow": {
    "sequences": {
      "default": [
        [
          "repomix-profile",
          [
            "run",
            "full-codebase"
          ]
        ],
        [
          "repomix-profile",
          [
            "run",
            "docs-only"
          ]
        ],
        [
          "compile-prompt",
          [
            "_docs/prompts/example.md"
          ]
        ]
      ]
    },
    "defaultSequence": "default"
  },
  "projectScaffolding": {
    "scaffoldTargetRootDir": ".",
    "userGuide": {
      "destinationFileName": "jaw-tools-guide.md"
    }
  }
};
