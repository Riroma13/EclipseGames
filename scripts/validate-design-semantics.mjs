#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateProjectProfile } from './sdd-runtime.mjs';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const DEFAULT_REQUIRED_TOPICS = [
  'intent',
  'approach',
  'architecture',
  'contracts',
  'boundaries',
  'working_set',
  'testing',
  'rollout',
  'simplicity',
];

const DEFAULT_ALIASES = {
  intent: ['Design', 'Context', 'Goals', 'Scope', 'Purpose', 'Intent'],
  approach: ['Technical Approach', 'Proposed design', 'Overview'],
  architecture: ['Architecture Decisions', 'Decisions', 'Architecture'],
  contracts: ['Data Flow', 'Data Flow and Contracts', 'Contracts', 'Interfaces'],
  boundaries: ['Failure and Privacy Boundaries', 'Privacy and security', 'Threat Matrix', 'Boundaries'],
  working_set: ['Working Set', 'Read Order', 'Expected files'],
  testing: ['Testing Strategy', 'Tests and acceptance', 'Evidence Plan'],
  rollout: ['Migration / Rollout', 'Rollout and rollback', 'Migration Strategy', 'Deployment and rollback'],
  simplicity: ['Simplicity Check', 'Simplicity'],
};

const CONTENT_RULES = {
  intent: /scope|goal|purpose|problem|objective|mvp|change|design|status|depend|delivery|approved/i,
  approach: /approach|reuse|refine|implement|architecture|existing|solution/i,
  architecture: /decision|component|ownership|model|rule|invariant|rationale/i,
  contracts: /contract|data|flow|api|route|interface|dto|service/i,
  boundaries: /failure|privacy|security|boundary|threat|error|archive|safe/i,
  working_set: /working\s*set|read\s*order|file|modify|create|scope|constraint/i,
  testing: /test|verify|evidence|playwright|vitest|acceptance|assert/i,
  rollout: /rollout|rollback|migration|deploy|release|schema|feature\s*flag/i,
  simplicity: /simple|simplicity|dashboard|complexity|future|scope|minimal/i,
};

const PLACEHOLDER_WORDS = new Set([
  'tbd',
  'todo',
  'placeholder',
  'pending',
  'unknown',
  'none',
  'n/a',
  'na',
  'later',
  'future',
  'defined',
  'determined',
  'decided',
]);

const BODY_LABEL_WORDS = new Set([
  'scope',
  'status',
  'context',
  'approach',
  'architecture',
  'decision',
  'decisions',
  'rationale',
  'contract',
  'contracts',
  'data',
  'flow',
  'failure',
  'privacy',
  'security',
  'boundary',
  'boundaries',
  'threat',
  'working',
  'set',
  'read',
  'order',
  'expected',
  'files',
  'testing',
  'tests',
  'evidence',
  'rollout',
  'rollback',
  'migration',
  'simplicity',
]);

const BODY_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'be',
  'by',
  'change',
  'contains',
  'covers',
  'defined',
  'describes',
  'details',
  'does',
  'for',
  'from',
  'has',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'part',
  'provides',
  'required',
  'section',
  'that',
  'the',
  'this',
  'to',
  'with',
]);

