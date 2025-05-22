#!/usr/bin/env node

/**
 * Mini-PRD Manager for jaw-tools
 * 
 * Manages mini-PRDs with front-matter metadata, integrates with Repomix profiles,
 * and tracks file status.
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

class MiniPrdManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.configDir = path.join(projectRoot, '.mini-prds');
    this.docsDir = path.join(projectRoot, '_docs/project-docs/prds');
    this.templatePath = path.join(projectRoot, '_docs/project-docs/templates/mini-prd-template.md');
    
    // Ensure directories exist
    fs.ensureDirSync(this.docsDir);
  }
  
  /**
   * Get all mini-PRDs
   */
  getAllPrds() {
    if (!fs.existsSync(this.docsDir)) {
      return [];
    }
    
    // Instead of reading JSON files from .mini-prds, read markdown files from docsDir
    const files = fs.readdirSync(this.docsDir)
      .filter(f => f.endsWith('.md'));
    
    return files.map(file => {
      try {
        const filePath = path.join(this.docsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { data: frontMatter } = matter(content);
        
        if (!frontMatter.prdId) {
          return null;
        }
        
        // Extract basic information from the front-matter
        return {
          id: frontMatter.prdId,
          name: frontMatter.name || '',
          description: frontMatter.description || '',
          includes: frontMatter.includes || [],
          excludes: frontMatter.excludes || [],
          plannedFiles: frontMatter.plannedFiles || []
        };
      } catch (err) {
        console.warn(`Warning: Could not parse PRD file: ${file}`);
        return null;
      }
    }).filter(Boolean);
  }
  
  /**
   * Get a specific mini-PRD by ID
   */
  getPrd(id) {
    // Find the markdown file for this PRD ID
    const files = fs.readdirSync(this.docsDir)
      .filter(f => f.endsWith('.md'));
    
    const prdFile = files.find(file => {
      try {
        const filePath = path.join(this.docsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { data: frontMatter } = matter(content);
        return frontMatter.prdId === id;
      } catch (err) {
        return false;
      }
    });
    
    if (!prdFile) {
      throw new Error(`Mini-PRD ${id} not found`);
    }
    
    // Read PRD data from the markdown file
    const filePath = path.join(this.docsDir, prdFile);
    const content = fs.readFileSync(filePath, 'utf8');
    const { data: frontMatter } = matter(content);
    
    return {
      id: frontMatter.prdId,
      name: frontMatter.name || '',
      description: frontMatter.description || '',
      includes: frontMatter.includes || [],
      excludes: frontMatter.excludes || [],
      plannedFiles: frontMatter.plannedFiles || [],
      createdAt: frontMatter.createdAt || new Date().toISOString(),
      updatedAt: frontMatter.updatedAt || new Date().toISOString(),
      versions: frontMatter.versions || []
    };
  }
  
  /**
   * Save a mini-PRD configuration
   */
  savePrd(prd) {
    // Instead of saving a separate JSON file, update the markdown file
    const markdownPath = path.join(this.docsDir, `${prd.id}-${prd.name}.md`);
    
    if (fs.existsSync(markdownPath)) {
      // Update existing file
      const content = fs.readFileSync(markdownPath, 'utf8');
      const parsed = matter(content);
      
      // Update front-matter with PRD data
      parsed.data.prdId = prd.id;
      parsed.data.name = prd.name;
      parsed.data.description = prd.description;
      parsed.data.includes = prd.includes;
      parsed.data.excludes = prd.excludes;
      parsed.data.plannedFiles = prd.plannedFiles;
      parsed.data.updatedAt = prd.updatedAt;
      parsed.data.versions = prd.versions;
      
      // Write updated content
      fs.writeFileSync(markdownPath, matter.stringify(parsed.content, parsed.data));
    } else {
      // Create new file via generateMarkdown
      this.generateMarkdown(prd);
    }
    
    return markdownPath;
  }
  
  /**
   * Create a new mini-PRD
   */
  createPrd(name, options = {}) {
    // Get next available ID
    const prds = this.getAllPrds();
    const nextId = prds.length > 0 
      ? Math.max(...prds.map(p => parseInt(p.id, 10) || 0)) + 1 
      : 1;
    
    const id = String(nextId).padStart(3, '0');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const prd = {
      id,
      name: slug,
      description: options.description || name,
      includes: options.includes || ['**/*'],
      excludes: options.excludes || [],
      plannedFiles: options.plannedFiles || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: []
    };
    
    // Save config
    this.savePrd(prd);
    
    // Create markdown file
    this.generateMarkdown(prd);
    
    // Create Repomix profile
    this.updateRepomixProfile(prd);
    
    return id;
  }
  
  /**
   * Update a mini-PRD
   */
  updatePrd(id, updates) {
    const prd = this.getPrd(id);
    
    // Store current version
    prd.versions.push({
      timestamp: new Date().toISOString(),
      includes: [...prd.includes],
      excludes: [...prd.excludes],
      plannedFiles: [...prd.plannedFiles]
    });
    
    // Apply updates
    if (updates.includes) prd.includes = updates.includes;
    if (updates.excludes) prd.excludes = updates.excludes;
    if (updates.plannedFiles) prd.plannedFiles = updates.plannedFiles;
    if (updates.description) prd.description = updates.description;
    
    prd.updatedAt = new Date().toISOString();
    
    // Save updates
    this.savePrd(prd);
    
    // Update markdown
    this.updateMarkdown(prd);
    
    // Update Repomix profile
    this.updateRepomixProfile(prd);
    
    return prd;
  }
  
  /**
   * Check file status for a mini-PRD
   */
  checkFileStatus(id) {
    const prd = this.getPrd(id);
    
    // Find all files matching the includes
    const matchedFiles = [];
    prd.includes.forEach(pattern => {
      try {
        const files = glob.sync(pattern, { 
          ignore: prd.excludes,
          cwd: this.projectRoot,
          absolute: false
        });
        matchedFiles.push(...files);
      } catch (err) {
        console.warn(`Warning: Error processing pattern ${pattern}: ${err.message}`);
      }
    });
    
    // Check planned files
    const plannedStatus = prd.plannedFiles.map(file => ({
      file,
      exists: fs.existsSync(path.join(this.projectRoot, file))
    }));
    
    return {
      existingFiles: matchedFiles.filter(f => !prd.plannedFiles.includes(f)),
      plannedFiles: plannedStatus
    };
  }
  
  /**
   * Generate a snapshot for a mini-PRD
   */
  generateSnapshot(id) {
    const prd = this.getPrd(id);
    
    // Build repomix command
    const repomixProfileName = `prd-${prd.id}-${prd.name}`;
    
    try {
      // Make sure the repomix profile exists
      this.updateRepomixProfile(prd);
      
      // Get the repomix profiles path
      const repoProfilesDir = path.join(this.projectRoot, '.repomix-profiles');
      const profileManagerPath = path.join(repoProfilesDir, 'profiles-manager.js');
      
      if (!fs.existsSync(profileManagerPath)) {
        throw new Error('Repomix profiles manager not found. Run "npx jaw-tools setup" first.');
      }
      
      // Run the repomix command
      const { execSync } = require('child_process');
      const output = execSync(`node "${profileManagerPath}" run ${repomixProfileName}`, { 
        cwd: this.projectRoot,
        stdio: 'pipe'  // Capture output
      }).toString();
      
      // Update the markdown with the snapshot info
      this.updateMarkdown(prd);
      
      return {
        success: true,
        output,
        profileName: repomixProfileName
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  
  /**
   * Update Repomix profile for a mini-PRD
   */
  updateRepomixProfile(prd) {
    const repoProfilesDir = path.join(this.projectRoot, '.repomix-profiles');
    const profilesFile = path.join(repoProfilesDir, 'profiles.json');
    
    // Ensure directory exists
    fs.ensureDirSync(repoProfilesDir);
    
    // Read existing profiles
    let profiles = {};
    if (fs.existsSync(profilesFile)) {
      try {
        profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
      } catch (err) {
        console.warn(`Warning: Could not parse profiles.json: ${err.message}`);
        profiles = {};
      }
    }
    
    // Add/update mini-PRD profile
    const profileName = `prd-${prd.id}-${prd.name}`;
    profiles[profileName] = {
      include: prd.includes.join(','),
      ignore: prd.excludes.join(','),
      style: 'xml',
      compress: false
    };
    
    // Save profiles
    fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2));
    
    return profileName;
  }
  
  /**
   * Generate markdown from template for a mini-PRD
   */
  generateMarkdown(prd) {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`Template not found at: ${this.templatePath}`);
    }
    
    let template = fs.readFileSync(this.templatePath, 'utf8');
    
    // Replace placeholders in the template
    template = template
      .replace(/\[PRD-NUMBER\]/g, prd.id)
      .replace(/\[Feature Title\]/g, prd.description)
      .replace(/\[feature-name-slug\]/g, prd.name)
      .replace(/\[Brief description for reference\]/g, prd.description);
    
    // Parse front-matter
    const parsed = matter(template);
    
    // Update front-matter
    parsed.data.prdId = prd.id;
    parsed.data.name = prd.name;
    parsed.data.description = prd.description;
    parsed.data.includes = prd.includes;
    parsed.data.excludes = prd.excludes;
    parsed.data.plannedFiles = prd.plannedFiles;
    
    // Convert back to string with updated front-matter
    const content = matter.stringify(parsed.content, parsed.data);
    
    // Write to file
    const outputPath = path.join(this.docsDir, `${prd.id}-${prd.name}.md`);
    fs.writeFileSync(outputPath, content);
    
    return outputPath;
  }
  
  /**
   * Update markdown for an existing mini-PRD
   */
  updateMarkdown(prd) {
    const markdownPath = path.join(this.docsDir, `${prd.id}-${prd.name}.md`);
    
    if (!fs.existsSync(markdownPath)) {
      // If it doesn't exist, generate it
      return this.generateMarkdown(prd);
    }
    
    try {
      // Read the current markdown
      const fileContent = fs.readFileSync(markdownPath, 'utf8');
      const parsed = matter(fileContent);
      
      // Update the front-matter
      parsed.data.prdId = prd.id;
      parsed.data.name = prd.name;
      parsed.data.description = prd.description;
      parsed.data.includes = prd.includes;
      parsed.data.excludes = prd.excludes;
      parsed.data.plannedFiles = prd.plannedFiles;
      
      // Update file section based on status
      const status = this.checkFileStatus(prd.id);
      
      // Try to update the content with file status
      let content = parsed.content;
      
      // Update Existing Files section
      const existingFilesList = status.existingFiles
        .map(file => `- \`${file}\` - [Description needed]`)
        .join('\n');
      
      // Update Planned Files section
      const plannedFilesList = status.plannedFiles
        .map(({ file, exists }) => 
          `- [${exists ? 'x' : ' '}] \`${file}\` - [Purpose needed]`)
        .join('\n');
      
      // Try to replace existing file sections
      const existingFilesRegex = /### Existing Files\s*\n(?:<!-- This section will be automatically updated by jaw-tools -->)?\s*([\s\S]*?)(?=### Planned Files|## 8\. Repomix Snapshot)/;
      const plannedFilesRegex = /### Planned Files\s*\n(?:<!-- This section will be automatically updated by jaw-tools -->)?\s*([\s\S]*?)(?=## 8\. Repomix Snapshot)/;
      
      // Replace Existing Files section
      content = content.replace(
        existingFilesRegex, 
        `### Existing Files\n<!-- This section will be automatically updated by jaw-tools -->\n${existingFilesList}\n\n`
      );
      
      // Replace Planned Files section
      content = content.replace(
        plannedFilesRegex,
        `### Planned Files\n<!-- This section will be automatically updated by jaw-tools -->\n${plannedFilesList}\n\n`
      );
      
      // Update Repomix Snapshot section
      const snapshotPath = `.repomix-profiles/outputs/prd-${prd.id}-${prd.name}.xml`;
      const snapshotExists = fs.existsSync(path.join(this.projectRoot, snapshotPath));
      
      const snapshotRegex = /Latest snapshot: \[(.*?)\]/;
      content = content.replace(
        snapshotRegex,
        `Latest snapshot: [${snapshotPath}]${snapshotExists ? '' : ' (not yet generated)'}`
      );
      
      // Write back the updated content
      const updatedContent = matter.stringify(content, parsed.data);
      fs.writeFileSync(markdownPath, updatedContent);
      
      return markdownPath;
    } catch (err) {
      console.error(`Error updating markdown: ${err.message}`);
      // If update fails, regenerate from template
      return this.generateMarkdown(prd);
    }
  }
  
  /**
   * Sync all mini-PRDs from markdown files
   */
  syncFromMarkdown() {
    if (!fs.existsSync(this.docsDir)) {
      return { created: 0, updated: 0 };
    }
    
    let created = 0;
    let updated = 0;
    
    // Find all markdown files
    const files = fs.readdirSync(this.docsDir).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      try {
        const filePath = path.join(this.docsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(fileContent);
        
        // Check if it has the required front-matter
        if (!parsed.data.prdId) {
          console.warn(`Warning: File ${file} missing prdId in front-matter, skipping`);
          continue;
        }
        
        const id = parsed.data.prdId;
        
        // Create or update Repomix profile for this PRD
        const prd = {
          id,
          name: parsed.data.name,
          description: parsed.data.description,
          includes: parsed.data.includes,
          excludes: parsed.data.excludes,
          plannedFiles: parsed.data.plannedFiles,
          createdAt: parsed.data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          versions: parsed.data.versions || []
        };
        
        // Update the Repomix profile
        this.updateRepomixProfile(prd);
        updated++;
      } catch (err) {
        console.warn(`Warning: Error processing ${file}: ${err.message}`);
      }
    }
    
    return { created, updated };
  }
  
  /**
   * Get version history for a mini-PRD
   */
  getHistory(id) {
    const prd = this.getPrd(id);
    return [
      // Current version
      {
        timestamp: prd.updatedAt,
        includes: prd.includes,
        excludes: prd.excludes,
        plannedFiles: prd.plannedFiles,
        isCurrent: true
      },
      // Previous versions
      ...prd.versions.map(v => ({
        ...v,
        isCurrent: false
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  /**
   * List all mini-PRDs with additional status information
   * @returns {Array} Array of PRDs with status
   */
  listPrds() {
    const prds = this.getAllPrds();
    
    return prds.map(prd => {
      let status = 'unknown';
      
      try {
        // Try to get full PRD to check for frontmatter status
        const fullPrd = this.getPrd(prd.id);
        const prdFile = path.join(this.docsDir, `${prd.id}-${prd.name}.md`);
        
        if (fs.existsSync(prdFile)) {
          const content = fs.readFileSync(prdFile, 'utf8');
          const { data } = matter(content);
          status = data.status || 'available';
        }
        
        return {
          ...prd,
          status
        };
      } catch (err) {
        return {
          ...prd,
          status: 'error'
        };
      }
    });
  }
}

module.exports = MiniPrdManager; 