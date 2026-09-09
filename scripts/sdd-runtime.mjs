#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  link,
  unlink,
  readdir,
} from 'node:fs/promises';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

export const CHANGE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const RUNTIME_SCHEMA_VERSION = 2;
export const TRACE_SCHEMA_VERSION = 1;
export const LOGICAL_ROLES = new Set(['SOL', 'HIGH', 'MID', 'LOW', 'HUMAN']);
export const RUNTIME_STATUSES = new Set([
  'READY',
  'RUNNING',
  'BLOCKED',
  'HUMAN_HANDOFF',
  'COMPLETED',
]);

const PORTABLE_ACTIONS = [
  'Design',
  'Architecture Review',
  'Design Refinement',
  'Tasks',
  'Tasks Review',
  'Tasks Refinement',
  'Workload Guard',
  'Apply 7.1 Foundation',
  'Apply 7.2 Core Engine',
  'Apply 7.3 Feature Implementation',
  'Apply 7.4 Integration',
  'Apply 7.5 Testing',
  'Apply 7.6 Apply Summary',
  'Verify',
  'Archive',
  'Health Report',
  'Repository Ready',
];

const ECLIPSEGAMES_ACTIONS = [
  'Design',
  'Architecture Review',
  'Design Refinement',
  'Tasks',
  'Tasks Review',
  'Tasks Refinement',
  'Apply',
  'Apply Summary',
  'Verify',
  'Archive',
  'Health Report',
  'Repository Ready',
];

export const CANONICAL_ACTIONS = new Set(PORTABLE_ACTIONS);
export const ALL_CANONICAL_ACTIONS = new Set([
  ...PORTABLE_ACTIONS,
  ...ECLIPSEGAMES_ACTIONS,
]);
export const STRANDED_RECOVERY_OPERATION = 'RECOVER_STRANDED_CHECKPOINT';
export const STRANDED_RECOVERY_TARGET = 'Apply 7.3 Feature Implementation';
export const DISPATCH_MATERIALIZATION_RECOVERY_OPERATION =
  'RECOVER_DISPATCH_MATERIALIZATION';

const TRANSITION_LOCK_NAME = 'transition.lock';
const TRANSITION_LOCK_WAIT_MS = 10;
const TRANSITION_LOCK_TIMEOUT_MS = 5000;

const REQUIRED_HUMAN_GIT_OPERATIONS = Object.freeze([
  'git add',
  'git commit',
  'git push',
  'git branch',
  'git config',
  'git notes',
  'git apply',
  'pull request',
  'CI wait',
  'merge',
  'release',
  'tag',
]);

const RESERVED_HUMAN_PHASES = new Set(['Commit', 'Push', 'Merge']);

export const STRANDED_RECOVERY_AUTHORITY_REFERENCES = Object.freeze({
  workflow: 'docs/SDD-WORKFLOW.md',
  modelMap: '.opencode/sdd-model-map.json',
  config: 'openspec/config.yaml',
});

const PORTABLE_ROLES = Object.freeze({
  Design: 'HIGH',
  'Architecture Review': 'HIGH',
  'Design Refinement': 'HIGH',
  Tasks: 'MID',
  'Tasks Review': 'MID',
  'Tasks Refinement': 'MID',
  'Workload Guard': 'MID',
  'Apply 7.1 Foundation': 'MID',
  'Apply 7.2 Core Engine': 'MID',
  'Apply 7.3 Feature Implementation': 'MID',
  'Apply 7.4 Integration': 'MID',
  'Apply 7.5 Testing': 'MID',
  'Apply 7.6 Apply Summary': 'MID',
  Verify: 'HIGH',
  Archive: 'LOW',
  'Health Report': 'LOW',
  'Repository Ready': 'LOW',
});

const PORTABLE_EDGES = Object.freeze({
  Design: 'Architecture Review',
  'Architecture Review': 'Tasks',
  'Design Refinement': 'Architecture Review',
  Tasks: 'Tasks Review',
  'Tasks Review': 'Workload Guard',
  'Tasks Refinement': 'Tasks Review',
  'Workload Guard': 'Apply 7.1 Foundation',
  'Apply 7.1 Foundation': 'Apply 7.2 Core Engine',
  'Apply 7.2 Core Engine': 'Apply 7.3 Feature Implementation',
  'Apply 7.3 Feature Implementation': 'Apply 7.4 Integration',
  'Apply 7.4 Integration': 'Apply 7.5 Testing',
  'Apply 7.5 Testing': 'Apply 7.6 Apply Summary',
  'Apply 7.6 Apply Summary': 'Verify',
  Verify: 'Archive',
  Archive: 'Health Report',
  'Health Report': 'Repository Ready',
});

const PORTABLE_ARTIFACTS = Object.freeze({
  Design: 'design.md',
  'Architecture Review': 'architecture-review.md',
  'Design Refinement': 'design.md',
  Tasks: 'tasks.md',
  'Tasks Review': 'tasks-review.md',
  'Tasks Refinement': 'tasks.md',
  'Workload Guard': 'workload-guard.md',
  'Apply 7.1 Foundation': 'apply-7.1-foundation.md',
  'Apply 7.2 Core Engine': 'apply-7.2-core-engine.md',
  'Apply 7.3 Feature Implementation': 'apply-7.3-feature-implementation.md',
  'Apply 7.4 Integration': 'apply-7.4-integration.md',
  'Apply 7.5 Testing': 'apply-7.5-testing.md',
  'Apply 7.6 Apply Summary': 'apply-7.6-apply-summary.md',
  Verify: 'verify-report.md',
  Archive: 'archive-report.md',
  'Health Report': 'health-report.md',
  'Repository Ready': 'repository-ready.md',
});

const ECLIPSEGAMES_ROLES = Object.freeze({
  Design: 'SOL',
  'Architecture Review': 'HIGH',
  'Design Refinement': 'SOL',
  Tasks: 'MID',
  'Tasks Review': 'MID',
  'Tasks Refinement': 'MID',
  Apply: 'MID',
  'Apply Summary': 'MID',
  Verify: 'HIGH',
  Archive: 'LOW',
  'Health Report': 'LOW',
  'Repository Ready': 'LOW',
});

const ECLIPSEGAMES_EDGES = Object.freeze({
  Design: 'Architecture Review',
  'Design Refinement': 'Architecture Review',
  'Architecture Review': 'Tasks',
  Tasks: 'Tasks Review',
  'Tasks Refinement': 'Tasks Review',
  'Tasks Review': 'Apply',
  Apply: 'Apply Summary',
  'Apply Summary': 'Verify',
  Verify: 'Archive',
  Archive: 'Health Report',
  'Health Report': 'Repository Ready',
});

const ECLIPSEGAMES_ARTIFACTS = Object.freeze({
  Design: 'DESIGN.md',
  'Architecture Review': 'ARCHITECTURE-REVIEW.md',
  'Design Refinement': 'DESIGN.md',
  Tasks: 'TASKS.md',
  'Tasks Review': 'TASKS-REVIEW.md',
  'Tasks Refinement': 'TASKS.md',
  Apply: 'APPLY-PROGRESS.md',
  'Apply Summary': 'APPLY-SUMMARY.md',
  Verify: 'VERIFY-REPORT.md',
  Archive: 'ARCHIVE-REPORT.md',
  'Health Report': 'HEALTH-REPORT.md',
  'Repository Ready': 'REPOSITORY-READY.md',
});

const HUMAN_CLASSES = new Set([
  'HUMAN_ARCHITECTURE',
  'HUMAN_SECURITY',
  'HUMAN_SCOPE',
  'HUMAN_GIT',
  'HUMAN_RISK_ACCEPTANCE',
  'HUMAN_INFRASTRUCTURE',
  'FATAL_INVARIANT',
]);
const AUTO_CLASSES = new Set([
  'AUTO_RETRY',
  'AUTO_REFINE',
  'AUTO_RECOVER',
  'ENVIRONMENT_RECOVERABLE',
  'PROVIDER_FALLBACK',
]);

export const BLOCKER_POLICIES = Object.freeze({
  AUTO_RETRY: { human_required: false, policy: 'RETRY_CURRENT_ACTION' },
  AUTO_REFINE: { human_required: false, policy: 'CANONICAL_REFINEMENT' },
  AUTO_RECOVER: { human_required: false, policy: 'CANONICAL_RECOVERY' },
  ENVIRONMENT_RECOVERABLE: {
    human_required: false,
    policy: 'ENVIRONMENT_RECOVERY',
  },
  PROVIDER_FALLBACK: {
    human_required: false,
    policy: 'SAME_ROLE_FALLBACK',
  },
  HUMAN_ARCHITECTURE: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_SECURITY: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_SCOPE: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_GIT: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_RISK_ACCEPTANCE: {
    human_required: true,
    policy: 'STOP/HUMAN_HANDOFF',
  },
  HUMAN_INFRASTRUCTURE: {
    human_required: true,
    policy: 'STOP/HUMAN_HANDOFF',
  },
  FATAL_INVARIANT: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
});

const REFINEMENT_BY_BLOCKED_REVIEW = Object.freeze({
  'Architecture Review': 'Design Refinement',
  'Tasks Review': 'Tasks Refinement',
});

const fail = (message) => {
  throw new TypeError(message);
};
const assertObject = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
};
const own = (value, allowed) => Object.keys(value).every((key) => allowed.has(key));
const hex = /^[a-f0-9]{64}$/;
const assertHash = (value, name) => {
  if (typeof value !== 'string' || !hex.test(value)) {
    fail(`${name} must be a sha256 hash`);
  }
};

function safeRelativePath(value, name) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    isAbsolute(value) ||
    value.split(/[\\/]/).includes('..')
  ) {
    fail(`${name} must be a safe relative repository path`);
  }
  return value;
}

function profileOptions(profile) {
  const source = profile?.project_profile ?? profile ?? {};
  const lifecycle = source.lifecycle ?? {};
  const custom = source.customLifecycle === true ||
    source.changes_root === 'docs/specs' ||
    source.changesRoot === 'docs/specs' ||
    source.semantic_validation?.profile === 'eclipsegames' ||
    source.semanticValidation?.profile === 'eclipsegames';
  return {
    custom,
    changesRoot: source.changes_root ?? source.changesRoot ?? 'openspec/changes',
    runtimeDirectory:
      source.runtime_directory ?? source.runtimeDirectory ?? '.sdd-runtime',
    runtimeLayout: source.runtime_layout ?? source.runtimeLayout ?? {
      state: 'state.json',
      trace: 'trace',
      recovery: 'recovery',
      locks: 'locks',
      checkpoints: 'checkpoints',
    },
    archiveBehavior: source.archive_behavior ?? source.archiveBehavior ?? 'relocate',
    authorityRefs: source.authority_refs ?? source.authorityRefs ?? {
      workflow: 'docs/SDD-WORKFLOW.md',
      modelMap: '.opencode/sdd-model-map.json',
      config: 'openspec/config.yaml',
    },
    phases: custom ? [...(lifecycle.phases ?? ECLIPSEGAMES_ACTIONS)] : PORTABLE_ACTIONS,
    roles: custom
      ? { ...(lifecycle.roles ?? ECLIPSEGAMES_ROLES) }
      : PORTABLE_ROLES,
    edges: custom
      ? { ...(lifecycle.edges ?? ECLIPSEGAMES_EDGES) }
      : PORTABLE_EDGES,
    artifacts: source.lifecycle_artifacts ?? source.lifecycleArtifacts ??
      (custom ? ECLIPSEGAMES_ARTIFACTS : PORTABLE_ARTIFACTS),
    terminal: lifecycle.terminal ?? 'Repository Ready',
  };
}

function projectionFor(profileOrProjection = undefined) {
  if (
    profileOrProjection &&
    Array.isArray(profileOrProjection.phases) &&
    profileOrProjection.roles &&
    profileOrProjection.edges
  ) {
    return profileOrProjection;
  }
  const options = profileOptions(profileOrProjection);
  return {
    phases: [...options.phases],
    roles: { ...options.roles },
    edges: { ...options.edges },
    artifacts: { ...options.artifacts },
    terminal: options.terminal,
  };
}

function actionsOf(projection) {
  return new Set(projection.phases);
}

function isKnownAction(action, projection = projectCanonicalWorkflow()) {
  return typeof action === 'string' && actionsOf(projection).has(action);
}

function runtimeDirectory(changePath, profile) {
  return join(changePath, profileOptions(profile).runtimeDirectory);
}

function runtimePath(changePath, profile, entry) {
  const options = profileOptions(profile);
  return join(runtimeDirectory(changePath, profile), options.runtimeLayout[entry]);
}

async function ensureProfileRuntimeLayout(changePath, profile) {
  const options = profileOptions(profile);
  if (!options.custom) return;
  await Promise.all(
    ['trace', 'recovery', 'locks', 'checkpoints'].map((entry) =>
      mkdir(runtimePath(changePath, profile, entry), { recursive: true }),
    ),
  );
}

export function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== 'object') fail('canonical JSON only accepts JSON values');
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

export function sha256(value) {
  return createHash('sha256')
    .update(
      typeof value === 'string' || value instanceof Uint8Array
        ? value
        : canonicalJson(value),
    )
    .digest('hex');
}

export function hashObject(value) {
  return sha256(value);
}

export function validateChangeName(change) {
  if (typeof change !== 'string' || !CHANGE_NAME_PATTERN.test(change)) {
    fail('invalid change name');
  }
  return change;
}

export function validateIdentity({ root, change, canonicalPath, profile } = {}) {
  if (typeof root !== 'string' || !isAbsolute(root)) {
    fail('canonical root must be absolute');
  }
  validateChangeName(change);
  const options = profileOptions(profile);
  safeRelativePath(options.changesRoot, 'changes root');
  const expected = join(resolve(root), options.changesRoot, change);
  if (canonicalPath !== undefined && resolve(canonicalPath) !== expected) {
    fail('canonical path mismatch');
  }
  if (relative(resolve(root), expected).startsWith('..')) {
    fail('change path escapes canonical root');
  }
  return { root: resolve(root), change, changePath: expected };
}

