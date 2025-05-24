// test/deps_snapshot.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const {
    parsePackageJsonDependencies,
    getRuntimeVersions,
    generateMarkdownOutput,
    generateJsonOutput,
    createSnapshot,
    getAllDependencies // Import for mocking in createSnapshot tests
} = require('../src/deps/snapshot');

// Store original functions
const originalFsReadFileSync = fs.readFileSync;
const originalFsExistsSync = fs.existsSync;
const originalFsMkdirSync = fs.mkdirSync;
const originalFsWriteFileSync = fs.writeFileSync;
const originalExecSync = child_process.execSync;
const originalProcessCwd = process.cwd;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log; // For createSnapshot success logs

let mockExecSyncCalls = [];
let mockConsoleWarnMessages = [];
let mockConsoleErrorMessages = [];
let mockConsoleLogMessages = [];
let mockWriteFileSyncArgs = null;
let mockMkdirSyncArgs = null;

describe('Dependency Snapshot Tests - src/deps/snapshot.js', () => {
    beforeEach(() => {
        // Reset mocks and captured calls for each test
        mockExecSyncCalls = [];
        mockConsoleWarnMessages = [];
        mockConsoleErrorMessages = [];
        mockConsoleLogMessages = [];
        mockWriteFileSyncArgs = null;
        mockMkdirSyncArgs = null;

        fs.readFileSync = originalFsReadFileSync;
        fs.existsSync = originalFsExistsSync;
        fs.mkdirSync = originalFsMkdirSync;
        fs.writeFileSync = originalFsWriteFileSync;
        child_process.execSync = originalExecSync;
        process.cwd = originalProcessCwd; // Restore original cwd

        console.warn = (message) => mockConsoleWarnMessages.push(message);
        console.error = (message) => mockConsoleErrorMessages.push(message);
        console.log = (message) => mockConsoleLogMessages.push(message); // Capture general logs

        // Default mock for process.cwd()
        process.cwd = () => '/test/project/root';

        // Default mock for fs.existsSync (can be overridden in specific tests)
        fs.existsSync = (filePath) => {
            if (filePath === path.join(process.cwd(), 'package.json')) return true; // Assume package.json exists by default
            if (filePath === path.join(process.cwd(), 'package-lock.json')) return true; // Assume npm by default
            if (filePath === path.join(process.cwd(), 'pnpm-lock.yaml')) return false;
            if (filePath === path.join(process.cwd(), 'yarn.lock')) return false;
            // For createSnapshot output file checks, default to false (file does not exist)
            return false; 
        };
    });

    afterEach(() => {
        // Restore all original functions
        fs.readFileSync = originalFsReadFileSync;
        fs.existsSync = originalFsExistsSync;
        fs.mkdirSync = originalFsMkdirSync;
        fs.writeFileSync = originalFsWriteFileSync;
        child_process.execSync = originalExecSync;
        process.cwd = originalProcessCwd;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
    });

    describe('A. parsePackageJsonDependencies() Tests', () => {
        it('1. Valid package.json with all targets', () => {
            fs.readFileSync = (filePath) => {
                if (filePath.endsWith('package.json')) {
                    return JSON.stringify({
                        dependencies: {
                            'next': '14.0.0',
                            '@supabase/supabase-js': '2.0.0',
                            '@clerk/nextjs': '4.0.0', // Clerk variant
                            'drizzle-orm': '0.20.0',
                            'tailwindcss': '3.0.0',
                            'shadcn-ui': '0.4.0' // Assuming it's a direct dep for test
                        },
                        devDependencies: {
                            'typescript': '5.1.0'
                        }
                    });
                }
                throw new Error('File not found by mock');
            };
            const result = parsePackageJsonDependencies();
            assert.deepStrictEqual(result.length, 7, 'Should find 7 dependencies');
            assert.ok(result.find(d => d.tool === 'Next.js' && d.version === '14.0.0' && d.source === 'package.json'));
            assert.ok(result.find(d => d.tool === 'Supabase JS' && d.version === '2.0.0' && d.source === 'package.json'));
            assert.ok(result.find(d => d.tool === 'Clerk (Next.js)' && d.version === '4.0.0' && d.source === 'package.json'));
            assert.ok(result.find(d => d.tool === 'Drizzle ORM' && d.version === '0.20.0' && d.source === 'package.json'));
            assert.ok(result.find(d => d.tool === 'Tailwind CSS' && d.version === '3.0.0' && d.source === 'package.json'));
            assert.ok(result.find(d => d.tool === 'TypeScript' && d.version === '5.1.0' && d.source === 'package.json'));
            assert.ok(result.find(d => d.tool === 'Shadcn UI' && d.version === '0.4.0' && d.source === 'package.json'));
        });

        it('2. Specific Clerk versions preference (@clerk/nextjs)', () => {
            fs.readFileSync = (filePath) => JSON.stringify({
                dependencies: {
                    '@clerk/clerk-react': '4.1.0',
                    '@clerk/nextjs': '4.0.0', // Should be preferred
                    '@clerk/clerk-js': '4.2.0'
                }
            });
            const result = parsePackageJsonDependencies();
            const clerkDep = result.find(d => d.tool.startsWith('Clerk'));
            assert.ok(clerkDep, 'Clerk dependency should be found');
            assert.strictEqual(clerkDep.tool, 'Clerk (Next.js)');
            assert.strictEqual(clerkDep.version, '4.0.0');
        });
         it('2b. Specific Clerk versions preference (@clerk/clerk-react if nextjs missing)', () => {
            fs.readFileSync = (filePath) => JSON.stringify({
                dependencies: {
                    '@clerk/clerk-react': '4.1.0', // Should be preferred now
                    '@clerk/clerk-js': '4.2.0'
                }
            });
            const result = parsePackageJsonDependencies();
            const clerkDep = result.find(d => d.tool.startsWith('Clerk'));
            assert.ok(clerkDep, 'Clerk dependency should be found');
            assert.strictEqual(clerkDep.tool, 'Clerk (React)');
            assert.strictEqual(clerkDep.version, '4.1.0');
        });


        it('3. Missing some dependencies', () => {
            fs.readFileSync = (filePath) => JSON.stringify({
                dependencies: { 'next': '13.0.0' },
                devDependencies: { 'tailwindcss': '2.5.0' }
            });
            const result = parsePackageJsonDependencies();
            assert.strictEqual(result.length, 2);
            assert.ok(result.find(d => d.tool === 'Next.js' && d.version === '13.0.0'));
            assert.ok(result.find(d => d.tool === 'Tailwind CSS' && d.version === '2.5.0'));
        });

        it('4. Empty dependencies and devDependencies', () => {
            fs.readFileSync = (filePath) => JSON.stringify({ dependencies: {}, devDependencies: {} });
            const result = parsePackageJsonDependencies();
            assert.deepStrictEqual(result, []);
        });

        it('5. package.json not found', () => {
            fs.existsSync = (filePath) => filePath !== path.join(process.cwd(), 'package.json'); // Simulate not found
            const result = parsePackageJsonDependencies();
            assert.deepStrictEqual(result, []);
            assert.ok(mockConsoleWarnMessages.some(msg => msg.includes('package.json not found')));
        });

        it('6. Invalid JSON in package.json', () => {
            fs.readFileSync = (filePath) => 'this is not valid json';
            const result = parsePackageJsonDependencies();
            assert.deepStrictEqual(result, []);
            assert.ok(mockConsoleErrorMessages.some(msg => msg.includes('Error reading or parsing package.json')));
        });
    });

    describe('B. getRuntimeVersions() Tests', () => {
        beforeEach(() => {
            child_process.execSync = (command) => {
                mockExecSyncCalls.push(command);
                if (command === 'node -v') return 'v18.0.0';
                if (command === 'npm -v') return '9.0.0';
                if (command === 'pnpm -v') return '8.0.0';
                if (command === 'yarn -v') return '1.22.0';
                if (command === 'tsc -v') return 'Version 5.0.0';
                if (command === 'npx tsc -v') return 'Version 5.0.1'; // Fallback version
                throw new Error(`Command not found by mock: ${command}`);
            };
        });

        it('1. All tools found (npm default)', () => {
            const result = getRuntimeVersions();
            assert.ok(result.find(d => d.tool === 'Node.js' && d.version === 'v18.0.0' && d.source === 'runtime'));
            assert.ok(result.find(d => d.tool === 'npm' && d.version === '9.0.0' && d.source === 'runtime'));
            assert.ok(result.find(d => d.tool === 'TypeScript (tsc)' && d.version === '5.0.0' && d.source === 'cli'));
            assert.deepStrictEqual(mockExecSyncCalls, ['node -v', 'npm -v', 'tsc -v']);
        });

        it('2. Specific package manager (pnpm)', () => {
            fs.existsSync = (filePath) => { // Override for this test
                if (filePath === path.join(process.cwd(), 'package-lock.json')) return false;
                if (filePath === path.join(process.cwd(), 'pnpm-lock.yaml')) return true;
                return false;
            };
            const result = getRuntimeVersions();
            assert.ok(result.find(d => d.tool === 'pnpm' && d.version === '8.0.0' && d.source === 'runtime'));
            assert.ok(!result.find(d => d.tool === 'npm'), 'NPM should not be present if pnpm is found');
            assert.deepStrictEqual(mockExecSyncCalls, ['node -v', 'pnpm -v', 'tsc -v']);
        });


        it('3. tsc -v fails, npx tsc -v succeeds', () => {
            child_process.execSync = (command) => { // Override for this test
                mockExecSyncCalls.push(command);
                if (command === 'node -v') return 'v18.0.0';
                if (command === 'npm -v') return '9.0.0';
                if (command === 'tsc -v') throw new Error('tsc not found');
                if (command === 'npx tsc -v') return 'Version 5.0.1';
                throw new Error('Command not found by mock');
            };
            const result = getRuntimeVersions();
            const tsDep = result.find(d => d.tool === 'TypeScript (tsc)');
            assert.ok(tsDep, 'TypeScript (tsc) should be found via npx fallback');
            assert.strictEqual(tsDep.version, '5.0.1');
            assert.deepStrictEqual(mockExecSyncCalls, ['node -v', 'npm -v', 'tsc -v', 'npx tsc -v']);
        });

        it('4. Command not found (tsc fails completely)', () => {
            child_process.execSync = (command) => { // Override
                mockExecSyncCalls.push(command);
                if (command === 'node -v') return 'v18.0.0';
                if (command === 'npm -v') return '9.0.0';
                if (command === 'tsc -v') throw new Error('tsc not found');
                if (command === 'npx tsc -v') throw new Error('npx tsc also not found');
                throw new Error('Command not found by mock');
            };
            const result = getRuntimeVersions();
            assert.ok(!result.find(d => d.tool === 'TypeScript (tsc)'), 'TypeScript should not be found');
            assert.ok(mockConsoleWarnMessages.some(msg => msg.includes('Could not get TypeScript version')));
        });
        
        it('5. Version parsing (Node.js keeps v, tsc removes "Version ")', () => {
            const result = getRuntimeVersions();
            const nodeDep = result.find(d => d.tool === 'Node.js');
            const tsDep = result.find(d => d.tool === 'TypeScript (tsc)');
            assert.strictEqual(nodeDep.version, 'v18.0.0'); // 'v' is kept
            assert.strictEqual(tsDep.version, '5.0.0'); // "Version " is removed
        });
    });

    describe('C. generateMarkdownOutput() Tests', () => {
        it('1. Sample Data', () => {
            const sampleData = [
                { tool: 'Node.js', version: 'v18.0.0', source: 'runtime' },
                { tool: 'npm', version: '9.0.0', source: 'runtime' },
                { tool: 'Next.js', version: '14.0.1', source: 'package.json' },
            ];
            const result = generateMarkdownOutput(sampleData);
            const today = new Date().toISOString().split('T')[0];
            assert.ok(result.includes(`lastUpdated: ${today}`));
            assert.ok(result.includes('| Tool / Library | Version   | Source         |'));
            assert.ok(result.includes('| Node.js | v18.0.0 | runtime |'));
            assert.ok(result.includes('| npm | 9.0.0 | runtime |'));
            assert.ok(result.includes('| Next.js | 14.0.1 | package.json |'));
            assert.ok(result.includes('> This snapshot is auto-generated'));
        });

        it('2. Empty Data', () => {
            const result = generateMarkdownOutput([]);
            const today = new Date().toISOString().split('T')[0];
            assert.ok(result.includes(`lastUpdated: ${today}`), "Frontmatter missing or date wrong");
            assert.ok(result.includes('| Tool / Library | Version   | Source         |'), "Table header missing");
            // Check that there are no data rows between header and footer
            const tableContentStartIndex = result.indexOf('Source         |') + 'Source         |'.length;
            const tableContentEndIndex = result.indexOf('> This snapshot is auto-generated');
            const tableContent = result.substring(tableContentStartIndex, tableContentEndIndex).trim();
            assert.strictEqual(tableContent, '', "Table should be empty or contain only whitespace between header and footer");
            assert.ok(result.includes('> This snapshot is auto-generated'), "Footer quote missing");
        });
    });

    describe('D. generateJsonOutput() Tests', () => {
        it('1. Sample Data (Node.js v stripping, key mapping)', () => {
            const sampleData = [
                { tool: 'Node.js', version: 'v20.1.1', source: 'runtime' },
                { tool: 'npm', version: '10.0.0', source: 'runtime' },
                { tool: 'Next.js', version: '14.0.2', source: 'package.json' },
                { tool: 'Clerk (Next.js)', version: '4.5.0', source: 'package.json' },
                { tool: 'TypeScript', version: '5.2.0', source: 'package.json' },
            ];
            const result = generateJsonOutput(sampleData);
            assert.deepStrictEqual(result, {
                node: '20.1.1', // 'v' stripped
                npm: '10.0.0',
                next: '14.0.2',
                clerk: '4.5.0',
                typescript: '5.2.0'
            });
        });

        it('2. Package Manager Key (pnpm)', () => {
            const sampleData = [{ tool: 'pnpm', version: '8.5.0', source: 'runtime' }];
            const result = generateJsonOutput(sampleData);
            assert.deepStrictEqual(result, { pnpm: '8.5.0' });
        });
         it('2b. Package Manager Key (Yarn)', () => {
            const sampleData = [{ tool: 'Yarn', version: '1.22.19', source: 'runtime' }];
            const result = generateJsonOutput(sampleData);
            assert.deepStrictEqual(result, { yarn: '1.22.19' });
        });

        it('3. Empty Data', () => {
            const result = generateJsonOutput([]);
            assert.deepStrictEqual(result, {});
        });
    });
    
    // Mock getAllDependencies for createSnapshot tests
    const mockGetAllDependencies = (data) => {
        // This is a simple way to replace the module's getAllDependencies for these tests
        // A more sophisticated approach might involve jest.mock or proxyquire
        require('../src/deps/snapshot').getAllDependencies = () => data;
    };
    const originalGetAllDependencies = getAllDependencies; // Store to restore

    describe('E. createSnapshot() Tests', () => {
        beforeEach(() => {
            // Restore original getAllDependencies before each test in this block, then mock if needed
            require('../src/deps/snapshot').getAllDependencies = originalGetAllDependencies;

            fs.existsSync = (filePath) => false; // Default: output file does not exist
            fs.mkdirSync = (dirPath, options) => { mockMkdirSyncArgs = { dirPath, options }; };
            fs.writeFileSync = (filePath, content) => { mockWriteFileSyncArgs = { filePath, content };};
        });
        
        afterEach(() => {
            require('../src/deps/snapshot').getAllDependencies = originalGetAllDependencies; // Restore
        });

        const sampleDepData = [{ tool: 'Node.js', version: 'v18', source: 'runtime' }];

        it('1. Successful Markdown Creation (Default Path)', () => {
            mockGetAllDependencies(sampleDepData);
            const result = createSnapshot({ format: 'table' });
            assert.strictEqual(result, true);
            assert.ok(mockWriteFileSyncArgs, "writeFileSync was not called");
            assert.strictEqual(mockWriteFileSyncArgs.filePath, path.resolve(process.cwd(), '_docs/project-files/references/stack-docs.md'));
            assert.ok(mockWriteFileSyncArgs.content.includes('# Project Stack Snapshot'));
            assert.ok(mockConsoleLogMessages.some(msg => msg.includes('Snapshot successfully written to')));
        });

        it('2. Successful JSON Creation (Custom Path with auto-extension)', () => {
            mockGetAllDependencies(sampleDepData);
            const result = createSnapshot({ format: 'json', out: 'custom/path/my-snapshot' });
            assert.strictEqual(result, true);
            assert.ok(mockWriteFileSyncArgs, "writeFileSync was not called");
            assert.strictEqual(mockWriteFileSyncArgs.filePath, path.resolve(process.cwd(), 'custom/path/my-snapshot.json'));
            const parsedContent = JSON.parse(mockWriteFileSyncArgs.content);
            assert.deepStrictEqual(parsedContent, { node: '18' });
            assert.ok(mockMkdirSyncArgs, "mkdirSync should have been called for custom path");
            assert.strictEqual(mockMkdirSyncArgs.dirPath, path.resolve(process.cwd(), 'custom/path'));
        });

        it('3. Successful JSON Creation (Custom Path with existing .json extension)', () => {
            mockGetAllDependencies(sampleDepData);
            const result = createSnapshot({ format: 'json', out: 'custom/path/my-snapshot.json' });
            assert.strictEqual(result, true);
            assert.ok(mockWriteFileSyncArgs, "writeFileSync was not called");
            assert.strictEqual(mockWriteFileSyncArgs.filePath, path.resolve(process.cwd(), 'custom/path/my-snapshot.json'));
        });
        
        it('3b. Successful Markdown Creation (Custom Path with existing .md extension)', () => {
            mockGetAllDependencies(sampleDepData);
            const result = createSnapshot({ format: 'table', out: 'custom/another.md' });
            assert.strictEqual(result, true);
            assert.ok(mockWriteFileSyncArgs, "writeFileSync was not called");
            assert.strictEqual(mockWriteFileSyncArgs.filePath, path.resolve(process.cwd(), 'custom/another.md'));
        });


        it('4. Overwrite Prevention', () => {
            mockGetAllDependencies(sampleDepData);
            fs.existsSync = (filePath) => true; // Simulate output file DOES exist
            
            const result = createSnapshot({ format: 'table' });
            assert.strictEqual(result, false);
            assert.strictEqual(mockWriteFileSyncArgs, null, "writeFileSync should not have been called");
            assert.ok(mockConsoleErrorMessages.some(msg => msg.includes('Output file already exists')));
        });

        it('5. getAllDependencies returns empty', () => {
            mockGetAllDependencies([]); // Simulate no dependencies found
            const result = createSnapshot({});
            assert.strictEqual(result, false);
            assert.strictEqual(mockWriteFileSyncArgs, null, "writeFileSync should not have been called");
            assert.ok(mockConsoleWarnMessages.some(msg => msg.includes('No dependency data collected')));
        });

        it('6. fs.writeFileSync throws error', () => {
            mockGetAllDependencies(sampleDepData);
            fs.writeFileSync = (filePath, content) => {
                throw new Error('Disk full');
            };
            const result = createSnapshot({});
            assert.strictEqual(result, false);
            assert.ok(mockConsoleErrorMessages.some(msg => msg.includes('Error writing snapshot') && msg.includes('Disk full')));
        });
    });
});
