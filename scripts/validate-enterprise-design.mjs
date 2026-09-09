#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const EXPECTED_SECTIONS = [
  'Executive Summary',
  'Technical Approach',
  'Architecture Decisions',
  'Data Flow',
  'Working Set',
  'Read Order',
  'Expected Commands',
  'Design Confidence',
  'Exploration Budget',
  'Risks',
  'Testing Strategy',
  'Doorbell Tests',
  'Required ADRs',
  'Boundaries',
  'Extensibility',
  'Interfaces / Contracts',
  'Migration Strategy',
  'Open Questions',
];
const EXPECTED_TOPICS = [
  'Scalability',
  'Open/Closed Principle (OCP)',
  'Ownership',
  'Data Retention',
  'Idempotency',
  'Shared Contracts',
  'Partitioning Strategy',
];

export function validateEnterpriseDesign(text) {
  const failures = [];
  const sections = [...text.matchAll(/^##\s+(\d+)\.\s+(.+?)\s*$/gm)].map((match) => ({
    number: Number(match[1]),
    title: match[2],
  }));
  if (sections.length !== EXPECTED_SECTIONS.length) {
    failures.push(`expected exactly 18 numbered sections, found ${sections.length}`);
  } else {
    sections.forEach((section, index) => {
      if (section.number !== index + 1 || section.title !== EXPECTED_SECTIONS[index]) {
        failures.push(`section ${index + 1} must be "${EXPECTED_SECTIONS[index]}"`);
      }
    });
  }
  const reviewStart = text.search(/^##\s+Architecture Review Preparation\b.*$/m);
  const reviewEnd = text.search(/^##\s+16\.\s+/m);
  const review = reviewStart >= 0
    ? text.slice(reviewStart, reviewEnd > reviewStart ? reviewEnd : undefined)
    : '';
  const topics = [...review.matchAll(/^###\s+([A-G])\.\s+(.+?)\s*$/gm)].map((match) => ({
    letter: match[1],
    title: match[2],
  }));
  if (topics.length !== EXPECTED_TOPICS.length) {
    failures.push(`expected exactly 7 A-G Architecture Review topics, found ${topics.length}`);
  } else {
    topics.forEach((topic, index) => {
      if (topic.letter !== String.fromCharCode(65 + index) || topic.title !== EXPECTED_TOPICS[index]) {
        failures.push(`Architecture Review topic ${String.fromCharCode(65 + index)} is not canonical`);
      }
    });
  }
  if (!/\bDecision\b/i.test(text) || !/\bRationale\b/i.test(text)) {
    failures.push('Design must separate Decision and Rationale');
  }
  return { valid: failures.length === 0, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const requested = process.argv.slice(2).find((argument) => argument !== '--');
  const failures = [];
  if (!requested) failures.push('usage: node scripts/validate-enterprise-design.mjs <design-path>');
  const candidate = requested ? (isAbsolute(requested) ? requested : resolve(ROOT, requested)) : null;
  if (candidate) {
    const rel = relative(ROOT, candidate);
    if (rel.startsWith('..') || isAbsolute(rel)) failures.push('design path must be inside the repository');
    if (!existsSync(candidate)) failures.push(`missing design: ${rel}`);
    if (existsSync(candidate)) failures.push(...validateEnterpriseDesign(readFileSync(candidate, 'utf8')).failures);
  }
  if (failures.length > 0) {
    console.error(`Enterprise Design validation: FAIL (${requested || '<none>'})`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`Enterprise Design validation: PASS (${requested})`);
  }
}