export function archiveDestinationPath({ root, change, date = new Date(), profile } = {}) {
  const identity = validateIdentity({ root, change, profile });
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) fail('invalid archive date');
  if (profileOptions(profile).archiveBehavior === 'in-place') return identity.changePath;
  const datePrefix = date.toISOString().slice(0, 10);
  return join(dirname(identity.changePath), 'archive', `${datePrefix}-${change}`);
}

export function validateScope(scope = {}) {
  const identity = validateIdentity(scope);
  if (scope.branch !== undefined && (typeof scope.branch !== 'string' || !scope.branch.trim())) {
    fail('invalid branch');
  }
  if (
    scope.workingSet !== undefined &&
    (!Array.isArray(scope.workingSet) ||
      scope.workingSet.some(
        (item) => typeof item !== 'string' || isAbsolute(item) || item.includes('..'),
      ))
  ) {
    fail('invalid Working Set');
  }
  return { ...identity, branch: scope.branch ?? null, workingSet: scope.workingSet ?? [] };
}

export async function fingerprintFiles(files) {
  const result = {};
  for (const file of [...files].sort()) result[file] = sha256(await readFile(file));
  return result;
}

function repositoryFilePath(root, reference, name) {
  if (typeof root !== 'string' || !isAbsolute(root)) fail('canonical root must be absolute');
  const rootPath = resolve(root);
  const target = resolve(rootPath, safeRelativePath(reference, name));
  const targetRelative = relative(rootPath, target);
  if (targetRelative.startsWith('..') || isAbsolute(targetRelative)) {
    fail(`${name} escapes canonical root`);
  }
  return target;
}

function changeFilePath(changePath, reference, name) {
  if (typeof changePath !== 'string' || !isAbsolute(changePath)) {
    fail('change path must be absolute');
  }
  const changeRoot = resolve(changePath);
  const target = resolve(changeRoot, safeRelativePath(reference, name));
  const targetRelative = relative(changeRoot, target);
  if (targetRelative.startsWith('..') || isAbsolute(targetRelative)) {
    fail(`${name} escapes change path`);
  }
  return target;
}

function assertRegularFile(filePath, name) {
  const stats = lstatSync(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) fail(`${name} must be a regular file`);
}

export function fingerprintConfiguredAuthorities({ root, changePath, profile, artifactNames = [] } = {}) {
  const options = profileOptions(profile);
  const fingerprints = { artifacts: {} };
  for (const key of ['workflow', 'modelMap', 'config']) {
    const filePath = repositoryFilePath(root, options.authorityRefs[key], `authorityRefs.${key}`);
    assertRegularFile(filePath, `authorityRefs.${key}`);
    fingerprints[key] = sha256(readFileSync(filePath));
  }
  if (artifactNames.length > 0) {
    if (typeof changePath !== 'string' || !isAbsolute(changePath)) fail('change path must be absolute');
    for (const artifact of [...artifactNames].sort()) {
      const filePath = changeFilePath(changePath, artifact, `fingerprints.artifacts.${artifact}`);
      try {
        assertRegularFile(filePath, `fingerprints.artifacts.${artifact}`);
      } catch (error) {
        if (error.code === 'ENOENT') fail(`missing-authoritative-artifact: ${artifact}`);
        throw error;
      }
      fingerprints.artifacts[artifact] = sha256(readFileSync(filePath));
    }
  }
  return fingerprints;
}

export async function atomicWriteJson(target, value) {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, target);
  const directory = await open(dirname(target), 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
  return target;
}