const MEANINGFUL_PROPOSITION = /\b(?:adopt\w*|allow\w*|apply\w*|approv\w*|avoid\w*|bound\w*|calculate\w*|clamp\w*|create\w*|define\w*|derive\w*|disable\w*|enforce\w*|ensure\w*|exclude\w*|expose\w*|fail\w*|flow\w*|identify\w*|implement\w*|integrat\w*|keep\w*|limit\w*|map\w*|modif\w*|omit\w*|own\w*|preserv\w*|prevent\w*|reject\w*|record\w*|remain\w*|reus\w*|select\w*|store\w*|support\w*|use\w*|verif\w*|validat\w*)\b/i;
const NON_GENERIC_PROPOSITION = /\b(?:adopt\w*|allow\w*|apply\w*|approv\w*|avoid\w*|bound\w*|calculate\w*|clamp\w*|create\w*|derive\w*|disable\w*|enforce\w*|ensure\w*|exclude\w*|expose\w*|fail\w*|flow\w*|identify\w*|implement\w*|integrat\w*|keep\w*|limit\w*|map\w*|modif\w*|omit\w*|own\w*|preserv\w*|prevent\w*|reject\w*|record\w*|remain\w*|reus\w*|select\w*|store\w*|support\w*|use\w*|verif\w*|validat\w*)\b/i;
const EXPLICIT_CONSTRAINT = /\b(?:cannot|must|never|no|not|only|without|unavailable|unchanged|none)\b/i;
const SELF_REFERENTIAL_TEMPLATE = /\b(?:this|the)\s+(?:section|topic|part)\b[\s\S]{0,180}\b(?:covers?|describes?|addresses?|contains?|provides?|defines?|details?|explains?)\b[\s\S]{0,180}\b(?:required|needed|for\s+(?:this|the)\s+change|in\s+this\s+design)\b/i;
const NORMALIZED_TOPIC_RESTATEMENT = /\b(?:this|the)\s+(?:approved\s+)?(?:design|decision|topic|section)\s+(?:defines?|describes?|covers?|addresses?|contains?|provides?)\b[\s\S]{0,120}\b(?:required|expected|necessary)\b[\s\S]{0,80}\b(?:for\s+(?:this|the)\s+change|in\s+this\s+design)\b/i;
const CONCRETE_DESIGN_SIGNAL = /(?:`[^`]+`|\b(?:api|route|endpoint|component|module|file|table|schema|migration|test|fixture|student|teacher|classroom|privacy|sqlite|react|fastify|typescript|repository)\b|[A-Za-z0-9_-]+\.(?:ts|tsx|js|mjs|md|sql)\b)/i;

function normalizeHeading(value) {
  return value
    .replace(/^\s*(?:\d+(?:\.\d+)*[.)]?|[A-G][.)])\s*/i, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function parseHeadings(text) {
  const matches = [...text.matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm)];
  return matches.map((match, index) => ({
    depth: match[1].length,
    title: match[2].trim(),
    normalized: normalizeHeading(match[2]),
    start: match.index,
    end: matches[index + 1]?.index ?? text.length,
    body: text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).trim(),
  }));
}

function meaningfulBodyText(body) {
  const normalized = body
    .replace(/^\s*#{1,6}\s+.*$/gm, ' ')
    .replace(/^\s*[-*_|`\s]+$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = normalized.match(/[A-Za-z][A-Za-z0-9'-]*/g) ?? [];
  const meaningfulWords = words.filter((word) => !PLACEHOLDER_WORDS.has(word.toLocaleLowerCase()));
  const contentWords = meaningfulWords.filter((word) => !BODY_LABEL_WORDS.has(word.toLocaleLowerCase()));
  return {
    text: normalized,
    meaningfulWords,
    contentWords,
    substantive: meaningfulWords.length >= 3 && contentWords.length > 0 && meaningfulWords.join(' ').length >= 20,
  };
}

function hasSubstantiveTopicMeaning(body, topic) {
  if (!body.substantive) return false;
  if (SELF_REFERENTIAL_TEMPLATE.test(body.text) && !NON_GENERIC_PROPOSITION.test(body.text)) return false;
  if (NORMALIZED_TOPIC_RESTATEMENT.test(body.text) && !CONCRETE_DESIGN_SIGNAL.test(body.text)) return false;

  const domainWords = body.meaningfulWords.filter((word) => {
    const normalized = word.toLocaleLowerCase();
    return !BODY_LABEL_WORDS.has(normalized) && !BODY_STOP_WORDS.has(normalized);
  });
  if (domainWords.length < 1) return false;

  // A heading label plus a generic sentence is not a design proposition. The
  // signal rule below supplies topic relevance; this check requires an
  // action, invariant, or explicit constraint that says what the design does.
  if (!MEANINGFUL_PROPOSITION.test(body.text) && !EXPLICIT_CONSTRAINT.test(body.text)) return false;
  const rule = CONTENT_RULES[topic];
  return !rule || rule.test(body.text);
}

function topicAliases(mapping, topic) {
  return mapping.heading_aliases?.[topic] ?? DEFAULT_ALIASES[topic] ?? [topic];
}

function findTopic(headings, mapping, topic) {
  const aliases = topicAliases(mapping, topic).map(normalizeHeading);
  return headings.find((heading) => aliases.includes(heading.normalized)) ?? null;
}

function validateReview(reviewText, reviewSemantics) {
  const errors = [];
  if (!reviewText || !reviewSemantics) return errors;
  const headings = parseHeadings(reviewText);
  const joined = reviewText.toLocaleLowerCase();
  const required = reviewSemantics.required_meanings ?? [];
  const patterns = {
    outcome: /outcome|result|decision|approved|blocked|pass/i,
    evidence: /evidence|reviewed|inspection|test/i,
    findings: /finding|condition|validation|risk|blocker/i,
    'next step': /next\s+(?:step|recommended)|follow[- ]?up|tasks/i,
  };
  for (const meaning of required) {
    const pattern = patterns[meaning.toLocaleLowerCase()] ?? new RegExp(meaning, 'i');
    if (!pattern.test(reviewText)) errors.push(`Architecture Review is missing semantic meaning: ${meaning}`);
  }
  if (reviewSemantics.heading_aliases?.length > 0) {
    const normalized = new Set(headings.map((heading) => heading.normalized));
    const present = reviewSemantics.heading_aliases.some((alias) => normalized.has(normalizeHeading(alias)));
    if (!present && !/architecture\s+validation|executive\s+summary/i.test(joined)) {
      errors.push('Architecture Review has no recognized review topic');
    }
  }
  return errors;
}

export function validateSemanticDesign(text, profileOrMapping) {
  const mapping = profileOrMapping?.semanticValidation ?? profileOrMapping?.semantic_validation ?? profileOrMapping ?? {};
  const requiredTopics = mapping.required_topics?.length ? mapping.required_topics : DEFAULT_REQUIRED_TOPICS;
  const headings = parseHeadings(text);
  const errors = [];
  const topics = {};
  for (const topic of requiredTopics) {
    const heading = findTopic(headings, mapping, topic);
    if (!heading) {
      errors.push(`missing mandatory semantic topic: ${topic}`);
      continue;
    }
    const body = meaningfulBodyText(heading.body);
    if (!hasSubstantiveTopicMeaning(body, topic)) {
      errors.push(`semantic topic ${topic} has no substantive content`);
      continue;
    }
    const rule = CONTENT_RULES[topic];
    if (rule && !rule.test(body.text)) errors.push(`semantic topic ${topic} lacks its required meaning`);
    topics[topic] = { heading: heading.title, depth: heading.depth };
  }
  return { valid: errors.length === 0, errors, topics };
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function isHistoricalDesign(text, designPath, profile) {
  if (/^\s*(?:\*{0,2})?(?:status|state|lifecycle|change_status)(?:\*{0,2})\s*:\s*(?:\*{0,2})?\s*(?:archived|historical|superseded|closed|repository_ready)\b/im.test(text)) return true;
  if (/^\s*(?:#|>|\*\*)?\s*(?:historical|superseded)\b/im.test(text)) return true;
  return false;
}

export function validateDesignFile({ designPath, profile, root = ROOT, activeOnly = false, historicalBypass = false } = {}) {
  if (typeof designPath !== 'string') return { valid: false, errors: ['design path is required'], topics: {} };
  const candidate = isAbsolute(designPath) ? designPath : resolve(root, designPath);
  const rel = relative(root, candidate);
  if (rel.startsWith('..') || isAbsolute(rel)) return { valid: false, errors: ['design path must be inside the repository'], topics: {} };
  if (!existsSync(candidate)) return { valid: false, errors: [`missing design: ${rel}`], topics: {} };
  const text = readFileSync(candidate, 'utf8');
  const profileData = profile?.project_profile ?? profile ?? {};
  const result = validateSemanticDesign(text, profileData);
  const mapping = profileData.semanticValidation ?? profileData.semantic_validation;
  const reviewArtifact = profileData.lifecycleArtifacts?.['Architecture Review'] ?? profileData.lifecycle_artifacts?.['Architecture Review'] ?? 'ARCHITECTURE-REVIEW.md';
  const reviewPath = join(dirname(candidate), reviewArtifact);
  if (existsSync(reviewPath)) result.errors.push(...validateReview(readFileSync(reviewPath, 'utf8'), mapping?.review_semantics));
  const historical = isHistoricalDesign(text, candidate, profileData);
  if (historical && (activeOnly || historicalBypass)) {
    return {
      valid: true,
      errors: [],
      topics: {},
      historical: true,
      skipped: true,
      diagnosticErrors: [...result.errors],
    };
  }
  result.valid = result.errors.length === 0;
  return { ...result, historical, skipped: false, diagnosticErrors: [] };
}

export function diagnoseHistoricalDesign(options = {}) {
  return validateDesignFile({ ...options, historicalBypass: true });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const argumentsList = process.argv.slice(2);
  const activeOnly = argumentsList.includes('--active-only');
  const historicalBypass = argumentsList.includes('--historical-diagnostic');
  const requested = argumentsList.find((argument) => !argument.startsWith('--'));
  if (!requested) {
    console.error('usage: pnpm sdd:validate:design -- <design-path>');
    process.exitCode = 1;
  } else {
    const mapPath = resolve(ROOT, '.opencode', 'sdd-model-map.json');
    let profile = null;
    try {
      profile = validateProjectProfile(readJson(mapPath));
    } catch (error) {
      console.error(`Design profile validation: FAIL (${error.message})`);
      process.exitCode = 1;
    }
    if (profile) {
      const result = validateDesignFile({ designPath: requested, profile, activeOnly, historicalBypass });
      const displayPath = isAbsolute(requested) ? relative(ROOT, requested) : requested;
      if (result.skipped) {
        console.log(`Semantic Design validation: SKIP (${displayPath}; historical diagnostic only)`);
      } else if (!result.valid) {
        console.error(`Semantic Design validation: FAIL (${displayPath})`);
        result.errors.forEach((error) => console.error(`- ${error}`));
        process.exitCode = 1;
      } else {
        console.log(`Semantic Design validation: PASS (${displayPath})`);
        console.log(`- ${Object.keys(result.topics).length} mandatory semantic topics validated`);
      }
    }
  }
}
