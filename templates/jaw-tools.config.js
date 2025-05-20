/**
 * jaw-tools configuration
 */

module.exports = {
  // Directory configuration
  directories: {
    repomixProfiles: '.repomix-profiles',
    docs: '_docs',
    prompts: '_docs/prompts',
    compiledPrompts: '_docs/prompts-compiled'
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
  
  // Next-gen sequential commands
  nextGen: {
    commands: [
      ['repomix-profile', ['run', 'full-codebase']],
      ['repomix-profile', ['run', 'docs-only']],
      // Add compile-prompt commands for your templates
      // ['compile-prompt', ['_docs/prompts/example.md']]
    ]
  }
}; 