'use strict';

/**
 * Version Registry
 * 
 * Tracks versions of template files for update detection
 */

const fs = require('fs');
const path = require('path');

class VersionRegistry {
  constructor() {
    this.registry = {};
    this.loadRegistry();
  }
  
  loadRegistry() {
    // Load from .jaw-tools-versions.json if exists
    const versionFile = path.join(process.cwd(), '.jaw-tools-versions.json');
    if (fs.existsSync(versionFile)) {
      try {
        this.registry = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      } catch (err) {
        console.warn(`⚠️ Error loading version registry: ${err.message}`);
        this.registry = {};
      }
    }
  }
  
  saveRegistry() {
    // Save to .jaw-tools-versions.json
    try {
      fs.writeFileSync(
        path.join(process.cwd(), '.jaw-tools-versions.json'),
        JSON.stringify(this.registry, null, 2)
      );
    } catch (err) {
      console.warn(`⚠️ Error saving version registry: ${err.message}`);
    }
  }
  
  recordVersion(filePath, version) {
    this.registry[filePath] = version;
    this.saveRegistry();
  }
  
  getVersion(filePath) {
    return this.registry[filePath] || null;
  }
  
  hasVersion(filePath, version) {
    return this.registry[filePath] === version;
  }
  
  hasNewerVersion(filePath, newVersion) {
    if (!this.registry[filePath]) return true;
    
    // Simple version comparison
    // Assumes versions like "1.0.0" or "v1.0.0"
    try {
      const currentVersion = this.registry[filePath].replace(/^v/, '');
      const newVersionClean = newVersion.replace(/^v/, '');
      
      const currentParts = currentVersion.split('.').map(p => parseInt(p, 10));
      const newParts = newVersionClean.split('.').map(p => parseInt(p, 10));
      
      // Compare major.minor.patch
      for (let i = 0; i < Math.max(currentParts.length, newParts.length); i++) {
        const current = currentParts[i] || 0;
        const next = newParts[i] || 0;
        
        if (next > current) return true;
        if (next < current) return false;
      }
      
      return false; // Versions are equal
    } catch (err) {
      // If version parsing fails, assume new version is newer
      console.warn(`⚠️ Error comparing versions: ${err.message}`);
      return true;
    }
  }
}

module.exports = VersionRegistry; 