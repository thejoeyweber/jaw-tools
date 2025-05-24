// src/deps/snapshot.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Parses package.json to find versions of specified dependencies.
 * @returns {Array<object>} Array of found dependency objects.
 */
function parsePackageJsonDependencies() {
    const results = [];
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    let packageJson;
    try {
        if (!fs.existsSync(packageJsonPath)) {
            console.warn(`⚠️ Warning: package.json not found at ${packageJsonPath}. Skipping package dependency checks.`);
            return results;
        }
        const fileContent = fs.readFileSync(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(fileContent);
    } catch (error) {
        console.error(`❌ Error reading or parsing package.json: ${error.message}. Skipping package dependency checks.`);
        return results;
    }

    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    const targetDependencies = [
        { keyPath: 'next', displayName: 'Next.js' },
        { keyPath: '@supabase/supabase-js', displayName: 'Supabase JS' },
        // Clerk will be handled separately due to multiple possible packages
        { keyPath: 'drizzle-orm', displayName: 'Drizzle ORM' },
        { keyPath: 'tailwindcss', displayName: 'Tailwind CSS' },
        { keyPath: 'typescript', displayName: 'TypeScript' },
        { keyPath: 'shadcn-ui', displayName: 'Shadcn UI' }, // Attempt to find shadcn-ui
    ];

    for (const dep of targetDependencies) {
        const version = dependencies[dep.keyPath] || devDependencies[dep.keyPath];
        if (version) {
            results.push({ tool: dep.displayName, version, source: 'package.json' });
        }
    }

    // Handle Clerk separately
    const clerkPackages = [
        { keyPath: '@clerk/nextjs', displayName: 'Clerk (Next.js)' },
        { keyPath: '@clerk/clerk-react', displayName: 'Clerk (React)' },
        { keyPath: '@clerk/clerk-js', displayName: 'Clerk JS' }
    ];
    let clerkFound = false;
    for (const pkg of clerkPackages) {
        const version = dependencies[pkg.keyPath] || devDependencies[pkg.keyPath];
        if (version && !clerkFound) {
            results.push({ tool: pkg.displayName, version, source: 'package.json' });
            clerkFound = true;
            // As per requirement, break after finding the first one.
            // If we need all, remove clerkFound and break.
            break; 
        }
    }
     if (!clerkFound) {
        // Optional: console.warn("⚠️ Warning: No Clerk package found among @clerk/nextjs, @clerk/clerk-react, @clerk/clerk-js.");
    }
    if (!results.some(r => r.tool === 'Shadcn UI')) {
        // Optional: console.warn("⚠️ Warning: 'shadcn-ui' package not found in package.json.");
    }


    return results;
}

/**
 * Executes CLI commands to get versions of runtime tools.
 * @returns {Array<object>} Array of found runtime version objects.
 */
function getRuntimeVersions() {
    const results = [];

    // Node.js
    try {
        const nodeVersion = execSync('node -v', { encoding: 'utf-8' }).trim();
        results.push({ tool: 'Node.js', version: nodeVersion, source: 'runtime' });
    } catch (error) {
        console.warn(`⚠️ Warning: Could not get Node.js version (node -v): ${error.message}`);
    }

    // Package Manager (npm, pnpm, yarn)
    let pmVersionCmd = null;
    let pmName = null;
    if (fs.existsSync(path.join(process.cwd(), 'package-lock.json'))) {
        pmVersionCmd = 'npm -v';
        pmName = 'npm';
    } else if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) {
        pmVersionCmd = 'pnpm -v';
        pmName = 'pnpm';
    } else if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) {
        pmVersionCmd = 'yarn -v';
        pmName = 'Yarn';
    } else {
        pmVersionCmd = 'npm -v'; // Default to npm if no lockfile found
        pmName = 'npm';
        console.warn('⚠️ Warning: No lockfile found (package-lock.json, pnpm-lock.yaml, yarn.lock). Defaulting to check npm version.');
    }

    if (pmVersionCmd) {
        try {
            const pmVersion = execSync(pmVersionCmd, { encoding: 'utf-8' }).trim();
            results.push({ tool: pmName, version: pmVersion, source: 'runtime' });
        } catch (error) {
            console.warn(`⚠️ Warning: Could not get ${pmName} version (${pmVersionCmd}): ${error.message}`);
        }
    }

    // TypeScript (tsc)
    let tscVersion = null;
    try {
        tscVersion = execSync('tsc -v', { encoding: 'utf-8' }).trim();
    } catch (error) {
        // console.warn(`⚠️ Info: 'tsc -v' failed. Trying 'npx tsc -v'. Error: ${error.message}`);
        try {
            tscVersion = execSync('npx tsc -v', { encoding: 'utf-8' }).trim();
        } catch (npxError) {
            console.warn(`⚠️ Warning: Could not get TypeScript version (tsc -v or npx tsc -v): ${npxError.message}`);
        }
    }
    if (tscVersion) {
        // Example output: "Version 5.3.3" - clean it up.
        const versionMatch = tscVersion.match(/Version\s*([0-9.]+)/i);
        results.push({ tool: 'TypeScript (tsc)', version: versionMatch ? versionMatch[1] : tscVersion, source: 'cli' });
    }
    
    return results;
}

