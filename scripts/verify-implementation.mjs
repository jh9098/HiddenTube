#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const srcRoot = path.resolve('src');
const componentRoots = ['components', 'nodes'].map((segment) => path.join(srcRoot, segment));
const maxLines = 260;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
      continue;
    }
    files.push(full);
  }

  return files;
}

function isPascalCase(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function summarize(result) {
  if (result.length === 0) {
    return '없음';
  }
  return result.map((item) => `  - ${item}`).join('\n');
}

const componentFiles = [];
for (const root of componentRoots) {
  componentFiles.push(...(await walk(root)));
}

const jsxFiles = componentFiles.filter((file) => file.endsWith('.jsx'));
const namingViolations = jsxFiles
  .map((file) => ({ file, name: path.basename(file, '.jsx') }))
  .filter(({ name }) => !isPascalCase(name))
  .map(({ file }) => path.relative(process.cwd(), file));

const lineViolations = [];
for (const file of await walk(srcRoot)) {
  if (!/\.(jsx|js|ts|tsx)$/.test(file)) {
    continue;
  }
  const raw = await readFile(file, 'utf8');
  const lineCount = raw.split('\n').length;
  if (lineCount > maxLines) {
    lineViolations.push(`${path.relative(process.cwd(), file)} (${lineCount}줄)`);
  }
}

const firestoreReadPatterns = [/\bgetDoc\b/g, /\bgetDocs\b/g, /\bonSnapshot\b/g, /\bcollection\(/g];
const firestoreMatches = [];
for (const file of await walk(srcRoot)) {
  if (!/\.(jsx|js|ts|tsx)$/.test(file)) {
    continue;
  }
  const raw = await readFile(file, 'utf8');
  const count = firestoreReadPatterns.reduce((total, pattern) => total + (raw.match(pattern)?.length ?? 0), 0);
  if (count > 0) {
    firestoreMatches.push(`${path.relative(process.cwd(), file)} (패턴 ${count}건)`);
  }
}

const report = [
  '# verify-implementation 리포트',
  '',
  `- React 컴포넌트 네이밍 위반: ${namingViolations.length}건`,
  summarize(namingViolations),
  '',
  `- 파일 길이 경고(${maxLines}줄 초과): ${lineViolations.length}건`,
  summarize(lineViolations),
  '',
  '- Cloud Firestore 읽기 관련 패턴 점검',
  `  - 감지 파일: ${firestoreMatches.length}건`,
  summarize(firestoreMatches),
  '',
  '- 권장 액션',
  '  - 네이밍 위반이 있으면 PascalCase로 변경합니다.',
  '  - 파일 길이 경고가 있으면 기능별 모듈로 분리합니다.',
  '  - Firestore 읽기 패턴이 있으면 쿼리 범위를 줄이고 캐시 사용을 검토합니다.'
].join('\n');

console.log(report);

if (namingViolations.length > 0 || lineViolations.length > 0) {
  process.exitCode = 1;
}