async function writeExclusiveJson(target, value) {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, target);
  } finally {
    await unlink(temporary).catch(() => {});
  }
  const directory = await open(dirname(target), 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

async function acquireTransitionLock(lockPath) {
  await mkdir(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + TRANSITION_LOCK_TIMEOUT_MS;
  while (true) {
    try {
      return await open(lockPath, 'wx', 0o600);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) fail('transition lock unavailable');
      await new Promise((resolvePromise) => setTimeout(resolvePromise, TRANSITION_LOCK_WAIT_MS));
    }
  }
}

async function withTransitionLock(changePath, profile, operation) {
  const lockPath = join(runtimePath(changePath, profile, 'locks'), TRANSITION_LOCK_NAME);
  const lock = await acquireTransitionLock(lockPath);
  try {
    return await operation();
  } finally {
    await lock.close();
    await unlink(lockPath).catch(() => {});
  }
}

export function projectCanonicalWorkflow(profile = undefined) {
  const projection = projectionFor(profile);
  return {
    phases: [...projection.phases],
    roles: { ...projection.roles },
    edges: { ...projection.edges },
    artifacts: { ...projection.artifacts },
    terminal: projection.terminal,
  };
}

function lifecyclePathTo(projection, target) {
  if (target === null || target === undefined) return [];
  if (!isKnownAction(target, projection)) fail(`unknown lifecycle phase ${target}`);

  const path = [];
  const visited = new Set();
  let current = projection.phases[0];
  while (current) {
    if (visited.has(current)) fail(`lifecycle ordering contains a cycle at ${current}`);
    visited.add(current);
    path.push(current);
    if (current === target) return path;
    current = projection.edges[current] ?? null;
  }

  // Refinements are conditional branches from a blocked review, so they are
  // intentionally absent from the normal edge walk. Their predecessor chain
  // is still deterministic for artifact validation.
  if (target === 'Design Refinement') {
    const review = 'Architecture Review';
    if (isKnownAction(review, projection)) return [...lifecyclePathTo(projection, review), target];
  }
  if (target === 'Tasks Refinement') {
    const review = 'Tasks Review';
    if (isKnownAction(review, projection)) return [...lifecyclePathTo(projection, review), target];
  }
  fail(`lifecycle phase ${target} is not reachable from Design`);
}

export function canonicalLifecyclePath(phase, profileOrProjection = undefined) {
  return lifecyclePathTo(projectionFor(profileOrProjection), phase);
}

function checkpointField(text, fields) {
  const fieldPattern = fields.join('|');
  return text.match(new RegExp(`^\\s*(?:\\*{0,2})?(?:${fieldPattern})(?:\\*{0,2})\\s*:\\s*(?:\\*{0,2})?(.+?)(?:\\*{0,2})?\\s*$`, 'im'))?.[1]?.trim() ?? null;
}

export function artifactCheckpointStatus(text) {
  if (typeof text !== 'string') return null;
  if (checkpointField(text, ['Repository Ready'])?.toLocaleUpperCase() === 'YES') return 'PASS';
  const raw = checkpointField(text, ['status', 'state', 'verdict', 'lifecycle', 'change_status']);
  if (!raw) return null;
  const value = raw
    .split(/\s+\|\s+/, 1)[0]
    .replace(/[\\`*]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase();
  const first = value.split(/\s+WITH\s+/i, 1)[0];
  if (['PASS', 'PASSED', 'SUCCESS', 'COMPLETE', 'COMPLETED', 'ARCHIVED', 'APPROVED'].includes(first)) return 'PASS';
  if (/^(?:BLOCKED|FAILED|FAIL)(?:\b|\s)/i.test(value)) return 'BLOCKED';
  return null;
}

function lifecycleArtifactEntries(projection, phase) {
  const path = lifecyclePathTo(projection, phase);
  const seen = new Set();
  return path.flatMap((current) => {
    const artifact = projection.artifacts[current];
    if (seen.has(artifact)) return [];
    seen.add(artifact);
    return [{ phase: current, artifact }];
  });
}

function readLifecycleArtifact(changePath, artifact) {
  const filePath = join(changePath, artifact);
  let stats;
  try {
    stats = lstatSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return { phase: null, artifact, path: filePath, present: false, status: null, text: null };
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) fail(`invalid authoritative artifact ${artifact}`);
  const text = readFileSync(filePath, 'utf8');
  return { phase: null, artifact, path: filePath, present: true, status: artifactCheckpointStatus(text), text };
}

export function inspectAuthoritativeLifecycle({ changePath, profile = undefined } = {}) {
  if (typeof changePath !== 'string' || !isAbsolute(changePath)) fail('change path must be absolute');
  const projection = projectCanonicalWorkflow(profile);
  const path = lifecyclePathTo(projection, projection.terminal);
  const entries = lifecycleArtifactEntries(projection, projection.terminal).map(({ phase, artifact }) => ({
    ...readLifecycleArtifact(changePath, artifact),
    phase,
  }));
  let latest = null;
  for (const entry of entries) {
    if (entry.present && entry.status !== null) {
      latest = {
        artifact: entry.artifact,
        phase: entry.phase,
        status: entry.status,
        next: checkpointField(entry.text, ['next']) ?? projection.edges[entry.phase] ?? null,
      };
    }
  }
  return {
    projection,
    path,
    entries,
    latest,
    hasEvidence: entries.some((entry) => entry.present),
  };
}

export function firstIncompleteLifecycleAction({ changePath, profile = undefined, inspection = undefined } = {}) {
  const inspected = inspection ?? inspectAuthoritativeLifecycle({ changePath, profile });
  return inspected.entries.find((entry) => !entry.present || entry.status !== 'PASS')?.phase ?? null;
}

export function validateAuthoritativeArtifacts({
  changePath,
  profile = undefined,
  phase,
  verdict = 'PASS',
  checkpoint = undefined,
  inspection = undefined,
  projection = undefined,
} = {}) {
  if (typeof changePath !== 'string' || !isAbsolute(changePath)) fail('change path must be absolute');
  const selectedProjection = projection ?? projectCanonicalWorkflow(profile);
  if (phase === null || phase === undefined) return { artifactNames: [], entries: [] };
  if (!isKnownAction(phase, selectedProjection)) fail(`unknown lifecycle phase ${phase}`);
  const inspected = inspection ?? inspectAuthoritativeLifecycle({ changePath, profile: selectedProjection });
  const entries = lifecycleArtifactEntries(selectedProjection, phase).map(({ phase: entryPhase, artifact }) =>
    inspected.entries.find((entry) => entry.artifact === artifact) ?? {
      phase: entryPhase,
      artifact,
      path: join(changePath, artifact),
      present: false,
      status: null,
      text: null,
    },
  );
  const targetArtifact = selectedProjection.artifacts[phase];
  for (const entry of entries) {
    if (!entry.present) {
      if (entry.artifact === targetArtifact) fail(`missing-authoritative-artifact: ${entry.artifact}`);
      fail(`inconsistent-lifecycle: predecessor ${entry.phase} artifact is missing`);
    }
    if (entry.artifact === targetArtifact) {
      if (verdict === 'PASS' && entry.status !== 'PASS') {
        fail(`artifact-state-divergence: ${entry.artifact} does not prove PASS`);
      }
      if (verdict === 'BLOCKED' && !['PASS', 'BLOCKED'].includes(entry.status)) {
        fail(`artifact-state-divergence: ${entry.artifact} does not prove the blocked checkpoint`);
      }
    } else if (entry.status !== 'PASS') {
      fail(`inconsistent-lifecycle: predecessor ${entry.phase} is not complete`);
    }
    const declaredNext = checkpointField(entry.text, ['next']);
    if (declaredNext !== null) {
      const expectedNext = selectedProjection.edges[entry.phase] ?? null;
      const terminalAliases = expectedNext === null && ['STOP', 'HUMAN_HANDOFF'].includes(declaredNext.toLocaleUpperCase());
      if (declaredNext !== expectedNext && !terminalAliases) {
        fail(`inconsistent-lifecycle: ${entry.phase} declares an impossible next action`);
      }
    }
    if (entry.status === 'BLOCKED') validateBlockedCheckpoint(entry.phase, declaredNext, selectedProjection);
  }
  if (checkpoint) {
    if (checkpoint.phase !== phase) fail('artifact-state-divergence: checkpoint phase mismatch');
    if (checkpoint.verdict === 'PASS' && checkpoint.next !== (selectedProjection.edges[phase] ?? null)) {
      fail(`inconsistent-lifecycle: checkpoint next action does not follow ${phase}`);
    }
    if (
      checkpoint.verdict === 'BLOCKED' &&
      checkpoint.next !== null &&
      !isKnownAction(checkpoint.next, selectedProjection)
    ) {
      fail('inconsistent-lifecycle: blocked checkpoint has an unknown next action');
    }
  }
  return { artifactNames: entries.map((entry) => entry.artifact), entries };
}

export function fingerprintLifecycleArtifacts({ changePath, profile = undefined, phase, projection = undefined } = {}) {
  if (typeof changePath !== 'string' || !isAbsolute(changePath)) fail('change path must be absolute');
  const selectedProjection = projection ?? projectCanonicalWorkflow(profile);
  const entries = lifecycleArtifactEntries(selectedProjection, phase);
  const fingerprints = {};
  for (const entry of entries) {
    const filePath = join(changePath, entry.artifact);
    try {
      assertRegularFile(filePath, `authoritative artifact ${entry.artifact}`);
    } catch (error) {
      if (error.code === 'ENOENT') fail(`missing-authoritative-artifact: ${entry.artifact}`);
      throw error;
    }
    fingerprints[entry.artifact] = sha256(readFileSync(filePath));
  }
  return fingerprints;
}

export function buildInitialState({ root, change, fingerprints, profile } = {}) {
  const identity = validateIdentity({ root, change, profile });
  const completeFingerprints = { artifacts: {}, ...fingerprints };
  for (const key of ['workflow', 'modelMap', 'config']) {
    assertHash(completeFingerprints[key], `fingerprints.${key}`);
  }
  return validateRuntimeState({
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    change,
    canonicalPath: identity.changePath,
    status: 'READY',
    sequence: 0,
    checkpoint: { phase: null, artifact: null, verdict: null, next: 'Design' },
    fingerprints: completeFingerprints,
    attempts: {},
    traceCursor: { sequence: 0, eventHash: null, chainHash: null },
    lastTransition: null,
  });
}

export async function bootstrapChange({ root, change, fingerprints, profile } = {}) {
  const identity = validateIdentity({ root, change, profile });
  const initialState = buildInitialState({ root, change, fingerprints, profile });
  const options = profileOptions(profile);
  let created = false;

  await mkdir(dirname(identity.changePath), { recursive: true });
  try {
    await mkdir(identity.changePath);
    created = true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }

  const statePath = runtimePath(identity.changePath, profile, 'state');
  if (created) {
    await ensureProfileRuntimeLayout(identity.changePath, profile);
    await writeExclusiveJson(statePath, initialState);
    return { changePath: identity.changePath, state: initialState, disposition: 'CREATED' };
  }

  try {
    const existing = JSON.parse(await readFile(statePath, 'utf8'));
    validateRuntimeState(existing);
    if (
      existing.change !== change ||
      existing.canonicalPath !== identity.changePath ||
      canonicalJson(existing.fingerprints) !== canonicalJson(initialState.fingerprints)
    ) {
      throw new TypeError('existing state does not match identity');
    }
    return { changePath: identity.changePath, state: existing, disposition: 'REUSED' };
  } catch (error) {
    if (error.code === 'ENOENT' && options.archiveBehavior === 'in-place') {
      await ensureProfileRuntimeLayout(identity.changePath, profile);
      await writeExclusiveJson(statePath, initialState);
      return {
        changePath: identity.changePath,
        state: initialState,
        disposition: 'CREATED_RUNTIME',
      };
    }
    throw new TypeError(`bootstrap provenance conflict: ${error.message}`);
  }
}

export function validateBlocker(blocker) {
  assertObject(blocker, 'blocker');
  if (!own(blocker, new Set(['class', 'human_required', 'reason', 'resume_phase']))) {
    fail('unknown blocker field');
  }
  const policy = BLOCKER_POLICIES[blocker.class];
  if (!policy) fail('unknown blocker class');
  if (typeof blocker.human_required !== 'boolean' || blocker.human_required !== policy.human_required) {
    fail('human_required mismatch');
  }
  if (typeof blocker.reason !== 'string' || !blocker.reason.trim()) fail('invalid blocker reason');
  if (
    blocker.resume_phase !== null &&
    (typeof blocker.resume_phase !== 'string' || !ALL_CANONICAL_ACTIONS.has(blocker.resume_phase))
  ) {
    fail('invalid resume_phase');
  }
  return { ...blocker, policy: policy.policy };
}

export function validateOutcomePacket(packet, projection = projectCanonicalWorkflow()) {
  assertObject(packet, 'outcome');
  if (
    !own(
      packet,
      new Set(['change', 'action', 'role', 'status', 'checkpointArtifact', 'artifacts', 'evidence', 'next', 'blocker']),
    )
  ) {
    fail('unknown outcome field');
  }
  validateChangeName(packet.change);
  if (!isKnownAction(packet.action, projection) || !LOGICAL_ROLES.has(packet.role)) {
    fail('invalid outcome action or role');
  }
  if (projection.roles[packet.action] !== packet.role) fail(`outcome role must match canonical role for ${packet.action}`);
  if (
    typeof packet.checkpointArtifact !== 'string' ||
    packet.checkpointArtifact !== canonicalCheckpointArtifact(packet.action, projection) ||
    !Array.isArray(packet.artifacts) ||
    !packet.artifacts.every((item) => typeof item === 'string') ||
    !packet.artifacts.includes(packet.checkpointArtifact) ||
    !Array.isArray(packet.evidence) ||
    !packet.evidence.every((item) => typeof item === 'string')
  ) {
    fail('invalid checkpoint artifact or outcome shape');
  }
  if (!['PASS', 'BLOCKED', 'FAILED'].includes(packet.status)) fail('invalid outcome status');
  if (typeof packet.next !== 'string') fail('invalid outcome next');
  if (packet.status === 'PASS' && packet.blocker !== undefined) fail('PASS outcome cannot contain blocker');
  if (packet.status !== 'PASS' && packet.blocker === undefined) fail('blocked outcome requires blocker');
  if (packet.blocker !== undefined) validateBlocker(packet.blocker);
  if (packet.status !== 'PASS') resolveBlockedTransition({
    phase: packet.action,
    next: packet.next,
    blocker: packet.blocker,
    projection,
  });
  return packet;
}

export function safeValidateOutcome(packet, projection = projectCanonicalWorkflow()) {
  try {
    const validated = validateOutcomePacket(packet, projection);
    if (validated.status !== 'PASS' && validated.blocker.human_required) {
      return { ...validated, status: 'HUMAN_HANDOFF', next: null };
    }
    return validated;
  } catch (error) {
    const action = isKnownAction(packet?.action, projection) ? packet.action : projection.phases[0];
    return {
      change: typeof packet?.change === 'string' ? packet.change : 'unknown',
      action,
      role: projection.roles[action] ?? 'HUMAN',
      status: 'HUMAN_HANDOFF',
      checkpointArtifact: canonicalCheckpointArtifact(action, projection),
      artifacts: [],
      evidence: [error.message],
      next: null,
      blocker: {
        class: 'FATAL_INVARIANT',
        human_required: true,
        reason: error.message,
        resume_phase: null,
      },
    };
  }
}

function fatalInvariantHandoff(reason) {
  return {
    action: 'HUMAN_HANDOFF',
    role: 'HUMAN',
    kind: 'human',
    blocker: {
      class: 'FATAL_INVARIANT',
      human_required: true,
      reason,
      resume_phase: null,
    },
  };
}

export function selectNextTransition(
  state,
  outcome,
  projection = projectCanonicalWorkflow(),
) {
  validateRuntimeState(state);
  validateOutcomePacket(outcome, projection);
  if (outcome.change !== state.change) fail('scope mismatch');
  if (state.checkpoint.next !== null && state.checkpoint.next !== outcome.action) {
    return fatalInvariantHandoff(
      `outcome ${outcome.action} is not the legal current action ${state.checkpoint.next}`,
    );
  }
  if (outcome.status !== 'PASS') {
    const policy = resolveBlockedTransition({
      phase: outcome.action,
      next: outcome.next,
      blocker: outcome.blocker,
      projection,
    });
    if (policy.human_required) {
      return { action: 'HUMAN_HANDOFF', role: 'HUMAN', kind: 'human', blocker: outcome.blocker };
    }
    if (policy.policy === 'CANONICAL_REFINEMENT') {
      const refinement = policy.next;
      if (!refinement || !isKnownAction(refinement, projection)) {
        return fatalInvariantHandoff(`AUTO_REFINE is not legal for ${outcome.action}`);
      }
      if (state.attempts[refinement] >= 1) {
        return fatalInvariantHandoff(`${refinement} refinement budget exhausted`);
      }
      return { action: refinement, role: projection.roles[refinement], kind: 'refinement' };
    }
    if (state.attempts[outcome.action] >= 2) {
      return fatalInvariantHandoff(`${outcome.action} retry budget exhausted`);
    }
    return { action: outcome.action, role: projection.roles[outcome.action], kind: 'retry' };
  }
  const next = projection.edges[outcome.action];
  if (!next) return { action: 'HUMAN_HANDOFF', role: 'HUMAN', kind: 'terminal' };
  if (!isKnownAction(next, projection)) fail('illegal transition');
  if (outcome.next !== next) {
    const terminalNext = outcome.next === 'STOP' || outcome.next === 'HUMAN_HANDOFF';
    if (!terminalNext || next !== undefined) fail('outcome next does not match legal transition');
  }
  return { action: next, role: projection.roles[next], kind: 'canonical' };
}

export function resolveBlockedTransition({ phase, next, blocker, projection = projectCanonicalWorkflow() } = {}) {
  if (!isKnownAction(phase, projection)) fail('blocked transition has an unknown phase');
  const validated = validateBlocker(blocker);
  if (validated.resume_phase !== null && validated.resume_phase !== next) {
    fail('blocked transition resume_phase does not match next');
  }
  if (validated.human_required) {
    if (next !== null) fail('human blocked transition cannot select a lifecycle phase');
    return { ...validated, next: null, kind: 'human' };
  }
  if (validated.policy === 'CANONICAL_REFINEMENT') {
    const refinement = REFINEMENT_BY_BLOCKED_REVIEW[phase];
    if (!refinement || !isKnownAction(refinement, projection) || next !== refinement || validated.resume_phase !== refinement) {
      fail(`blocked transition is not the canonical refinement for ${phase}`);
    }
    return { ...validated, next: refinement, kind: 'refinement' };
  }
  if (validated.policy === 'RETRY_CURRENT_ACTION') {
    if (next !== phase || (validated.resume_phase !== null && validated.resume_phase !== phase)) {
      fail(`blocked transition cannot resume ${next}`);
    }
    return { ...validated, next: phase, kind: 'retry' };
  }
  return { ...validated, next, kind: 'recovery' };
}

function validateBlockedCheckpoint(phase, next, projection) {
  if (next === null) return;
  const refinement = REFINEMENT_BY_BLOCKED_REVIEW[phase];
  const blocker = refinement
    ? { class: 'AUTO_REFINE', human_required: false, reason: 'blocked checkpoint', resume_phase: refinement }
    : { class: 'AUTO_RETRY', human_required: false, reason: 'blocked checkpoint', resume_phase: phase };
  resolveBlockedTransition({ phase, next, blocker, projection });
}

export function canonicalCheckpointArtifact(action, profileOrProjection = undefined) {
  const projection = projectionFor(profileOrProjection);
  if (!isKnownAction(action, projection) || typeof projection.artifacts[action] !== 'string') {
    fail(`no canonical checkpoint artifact for ${action}`);
  }
  return projection.artifacts[action];
}

export function recordAttempt(state, action) {
  validateRuntimeState(state);
  if (!ALL_CANONICAL_ACTIONS.has(action)) fail('invalid attempt action');
  const count = state.attempts[action] || 0;
  if (count >= 2) fail('retry budget exhausted');
  return validateRuntimeState({
    ...state,
    attempts: { ...state.attempts, [action]: count + 1 },
  });
}

export function idempotencyKey(change, sequence, action, inputHash) {
  validateChangeName(change);
  assertHash(inputHash, 'inputHash');
  return sha256(`${change}${sequence}${action}${inputHash}`);
}

export function reconstructState({
  root,
  change,
  fingerprints = {
    workflow: '0'.repeat(64),
    modelMap: '0'.repeat(64),
    config: '0'.repeat(64),
  },
  artifacts = [],
  profile,
} = {}) {
  const state = buildInitialState({ root, change, fingerprints, profile });
  if (!artifacts.length) return state;
  const projection = projectionFor(profile);
  const candidates = artifacts.filter(
    (artifact) => artifact && isKnownAction(artifact.phase, projection),
  );
  if (candidates.length > 1 && candidates.some((artifact) => !artifact.status && !artifact.next)) {
    fail('ambiguous checkpoint artifacts');
  }
  const ordered = [...candidates].sort(
    (left, right) => canonicalLifecyclePath(left.phase, projection).length - canonicalLifecyclePath(right.phase, projection).length,
  );
  const checkpoint = ordered.filter((artifact) => artifact.status).at(-1);
  if (!checkpoint) return state;
  const identity = validateIdentity({ root, change, profile });
  validateAuthoritativeArtifacts({
    changePath: identity.changePath,
    profile,
    phase: checkpoint.phase,
    verdict: checkpoint.status === 'BLOCKED' ? 'BLOCKED' : 'PASS',
    projection,
  });
  const next = checkpoint.next ?? projection.edges[checkpoint.phase] ?? null;
  return validateRuntimeState({
    ...state,
    status: checkpoint.status === 'BLOCKED' ? 'BLOCKED' : 'READY',
    checkpoint: {
      phase: checkpoint.phase,
      artifact: checkpoint.name ?? null,
      verdict:
        checkpoint.status === 'PASS'
          ? 'PASS'
          : checkpoint.status === 'BLOCKED'
            ? 'BLOCKED'
            : null,
      next,
    },
  });
}

export async function recoverLegacyChange({
  changePath,
  root,
  change,
  fingerprints,
  profile,
} = {}) {
  if (typeof changePath !== 'string' || !isAbsolute(changePath)) {
    fail('legacy change path must be absolute');
  }
  const projection = projectionFor(profile);
  const order = [...projection.phases].reverse();
  const artifacts = [];
  const seen = new Set();
  const primaryPhaseByArtifact = new Map(
    lifecycleArtifactEntries(projection, projection.terminal).map((entry) => [entry.artifact, entry.phase]),
  );
  for (const phase of order) {
    const name = canonicalCheckpointArtifact(phase, projection);
    if (seen.has(name)) continue;
    seen.add(name);
    try {
      const text = await readFile(join(changePath, name), 'utf8');
      const status = artifactCheckpointStatus(text);
      const next = checkpointField(text, ['next']);
      artifacts.push({ name, phase: primaryPhaseByArtifact.get(name) ?? phase, status, next });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return reconstructState({ root, change, fingerprints, artifacts, profile });
}

function validateCheckpoint(checkpoint) {
  assertObject(checkpoint, 'checkpoint');
  if (!own(checkpoint, new Set(['phase', 'artifact', 'verdict', 'next']))) {
    fail('unknown checkpoint field');
  }
  if (checkpoint.phase !== null && typeof checkpoint.phase !== 'string') fail('invalid checkpoint phase');
  if (checkpoint.phase !== null && !ALL_CANONICAL_ACTIONS.has(checkpoint.phase)) fail('invalid checkpoint phase');
  if (
    checkpoint.artifact !== null &&
    (typeof checkpoint.artifact !== 'string' || !checkpoint.artifact.trim())
  ) {
    fail('invalid checkpoint artifact');
  }
  if (!['PASS', 'BLOCKED', null].includes(checkpoint.verdict)) fail('invalid checkpoint verdict');
  if (
    checkpoint.next !== null &&
    (typeof checkpoint.next !== 'string' || !ALL_CANONICAL_ACTIONS.has(checkpoint.next))
  ) {
    fail('invalid checkpoint next');
  }
}

export function validateRuntimeState(state) {
  assertObject(state, 'state');
  if (
    !own(
      state,
      new Set([
        'schemaVersion',
        'change',
        'canonicalPath',
        'status',
        'sequence',
        'checkpoint',
        'fingerprints',
        'attempts',
        'traceCursor',
        'lastTransition',
      ]),
    )
  ) {
    fail('unknown state field');
  }
  if (state.schemaVersion !== RUNTIME_SCHEMA_VERSION) fail('unsupported state schema');
  validateChangeName(state.change);
  if (typeof state.canonicalPath !== 'string' || !isAbsolute(state.canonicalPath)) {
    fail('invalid state canonicalPath');
  }
  if (
    !RUNTIME_STATUSES.has(state.status) ||
    !Number.isSafeInteger(state.sequence) ||
    state.sequence < 0
  ) {
    fail('invalid state status or sequence');
  }
  validateCheckpoint(state.checkpoint);
  assertObject(state.fingerprints, 'fingerprints');
  if (!own(state.fingerprints, new Set(['workflow', 'modelMap', 'config', 'artifacts']))) {
    fail('unknown fingerprints field');
  }
  for (const key of ['workflow', 'modelMap', 'config']) {
    assertHash(state.fingerprints[key], `fingerprints.${key}`);
  }
  assertObject(state.fingerprints.artifacts, 'fingerprints.artifacts');
  for (const hash of Object.values(state.fingerprints.artifacts)) assertHash(hash, 'artifact fingerprint');
  assertObject(state.attempts, 'attempts');
  if (Object.keys(state.attempts).some((action) => !ALL_CANONICAL_ACTIONS.has(action))) {
    fail('invalid attempt action');
  }
  if (Object.values(state.attempts).some((attempt) => !Number.isSafeInteger(attempt) || attempt < 0)) {
    fail('invalid attempts');
  }
  assertObject(state.traceCursor, 'traceCursor');
  if (!own(state.traceCursor, new Set(['sequence', 'eventHash', 'chainHash']))) {
    fail('unknown trace cursor field');
  }
  if (state.traceCursor.sequence !== state.sequence) fail('trace cursor sequence mismatch');
  if (state.traceCursor.eventHash !== null) assertHash(state.traceCursor.eventHash, 'trace cursor eventHash');
  if (state.traceCursor.chainHash !== null) assertHash(state.traceCursor.chainHash, 'trace cursor chainHash');
  if ((state.traceCursor.eventHash === null) !== (state.traceCursor.chainHash === null)) {
    fail('trace cursor hash pair mismatch');
  }
  if (state.lastTransition !== null) {
    assertObject(state.lastTransition, 'lastTransition');
    if (
      !own(
        state.lastTransition,
        new Set(['idempotencyKey', 'action', 'inputHash', 'outcomeHash', 'afterStateHash']),
      )
    ) {
      fail('unknown last transition field');
    }
    if (state.lastTransition.idempotencyKey !== undefined) {
      assertHash(state.lastTransition.idempotencyKey, 'lastTransition.idempotencyKey');
    }
    if (
      state.lastTransition.action !== undefined &&
      !ALL_CANONICAL_ACTIONS.has(state.lastTransition.action)
    ) {
      fail('invalid last transition action');
    }
    for (const key of ['inputHash', 'outcomeHash', 'afterStateHash']) {
      assertHash(state.lastTransition[key], `lastTransition.${key}`);
    }
  }
  return state;
}

function materialization(state) {
  return {
    status: state.status,
    sequence: state.sequence,
    checkpoint: state.checkpoint,
    fingerprints: state.fingerprints,
    attempts: state.attempts,
    traceCursor: state.traceCursor,
    lastTransition: state.lastTransition,
  };
}

function stateFromTraceEvent(event, canonicalPath) {
  return validateRuntimeState({
    ...event.stateMaterialization,
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    change: event.change,
    canonicalPath,
    traceCursor: {
      sequence: event.sequence,
      eventHash: event.eventHash,
      chainHash: event.chainHash,
    },
  });
}

function validateProfileRuntimeState(state, profile) {
  const projection = projectionFor(profile);
  const checkpoint = state.checkpoint;
  if (checkpoint.phase === null) {
    if (checkpoint.artifact !== null || checkpoint.verdict !== null) {
      fail('initial checkpoint contains materialized phase data');
    }
  } else {
    if (!isKnownAction(checkpoint.phase, projection)) fail('checkpoint phase is not canonical');
    if (checkpoint.artifact !== projection.artifacts[checkpoint.phase]) {
      fail('checkpoint artifact is not canonical');
    }
    if (checkpoint.verdict === null) fail('materialized checkpoint is missing a verdict');
  }
  if (checkpoint.next !== null && !isKnownAction(checkpoint.next, projection)) {
    fail('checkpoint next action is not canonical');
  }
  if (checkpoint.verdict === 'BLOCKED') validateBlockedCheckpoint(checkpoint.phase, checkpoint.next, projection);
  if (Object.keys(state.attempts).some((action) => !isKnownAction(action, projection))) {
    fail('attempt action is not canonical for the profile');
  }
  return state;
}

export function createTraceEvent({
  change,
  sequence,
  action,
  role,
  inputHash,
  outcomeHash,
  beforeState,
  afterState,
  route = { configured: role, resolved: role, rejections: [] },
  contextAudit = { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references: {} },
  timestamp = new Date().toISOString(),
  operation = undefined,
  previousSequence = undefined,
  newSequence = undefined,
  sourceStatus = undefined,
  target = undefined,
  authorization = undefined,
  authorityFingerprints = undefined,
} = {}) {
  validateChangeName(change);
  if (!Number.isSafeInteger(sequence) || sequence < 1 || !ALL_CANONICAL_ACTIONS.has(action)) {
    fail('invalid trace sequence or action');
  }
  if (!LOGICAL_ROLES.has(role)) fail('invalid trace role');
  assertHash(inputHash, 'inputHash');
  assertHash(outcomeHash, 'outcomeHash');
  validateRuntimeState(beforeState);
  validateRuntimeState(afterState);
  const event = {
    schemaVersion: TRACE_SCHEMA_VERSION,
    sequence,
    idempotencyKey: sha256(`${change}${sequence}${action}${inputHash}`),
    previousEventHash: beforeState.traceCursor.eventHash,
    chainHash: '',
    change,
    action,
    role,
    inputHash,
    outcomeHash,
    route,
    beforeStateHash: hashObject(materialization(beforeState)),
    afterStateHash: hashObject(materialization(afterState)),
    stateMaterialization: materialization(afterState),
    contextAudit,
    timestamp,
  };
  if (operation !== undefined) {
    if (role !== 'HUMAN' || action !== target) fail('invalid recovery trace operation');
    if (![STRANDED_RECOVERY_OPERATION, DISPATCH_MATERIALIZATION_RECOVERY_OPERATION].includes(operation)) {
      fail('invalid recovery trace operation');
    }
    if (previousSequence !== sequence - 1 || newSequence !== sequence || sourceStatus !== 'HUMAN_HANDOFF') {
      fail('invalid recovery trace sequence');
    }
    validateRecoveryAuthorization(authorization);
    assertObject(authorityFingerprints, 'authorityFingerprints');
    for (const key of ['workflow', 'modelMap', 'config']) assertHash(authorityFingerprints[key], `authorityFingerprints.${key}`);
    Object.assign(event, {
      operation,
      previousSequence,
      newSequence,
      sourceStatus,
      target,
      authorization,
      authorityFingerprints,
    });
  }
  event.eventHash = sha256(
    Object.fromEntries(Object.entries(event).filter(([key]) => !['eventHash', 'chainHash'].includes(key))),
  );
  event.chainHash = sha256(`${beforeState.traceCursor.chainHash || 'genesis'}${event.eventHash}`);
  return event;
}

function traceEventFingerprint(event) {
  const { timestamp, eventHash, chainHash, ...semanticEvent } = event;
  return hashObject(semanticEvent);
}

export function validateTraceEvent(event) {
  assertObject(event, 'trace event');
  const baseFields = new Set([
    'schemaVersion',
    'sequence',
    'idempotencyKey',
    'previousEventHash',
    'chainHash',
    'change',
    'action',
    'role',
    'inputHash',
    'outcomeHash',
    'route',
    'beforeStateHash',
    'afterStateHash',
    'stateMaterialization',
    'contextAudit',
    'timestamp',
    'eventHash',
  ]);
  const recoveryFields = new Set([
    'operation',
    'previousSequence',
    'newSequence',
    'sourceStatus',
    'target',
    'authorization',
    'authorityFingerprints',
  ]);
  if (!own(event, new Set([...baseFields, ...recoveryFields]))) fail('unknown trace event field');
  for (const key of baseFields) {
    if (event[key] === undefined) fail(`missing trace event field ${key}`);
  }
  if (event.schemaVersion !== TRACE_SCHEMA_VERSION) fail('unsupported trace schema');
  if (
    !Number.isSafeInteger(event.sequence) ||
    event.sequence < 1 ||
    !ALL_CANONICAL_ACTIONS.has(event.action) ||
    !LOGICAL_ROLES.has(event.role)
  ) {
    fail('invalid trace event identity');
  }
  validateChangeName(event.change);
  assertHash(event.idempotencyKey, 'idempotencyKey');
  if (event.idempotencyKey !== sha256(`${event.change}${event.sequence}${event.action}${event.inputHash}`)) {
    fail('trace idempotency key mismatch');
  }
  assertHash(event.inputHash, 'inputHash');
  assertHash(event.outcomeHash, 'outcomeHash');
  assertHash(event.beforeStateHash, 'beforeStateHash');
  assertHash(event.afterStateHash, 'afterStateHash');
  assertHash(event.eventHash, 'eventHash');
  assertHash(event.chainHash, 'chainHash');
  if (event.previousEventHash !== null) assertHash(event.previousEventHash, 'previousEventHash');
  validateRuntimeState({
    ...event.stateMaterialization,
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    change: event.change,
    canonicalPath: '/validated',
  });
  if (
    event.stateMaterialization.traceCursor.eventHash !== null ||
    event.stateMaterialization.traceCursor.chainHash !== null
  ) {
    fail('trace materialization contains a published cursor');
  }
  if (typeof event.timestamp !== 'string' || !event.timestamp.trim()) fail('invalid trace timestamp');
  if (event.afterStateHash !== hashObject(event.stateMaterialization)) fail('trace after-state hash mismatch');
  if (event.operation !== undefined) {
    if (
      event.role !== 'HUMAN' ||
      event.action !== event.target ||
      ![STRANDED_RECOVERY_OPERATION, DISPATCH_MATERIALIZATION_RECOVERY_OPERATION].includes(event.operation) ||
      event.previousSequence !== event.sequence - 1 ||
      event.newSequence !== event.sequence ||
      event.sourceStatus !== 'HUMAN_HANDOFF'
    ) {
      fail('invalid recovery trace provenance');
    }
    validateRecoveryAuthorization(event.authorization);
    assertObject(event.authorityFingerprints, 'authorityFingerprints');
    for (const key of ['workflow', 'modelMap', 'config']) {
      assertHash(event.authorityFingerprints[key], `authorityFingerprints.${key}`);
    }
    assertObject(event.authorityFingerprints.artifacts, 'authorityFingerprints.artifacts');
    for (const hash of Object.values(event.authorityFingerprints.artifacts)) {
      assertHash(hash, 'authority artifact fingerprint');
    }
  } else if ([...recoveryFields].some((key) => event[key] !== undefined)) {
    fail('incomplete recovery trace provenance');
  }
  const expected = sha256(
    Object.fromEntries(Object.entries(event).filter(([key]) => !['eventHash', 'chainHash'].includes(key))),
  );
  if (expected !== event.eventHash) fail('trace event hash mismatch');
  return event;
}

export function validateTraceSequence(events) {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  const keys = new Set();
  let previous = null;
  let change = null;
  for (let index = 0; index < ordered.length; index += 1) {
    const event = validateTraceEvent(ordered[index]);
    if (event.sequence !== index + 1) fail('trace sequence gap or duplicate');
    if (change === null) change = event.change;
    if (event.change !== change) fail('trace change scope mismatch');
    if (keys.has(event.idempotencyKey)) fail('duplicate trace idempotency key');
    keys.add(event.idempotencyKey);
    if (event.previousEventHash !== (previous?.eventHash ?? null)) fail('trace hash chain mismatch');
    if (event.chainHash !== sha256(`${previous?.chainHash || 'genesis'}${event.eventHash}`)) fail('trace chain hash mismatch');
    if (previous) {
      const previousState = {
        ...previous.stateMaterialization,
        schemaVersion: RUNTIME_SCHEMA_VERSION,
        change: previous.change,
        canonicalPath: '/validated',
        traceCursor: {
          sequence: previous.sequence,
          eventHash: previous.eventHash,
          chainHash: previous.chainHash,
        },
      };
      if (event.beforeStateHash !== hashObject(materialization(previousState))) {
        fail('trace state continuity mismatch');
      }
    }
    previous = event;
  }
  return ordered;
}

export function reconcileTraceState(
  state,
  events,
  profile = undefined,
  { enforceProfile = profile !== undefined } = {},
) {
  const validateState = (candidate) => {
    const validated = validateRuntimeState(candidate);
    return enforceProfile ? validateProfileRuntimeState(validated, profile) : validated;
  };
  validateState(state);
  const ordered = validateTraceSequence(events);
  const cursor = ordered.at(-1);
  if (!cursor) {
    if (state.sequence !== 0 || state.traceCursor.eventHash !== null || state.traceCursor.chainHash !== null) {
      fail('runtime state has no corresponding trace');
    }
    return { state, events: ordered, reconciled: false };
  }
  if (state.change !== cursor.change) fail('state and trace change scope mismatch');
  if (state.sequence > cursor.sequence) fail('state is ahead of trace');
  if (state.sequence === cursor.sequence) {
    if (
      state.traceCursor.eventHash !== cursor.eventHash ||
      state.traceCursor.chainHash !== cursor.chainHash
    ) {
      fail('state cursor conflicts with trace');
    }
    const expectedState = validateState(stateFromTraceEvent(cursor, state.canonicalPath));
    if (canonicalJson(materialization(state)) !== canonicalJson(materialization(expectedState))) {
      fail('state materialization conflicts with trace');
    }
    return { state, events: ordered, reconciled: false };
  }
  if (state.sequence < cursor.sequence - 1) fail('more than one unmatched trace event');
  if (state.sequence === cursor.sequence - 1) {
    if (hashObject(materialization(state)) !== cursor.beforeStateHash) {
      fail('state predecessor conflicts with trace');
    }
    const materialized = validateState(stateFromTraceEvent(cursor, state.canonicalPath));
    return { state: materialized, events: ordered, reconciled: true };
  }
  fail('state and trace sequence cannot be reconciled');
}

export function createContextPacket({ authorityRefs = {}, fingerprints = {}, workingSet = [] } = {}) {
  const references = { ...authorityRefs };
  const packet = {
    authorityRefs: references,
    fingerprints: { ...fingerprints },
    workingSet: [...workingSet],
    audit: { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references },
  };
  return Object.freeze({
    ...packet,
    forPhase(phase) {
      if (!ALL_CANONICAL_ACTIONS.has(phase)) fail('invalid context phase');
      return Object.freeze({
        ...packet,
        phase,
        audit: { ...packet.audit, references: { ...references } },
      });
    },
  });
}

export function evaluateWorkloadGuard({
  estimatedLines,
  semanticException = null,
  withinApprovedDesign = true,
  withinApprovedTasks = true,
  withinApprovedWorkingSet = true,
} = {}) {
  if (!Number.isSafeInteger(estimatedLines) || estimatedLines < 0) fail('invalid workload forecast');
  if ([withinApprovedDesign, withinApprovedTasks, withinApprovedWorkingSet].some((value) => typeof value !== 'boolean')) {
    fail('invalid approved scope status');
  }
  const forecast = { estimatedLines, treatment: 'informational-only' };
  let blockerInput = semanticException;
  if ((!withinApprovedDesign || !withinApprovedTasks || !withinApprovedWorkingSet) && blockerInput === null) {
    blockerInput = {
      class: 'HUMAN_SCOPE',
      reason: 'material Design/Tasks/Working Set expansion requires the Design/Review path',
      resume_phase: 'Design Refinement',
    };
  }
  if (blockerInput !== null) {
    assertObject(blockerInput, 'semantic workload exception');
    const blocker = validateBlocker({
      ...blockerInput,
      human_required: true,
      resume_phase: blockerInput.resume_phase ?? null,
    });
    if (!blocker.policy.startsWith('STOP/')) fail('semantic workload exception must be HUMAN-owned');
    return {
      status: 'HUMAN_HANDOFF',
      policy: 'semantic-exception',
      human_required: true,
      forecast,
      blocker: {
        ...blockerInput,
        human_required: true,
        resume_phase: blockerInput.resume_phase ?? null,
      },
    };
  }
  return { status: 'PASS', policy: 'size-neutral', human_required: false, forecast };
}

export function gitMutationBarrier({ operation, target = '' } = {}) {
  const blockedOperations = new Set([
    'add',
    'commit',
    'push',
    'pull',
    'fetch',
    'merge',
    'rebase',
    'cherry-pick',
    'revert',
    'switch',
    'checkout',
    'reset',
    'clean',
    'stash',
    'restore',
    'rm',
    'mv',
    'worktree',
    'update-ref',
    'branch',
    'config',
    'notes',
    'apply',
    'replace',
    'filter-branch',
    'filter-repo',
    'release',
    'deploy',
    'tag',
    'pr',
    'workflow',
    'run',
    'checks',
    'ci',
  ]);
  const normalizedOperation = typeof operation === 'string'
    ? operation.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
    : '';
  const category = normalizedOperation
    .replace(/^git\s+/, '')
    .replace(/^gh\s+/, '')
    .replace(/^pull[- ]request(?:\s+.*)?$/, 'pr')
    .replace(/^ci wait(?:\s+.*)?$/, 'ci');
  const normalizedTarget = typeof target === 'string' ? target.trim().toLocaleLowerCase() : '';
  if (
    [...blockedOperations].some(
      (blocked) => category === blocked || category.startsWith(`${blocked} `),
    ) || normalizedTarget === 'main' || normalizedTarget === 'refs/heads/main'
  ) {
    fail('HUMAN_GIT: Git mutation/direct-to-main request rejected');
  }
  return { allowed: true, operation, target };
}

function repositoryRootForChangePath(changePath, profile) {
  const parts = profileOptions(profile).changesRoot.split(/[\\/]/).filter(Boolean);
  let current = dirname(resolve(changePath));
  for (let index = 0; index < parts.length; index += 1) current = dirname(current);
  return current;
}

export function dispatchUntilTerminal({
  state,
  outcomes = [],
  execute = null,
  projection = projectCanonicalWorkflow(),
  maxTransitions = 25,
} = {}) {
  let current = validateRuntimeState(state);
  let duplicate = false;
  for (let index = 0; index < maxTransitions; index += 1) {
    if (current.status === 'HUMAN_HANDOFF' || current.status === 'COMPLETED') {
      return { status: current.status, state: current, duplicate };
    }
    const rawOutcome = outcomes[index] ?? (execute ? execute(current) : null);
    if (!rawOutcome) return { status: current.status, state: current, duplicate };
    const outcome = safeValidateOutcome(rawOutcome, projection);
    if (outcome.status === 'HUMAN_HANDOFF') {
      const rawInputHash = hashObject(rawOutcome);
      if (current.lastTransition?.action === outcome.action && current.lastTransition.inputHash === rawInputHash) {
        duplicate = true;
        continue;
      }
      let validatedRawOutcome = null;
      try {
        validatedRawOutcome = validateOutcomePacket(rawOutcome, projection);
      } catch {}
      const actualBlockedOutcome = validatedRawOutcome?.status === 'BLOCKED' && validatedRawOutcome.blocker.human_required;
      const phase = actualBlockedOutcome ? validatedRawOutcome.action : current.checkpoint.phase;
      const artifact = actualBlockedOutcome ? validatedRawOutcome.checkpointArtifact : current.checkpoint.artifact;
      current = validateRuntimeState({
        ...current,
        status: 'HUMAN_HANDOFF',
        sequence: current.sequence + 1,
        checkpoint: { phase, artifact, verdict: 'BLOCKED', next: null },
        traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null },
        lastTransition: {
          inputHash: rawInputHash,
          outcomeHash: hashObject(outcome),
          afterStateHash: hashObject({ status: 'HUMAN_HANDOFF', blocker: outcome.blocker }),
          action: outcome.action,
        },
      });
      return { status: current.status, state: current, duplicate, blocker: outcome.blocker };
    }
    const inputHash = hashObject(outcome);
    const key = idempotencyKey(current.change, current.sequence + 1, outcome.action, inputHash);
    if (current.lastTransition?.action === outcome.action && current.lastTransition.inputHash === inputHash) {
      duplicate = true;
      continue;
    }
    const transition = selectNextTransition(current, outcome, projection);
    if (transition.kind === 'human' || transition.kind === 'terminal') {
      current = validateRuntimeState({
        ...current,
        status: 'HUMAN_HANDOFF',
        sequence: current.sequence + 1,
        checkpoint: {
          phase: outcome.action,
          artifact: outcome.checkpointArtifact,
          verdict: outcome.status === 'PASS' ? 'PASS' : 'BLOCKED',
          next: null,
        },
        traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null },
        lastTransition: {
          idempotencyKey: key,
          action: outcome.action,
          inputHash,
          outcomeHash: hashObject(outcome),
          afterStateHash: hashObject({ status: 'HUMAN_HANDOFF' }),
        },
      });
      return { status: current.status, state: current, duplicate, blocker: transition.blocker };
    }
    if (outcome.status !== 'PASS' || (current.attempts[outcome.action] || 0) < 2) {
      current = recordAttempt(current, outcome.action);
    }
    current = validateRuntimeState({
      ...current,
      sequence: current.sequence + 1,
      checkpoint: {
        phase: outcome.action,
        artifact: outcome.checkpointArtifact,
        verdict: outcome.status,
        next: transition.action,
      },
      lastTransition: {
        idempotencyKey: key,
        action: outcome.action,
        inputHash,
        outcomeHash: hashObject(outcome),
        afterStateHash: hashObject({ action: transition.action }),
      },
      traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null },
    });
  }
  fail('dispatch transition limit exceeded');
}

export async function persistExecutorOutcome({
  changePath,
  state,
  outcome,
  route = undefined,
  contextAudit = undefined,
  profile = undefined,
  projection = projectCanonicalWorkflow(profile),
} = {}) {
  if (typeof changePath !== 'string' || !isAbsolute(changePath)) fail('change path must be absolute');
  validateRuntimeState(state);
  if (resolve(changePath) !== resolve(state.canonicalPath)) fail('change path mismatch');
  const validatedOutcome = validateOutcomePacket(outcome, projection);
  const checkpointPath = join(changePath, validatedOutcome.checkpointArtifact);
  let checkpointStats;
  try {
    checkpointStats = await lstat(checkpointPath);
  } catch (error) {
    if (error.code === 'ENOENT') fail(`missing canonical checkpoint artifact ${validatedOutcome.checkpointArtifact}`);
    throw error;
  }
  if (!checkpointStats.isFile() || checkpointStats.isSymbolicLink()) {
    fail(`invalid canonical checkpoint artifact ${validatedOutcome.checkpointArtifact}`);
  }

  const options = profileOptions(profile);
  const shouldRelocate = validatedOutcome.action === 'Archive' &&
    validatedOutcome.status === 'PASS' && options.archiveBehavior !== 'in-place';
  const result = dispatchUntilTerminal({ state, outcomes: [validatedOutcome], projection });
  if (result.state.sequence === state.sequence) {
    if (result.duplicate && state.traceCursor.eventHash !== null) {
      return { ...result, persisted: false, event: null, tracePath: null };
    }
    fail('executor outcome did not produce one transition');
  }
  if (result.state.sequence !== state.sequence + 1) fail('executor outcome produced more than one transition');

  // Persist provenance for every artifact in the completed predecessor chain,
  // not only the current checkpoint. Resume must be able to distinguish a
  // valid state from a state whose authoritative evidence was deleted or
  // changed after publication.
  const lifecycleArtifactFingerprints = fingerprintLifecycleArtifacts({
    changePath,
    phase: validatedOutcome.action,
    projection,
  });
  const materializedResultState = validateRuntimeState({
    ...result.state,
    fingerprints: {
      ...result.state.fingerprints,
      artifacts: {
        ...result.state.fingerprints.artifacts,
        ...lifecycleArtifactFingerprints,
      },
    },
  });

  const routeValue = route ?? { configured: validatedOutcome.role, resolved: validatedOutcome.role, rejections: [] };
  validateRoute(routeValue);
  const baseContextAudit = contextAudit ?? {
    bootstrapReadCount: 1,
    normalPhaseBootstrapReadCount: 0,
    references: options.authorityRefs,
  };
  let archivePath = null;
  let archiveLockPath = null;
  let archiveLock = null;
  let relocated = false;
  try {
    if (shouldRelocate) {
      const root = repositoryRootForChangePath(changePath, profile);
      archivePath = archiveDestinationPath({ root, change: state.change, profile });
      await mkdir(runtimePath(changePath, profile, 'locks'), { recursive: true });
      archiveLockPath = join(runtimePath(changePath, profile, 'locks'), 'archive-materialization.lock');
      archiveLock = await open(archiveLockPath, 'wx', 0o600);
      await mkdir(dirname(archivePath), { recursive: true });
      try {
        await lstat(archivePath);
        fail('archive destination already exists');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    const event = createTraceEvent({
      change: state.change,
      sequence: result.state.sequence,
      action: validatedOutcome.action,
      role: validatedOutcome.role,
      inputHash: result.state.lastTransition.inputHash,
      outcomeHash: materializedResultState.lastTransition.outcomeHash,
      beforeState: state,
      afterState: materializedResultState,
      route: routeValue,
      contextAudit: baseContextAudit,
    });
    const persisted = await persistTransition({ changePath, event, state: materializedResultState, profile });
    let nextState = persisted.state ?? validateRuntimeState({
      ...materializedResultState,
      traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash },
    });
    const persistedEvent = persisted.event ?? event;
    if (!shouldRelocate) {
      return { ...result, ...persisted, persisted: !persisted.duplicate, state: nextState, event: persistedEvent };
    }

    await rename(changePath, archivePath);
    relocated = true;
    nextState = validateRuntimeState({ ...nextState, canonicalPath: archivePath });
    await atomicWriteJson(runtimePath(archivePath, profile, 'state'), nextState);
    return {
      ...result,
      ...persisted,
      persisted: !persisted.duplicate,
      state: nextState,
      tracePath: join(archivePath, relative(changePath, persisted.tracePath)),
      event: persistedEvent,
    };
  } finally {
    if (archiveLock) {
      await archiveLock.close();
      await unlink(join(runtimePath(relocated ? archivePath : changePath, profile, 'locks'), 'archive-materialization.lock')).catch(() => {});
    }
  }
}

export async function persistTransition({ changePath, event, state, profile } = {}) {
  validateTraceEvent(event);
  validateRuntimeState(state);
  if (state.change !== event.change) fail('transition scope mismatch');
  if (resolve(changePath) !== resolve(state.canonicalPath)) fail('transition path mismatch');
  const traceDirectory = runtimePath(changePath, profile, 'trace');
  const tracePath = join(
    traceDirectory,
    `${String(event.sequence).padStart(20, '0')}-${event.eventHash}.json`,
  );
  const statePath = runtimePath(changePath, profile, 'state');
  const expectedState = stateFromTraceEvent(event, resolve(changePath));
  if (canonicalJson(materialization(state)) !== canonicalJson(event.stateMaterialization)) {
    fail('transition state materialization mismatch');
  }

  return withTransitionLock(changePath, profile, async () => {
    let persistedState;
    try {
      persistedState = validateRuntimeState(JSON.parse(await readFile(statePath, 'utf8')));
    } catch (error) {
      if (error.code === 'ENOENT') fail('missing persisted runtime state');
      throw error;
    }

    const existingEvents = await readTraceEvents(changePath, profile);
    if (persistedState.sequence > event.sequence) fail('stale transition sequence');

    const existing = existingEvents.find((candidate) => candidate.sequence === event.sequence) ?? null;
    const existingTracePath = existing
      ? join(
        traceDirectory,
        `${String(existing.sequence).padStart(20, '0')}-${existing.eventHash}.json`,
      )
      : null;
    if (existing && traceEventFingerprint(existing) !== traceEventFingerprint(event)) {
      fail(resolve(existingTracePath) === resolve(tracePath)
        ? 'conflicting duplicate trace event'
        : 'conflicting trace sequence');
    }

    if (existing) {
      const existingState = stateFromTraceEvent(existing, resolve(changePath));
      if (canonicalJson(persistedState) === canonicalJson(existingState)) {
        return { duplicate: true, tracePath: existingTracePath, state: persistedState, event: existing };
      }
      if (
        persistedState.sequence !== event.sequence - 1 ||
        hashObject(materialization(persistedState)) !== existing.beforeStateHash
      ) {
        fail('transition predecessor mismatch');
      }
      await atomicWriteJson(statePath, existingState);
      return { duplicate: true, tracePath: existingTracePath, state: existingState, event: existing };
    }

    if (persistedState.sequence >= event.sequence) fail('stale transition sequence');
    if (
      persistedState.sequence !== event.sequence - 1 ||
      hashObject(materialization(persistedState)) !== event.beforeStateHash
    ) {
      fail('transition predecessor mismatch');
    }
    await writeExclusiveJson(tracePath, event);
    await atomicWriteJson(statePath, expectedState);
    return { duplicate: false, tracePath, state: expectedState, event };
  });
}

const CANONICAL_TRACE_FILENAME = /^\d{20}-[a-f0-9]{64}\.json$/;

function traceEntryPath(tracePath, name) {
  if (!CANONICAL_TRACE_FILENAME.test(name)) fail('ambiguous trace');
  const traceRoot = resolve(tracePath);
  const candidatePath = resolve(traceRoot, name);
  const candidateRelative = relative(traceRoot, candidatePath);
  if (candidateRelative.startsWith('..') || isAbsolute(candidateRelative)) {
    fail('trace entry escapes trace root');
  }
  return candidatePath;
}

function validateTraceEntry(name, event) {
  validateTraceEvent(event);
  if (name !== `${String(event.sequence).padStart(20, '0')}-${event.eventHash}.json`) {
    fail('trace filename provenance mismatch');
  }
  return event;
}

async function traceNames(tracePath) {
  let stats;
  try {
    stats = await lstat(tracePath);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) fail('invalid trace directory');
  return readdir(tracePath);
}

function traceNamesSync(tracePath) {
  let stats;
  try {
    stats = lstatSync(tracePath);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) fail('invalid trace directory');
  return readdirSync(tracePath);
}

export async function readTraceEvents(changePath, profile = undefined) {
  const tracePath = runtimePath(changePath, profile, 'trace');
  const names = await traceNames(tracePath);
  const events = [];
  for (const name of names) {
    const candidatePath = traceEntryPath(tracePath, name);
    const stats = await lstat(candidatePath);
    if (!stats.isFile() || stats.isSymbolicLink()) fail('invalid trace entry');
    const event = validateTraceEntry(name, JSON.parse(await readFile(candidatePath, 'utf8')));
    events.push(event);
  }
  return validateTraceSequence(events);
}

export function readTraceEventsSync(changePath, profile = undefined) {
  const tracePath = runtimePath(changePath, profile, 'trace');
  const names = traceNamesSync(tracePath);
  const events = [];
  for (const name of names) {
    const candidatePath = traceEntryPath(tracePath, name);
    const stats = lstatSync(candidatePath);
    if (!stats.isFile() || stats.isSymbolicLink()) fail('invalid trace entry');
    const event = validateTraceEntry(name, JSON.parse(readFileSync(candidatePath, 'utf8')));
    events.push(event);
  }
  return validateTraceSequence(events);
}

export function validateRuntimeRecovery({
  root = undefined,
  changePath,
  expectedChange = undefined,
  state,
  events = undefined,
  profile = undefined,
} = {}) {
  const persistedState = validateRuntimeState(state);
  const canonicalChange = expectedChange ?? persistedState.change;
  const canonicalPath = resolve(changePath);
  const repositoryRoot = root ?? repositoryRootForChangePath(canonicalPath, profile);
  validateIdentity({ root: repositoryRoot, change: canonicalChange, canonicalPath, profile });
  if (persistedState.change !== canonicalChange) fail('runtime state change mismatch');
  if (resolve(persistedState.canonicalPath) !== canonicalPath) fail('runtime state path mismatch');

  const trace = events ?? readTraceEventsSync(canonicalPath, profile);
  const reconciled = reconcileTraceState(persistedState, trace, profile, { enforceProfile: true });
  let lifecycleEvidence = { artifactNames: [], entries: [] };
  if (reconciled.state.checkpoint.phase !== null) {
    const lifecycleInspection = inspectAuthoritativeLifecycle({ changePath: canonicalPath, profile });
    if (
      lifecycleInspection.latest &&
      lifecycleInspection.latest.artifact !== reconciled.state.checkpoint.artifact
    ) {
      fail('artifact-state-divergence: runtime checkpoint conflicts with authoritative artifact checkpoint');
    }
    lifecycleEvidence = validateAuthoritativeArtifacts({
      changePath: canonicalPath,
      profile,
      phase: reconciled.state.checkpoint.phase,
      verdict: reconciled.state.checkpoint.verdict,
      checkpoint: reconciled.state.checkpoint,
      inspection: lifecycleInspection,
    });
    for (const artifact of lifecycleEvidence.artifactNames) {
      if (!Object.prototype.hasOwnProperty.call(reconciled.state.fingerprints.artifacts, artifact)) {
        fail(`artifact-state-divergence: runtime state has no fingerprint for ${artifact}`);
      }
    }
  }
  const authorityFingerprints = fingerprintConfiguredAuthorities({
    root: repositoryRoot,
    changePath: canonicalPath,
    profile,
    artifactNames: Object.keys(reconciled.state.fingerprints.artifacts),
  });
  for (const key of ['workflow', 'modelMap', 'config']) {
    if (reconciled.state.fingerprints[key] !== authorityFingerprints[key]) {
      fail('runtime authority fingerprint mismatch');
    }
  }
  if (canonicalJson(reconciled.state.fingerprints.artifacts) !== canonicalJson(authorityFingerprints.artifacts)) {
    fail('artifact-state-divergence: runtime artifact fingerprint mismatch');
  }
  if (reconciled.events.length === 0) {
    const initialState = buildInitialState({
      root: repositoryRoot,
      change: canonicalChange,
      fingerprints: authorityFingerprints,
      profile,
    });
    if (canonicalJson(materialization(reconciled.state)) !== canonicalJson(materialization(initialState))) {
      fail('initial runtime state materialization mismatch');
    }
  }
  const projection = projectCanonicalWorkflow(profile);
  for (const event of reconciled.events) {
    if (event.stateMaterialization.checkpoint.phase !== event.action) {
      fail('trace action and checkpoint phase mismatch');
    }
    if (
      event.operation === undefined &&
      (projection.roles[event.action] !== event.role || !isKnownAction(event.action, projection))
    ) {
      fail('trace role is not canonical for the profile');
    }
    if (
      event.authorityFingerprints !== undefined &&
      canonicalJson(event.authorityFingerprints) !== canonicalJson(authorityFingerprints)
    ) {
      fail('trace authority fingerprint mismatch');
    }
  }
  return { ...reconciled, fingerprints: authorityFingerprints };
}

function validateRecoveryAuthorization(authorization) {
  assertObject(authorization, 'authorization');
  if (!own(authorization, new Set(['actor', 'approval']))) fail('ambiguous recovery authorization');
  if (authorization.actor !== 'HUMAN / MAINTAINER') fail('invalid HUMAN authorization actor');
  if (typeof authorization.approval !== 'string' || !authorization.approval.trim() || authorization.approval.length > 2000) {
    fail('invalid HUMAN authorization approval');
  }
}

function recoveryAuthorityReferences(profile) {
  return profileOptions(profile).authorityRefs;
}

function assertFreshRecoveryAuthority({ root, changePath, profile, supplied, artifactNames = [] }) {
  const fresh = fingerprintConfiguredAuthorities({ root, changePath, profile, artifactNames });
  if (canonicalJson(supplied) !== canonicalJson(fresh)) fail('recovery authority fingerprint mismatch');
  return fresh;
}

function recoveryLockPath(changePath, profile, name) {
  const options = profileOptions(profile);
  const directory = options.custom ? runtimePath(changePath, profile, 'locks') : runtimeDirectory(changePath, profile);
  return join(directory, name);
}

function recoveryProjection(target, profile) {
  const configured = projectCanonicalWorkflow(profile);
  return isKnownAction(target, configured) ? configured : projectCanonicalWorkflow();
}

function isAllowedRecoveryRefinement(action, expectedIndex, path) {
  if (action === 'Design Refinement') {
    return expectedIndex > path.indexOf('Architecture Review');
  }
  if (action === 'Tasks Refinement') {
    return expectedIndex > path.indexOf('Tasks Review');
  }
  return false;
}

function validateStrandedPredecessorChain({ changePath, target, state, events, profile }) {
  const projection = recoveryProjection(target, profile);
  const path = lifecyclePathTo(projection, target);
  if (state.checkpoint.artifact !== projection.artifacts[target]) {
    fail('invalid-recovery-chain: target artifact does not match the Portable lifecycle');
  }

  const reconciled = reconcileTraceState(state, events);
  if (reconciled.state.sequence !== events.length) fail('invalid-recovery-chain: state and trace sequence mismatch');

  let expectedIndex = 0;
  for (const event of events) {
    if (event.operation !== undefined) fail('invalid-recovery-chain: recovery trace cannot contain another recovery');
    if (expectedIndex >= path.length) fail('invalid-recovery-chain: trace contains events after the target checkpoint');
    if (event.stateMaterialization.checkpoint.phase !== event.action) {
      fail('invalid-recovery-chain: trace action and checkpoint phase differ');
    }
    if (projection.roles[event.action] !== event.role) {
      fail(`invalid-recovery-chain: ${event.action} has a non-canonical role`);
    }
    const expected = path[expectedIndex];
    if (isAllowedRecoveryRefinement(event.action, expectedIndex, path)) {
      if (event.stateMaterialization.checkpoint.verdict !== 'PASS') {
        fail(`invalid-recovery-chain: ${event.action} did not complete`);
      }
      if (event.stateMaterialization.checkpoint.next !== (projection.edges[event.action] ?? null)) {
        fail(`invalid-recovery-chain: ${event.action} declares an impossible next action`);
      }
      continue;
    }
    if (event.action !== expected) {
      if (expectedIndex > 0 && event.action === path[expectedIndex - 1]) {
        if (event.stateMaterialization.checkpoint.verdict !== 'PASS') {
          fail(`invalid-recovery-chain: predecessor ${event.action} is not complete`);
        }
        if (event.stateMaterialization.checkpoint.next !== (projection.edges[event.action] ?? null)) {
          fail(`invalid-recovery-chain: ${event.action} declares an impossible next action`);
        }
        continue;
      }
      fail(`invalid-recovery-chain: expected ${expected ?? 'no further phase'} before ${event.action}`);
    }
    const eventVerdict = event.stateMaterialization.checkpoint.verdict;
    if (event.action === target) {
      if (eventVerdict !== 'BLOCKED' || expectedIndex !== path.length - 1 || event.stateMaterialization.checkpoint.next !== null) {
        fail('invalid-recovery-chain: target is not the final blocked checkpoint');
      }
    } else {
      if (eventVerdict !== 'PASS') fail(`invalid-recovery-chain: predecessor ${event.action} is not complete`);
      if (event.stateMaterialization.checkpoint.next !== (projection.edges[event.action] ?? null)) {
        fail(`invalid-recovery-chain: ${event.action} declares an impossible next action`);
      }
    }
    expectedIndex += 1;
  }
  if (expectedIndex !== path.length) {
    fail(`invalid-recovery-chain: missing predecessor before ${target}`);
  }

  // The trace proves ordering; the files prove that each completed phase has
  // authoritative evidence. A recovery marker alone never supplies either.
  validateAuthoritativeArtifacts({
    changePath,
    phase: target,
    verdict: 'BLOCKED',
    projection,
  });
  return { projection, path, state: reconciled.state };
}

function validateRecoveryPrefix({ changePath, checkpointPhase, state, events, profile, projection }) {
  const selectedProjection = projection ?? recoveryProjection(checkpointPhase, profile);
  const path = lifecyclePathTo(selectedProjection, checkpointPhase);
  if (state.checkpoint.phase !== checkpointPhase || state.checkpoint.next !== null) {
    fail('invalid-recovery-chain: recovery checkpoint does not identify its proven predecessor');
  }
  const reconciled = reconcileTraceState(state, events);
  let expectedIndex = 0;
  for (const event of events) {
    if (event.operation !== undefined) fail('invalid-recovery-chain: recovery trace cannot contain another recovery');
    if (event.stateMaterialization.checkpoint.phase !== event.action) {
      fail('invalid-recovery-chain: trace action and checkpoint phase differ');
    }
    if (selectedProjection.roles[event.action] !== event.role) {
      fail(`invalid-recovery-chain: ${event.action} has a non-canonical role`);
    }
    const expected = path[expectedIndex];
    if (event.action === expected) {
      if (
        event.action !== checkpointPhase &&
        event.stateMaterialization.checkpoint.verdict === 'PASS' &&
        event.stateMaterialization.checkpoint.next !== (selectedProjection.edges[event.action] ?? null)
      ) {
        fail(`invalid-recovery-chain: ${event.action} declares an impossible next action`);
      }
      expectedIndex += 1;
      continue;
    }
    if (isAllowedRecoveryRefinement(event.action, expectedIndex, path)) {
      if (event.stateMaterialization.checkpoint.verdict !== 'PASS') {
        fail(`invalid-recovery-chain: ${event.action} did not complete`);
      }
      if (event.stateMaterialization.checkpoint.next !== (selectedProjection.edges[event.action] ?? null)) {
        fail(`invalid-recovery-chain: ${event.action} declares an impossible next action`);
      }
      continue;
    }
    if (expectedIndex > 0 && event.action === path[expectedIndex - 1]) {
      if (
        event.stateMaterialization.checkpoint.verdict === 'PASS' &&
        event.stateMaterialization.checkpoint.next !== (selectedProjection.edges[event.action] ?? null)
      ) {
        fail(`invalid-recovery-chain: ${event.action} declares an impossible next action`);
      }
      continue;
    }
    fail(`invalid-recovery-chain: expected ${expected ?? 'no further phase'} before ${event.action}`);
  }
  if (expectedIndex !== path.length) fail(`invalid-recovery-chain: missing predecessor before ${checkpointPhase}`);
  validateAuthoritativeArtifacts({
    changePath,
    phase: checkpointPhase,
    verdict: state.checkpoint.verdict,
    projection: selectedProjection,
  });
  return { projection: selectedProjection, path, state: reconciled.state };
}

export async function recoverStrandedCheckpoint(input = {}) {
  assertObject(input, 'recovery request');
  const allowed = new Set(['root', 'change', 'canonicalPath', 'expectedSequence', 'target', 'authorityRefs', 'fingerprints', 'authorization', 'profile']);
  if (!own(input, allowed)) fail('unknown recovery request field');
  const { root, change, canonicalPath, expectedSequence, target, authorityRefs, fingerprints, authorization, profile } = input;
  const identity = validateIdentity({ root, change, canonicalPath, profile });
  if (target !== STRANDED_RECOVERY_TARGET) fail('invalid recovery target');
  if (!Number.isSafeInteger(expectedSequence) || expectedSequence < 1) fail('invalid expected sequence');
  validateRecoveryAuthorization(authorization);
  if (canonicalJson(authorityRefs) !== canonicalJson(recoveryAuthorityReferences(profile))) fail('ambiguous authority references');
  assertObject(fingerprints, 'fingerprints');
  for (const key of ['workflow', 'modelMap', 'config']) assertHash(fingerprints[key], `fingerprints.${key}`);
  assertObject(fingerprints.artifacts, 'fingerprints.artifacts');
  for (const hash of Object.values(fingerprints.artifacts)) assertHash(hash, 'artifact fingerprint');
  const suppliedArtifactNames = Object.keys(fingerprints.artifacts).sort();
  const lockPath = recoveryLockPath(identity.changePath, profile, 'stranded-recovery.lock');
  await mkdir(dirname(lockPath), { recursive: true });
  const statePath = runtimePath(identity.changePath, profile, 'state');
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
    const state = validateRuntimeState(JSON.parse(await readFile(statePath, 'utf8')));
    if (canonicalJson(Object.keys(state.fingerprints.artifacts).sort()) !== canonicalJson(suppliedArtifactNames)) {
      fail('recovery authority artifact set mismatch');
    }
    const freshAuthorityFingerprints = assertFreshRecoveryAuthority({ root, changePath: identity.changePath, profile, supplied: fingerprints, artifactNames: suppliedArtifactNames });
    if (state.sequence !== expectedSequence || state.status !== 'HUMAN_HANDOFF') fail('stale recovery checkpoint');
    if (state.checkpoint.phase !== target || state.checkpoint.next !== null) fail('recovery checkpoint is not blocked');
    const events = await readTraceEvents(identity.changePath, profile);
    if (events.length !== expectedSequence) fail('recovery trace sequence mismatch');
    const chain = validateStrandedPredecessorChain({
      changePath: identity.changePath,
      target,
      state,
      events,
      profile,
    });
    const recoveredArtifactFingerprints = fingerprintLifecycleArtifacts({
      changePath: identity.changePath,
      phase: target,
      projection: chain.projection,
    });
    const after = validateRuntimeState({
      ...state,
      status: 'READY',
      sequence: expectedSequence + 1,
      checkpoint: { phase: target, artifact: state.checkpoint.artifact, verdict: 'BLOCKED', next: target },
      fingerprints: {
        ...state.fingerprints,
        ...freshAuthorityFingerprints,
        artifacts: { ...state.fingerprints.artifacts, ...recoveredArtifactFingerprints },
      },
      traceCursor: { sequence: expectedSequence + 1, eventHash: null, chainHash: null },
      lastTransition: {
        inputHash: hashObject({ operation: STRANDED_RECOVERY_OPERATION, expectedSequence, authorization }),
        outcomeHash: hashObject({ operation: STRANDED_RECOVERY_OPERATION, target }),
        afterStateHash: hashObject({ operation: STRANDED_RECOVERY_OPERATION, target }),
      },
    });
    const event = createTraceEvent({
      change,
      sequence: after.sequence,
      action: target,
      role: 'HUMAN',
      inputHash: after.lastTransition.inputHash,
      outcomeHash: after.lastTransition.outcomeHash,
      beforeState: state,
      afterState: after,
      operation: STRANDED_RECOVERY_OPERATION,
      previousSequence: expectedSequence,
      newSequence: after.sequence,
      sourceStatus: 'HUMAN_HANDOFF',
      target,
      authorization,
      authorityFingerprints: fingerprints,
      contextAudit: {
        bootstrapReadCount: 1,
        normalPhaseBootstrapReadCount: 0,
        references: authorityRefs,
        operation: STRANDED_RECOVERY_OPERATION,
      },
    });
    const persisted = await persistTransition({ changePath: identity.changePath, event, state: after, profile });
    return {
      ...persisted,
      state: validateRuntimeState({
        ...after,
        traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash },
      }),
      event,
    };
  } finally {
    if (lock) {
      await lock.close();
      await unlink(lockPath).catch(() => {});
    }
  }
}

/**
 * Preserve Portable's narrowly scoped sequence-21 materialization recovery.
 * It is never part of ordinary dispatch and cannot infer a PASS result.
 */
export async function recoverDispatchMaterialization(input = {}) {
  assertObject(input, 'materialization recovery request');
  const allowed = new Set([
    'root',
    'change',
    'canonicalPath',
    'expectedSequence',
    'target',
    'authorityRefs',
    'fingerprints',
    'authorization',
    'blockedOutcome',
    'profile',
  ]);
  if (!own(input, allowed)) fail('unknown materialization recovery request field');
  const {
    root,
    change,
    canonicalPath,
    expectedSequence,
    target,
    authorityRefs,
    fingerprints,
    authorization,
    blockedOutcome,
    profile,
  } = input;
  if (target !== 'Apply 7.5 Testing') fail('invalid materialization recovery target');
  if (expectedSequence !== 21) fail('materialization recovery is limited to sequence 21');
  validateRecoveryAuthorization(authorization);
  if (canonicalJson(authorityRefs) !== canonicalJson(recoveryAuthorityReferences(profile))) fail('ambiguous authority references');
  validateOutcomePacket(blockedOutcome);
  if (
    blockedOutcome.status !== 'BLOCKED' ||
    blockedOutcome.action !== target ||
    blockedOutcome.role !== 'MID' ||
    blockedOutcome.blocker.class !== 'HUMAN_SCOPE' ||
    blockedOutcome.blocker.resume_phase !== target ||
    blockedOutcome.next !== target
  ) {
    fail('non-recoverable blocked evidence');
  }
  const identity = validateIdentity({ root, change, canonicalPath, profile });
  assertObject(fingerprints, 'fingerprints');
  for (const key of ['workflow', 'modelMap', 'config']) assertHash(fingerprints[key], `fingerprints.${key}`);
  assertObject(fingerprints.artifacts, 'fingerprints.artifacts');
  for (const hash of Object.values(fingerprints.artifacts)) assertHash(hash, 'artifact fingerprint');
  const suppliedArtifactNames = Object.keys(fingerprints.artifacts).sort();
  const lockPath = recoveryLockPath(identity.changePath, profile, 'dispatch-materialization-recovery.lock');
  await mkdir(dirname(lockPath), { recursive: true });
  const statePath = runtimePath(identity.changePath, profile, 'state');
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
    const state = validateRuntimeState(JSON.parse(await readFile(statePath, 'utf8')));
    if (canonicalJson(Object.keys(state.fingerprints.artifacts).sort()) !== canonicalJson(suppliedArtifactNames)) {
      fail('recovery authority artifact set mismatch');
    }
    const freshAuthorityFingerprints = assertFreshRecoveryAuthority({ root, changePath: identity.changePath, profile, supplied: fingerprints, artifactNames: suppliedArtifactNames });
    if (state.sequence !== expectedSequence || state.status !== 'HUMAN_HANDOFF') fail('stale materialization recovery checkpoint');
    if (state.checkpoint.phase !== 'Apply 7.4 Integration' || state.checkpoint.next !== null) fail('materialization checkpoint mismatch');
    const events = await readTraceEvents(identity.changePath, profile);
    if (events.length !== expectedSequence) fail('recovery trace sequence mismatch');
    const chain = validateRecoveryPrefix({
      changePath: identity.changePath,
      checkpointPhase: 'Apply 7.4 Integration',
      state,
      events,
      profile,
    });
    if (blockedOutcome.checkpointArtifact !== chain.projection.artifacts[target]) {
      fail('invalid-recovery-chain: blocked outcome artifact does not match the Portable lifecycle');
    }
    validateAuthoritativeArtifacts({
      changePath: identity.changePath,
      phase: target,
      verdict: 'BLOCKED',
      projection: chain.projection,
    });
    const recoveredArtifactFingerprints = fingerprintLifecycleArtifacts({
      changePath: identity.changePath,
      phase: target,
      projection: chain.projection,
    });
    const after = validateRuntimeState({
      ...state,
      status: 'READY',
      sequence: expectedSequence + 1,
      checkpoint: { phase: target, artifact: blockedOutcome.checkpointArtifact, verdict: 'BLOCKED', next: target },
      fingerprints: {
        ...state.fingerprints,
        ...freshAuthorityFingerprints,
        artifacts: { ...state.fingerprints.artifacts, ...recoveredArtifactFingerprints },
      },
      traceCursor: { sequence: expectedSequence + 1, eventHash: null, chainHash: null },
      lastTransition: {
        inputHash: hashObject(blockedOutcome),
        outcomeHash: hashObject({ ...blockedOutcome, status: 'HUMAN_HANDOFF', next: null }),
        afterStateHash: hashObject({ operation: DISPATCH_MATERIALIZATION_RECOVERY_OPERATION, target }),
      },
    });
    const event = createTraceEvent({
      change,
      sequence: after.sequence,
      action: target,
      role: 'HUMAN',
      inputHash: after.lastTransition.inputHash,
      outcomeHash: after.lastTransition.outcomeHash,
      beforeState: state,
      afterState: after,
      operation: DISPATCH_MATERIALIZATION_RECOVERY_OPERATION,
      previousSequence: expectedSequence,
      newSequence: after.sequence,
      sourceStatus: 'HUMAN_HANDOFF',
      target,
      authorization,
      authorityFingerprints: fingerprints,
      contextAudit: {
        bootstrapReadCount: 1,
        normalPhaseBootstrapReadCount: 0,
        references: authorityRefs,
        operation: DISPATCH_MATERIALIZATION_RECOVERY_OPERATION,
      },
    });
    const persisted = await persistTransition({ changePath: identity.changePath, event, state: after, profile });
    return {
      ...persisted,
      state: validateRuntimeState({
        ...after,
        traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash },
      }),
      event,
    };
  } finally {
    if (lock) {
      await lock.close();
      await unlink(lockPath).catch(() => {});
    }
  }
}

export function resolveRoute({ role, requiredCapability, minimumQuality = 0, candidates = [] } = {}) {
  if (!LOGICAL_ROLES.has(role) || role === 'HUMAN') fail('invalid routable role');
  const rejected = [];
  const compatible = candidates
    .filter((candidate) => {
      if (candidate.role !== role) {
        rejected.push({ id: candidate.id, reason: 'role-mismatch' });
        return false;
      }
      if (!Array.isArray(candidate.capabilities) || !candidate.capabilities.includes(requiredCapability)) {
        rejected.push({ id: candidate.id, reason: 'capability-mismatch' });
        return false;
      }
      if (candidate.available === false) {
        rejected.push({ id: candidate.id, reason: 'provider-unavailable' });
        return false;
      }
      if ((candidate.quality ?? 1) < minimumQuality) {
        rejected.push({ id: candidate.id, reason: 'quality-below-minimum' });
        return false;
      }
      if (!Number.isFinite(candidate.cost)) {
        rejected.push({ id: candidate.id, reason: 'invalid-cost' });
        return false;
      }
      return true;
    })
    .sort((a, b) => a.cost - b.cost);
  if (!compatible[0]) fail('no compatible route');
  return {
    configured: role,
    resolved: compatible[0].id,
    rejections: rejected,
    considered: candidates.map((candidate) => candidate.id),
    candidates: compatible.map((candidate) => candidate.id),
  };
}

export async function resolveConfiguredRoute({ modelMapPath, modelMap, role, requiredCapability, minimumQuality = 0 } = {}) {
  if (!modelMap && typeof modelMapPath === 'string') modelMap = JSON.parse(await readFile(modelMapPath, 'utf8'));
  validateProjectProfile(modelMap);
  const routing = modelMap.runtime_routing;
  assertObject(routing, 'modelMap.runtime_routing');
  const primaryId = routing.primary?.[role];
  const fallbackIds = routing.fallbacks?.[role];
  const records = routing.candidates?.[role];
  if (typeof primaryId !== 'string' || !Array.isArray(fallbackIds) || !Array.isArray(records)) fail('configured route metadata missing');
  const byId = new Map(records.map((candidate) => [candidate.id, candidate]));
  const ids = [primaryId, ...fallbackIds];
  const candidates = ids.map((id) => byId.get(id)).filter(Boolean);
  if (candidates.length !== ids.length) fail('configured route candidate missing');
  return resolveRoute({ role, requiredCapability, minimumQuality, candidates });
}

export async function resolveConfiguredPhaseRoute({ modelMapPath, modelMap, phase, minimumQuality = 0 } = {}) {
  if (!modelMap && typeof modelMapPath === 'string') modelMap = JSON.parse(await readFile(modelMapPath, 'utf8'));
  const validated = validateProjectProfile(modelMap);
  const role = validated.lifecycle.roles[phase];
  if (!role || role === 'HUMAN') fail(`phase is not routable: ${phase}`);
  const executor = modelMap.phase_executors?.[phase];
  if (typeof executor !== 'string' || !executor.trim()) fail(`phase executor is missing for ${phase}`);
  if (modelMap.local_agent_roles?.[executor] !== role) fail(`phase executor ${executor} is not bound to ${phase}`);
  const model = modelMap.roles?.[role]?.model;
  if (typeof model !== 'string' || !model) fail(`phase role model is missing for ${phase}`);
  return {
    phase,
    executor,
    role,
    resolved: executor,
    model,
  };
}

export function validateRoute(route) {
  assertObject(route, 'route');
  if (typeof route.configured !== 'string' || typeof route.resolved !== 'string' || !Array.isArray(route.rejections)) fail('invalid route');
  return route;
}

function validateProfileSources(value, name) {
  if (!Array.isArray(value) || value.length === 0) fail(`${name} must contain relative repository paths`);
  const sources = value.map((source) => safeRelativePath(source, name));
  if (new Set(sources).size !== sources.length) fail(`${name} must not contain duplicates`);
  return sources;
}

function validateStringList(value, name, { requireValues = true } = {}) {
  if (!Array.isArray(value) || (requireValues && value.length === 0)) fail(`${name} must be a non-empty string list`);
  if (value.some((item) => typeof item !== 'string' || !item.trim())) fail(`${name} must contain non-empty strings`);
  if (new Set(value).size !== value.length) fail(`${name} must not contain duplicates`);
  return [...value];
}

function validateLifecycleMapping(options, profile) {
  const phases = validateStringList(options.phases, 'project_profile.lifecycle.phases');
  const phaseSet = new Set(phases);
  if (!phaseSet.has(options.terminal)) fail('project_profile.lifecycle.terminal must be a lifecycle phase');
  for (const phase of phases) {
    if (!LOGICAL_ROLES.has(options.roles[phase])) fail(`project_profile.lifecycle.roles is missing ${phase}`);
    if (typeof options.artifacts[phase] !== 'string' || !options.artifacts[phase].trim()) {
      fail(`project_profile.lifecycle_artifacts is missing ${phase}`);
    }
  }
  for (const phase of Object.keys(options.artifacts)) {
    if (!phaseSet.has(phase)) fail(`project_profile.lifecycle_artifacts has unknown phase ${phase}`);
  }
  for (const [phase, role] of Object.entries(options.roles)) {
    if (!phaseSet.has(phase)) fail(`project_profile.lifecycle.roles has unknown phase ${phase}`);
    if (!LOGICAL_ROLES.has(role)) fail(`project_profile.lifecycle.roles has invalid role for ${phase}`);
  }
  for (const [phase, next] of Object.entries(options.edges)) {
    if (!phaseSet.has(phase) || !phaseSet.has(next)) fail(`project_profile.lifecycle.edges has unknown phase ${phase}`);
  }
  if (options.edges[options.terminal] !== undefined) fail('project_profile.lifecycle.terminal cannot have an outgoing edge');
  for (const phase of phases) {
    if (phase !== options.terminal && typeof options.edges[phase] !== 'string') {
      fail(`project_profile.lifecycle.edges is missing ${phase}`);
    }
    const visited = new Set();
    let current = phase;
    while (current !== options.terminal) {
      if (visited.has(current)) fail(`project_profile.lifecycle.edges contains a cycle at ${current}`);
      visited.add(current);
      current = options.edges[current];
    }
  }
  if (profile.lifecycle?.phases !== undefined && profile.lifecycle.phases.length !== phases.length) {
    fail('project_profile.lifecycle phases do not match the effective lifecycle');
  }
  return { phases, phaseSet };
}

function validateSemanticMapping(mapping, required) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) fail('project_profile.semantic_validation is required');
  if (!own(mapping, new Set(['profile', 'required_topics', 'heading_aliases', 'optional_topics', 'review_semantics']))) {
    fail('unknown project_profile.semantic_validation field');
  }
  if (typeof mapping.profile !== 'string' || !mapping.profile.trim()) fail('project_profile.semantic_validation.profile is required');
  const requiredTopics = validateStringList(mapping.required_topics, 'project_profile.semantic_validation.required_topics');
  const aliases = mapping.heading_aliases;
  assertObject(aliases, 'project_profile.semantic_validation.heading_aliases');
  for (const topic of requiredTopics) {
    validateStringList(aliases[topic], `project_profile.semantic_validation.heading_aliases.${topic}`);
  }
  if (mapping.optional_topics !== undefined) validateStringList(mapping.optional_topics, 'project_profile.semantic_validation.optional_topics', { requireValues: false });
  const review = mapping.review_semantics;
  assertObject(review, 'project_profile.semantic_validation.review_semantics');
  if (!own(review, new Set(['artifact', 'required_meanings', 'heading_aliases']))) fail('unknown project_profile.semantic_validation.review_semantics field');
  if (typeof review.artifact !== 'string' || !review.artifact.trim()) fail('project_profile.semantic_validation.review_semantics.artifact is required');
  validateStringList(review.required_meanings, 'project_profile.semantic_validation.review_semantics.required_meanings');
  validateStringList(review.heading_aliases, 'project_profile.semantic_validation.review_semantics.heading_aliases');
  if (required && requiredTopics.length === 0) fail('project_profile.semantic_validation requires mandatory topics');
  return requiredTopics;
}

function validateGitBoundary(boundary, terminal) {
  assertObject(boundary, 'project_profile.git_boundary');
  if (!own(boundary, new Set(['owner', 'terminal', 'operations']))) fail('unknown project_profile.git_boundary field');
  if (boundary.owner !== 'HUMAN') fail('project_profile.git_boundary.owner must be HUMAN');
  if (boundary.terminal !== terminal) fail('project_profile.git_boundary.terminal must match lifecycle terminal');
  const operations = validateStringList(boundary.operations, 'project_profile.git_boundary.operations');
  const normalized = new Set(operations.map((operation) => operation.toLocaleLowerCase()));
  for (const operation of REQUIRED_HUMAN_GIT_OPERATIONS) {
    if (!normalized.has(operation.toLocaleLowerCase())) fail(`project_profile.git_boundary.operations is missing ${operation}`);
  }
  return operations;
}

export function validateProjectProfile(modelMap) {
  assertObject(modelMap, 'modelMap');
  if (typeof modelMap.project !== 'string' || !modelMap.project.trim()) fail('project profile id is required');
  validateChangeName(modelMap.project);
  const profile = modelMap.project_profile;
  assertObject(profile, 'project_profile');
  const allowed = new Set([
    'name',
    'memory_key',
    'changes_root',
    'runtime_directory',
    'runtime_layout',
    'archive_behavior',
    'authority_order',
    'authority_refs',
    'context_sources',
    'invariant_sources',
    'lifecycle_artifacts',
    'semantic_validation',
    'lifecycle',
    'git_boundary',
  ]);
  if (!own(profile, allowed)) fail('unknown project profile field');
  if (typeof profile.name !== 'string' || !profile.name.trim()) fail('project profile name is required');
  if (typeof profile.memory_key !== 'string' || !profile.memory_key.trim()) fail('project profile memory_key is required');
  const options = profileOptions(profile);
  safeRelativePath(options.changesRoot, 'project_profile.changes_root');
  safeRelativePath(options.runtimeDirectory, 'project_profile.runtime_directory');
  assertObject(options.runtimeLayout, 'project_profile.runtime_layout');
  for (const entry of ['state', 'trace', 'recovery', 'locks', 'checkpoints']) {
    safeRelativePath(options.runtimeLayout[entry], `project_profile.runtime_layout.${entry}`);
  }
  assertObject(options.authorityRefs, 'project_profile.authority_refs');
  for (const key of ['workflow', 'modelMap', 'config']) {
    if (typeof options.authorityRefs[key] !== 'string') fail(`project_profile.authority_refs is missing ${key}`);
  }
  for (const [key, value] of Object.entries(options.authorityRefs)) {
    safeRelativePath(value, `project_profile.authority_refs.${key}`);
  }
  for (const [phase, artifact] of Object.entries(options.artifacts)) {
    if (typeof artifact !== 'string' || artifact.includes('/') || artifact.includes('\\')) {
      fail(`project_profile.lifecycle_artifacts.${phase} must be a basename`);
    }
  }
  if (!['in-place', 'relocate'].includes(options.archiveBehavior)) fail('invalid archive behavior');
  const contextSources = validateProfileSources(profile.context_sources, 'project_profile.context_sources');
  const invariantSources = validateProfileSources(profile.invariant_sources, 'project_profile.invariant_sources');
  const lifecycle = profile.lifecycle ?? {};
  if (!own(lifecycle, new Set(['phases', 'edges', 'roles', 'terminal']))) fail('unknown project_profile.lifecycle field');
  if (
    options.custom &&
    (!profile.changes_root || !profile.runtime_directory || !profile.runtime_layout || !profile.authority_refs ||
      !Array.isArray(lifecycle.phases) || !lifecycle.edges || !lifecycle.roles || profile.lifecycle_artifacts === undefined)
  ) {
    fail('custom project profile must declare lifecycle mappings');
  }
  if (lifecycle.phases !== undefined && (!Array.isArray(lifecycle.phases) || lifecycle.phases.length === 0)) fail('project_profile.lifecycle.phases must be non-empty');
  if (lifecycle.edges !== undefined) assertObject(lifecycle.edges, 'project_profile.lifecycle.edges');
  if (lifecycle.roles !== undefined) assertObject(lifecycle.roles, 'project_profile.lifecycle.roles');
  if (profile.lifecycle_artifacts !== undefined) assertObject(profile.lifecycle_artifacts, 'project_profile.lifecycle_artifacts');
  const { phases, phaseSet } = validateLifecycleMapping(options, profile);
  if (modelMap.phase_executors !== undefined) {
    assertObject(modelMap.phase_executors, 'modelMap.phase_executors');
    for (const phase of phases) {
      if (typeof modelMap.phase_executors[phase] !== 'string' || !modelMap.phase_executors[phase].trim()) {
        fail(`modelMap.phase_executors is missing ${phase}`);
      }
    }
    for (const phase of Object.keys(modelMap.phase_executors)) {
      if (!phaseSet.has(phase)) fail(`modelMap.phase_executors has unknown phase ${phase}`);
    }
    if (!modelMap.local_agent_roles || !modelMap.roles) fail('phase executor validation requires local_agent_roles and roles');
    for (const phase of phases) {
      const executor = modelMap.phase_executors[phase];
      const role = options.roles[phase];
      if (modelMap.local_agent_roles[executor] !== role) fail(`modelMap.phase_executors role mismatch for ${phase}`);
    }
  }
  if (options.custom) validateSemanticMapping(profile.semantic_validation, true);
  else if (profile.semantic_validation) validateSemanticMapping(profile.semantic_validation, false);
  const gitOperations = options.custom ? validateGitBoundary(profile.git_boundary, options.terminal) : null;
  if (modelMap.phase_roles !== undefined) {
    assertObject(modelMap.phase_roles, 'modelMap.phase_roles');
    for (const [phase, role] of Object.entries(modelMap.phase_roles)) {
      if (!phaseSet.has(phase)) {
        if (role !== 'HUMAN' || !RESERVED_HUMAN_PHASES.has(phase)) fail(`modelMap.phase_roles does not match ${phase}`);
        continue;
      }
      if (options.roles[phase] !== role) fail(`modelMap.phase_roles does not match ${phase}`);
    }
    for (const phase of phases) {
      if (modelMap.phase_roles[phase] !== options.roles[phase]) fail(`modelMap.phase_roles is missing ${phase}`);
    }
  }
  return Object.freeze({
    id: modelMap.project,
    name: profile.name.trim(),
    memoryKey: profile.memory_key.trim(),
    contextSources,
    invariantSources,
    changesRoot: options.changesRoot,
    runtimeDirectory: options.runtimeDirectory,
    runtimeLayout: { ...options.runtimeLayout },
    archiveBehavior: options.archiveBehavior,
    authorityRefs: { ...options.authorityRefs },
    lifecycleArtifacts: { ...options.artifacts },
    semanticValidation: profile.semantic_validation ?? null,
    gitBoundary: gitOperations ? { owner: 'HUMAN', terminal: options.terminal, operations: [...gitOperations] } : null,
    lifecycle: {
      phases: [...options.phases],
      edges: { ...options.edges },
      roles: { ...options.roles },
      terminal: options.terminal,
    },
    phaseExecutors: modelMap.phase_executors ? { ...modelMap.phase_executors } : null,
    customLifecycle: options.custom,
  });
}

export async function loadProjectProfile({ modelMapPath, modelMap } = {}) {
  if (!modelMap && typeof modelMapPath === 'string') modelMap = JSON.parse(await readFile(modelMapPath, 'utf8'));
  return validateProjectProfile(modelMap);
}

export { HUMAN_CLASSES, AUTO_CLASSES };
