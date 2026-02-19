#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const skillDir = path.resolve('skills/verify-implementation');
const referencesDir = path.join(skillDir, 'references');
const rulesPath = path.join(referencesDir, 'project-rules.md');

const args = process.argv.slice(2);
const ruleText = args.join(' ').trim();

if (!ruleText) {
  console.error('사용법: npm run manage-skills -- "규칙 설명"');
  process.exit(1);
}

await mkdir(referencesDir, { recursive: true });

let current = '';
try {
  current = await readFile(rulesPath, 'utf8');
} catch {
  current = '# 프로젝트 규칙 모음\n\n';
}

const now = new Date().toISOString();
const next = `${current}\n## ${now}\n- ${ruleText}\n`;

await writeFile(rulesPath, next, 'utf8');

console.log('✅ 규칙을 스킬 레퍼런스에 저장했습니다.');
console.log(`- 파일: ${path.relative(process.cwd(), rulesPath)}`);
console.log('- 다음 단계: npm run verify-implementation');