/**
 * Orchestrates calls to parse dependencies from package.json and runtime commands.
 * Combines results and handles potential duplicates.
 * @param {object} options - For future use (e.g., --source flag).
 * @returns {Array<object>} Combined and de-duplicated array of dependency objects.
 */
function getAllDependencies(options = {}) {
    const packageDeps = parsePackageJsonDependencies();
    const runtimeDeps = getRuntimeVersions();
    
    const combinedResults = [...packageDeps, ...runtimeDeps];
    const finalResults = [];
    const toolTracker = new Set(); // To track tools already added

    // Order of preference for tools:
    // 1. Node.js (runtime)
    // 2. npm/pnpm/yarn (runtime)
    // 3. TypeScript (package.json OR cli - prefer package.json)
    // 4. Next.js (package.json)
    // 5. Supabase JS (package.json)
    // 6. Drizzle ORM (package.json)
    // 7. Tailwind CSS (package.json)
    // 8. Shadcn UI (package.json)
    // 9. Clerk (package.json)

    const toolOrder = [
        'Node.js', 
        'npm', 'pnpm', 'Yarn', // Package managers
        'TypeScript', // This will be preferred from package.json
        'Next.js', 
        'Supabase JS', 
        'Clerk (Next.js)', 'Clerk (React)', 'Clerk JS', // Clerk variants
        'Drizzle ORM', 
        'Tailwind CSS', 
        'Shadcn UI',
        'TypeScript (tsc)' // Fallback for TypeScript if not in package.json
    ];

    for (const toolName of toolOrder) {
        // Handle TypeScript special case: prefer package.json version
        if (toolName === 'TypeScript') {
            const tsPackage = combinedResults.find(dep => dep.tool === 'TypeScript' && dep.source === 'package.json');
            if (tsPackage && !toolTracker.has('TypeScript')) {
                finalResults.push(tsPackage);
                toolTracker.add('TypeScript'); // Mark TypeScript as added
            }
            continue; // Move to next tool in order
        }
        if (toolName === 'TypeScript (tsc)') {
             if (!toolTracker.has('TypeScript')) { // Only add tsc if no package.json TypeScript
                const tsCli = combinedResults.find(dep => dep.tool === 'TypeScript (tsc)');
                if (tsCli) {
                    // Rename to just "TypeScript" for final output consistency if package.json one not found
                    finalResults.push({ tool: 'TypeScript', version: tsCli.version, source: tsCli.source });
                    toolTracker.add('TypeScript'); // Mark TypeScript as added
                }
            }
            continue;
        }

        // Handle general case
        const foundDep = combinedResults.find(dep => dep.tool === toolName);
        if (foundDep && !toolTracker.has(toolName)) {
            // For Clerk, ensure only one variant is added.
            if (toolName.startsWith('Clerk')) {
                if (!toolTracker.has('Clerk')) { // Check if any Clerk variant is already added
                    finalResults.push(foundDep);
                    toolTracker.add('Clerk'); // Generic "Clerk" tracker
                    toolTracker.add(toolName); // Specific variant tracker
                }
            } else {
                finalResults.push(foundDep);
                toolTracker.add(toolName);
            }
        }
    }
    
    // Add any remaining dependencies not in the preferred order but found
    // (e.g., if a new package manager was detected or other unexpected tools)
    for (const dep of combinedResults) {
        const alreadyAdded = finalResults.some(finalDep => finalDep.tool === dep.tool || (dep.tool.startsWith('Clerk') && finalDep.tool.startsWith('Clerk')));
         if (dep.tool === 'TypeScript (tsc)' && finalResults.some(fr => fr.tool === 'TypeScript')) {
            // Skip if TypeScript (from package.json or already processed tsc) is present
        } else if (!alreadyAdded) {
            finalResults.push(dep);
        }
    }


    return finalResults;
}

/**
 * Generates a Markdown formatted string for the dependency snapshot.
 * @param {Array<object>} dependenciesData - Array of dependency objects.
 * @returns {string} Markdown formatted string.
 */
