#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Usage: npm run release -- <version>');
  console.log('Example: npm run release -- 1.0.0');
}

const versionArg = process.argv[2];
if (!versionArg) {
  usage();
  process.exit(1);
}

const pkgPath = path.join(process.cwd(), 'package.json');
const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = versionArg;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Append to CHANGELOG.md if present
const today = new Date();
const yyyy = today.getUTCFullYear();
const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
const dd = String(today.getUTCDate()).padStart(2, '0');
const dateStr = `${yyyy}-${mm}-${dd}`;

let changelogEntry = `\n## [${versionArg}] - ${dateStr}\n- Release ${versionArg}.\n`;
try {
  if (fs.existsSync(changelogPath)) {
    fs.appendFileSync(changelogPath, changelogEntry, 'utf8');
  } else {
    fs.writeFileSync(changelogPath, `# Changelog\n${changelogEntry}`, 'utf8');
  }
} catch (e) {
  // non-fatal
}

console.log(`Version bumped to ${versionArg}.`);
console.log('Next steps:');
console.log('  git add package.json CHANGELOG.md');
console.log(`  git commit -m "release: v${versionArg}"`);
console.log(`  git tag v${versionArg}`);
console.log('  git push origin master --tags');
console.log('Build and push Docker images as needed.');
