import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Sensitive key assignment pattern (assigning a non-empty secret value)
const SENSITIVE_ASSIGNMENT = /^\s*(?:export\s+)?(?:CLOCKED_API_KEY|UPSTASH_REDIS_REST_TOKEN|KV_REST_API_TOKEN|SHARE_SECRET)\s*=\s*(?!['"]?\s*$)['"]?([a-zA-Z0-9_\-\.]{4,})['"]?/im;

// Suspicious patterns: Clocked API key prefixes, long bearer tokens, long hex/base64 secrets
const CLOCKED_KEY_PATTERN = /\bclk_[a-zA-Z0-9_\-]{16,}\b/i;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[a-zA-Z0-9_\-\.]{24,}\b/i;
const GENERIC_API_KEY_PATTERN = /(?:api[_-]?key|secret[_-]?token|auth[_-]?token)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{24,}['"]/i;

// Binary / ignore extensions
const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.docx', '.pdf', '.zip', '.bin', '.tar', '.gz', '.woff', '.woff2', '.ttf', '.eot',
  '.mp4', '.mp3'
]);

function getFilesToCheck() {
  try {
    // Check staged files first
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' })
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    if (staged.length > 0) {
      return staged;
    }

    // If nothing staged, check all tracked files
    const tracked = execSync('git ls-files', { encoding: 'utf-8' })
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    return tracked;
  } catch {
    // If not in git yet, scan directory recursively excluding node_modules, .git, etc.
    return [];
  }
}

function scanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (IGNORED_EXTENSIONS.has(ext)) return [];
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.startsWith('temp-app')) return [];
  // Never scan sample plant files or documentation about the rules
  if (filePath === 'scripts/check-secrets.mjs' || filePath === '.env.example') return [];

  if (!fs.existsSync(filePath)) return [];

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return []; // binary file or unreadable
  }

  const issues = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (SENSITIVE_ASSIGNMENT.test(line)) {
      issues.push({ lineNum, reason: 'Assignment of sensitive environment variable detected' });
    } else if (CLOCKED_KEY_PATTERN.test(line)) {
      issues.push({ lineNum, reason: 'Clocked API key pattern detected' });
    } else if (BEARER_TOKEN_PATTERN.test(line)) {
      issues.push({ lineNum, reason: 'Bearer token detected' });
    } else if (GENERIC_API_KEY_PATTERN.test(line)) {
      issues.push({ lineNum, reason: 'Hardcoded API secret token detected' });
    }
  }

  return issues;
}

const files = getFilesToCheck();
let hasErrors = false;

console.log(`[check-secrets] Scanning ${files.length} file(s)...`);

for (const file of files) {
  // Disallow any .env or .env.local file from ever being staged or committed
  const baseName = path.basename(file);
  if (baseName.startsWith('.env') && baseName !== '.env.example') {
    console.error(`[check-secrets] CRITICAL: Environment file "${file}" must never be committed!`);
    hasErrors = true;
    continue;
  }

  const issues = scanFile(file);
  if (issues.length > 0) {
    hasErrors = true;
    for (const issue of issues) {
      console.error(`[check-secrets] CRITICAL: Potential secret detected in "${file}" at line ${issue.lineNum} (${issue.reason})`);
    }
  }
}

if (hasErrors) {
  console.error('\n[check-secrets] FAILED: Secrets detected. Commit aborted.');
  process.exit(1);
} else {
  console.log('[check-secrets] PASSED: No secrets detected.');
  process.exit(0);
}
