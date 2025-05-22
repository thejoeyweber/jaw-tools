/**
 * jaw-tools configuration
 */

module.exports = {
  // Directory configuration
  directories: {
    repomixProfiles: '.repomix-profiles',
    docs: '_docs',
    prompts: '_docs/prompts',
    compiledPrompts: '_docs/prompts-compiled',
    miniPrdTemplatePath: '_docs/project-docs/templates/mini-prd-template.md'
  },
  
  // Repomix configuration
  repomix: {
    defaultProfiles: {
      'full-codebase': {
        include: '**',
        ignore: '.git/**,node_modules/**,.next/**,out/**,build/**,coverage/**,.pnp/**,.pnp.js,.yarn/**,yarn.lock,package-lock.json,.env*,.vercel/**,.DS_Store,*.pem,*.tsbuildinfo,next-env.d.ts,npm-debug.log*,yarn-debug.log*,yarn-error.log*,.github/**,.husky/**,public/**',
        style: 'xml',
        compress: false
      },
      'docs-only': {
        include: '_docs/**',
        ignore: '_docs/prompts-compiled/**',
        style: 'xml',
        compress: false
      }
    },
    env: {
      // Environment variables to pass to repomix
      // NODE_OPTIONS: '--max-old-space-size=8192'
    }
  },
  
  // Prompt compiler configuration
  promptCompiler: {
    variables: {
      // Template variables to replace in prompts
      // PROJECT_NAME: 'My Awesome Project',
      // API_VERSION: 'v1.0'
    },
    useNumberedOutputs: true
  },
  
  // Workflow sequential commands
  workflow: {
    sequences: {
      'default': [
        ['repomix-profile', ['run', 'full-codebase']],
        ['repomix-profile', ['run', 'docs-only']],
        // Add compile-prompt commands for your templates
        // ['compile-prompt', ['_docs/prompts/example.md']]
      ],
      'another_sequence': [
        // Add another sequence of commands here
      ]
    },
    defaultSequence: 'default'
  },
  
  // Project scaffolding configuration
  projectScaffolding: {
    // Target directory in the user's project where 'scaffold_root/_docs' (or other top-level dirs in scaffold_root) contents will be copied.
    // For example, if scaffold_root contains an '_docs' folder, it will be copied into this target.
    // If scaffold_root contains 'file.txt', it will be copied to <project_root>/file.txt if scaffoldTargetRootDir is '.'
    scaffoldTargetRootDir: '.',
    
    userGuide: {
      // Source is always 'templates/README.md' from jaw-tools package.
      // Destination is relative to 'directories.docs'.
      destinationFileName: 'jaw-tools-guide.md'
    }
  }
}; 