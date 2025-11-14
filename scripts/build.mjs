#!/usr/bin/env node

/**
 * Production build script for Thai RMF Market Pulse MCP Server
 * 
 * This script:
 * 1. Clears the dist directory
 * 2. Compiles TypeScript to JavaScript using esbuild
 * 3. Copies runtime data assets (CSV and JSON files) to dist
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🏗️  Building Thai RMF Market Pulse MCP Server...\n');

try {
  // Step 1: Clear dist directory
  console.log('1️⃣  Cleaning dist directory...');
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  console.log('   ✓ Cleaned\n');

  // Step 2: Run esbuild to compile TypeScript
  console.log('2️⃣  Compiling TypeScript with esbuild...');
  execSync(
    'esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist',
    { cwd: rootDir, stdio: 'inherit' }
  );
  console.log('   ✓ Compiled\n');

  // Step 3: Copy data assets to dist
  console.log('3️⃣  Copying data assets...');
  
  // Create directories
  const distDocsDir = path.join(distDir, 'docs');
  const distDataDir = path.join(distDir, 'data', 'rmf-funds');
  fs.mkdirSync(distDocsDir, { recursive: true });
  fs.mkdirSync(distDataDir, { recursive: true });

  // Copy CSV file
  const csvSource = path.join(rootDir, 'docs', 'rmf-funds-consolidated.csv');
  const csvDest = path.join(distDocsDir, 'rmf-funds-consolidated.csv');
  if (fs.existsSync(csvSource)) {
    fs.copyFileSync(csvSource, csvDest);
    console.log('   ✓ Copied rmf-funds-consolidated.csv');
  } else {
    throw new Error(`CSV file not found: ${csvSource}`);
  }

  // Copy JSON fund files
  const jsonSourceDir = path.join(rootDir, 'data', 'rmf-funds');
  if (fs.existsSync(jsonSourceDir)) {
    const jsonFiles = fs.readdirSync(jsonSourceDir).filter(f => f.endsWith('.json'));
    let copiedCount = 0;
    
    for (const file of jsonFiles) {
      const srcFile = path.join(jsonSourceDir, file);
      const destFile = path.join(distDataDir, file);
      fs.copyFileSync(srcFile, destFile);
      copiedCount++;
    }
    
    console.log(`   ✓ Copied ${copiedCount} JSON fund files`);
  } else {
    throw new Error(`JSON directory not found: ${jsonSourceDir}`);
  }

  console.log('\n✅ Build completed successfully!\n');
  console.log('📦 Output: dist/index.js');
  console.log('📁 Assets: Copied to dist/docs/ and dist/data/');
  console.log('🚀 Run with: npm start\n');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