function generateMarkdownOutput(dependenciesData) {
    const today = new Date().toISOString().split('T')[0];
    const frontMatter = `---
docType: reference
version: 1.0.0
lastUpdated: ${today}
---
`;

    const tableHeader = `
# Project Stack Snapshot

| Tool / Library | Version   | Source         |
|----------------|-----------|----------------|
`;

    let tableRows = '';
    for (const dep of dependenciesData) {
        tableRows += `| ${dep.tool} | ${dep.version || 'N/A'} | ${dep.source || 'N/A'} |\n`;
    }

    const footerQuote = `
> This snapshot is auto-generated for reproducibility. Add manual notes as needed.
`;

    return frontMatter + tableHeader + tableRows.trim() + footerQuote;
}

/**
 * Generates a JSON object for the dependency snapshot with simplified keys.
 * @param {Array<object>} dependenciesData - Array of dependency objects.
 * @returns {object} JSON object representing the dependencies.
 */
function generateJsonOutput(dependenciesData) {
    const jsonData = {};
    const keyMap = {
        'Node.js': 'node',
        'npm': 'npm',
        'pnpm': 'pnpm',
        'Yarn': 'yarn',
        'TypeScript': 'typescript',
        'Next.js': 'next',
        'Supabase JS': 'supabase',
        'Clerk (Next.js)': 'clerk',
        'Clerk (React)': 'clerk',
        'Clerk JS': 'clerk',
        'Drizzle ORM': 'drizzle',
        'Tailwind CSS': 'tailwindcss',
        'Shadcn UI': 'shadcn'
        // Note: TypeScript (tsc) is already handled in getAllDependencies to be 'TypeScript'
    };

    for (const dep of dependenciesData) {
        const jsonKey = keyMap[dep.tool];
        if (jsonKey) {
            let version = dep.version;
            if (jsonKey === 'node' && version && version.startsWith('v')) {
                version = version.substring(1);
            }
            // Ensure we don't overwrite an already set key (e.g. for multiple Clerk variants)
            // unless the new value is more specific or preferred (not handled here, first one wins)
            if (!jsonData[jsonKey]) {
                 jsonData[jsonKey] = version;
            }
        }
    }
    return jsonData;
}

/**
 * Creates a dependency snapshot file in the specified format.
 * @param {object} options - Options object.
 * @param {string} [options.format='table'] - Output format ('table' for Markdown, 'json' for JSON).
 * @param {string} [options.out] - Output file path.
 * @returns {boolean} True if snapshot was created successfully, false otherwise.
 */
function createSnapshot(options = {}) {
    const format = options.format || 'table'; // Default to 'table' (Markdown)
    const dependenciesData = getAllDependencies();

    if (!dependenciesData || dependenciesData.length === 0) {
        console.warn('⚠️ No dependency data collected. Snapshot will not be generated.');
        return false;
    }

    let outputContent = '';
    const defaultExtension = format === 'json' ? '.json' : '.md';

    if (format === 'json') {
        const jsonData = generateJsonOutput(dependenciesData);
        outputContent = JSON.stringify(jsonData, null, 2);
    } else { // 'table' or default
        outputContent = generateMarkdownOutput(dependenciesData);
    }

    let outputPath;
    if (options.out) {
        // Check if options.out already has a valid extension
        if (path.extname(options.out).toLowerCase() === '.json' || path.extname(options.out).toLowerCase() === '.md') {
            outputPath = path.resolve(process.cwd(), options.out);
        } else {
            // Append default extension if no extension or an unrecognized one is present
            outputPath = path.resolve(process.cwd(), options.out + defaultExtension);
        }
    } else {
        const defaultFileName = '_docs/project-files/references/stack-docs' + defaultExtension;
        outputPath = path.resolve(process.cwd(), defaultFileName);
    }
    
    const outputDir = path.dirname(outputPath);
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            // console.log(`✅ Created directory: ${outputDir}`); // Optional: for verbosity
        }
    } catch (error) {
        console.error(`❌ Error creating directory ${outputDir}: ${error.message}`);
        return false;
    }

    if (fs.existsSync(outputPath)) {
        console.error(`❌ Error: Output file already exists: ${outputPath}`);
        console.error('To prevent data loss, jaw deps snapshot will not overwrite existing files.');
        console.error('Please remove the existing file or use a different output path with --out.');
        return false;
    }

    try {
        fs.writeFileSync(outputPath, outputContent);
        console.log(`✅ Snapshot successfully written to: ${outputPath}`);
        return true;
    } catch (error) {
        console.error(`❌ Error writing snapshot to ${outputPath}: ${error.message}`);
        return false;
    }
}


module.exports = {
    createSnapshot, // Primary function for CLI
    getAllDependencies,
    generateMarkdownOutput,
    generateJsonOutput,
    parsePackageJsonDependencies,
    getRuntimeVersions
};
