# FG2G Curriculum Extraction Guide

This document explains how to extract and organize the FG2G curriculum content from the `fg2g-curriculum.zip` file into the root-level directory structure.

## Overview

The extraction process takes content from the ZIP file and maps it to the appropriate curriculum directories at the root level of the repository. This automated approach ensures consistent organization and makes the curriculum content readily accessible.

## Directory Structure

The curriculum is organized into the following root-level directories:

- `01-front-matter/` - Title page, copyright, dedication, foreword, acknowledgments, and how-to-use guide
- `02-introduction/` - Introduction to the curriculum and its theoretical rationale
- `03-theoretical-foundation/` - ACEs, trauma-informed pedagogy, therapeutic horticulture, and literature review
- `04-5rs-framework/` - The 5Rs framework (Root, Regulate, Reconnect, Restore, Reflect)
- `05-grade-bands/` - Grade-specific content (K-2, 3-5, 6-8, 9-12)
- `06-instructional-strategies/` - Teaching strategies and methodologies (placeholder)
- `07-living-learning-labs/` - Design specifications, safety protocols, garden management
- `08-assessment/` - Assessment tools, rubrics, and progress monitoring
- `09-professional-development/` - Training overview, PD sessions, credentialing pathways
- `10-technology-integration/` - Digital platform, AI tools, and data collection
- `11-community-partnerships/` - Partnership models, family engagement, grant resources
- `12-implementation/` - Implementation guide and best practices
- `13-conclusion/` - Conclusion and future directions (placeholder)
- `appendices/` - Supplementary materials and reference documents
- `assets/` - Images, icons, and other media assets

## Directory Mapping

The extraction script maps ZIP file paths to root-level directories as follows:

| ZIP Path | Root Directory |
|----------|----------------|
| `fg2g-curriculum/docs/00-front-matter/` | `01-front-matter/` |
| `fg2g-curriculum/docs/01-introduction/` | `02-introduction/` |
| `fg2g-curriculum/docs/02-theoretical-foundation/` | `03-theoretical-foundation/` |
| `fg2g-curriculum/docs/03-5rs-framework/` | `04-5rs-framework/` |
| `fg2g-curriculum/docs/04-grade-bands/` | `05-grade-bands/` |
| `fg2g-curriculum/docs/05-living-learning-labs/` | `07-living-learning-labs/` |
| `fg2g-curriculum/docs/06-assessment-tools/` | `08-assessment/` |
| `fg2g-curriculum/docs/07-professional-development/` | `09-professional-development/` |
| `fg2g-curriculum/docs/08-technology-integration/` | `10-technology-integration/` |
| `fg2g-curriculum/docs/09-community-partnerships/` | `11-community-partnerships/` |
| `fg2g-curriculum/docs/10-implementation-guide/` | `12-implementation/` |
| `fg2g-curriculum/appendices/` | `appendices/` |
| `fg2g-curriculum/assets/` | `assets/` |

## Manual Extraction

### Prerequisites

1. Node.js version 18 or higher
2. npm package manager
3. Access to the repository

### Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the extraction script:**
   ```bash
   npm run extract-curriculum
   ```
   
   Or directly:
   ```bash
   node scripts/extract-curriculum.js
   ```

3. **Verify the extraction:**
   The script will output a summary showing:
   - Number of files extracted
   - Number of files skipped
   - Any errors encountered
   
   Example output:
   ```
   🚀 Starting FG2G Curriculum Extraction...
   
   ✓ Found ZIP file: fg2g-curriculum.zip
   📦 Loading ZIP file...
   ✓ ZIP file loaded. Found 104 entries.
   
   📂 Extracting and organizing files...
   
     ✓ Extracted: 01-front-matter/title-page.md
     ✓ Extracted: 01-front-matter/copyright.md
     ...
   
   ============================================================
   📊 Extraction Summary:
   ============================================================
     ✓ Files extracted: 87
     ⊘ Files skipped: 0
     ✗ Errors: 0
   
   ✅ Extraction completed successfully!
   ```

## GitHub Action Workflow

### Triggering the Workflow

The extraction can be automated using GitHub Actions:

1. Navigate to your repository on GitHub
2. Go to the **Actions** tab
3. Select **Extract FG2G Curriculum** from the workflows list
4. Click **Run workflow**
5. Select the branch you want to run on
6. (Optional) Choose whether to overwrite existing files
7. Click **Run workflow**

### What the Workflow Does

The workflow performs the following steps:

1. Checks out the repository
2. Sets up Node.js environment (version 20)
3. Installs required dependencies (`adm-zip`, `fs-extra`)
4. Runs the extraction script
5. Commits and pushes the extracted files with the message: "Extract and organize FG2G curriculum content"

### Permissions

The workflow requires:
- `contents: write` - To commit and push changes
- `pull-requests: write` - To update pull requests (if applicable)

## Verification

After extraction, verify the following:

