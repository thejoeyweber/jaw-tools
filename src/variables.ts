import * as glob from 'glob';
import * as fs from 'fs';
import * as path from 'path';

export interface VariableType<T = any> {
  name: string;
  discover(pattern?: string, config?: any): Promise<T[]>; // Added config
  render(item: T): string;
  validate?(item: T, originalKeyOrPattern?: string, config?: any): Promise<boolean | string>; // Added config and originalKeyOrPattern
  filters?: Record<string, (items: T[], arg?: string) => T[]>;
}

export const registry: Record<string, VariableType> = {};

export function registerVariableType(name: string, type: VariableType) {
  if (registry[name]) {
    console.warn(`Variable type "${name}" is already registered. Overwriting.`);
  }
  registry[name] = type;
}

// Basic file type
registerVariableType('file', {
  name: 'file',
  async discover(pattern?: string, config?: any): Promise<string[]> {
    if (!pattern) return [];
    const projectRoot = config?.__projectRoot || '.';
    // Ensure pattern is absolute or resolved relative to projectRoot
    const absolutePattern = path.isAbsolute(pattern) ? pattern : path.join(projectRoot, pattern);

    try {
      // Use { nodir: true } to only match files, not directories
      const files = glob.sync(absolutePattern, { nodir: true });
      // Return paths relative to project root, or absolute if they were originally absolute
      return files.map(file => {
        if (path.isAbsolute(pattern)) return file; // If original pattern was absolute, keep files absolute
        const relativePath = path.relative(projectRoot, file);
        // If pattern was relative, return relative path. If it was absolute, this ensures it remains absolute.
        return path.isAbsolute(pattern) ? path.resolve(projectRoot, relativePath) : relativePath;
      });
    } catch (err) {
      console.error(`Error during glob search for pattern ${pattern}:`, err);
      return [];
    }
  },
  render(item: string): string {
    // For now, we'll read the file content during the main compile function's resolution phase.
    // Render here will just return the path, assuming it's validated.
    // Or, if we decide render should do the reading, this needs fs access and error handling.
    // For this iteration, let's assume render receives the content, or this is handled by compile-prompt.js
    // Based on the instructions, render should be simple, and the main file reading will happen
    // in compile-prompt.js after validation. So, returning item (path) is correct.
    return item; // Path to the file
  },
  async validate(item: string, originalKeyOrPattern?: string, config?: any): Promise<boolean | string> {
    // console.log("Validating file:", item, "against pattern:", originalKeyOrPattern); // For testing as per instructions
    const projectRoot = config?.__projectRoot || '.';
    const absolutePath = path.isAbsolute(item) ? item : path.join(projectRoot, item);

    if (!fs.existsSync(absolutePath)) {
      return `File not found: ${item} (resolved from ${absolutePath})`;
    }
    if (fs.statSync(absolutePath).isDirectory()) {
      return `Expected a file, but got a directory: ${item} (resolved from ${absolutePath})`;
    }

    // Extension check based on the original key/pattern if it implies an extension
    if (originalKeyOrPattern) {
      // This logic is a bit tricky. If originalKeyOrPattern is a glob like "*.ts", extname gives ".ts"
      // If originalKeyOrPattern is a direct path like "/foo/bar.ts", extname gives ".ts"
      const patternExtension = path.extname(originalKeyOrPattern); 
      
      // Avoid check if patternExtension is empty (e.g. "README"), or a generic glob like "*" or ".*"
      if (patternExtension && patternExtension !== '.' && !patternExtension.includes('*')) {
        const itemExtension = path.extname(item);
        if (patternExtension.toLowerCase() !== itemExtension.toLowerCase()) {
          return `File extension mismatch for ${item}. Expected ${patternExtension} (from ${originalKeyOrPattern}) but got ${itemExtension}.`;
        }
      }
    }
    return true;
  },
  filters: {
    extension: (items: string[], ext?: string) => {
      if (!ext) return items;
      return items.filter(item => item.endsWith(`.${ext}`));
    }
  }
});
