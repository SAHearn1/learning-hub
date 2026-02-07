#!/usr/bin/env node

/**
 * FG2G Curriculum Extraction Script
 * 
 * This script extracts the fg2g-curriculum.zip file and organizes its contents
 * into the appropriate root-level curriculum directories.
 */

const AdmZip = require('adm-zip');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const ZIP_FILE = 'fg2g-curriculum.zip';
const ROOT_DIR = process.cwd();
const ZIP_PATH = path.join(ROOT_DIR, ZIP_FILE);

// Directory mapping from ZIP structure to root structure
const DIRECTORY_MAPPING = {
  'fg2g-curriculum/docs/00-front-matter': '01-front-matter',
  'fg2g-curriculum/docs/01-introduction': '02-introduction',
  'fg2g-curriculum/docs/02-theoretical-foundation': '03-theoretical-foundation',
  'fg2g-curriculum/docs/03-5rs-framework': '04-5rs-framework',
  'fg2g-curriculum/docs/04-grade-bands': '05-grade-bands',
  'fg2g-curriculum/docs/05-living-learning-labs': '07-living-learning-labs',
  'fg2g-curriculum/docs/06-assessment-tools': '08-assessment',
  'fg2g-curriculum/docs/07-professional-development': '09-professional-development',
  'fg2g-curriculum/docs/08-technology-integration': '10-technology-integration',
  'fg2g-curriculum/docs/09-community-partnerships': '11-community-partnerships',
  'fg2g-curriculum/docs/10-implementation-guide': '12-implementation',
  'fg2g-curriculum/appendices': 'appendices',
  'fg2g-curriculum/assets': 'assets',
};

// Special handling for instructional strategies (if needed)
const INSTRUCTIONAL_STRATEGIES_DIR = '06-instructional-strategies';

// Special handling for conclusion (if needed)
const CONCLUSION_DIR = '13-conclusion';

/**
 * Main extraction function
 */
async function extractCurriculum() {
  console.log('🚀 Starting FG2G Curriculum Extraction...\n');

  try {
    // Verify ZIP file exists
    if (!fs.existsSync(ZIP_PATH)) {
      throw new Error(`ZIP file not found: ${ZIP_PATH}`);
    }
    console.log(`✓ Found ZIP file: ${ZIP_FILE}`);

    // Load the ZIP file
    console.log('📦 Loading ZIP file...');
    const zip = new AdmZip(ZIP_PATH);
    const zipEntries = zip.getEntries();
    console.log(`✓ ZIP file loaded. Found ${zipEntries.length} entries.\n`);

    // Statistics
    let extractedFiles = 0;
    let skippedFiles = 0;
    const errors = [];

    // Extract and organize files
    console.log('📂 Extracting and organizing files...\n');

    for (const entry of zipEntries) {
      try {
        // Skip directories themselves
        if (entry.isDirectory) {
          continue;
        }

        const entryPath = entry.entryName;
        
        // Find the appropriate mapping
        let targetDir = null;
        let relativePath = null;

        for (const [zipPath, rootPath] of Object.entries(DIRECTORY_MAPPING)) {
          if (entryPath.startsWith(zipPath + '/')) {
            targetDir = rootPath;
            relativePath = entryPath.substring(zipPath.length + 1);
            break;
          }
        }

        // If no mapping found, skip the file
        if (!targetDir || !relativePath) {
          console.log(`  ⊘ Skipped: ${entryPath} (no mapping)`);
          skippedFiles++;
          continue;
        }

        // Construct target path
        const targetPath = path.join(ROOT_DIR, targetDir, relativePath);
        
        // Ensure target directory exists
        await fs.ensureDir(path.dirname(targetPath));

        // Extract the file
        const fileContent = entry.getData();
        await fs.writeFile(targetPath, fileContent);
        
        console.log(`  ✓ Extracted: ${targetDir}/${relativePath}`);
        extractedFiles++;

      } catch (err) {
        const errorMsg = `Error extracting ${entry.entryName}: ${err.message}`;
        console.error(`  ✗ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Create placeholder files for empty directories if needed
    await createPlaceholders();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Extraction Summary:');
    console.log('='.repeat(60));
    console.log(`  ✓ Files extracted: ${extractedFiles}`);
    console.log(`  ⊘ Files skipped: ${skippedFiles}`);
    console.log(`  ✗ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n✅ Extraction completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during extraction:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Helper function to format directory name for title
 * Converts '06-instructional-strategies' to 'Instructional Strategies'
 */
function formatDirectoryTitle(dirName) {
  // Remove number prefix (e.g., '06-' or '13-')
  const withoutNumber = dirName.replace(/^\d+-/, '');
  // Replace hyphens with spaces and capitalize each word
  return withoutNumber
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Create placeholder files for directories that might be empty
 */
async function createPlaceholders() {
  const placeholderDirs = [
    INSTRUCTIONAL_STRATEGIES_DIR,
    CONCLUSION_DIR,
  ];

  console.log('\n📝 Creating placeholder files for empty directories...');

  for (const dir of placeholderDirs) {
    const dirPath = path.join(ROOT_DIR, dir);
    await fs.ensureDir(dirPath);
    
    const readmePath = path.join(dirPath, 'README.md');
    
    // Only create if directory is empty
    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
      const title = formatDirectoryTitle(dir);
      const placeholderContent = `# ${title}\n\nThis section is under development.\n`;
      await fs.writeFile(readmePath, placeholderContent);
      console.log(`  ✓ Created placeholder: ${dir}/README.md`);
    }
  }
}

/**
 * Verify extraction was successful
 */
async function verifyExtraction() {
  console.log('🔍 Verifying extraction...');
  
  const requiredDirs = Object.values(DIRECTORY_MAPPING);
  let allPresent = true;

  for (const dir of requiredDirs) {
    const dirPath = path.join(ROOT_DIR, dir);
    if (await fs.pathExists(dirPath)) {
      const files = await fs.readdir(dirPath);
      console.log(`  ✓ ${dir} (${files.length} items)`);
    } else {
      console.log(`  ✗ ${dir} (missing)`);
      allPresent = false;
    }
  }

  return allPresent;
}

// Run the extraction
if (require.main === module) {
  extractCurriculum()
    .then(() => verifyExtraction())
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = { extractCurriculum, verifyExtraction };