### 1. Directory Structure
Check that all curriculum directories contain files:
```bash
ls -la 01-front-matter/
ls -la 02-introduction/
ls -la 03-theoretical-foundation/
# ... and so on
```

### 2. File Count
Verify the expected number of files in each directory:
```bash
find 01-front-matter -type f | wc -l
find 02-introduction -type f | wc -l
# ... and so on
```

### 3. Content Integrity
Open a few markdown files to ensure they were extracted correctly:
```bash
cat 01-front-matter/title-page.md
cat 02-introduction/why-this-curriculum.md
cat 04-5rs-framework/overview.md
```

### 4. Grade Band Subdirectories
Verify that grade band subdirectories are preserved:
```bash
ls -la 05-grade-bands/
ls -la 05-grade-bands/K-2/
ls -la 05-grade-bands/3-5/
ls -la 05-grade-bands/6-8/
ls -la 05-grade-bands/9-12/
```

## Troubleshooting

### Issue: ZIP file not found

**Error:** `ZIP file not found: fg2g-curriculum.zip`

**Solution:** 
- Ensure the `fg2g-curriculum.zip` file exists in the root of the repository
- Check that you're running the script from the repository root directory

### Issue: Permission denied

**Error:** `EACCES: permission denied`

**Solution:**
- Ensure you have write permissions to the repository directories
- On Unix systems, check file permissions: `ls -la`
- Try running with appropriate permissions or check directory ownership

### Issue: Module not found

**Error:** `Cannot find module 'adm-zip'` or `Cannot find module 'fs-extra'`

**Solution:**
- Run `npm install` to install all dependencies
- Or install specific packages: `npm install adm-zip fs-extra`

### Issue: Files not extracted

**Problem:** The script runs but no files appear in the directories

**Solution:**
- Check the script output for any error messages
- Verify the ZIP file is not corrupted: `unzip -t fg2g-curriculum.zip`
- Ensure the directory mapping in the script matches the ZIP structure
- Run with verbose logging to see detailed output

### Issue: Duplicate files

**Problem:** Running the script multiple times creates duplicate content

**Solution:**
- The script is designed to be idempotent (overwriting existing files)
- Files should be overwritten, not duplicated
- If duplicates occur, clear the directories and re-run:
  ```bash
  rm -rf 01-front-matter/* 02-introduction/* # ... etc
  npm run extract-curriculum
  ```

### Issue: GitHub Action fails

**Problem:** The GitHub Action workflow fails to run

**Solution:**
- Check the Actions tab for detailed error logs
- Verify the workflow file syntax is correct
- Ensure the repository has Actions enabled
- Check that the branch has the necessary permissions
- Verify the GITHUB_TOKEN has write access

### Issue: Incomplete extraction

**Problem:** Some files are missing after extraction

**Solution:**
- Review the extraction summary for skipped files
- Check if the directory mapping includes all necessary paths
- Verify the ZIP file contains all expected content: `unzip -l fg2g-curriculum.zip`
- Look for error messages in the script output

## Script Behavior

### Idempotency
The extraction script is **idempotent**, meaning:
- It can be run multiple times safely
- Existing files will be overwritten with the same content
- No duplicate files will be created
- The end result is always the same regardless of how many times it runs

### File Handling
- **Existing files:** Overwritten by default
- **Missing directories:** Created automatically
- **Subdirectories:** Preserved from ZIP structure
- **Permissions:** Maintained where possible
- **Timestamps:** Updated to extraction time

### Error Handling
The script includes comprehensive error handling:
- Invalid ZIP files are detected early
- Individual file errors don't stop the entire process
- All errors are logged and summarized
- Exit code indicates success (0) or failure (1)

## Advanced Usage

### Custom Extraction Path

To extract to a different location, modify the `ROOT_DIR` constant in the script:

```javascript
const ROOT_DIR = '/path/to/custom/directory';
```

### Selective Extraction

To extract only specific directories, modify the `DIRECTORY_MAPPING` object:

```javascript
const DIRECTORY_MAPPING = {
  'fg2g-curriculum/docs/00-front-matter': '01-front-matter',
  // Comment out directories you don't want to extract
  // 'fg2g-curriculum/docs/01-introduction': '02-introduction',
};
```

### Skip Existing Files

To skip existing files instead of overwriting, modify the extraction logic:

```javascript
// Add this check before writing
if (await fs.pathExists(targetPath)) {
  console.log(`  ⊘ Skipped: ${targetDir}/${relativePath} (already exists)`);
  skippedFiles++;
  continue;
}
```

## Support

For issues or questions:
1. Check this documentation first
2. Review the script output for error messages
3. Open an issue on GitHub with:
   - The error message
   - Steps to reproduce
   - Your Node.js version (`node --version`)
   - Your npm version (`npm --version`)

## Future Enhancements

Potential improvements for future versions:
- Progress bar for large extractions
- Validation of extracted content
- Automatic backup before extraction
- Dry-run mode to preview changes
- Configuration file for custom mappings
- Support for incremental updates
