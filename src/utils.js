/**
 * Common utilities for jaw-tools
 */

const fs = require('fs');
const path = require('path');

/**
 * Pads a number with leading zeros
 * @param {number} num Number to pad
 * @param {number} size Size of resulting string
 * @returns {string} Padded number
 */
function pad(num, size) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Gets an approximation of token count for a file
 * @param {string} filePath Path to the file
 * @returns {number|string} Estimated token count or error message
 */
function getTokenCount(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInKB = stats.size / 1024;
    // Rough estimate: ~0.6 tokens per byte for XML/text
    return Math.round(fileSizeInKB * 0.6 * 1024); 
  } catch (err) {
    return "Error getting token count";
  }
}

/**
 * Runs a command with proper error handling
 * @param {Array} command Command and args array, e.g. ['node', ['file.js']]
 * @param {number} index Optional index for step numbering
 * @returns {Promise} Promise that resolves when command completes
 */
function runCommand([cmd, args], index) {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const stepNum = typeof index === 'number' ? `[Step ${index + 1}] ` : '';
    console.log(`\n${stepNum}Running: ${cmd} ${args.join(' ')}`);
    
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });
    
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Command failed: ${cmd} ${args.join(' ')}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Creates directory if it doesn't exist
 * @param {string} dir Directory path
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  pad,
  getTokenCount,
  runCommand,
  ensureDir
}; 