#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CHANGE_NAME_PATTERN,
  firstIncompleteLifecycleAction,
  inspectAuthoritativeLifecycle,
  projectCanonicalWorkflow,
  readTraceEventsSync,
  validateChangeName,
  validateAuthoritativeArtifacts,
  validateProjectProfile,
  validateRuntimeRecovery,
} from './sdd-runtime.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'development', 'trunk']);

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function normalizedBranch(branch) {
  if (typeof branch !== 'string') return null;
  const value = branch.trim().replace(/^refs\/heads\//i, '');
  return value || null;
}

function branchSuffix(branch) {
  return normalizedBranch(branch)?.split('/').filter(Boolean).at(-1) || null;
}

export function canonicalBranchChangeName(branch) {
  const normalized = normalizedBranch(branch);
  if (!normalized || PROTECTED_BRANCHES.has(normalized.toLowerCase())) return null;
  const name = normalized
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return isValidChangeName(name) ? name : null;
}

export const branchChangeName = canonicalBranchChangeName;

function branchAssociationNames(branch) {
  const names = new Set();
  const derived = canonicalBranchChangeName(branch);
  const suffix = branchSuffix(branch);
  if (derived) names.add(derived);
  if (isValidChangeName(suffix)) names.add(suffix);
  return names;
}

function profileFor(profile, root = ROOT) {
  if (profile !== undefined && profile !== null) {
    if (profile.project_profile) return validateProjectProfile(profile);
    return validateProjectProfile(profile);
  }
  const mapPath = join(root, '.opencode', 'sdd-model-map.json');
  if (!existsSync(mapPath)) return null;
  try {
    const text = readFileSync(mapPath, 'utf8');
    return validateProjectProfile(JSON.parse(text));
  } catch (error) {
    throw new TypeError(`invalid-project-profile: ${error.message}`);
  }
}

function profileRoot(profile) {
  return profile?.changesRoot ?? profile?.changes_root ?? 'openspec/changes';
}

function profileRuntimeLayout(profile) {
  return profile?.runtimeLayout ?? profile?.runtime_layout ?? {
    state: 'state.json',
    trace: 'trace',
    recovery: 'recovery',
    locks: 'locks',
    checkpoints: 'checkpoints',
  };
}

function profileArtifacts(profile) {
  return profile?.lifecycleArtifacts ?? profile?.lifecycle_artifacts ??
    projectCanonicalWorkflow(profile).artifacts;
}

function hasArchivePath(filePath) {
  return filePath.split(/[\\/]/).includes('archive');
}

function isValidChangeName(name) {
  return typeof name === 'string' && CHANGE_NAME_PATTERN.test(name);
}

function lastField(text, field) {
  const matches = [...text.matchAll(new RegExp(`^\\s*${field}:\\s*(.+?)\\s*$`, 'gim'))];
  return matches.at(-1)?.[1]?.trim() || null;
}

function normalizeCheckpoint(checkpoint, fallbackArtifact = null, fallbackPhase = null) {
  if (!checkpoint || typeof checkpoint !== 'object') {
    return { artifact: fallbackArtifact, phase: fallbackPhase, status: null, next: null };
  }
  return {
    artifact: checkpoint.artifact ?? fallbackArtifact,
    phase: checkpoint.phase ?? fallbackPhase,
    status: checkpoint.status ?? checkpoint.verdict ?? null,
    next: checkpoint.next ?? null,
  };
}

function authoritativeCheckpoint(candidate, profile) {
  if (!candidate?.path) return null;
  const inspection = candidate.lifecycleInspection ?? inspectAuthoritativeLifecycle({
    changePath: candidate.path,
    profile,
  });
  if (!inspection.hasEvidence) return null;
  if (inspection.latest) {
    validateAuthoritativeArtifacts({
      changePath: candidate.path,
      profile,
      phase: inspection.latest.phase,
      verdict: inspection.latest.status,
      inspection,
    });
    const next = firstIncompleteLifecycleAction({
      changePath: candidate.path,
      profile,
      inspection,
    });
    return {
      ...inspection.latest,
      next: next ?? inspection.latest.next,
    };
  }
  const firstPresent = inspection.entries.find((entry) => entry.present);
  if (!firstPresent) return null;
  return {
    artifact: firstPresent.artifact,
    phase: firstPresent.phase,
    status: null,
    next: firstIncompleteLifecycleAction({
      changePath: candidate.path,
      profile,
      inspection,
    }) ?? firstPresent.phase,
  };
}

function recoverCheckpoint(candidate, profile) {
  if (candidate?.authoritativeCheckpoint) return normalizeCheckpoint(candidate.authoritativeCheckpoint);
  if (candidate?.runtimeState) {
    const checkpoint = candidate.runtimeState.checkpoint;
    return normalizeCheckpoint(checkpoint);
  }
  if (candidate?.checkpoint) return normalizeCheckpoint(candidate.checkpoint);
  if (!candidate?.path) return normalizeCheckpoint();

  const inspection = candidate.lifecycleInspection ?? inspectAuthoritativeLifecycle({
    changePath: candidate.path,
    profile,
  });
  if (inspection.hasEvidence) {
    return normalizeCheckpoint(authoritativeCheckpoint({ ...candidate, lifecycleInspection: inspection }, profile));
  }

  const projection = projectCanonicalWorkflow(profile);
  const seen = new Set();
  for (const phase of [...projection.phases].reverse()) {
    const artifact = projection.artifacts[phase];
    if (seen.has(artifact)) continue;
    seen.add(artifact);
    const text = readText(join(candidate.path, artifact));
    if (text === null) continue;
    return normalizeCheckpoint(
      {
        artifact,
        phase,
        status: lastField(text, 'status') || lastField(text, 'state'),
        next: lastField(text, 'next'),
      },
      artifact,
      phase,
    );
  }
  return normalizeCheckpoint();
}

function designIsHistorical(path, profile) {
  const design = readText(join(path, profileArtifacts(profile).Design || 'DESIGN.md')) || '';
  if (/\b(?:HISTORICAL|SUPERSEDED)\b/i.test(design)) return true;
  if (/^\s*(?:\*{0,2})?(?:status|state|lifecycle|change_status)(?:\*{0,2})\s*:\s*(?:\*{0,2})?\s*(?:archived|historical|superseded|closed|repository_ready)\b/im.test(design)) return true;
  return false;
}

function runtimeState(path, profile, expectedChange = null) {
  const runtimeDir = profile?.runtimeDirectory ?? profile?.runtime_directory ?? '.sdd-runtime';
  const layout = profileRuntimeLayout(profile);
  const stateFile = join(path, runtimeDir, layout.state);
  const text = readText(stateFile);
  if (text === null) {
    try {
      if (readTraceEventsSync(path, profile).length > 0) {
        throw new TypeError('trace exists without persisted runtime state');
      }
      return { state: null, invalid: false, reconciled: false };
    } catch (error) {
      return { state: null, invalid: true, error: error.message, reason: runtimeErrorReason(error), reconciled: false };
    }
  }
  try {
    const result = validateRuntimeRecovery({
      changePath: path,
      expectedChange,
      state: JSON.parse(text),
      profile,
    });
    return { state: result.state, invalid: false, reconciled: result.reconciled };
  } catch (error) {
    return { state: null, invalid: true, error: error.message, reason: runtimeErrorReason(error), reconciled: false };
  }
}

function runtimeErrorReason(error) {
  const message = error?.message || String(error);
  if (/missing[- ]authoritative[- ]artifact|missing canonical checkpoint artifact/i.test(message)) {
    return 'missing-authoritative-artifact';
  }
  if (/inconsistent[- ]lifecycle/i.test(message)) return 'inconsistent-lifecycle';
  if (/artifact[- ]state[- ]divergence|artifact fingerprint/i.test(message)) {
    return 'artifact-state-divergence';
  }
  return 'corrupt-runtime-state';
}

function hasHistoricalEvidence(path, profile, state) {
  if (hasArchivePath(path)) return true;
  if (designIsHistorical(path, profile)) return true;
  if (state?.status === 'COMPLETED') return true;
  const spec = readText(join(path, 'SPEC.md')) || '';
  if (/^\s*(?:\*{0,2})?(?:status|state|lifecycle|change_status)(?:\*{0,2})\s*:\s*(?:\*{0,2})?\s*(?:archived|historical|superseded|closed|repository_ready|completed)\b/im.test(spec)) return true;
  return false;
}

function isActiveCandidate(candidate) {
  if (!candidate || candidate.active === false || candidate.archived || candidate.completed) return false;
  return true;
}

function candidateFromDirectory(root, entry, profile) {
  const path = resolve(root, entry.name);
  const runtime = runtimeState(path, profile, entry.name);
  let files;
  try {
    files = readdirSync(path, { withFileTypes: true });
  } catch {
    return null;
  }
  const filePaths = files.filter((file) => file.isFile()).map((file) => join(path, file.name));
  const text = filePaths.map((file) => readText(file) || '').join('\n');
  let lifecycleInspection = null;
  let lifecycleError = null;
  try {
    lifecycleInspection = inspectAuthoritativeLifecycle({ changePath: path, profile });
    if (lifecycleInspection.latest) {
      validateAuthoritativeArtifacts({
        changePath: path,
        profile,
        phase: lifecycleInspection.latest.phase,
        verdict: lifecycleInspection.latest.status,
        inspection: lifecycleInspection,
      });
      if (
        runtime.state?.checkpoint?.phase !== null &&
        runtime.state?.checkpoint?.phase !== undefined &&
        runtime.state.checkpoint.artifact !== lifecycleInspection.latest.artifact
      ) {
        throw new TypeError('artifact-state-divergence: runtime checkpoint conflicts with authoritative artifact checkpoint');
      }
    }
  } catch (error) {
    lifecycleError = error;
  }
  const completed = !runtime.invalid && hasHistoricalEvidence(path, profile, runtime.state);
  const runtimeDirectory = profile?.runtimeDirectory ?? profile?.runtime_directory ?? '.sdd-runtime';
  const hasRuntimeDirectory = existsSync(join(path, runtimeDirectory));
  const activeByEvidence = Boolean(runtime.state) || lifecycleInspection?.hasEvidence || hasRuntimeDirectory || Boolean(lifecycleError);
  if (!activeByEvidence) return null;
  const artifactCheckpoint = lifecycleError
    ? null
    : authoritativeCheckpoint({ name: entry.name, path, lifecycleInspection }, profile);
  const selectedCheckpoint = runtime.state?.checkpoint?.phase !== null && runtime.state?.checkpoint?.phase !== undefined
    ? normalizeCheckpoint(runtime.state.checkpoint)
    : artifactCheckpoint;
  return {
    name: entry.name,
    path,
    completed,
    archived: completed,
    runtimeState: runtime.state,
    runtimeStateInvalid: runtime.invalid,
    runtimeStateError: runtime.error || null,
    runtimeStateReason: runtime.reason || null,
    reconciled: runtime.reconciled,
    lifecycleInspection,
    lifecycleInvalid: Boolean(lifecycleError),
    lifecycleError: lifecycleError?.message || null,
    authoritativeCheckpoint: selectedCheckpoint,
    checkpoint: lifecycleError
      ? normalizeCheckpoint()
      : recoverCheckpoint({
        name: entry.name,
        path,
        runtimeState: runtime.state,
        authoritativeCheckpoint: selectedCheckpoint,
        lifecycleInspection,
      }, profile),
  };
}

/**
 * Discover active change directories without creating or mutating anything.
 * The default path preserves Portable's openspec/changes behavior; a profile
 * can point the same engine at a repository-native changes root.
 */
export function discoverActiveChanges(changesRoot = join(ROOT, 'openspec', 'changes'), options = {}) {
  const profile = options.profile;
  if (!existsSync(changesRoot)) return [];
  let entries;
  try {
    entries = readdirSync(changesRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => candidateFromDirectory(changesRoot, entry, profile))
    .filter(isActiveCandidate)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function uniqueActiveCandidates(candidates) {
  const byName = new Map();
  for (const candidate of candidates || []) {
    const value = typeof candidate === 'string' ? { name: candidate } : candidate;
    if (!value || typeof value !== 'object') continue;
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    if (isActiveCandidate({ ...value, name }) && isValidChangeName(name) && !byName.has(name)) {
      byName.set(name, { ...value, name });
    }
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function persistedCandidates(state) {
  if (!state) return [];
  if (Array.isArray(state)) return state;
  if (typeof state === 'string') return [{ name: state, active: true }];
  if (typeof state !== 'object') return [];
  if (Array.isArray(state.candidates)) return state.candidates;
  const current = state.current || state.currentChange || state.sdd || state;
  if (typeof current === 'string') return [{ name: current, active: true }];
  if (current && typeof current === 'object') {
    const name = current.name || current.change || current.changeName;
    return name ? [{ ...current, name }] : [];
  }
  return [];
}

function stopResult(branch, reason, candidates = []) {
  return {
    status: 'STOP',
    human_required: true,
    branch: branch?.trim() || '(detached HEAD)',
    reason,
    candidates: candidates.map((candidate) => candidate.name),
  };
}

function readyResult({ branch, candidate = null, profile = null, source, change = null }) {
  if (candidate?.runtimeStateInvalid) {
    return stopResult(branch, candidate.runtimeStateReason || 'corrupt-runtime-state', [candidate]);
  }
  if (candidate?.lifecycleInvalid) {
    return stopResult(branch, lifecycleErrorReason(candidate.lifecycleError), [candidate]);
  }
  if (candidate?.runtimeState?.status === 'HUMAN_HANDOFF') {
    return stopResult(branch, 'human-git-handoff', [candidate]);
  }
  const resolvedChange = candidate?.name || change;
  const checkpoint = candidate ? recoverCheckpoint(candidate, profile) : normalizeCheckpoint();
  if (candidate?.path && checkpoint.phase && checkpoint.status) {
    try {
      validateAuthoritativeArtifacts({
        changePath: resolve(candidate.path),
        profile,
        phase: checkpoint.phase,
        verdict: checkpoint.status === 'BLOCKED' ? 'BLOCKED' : 'PASS',
        checkpoint: {
          phase: checkpoint.phase,
          verdict: checkpoint.status === 'BLOCKED' ? 'BLOCKED' : 'PASS',
          next: checkpoint.next,
        },
      });
    } catch (error) {
      return stopResult(branch, lifecycleErrorReason(error.message), [candidate]);
    }
  }
  const terminal = checkpoint.phase === 'Repository Ready' && checkpoint.status === 'PASS' && checkpoint.next === null;
  if (terminal) return stopResult(branch, 'human-git-handoff', [candidate]);
  return {
    status: 'READY',
    human_required: false,
    branch: branch?.trim() || '(detached HEAD)',
    change: resolvedChange,
    source: candidate?.runtimeState ? 'runtime-state' : source,
    checkpoint,
    delegation: `/sdd-direct ${resolvedChange}`,
    next: checkpoint.next || 'first incomplete canonical action',
  };
}

function explicitChangeProvided(explicitChange) {
  return explicitChange !== undefined && explicitChange !== null && !(typeof explicitChange === 'string' && explicitChange.trim() === '');
}

function pathForChange(root, profile, change) {
  return join(resolve(root), profileRoot(profile), change);
}

function explicitIsHistorical({ root, profile, change, activeChanges }) {
  const candidate = activeChanges.find((item) => item.name === change);
  if (candidate?.runtimeStateInvalid) return candidate.runtimeStateReason || 'invalid-runtime-state';
  if (candidate?.lifecycleInvalid) return lifecycleErrorReason(candidate.lifecycleError);
  if (candidate?.archived || candidate?.completed) return true;
  const path = pathForChange(root, profile, change);
  if (!existsSync(path)) return false;
  const runtime = runtimeState(path, profile, change);
  if (runtime.invalid) return runtime.reason || 'invalid-runtime-state';
  return hasHistoricalEvidence(path, profile, runtime.state);
}

function lifecycleErrorReason(message) {
  if (/missing[- ]authoritative[- ]artifact/i.test(message || '')) return 'missing-authoritative-artifact';
  if (/artifact[- ]state[- ]divergence/i.test(message || '')) return 'artifact-state-divergence';
  return 'inconsistent-lifecycle';
}

function resolveExplicitChange({ branch, explicitChange, root = ROOT, profile, activeChanges = [] }) {
  if (!explicitChangeProvided(explicitChange)) return null;
  if (typeof explicitChange !== 'string') return stopResult(branch, 'invalid-explicit-spec');
  const change = explicitChange.trim();
  try {
    validateChangeName(change);
  } catch {
    return stopResult(branch, 'invalid-explicit-spec');
  }
  const candidate = activeChanges.find((item) => item.name === change) ?? null;
  const historical = explicitIsHistorical({ root, profile, change, activeChanges });
  if (typeof historical === 'string' && historical !== 'true' && historical !== 'false') {
    if (historical === 'invalid-runtime-state' || historical === 'corrupt-runtime-state') {
      return stopResult(branch, historical === 'invalid-runtime-state' ? 'corrupt-runtime-state' : historical, [{ name: change }]);
    }
    return stopResult(branch, historical, [{ name: change }]);
  }
  if (historical) {
    return stopResult(branch, 'historical-or-terminal-spec', [{ name: change }]);
  }
  return readyResult({ branch, change, candidate, profile, source: 'explicit' });
}

function hasRuntimeIdentityMismatch(candidate, root, profile) {
  if (!candidate) return false;
  if (candidate.runtimeStateInvalid) return true;
  const state = candidate.runtimeState ?? (candidate.canonicalPath !== undefined ? candidate : null);
  if (!state) return false;
  if (state.canonicalPath === undefined && state.change === undefined) return false;
  if (typeof state.canonicalPath !== 'string' || typeof state.change !== 'string') return true;
  const expectedPath = candidate.path ? resolve(candidate.path) : pathForChange(root, profile, candidate.name);
  return state.change !== candidate.name || resolve(state.canonicalPath) !== expectedPath;
}

function candidateMatchesBranch(candidate, branch) {
  if (candidate?.associated === true || candidate?.current === true) return true;
  const names = branchAssociationNames(branch);
  if (names.has(candidate?.name)) return true;
  const normalized = normalizedBranch(branch);
  const candidateBranches = [
    candidate?.branch,
    candidate?.branchName,
    candidate?.runtimeState?.branch,
    candidate?.runtimeState?.branchName,
  ];
  return candidateBranches.some((value) => {
    const candidateBranch = normalizedBranch(value);
    return Boolean(normalized && candidateBranch && (candidateBranch === normalized || names.has(canonicalBranchChangeName(candidateBranch))));
  });
}

function existingChangeNames(values) {
  const names = new Set();
  for (const value of values || []) {
    const name = typeof value === 'string' ? value.trim() : value?.name?.trim();
    if (isValidChangeName(name)) names.add(name);
  }
  return names;
}

export function resolveChangeName({
  branch = '',
  explicitChange = undefined,
  activeChanges = [],
  persistedState = null,
  existingChanges = [],
  root = ROOT,
  profile = null,
} = {}) {
  const explicit = resolveExplicitChange({ branch, explicitChange, root, profile, activeChanges });
  if (explicit) return explicit;
  const allActive = uniqueActiveCandidates(activeChanges);
  const invalidActive = allActive.find((candidate) => candidate.lifecycleInvalid || hasRuntimeIdentityMismatch(candidate, root, profile));
  if (invalidActive) {
    return stopResult(
      branch,
      invalidActive.lifecycleInvalid
        ? lifecycleErrorReason(invalidActive.lifecycleError)
        : invalidActive.runtimeStateReason || 'corrupt-runtime-state',
      [invalidActive],
    );
  }
  if (allActive.length === 1) return readyResult({ branch, candidate: allActive[0], profile, source: 'active' });
  if (allActive.length > 1) return stopResult(branch, 'multiple-active-specs', allActive);

  // Persisted runtime metadata corroborates an on-disk active SPEC; it never
  // creates or reactivates one when the authoritative docs/specs scan is empty.
  if (profileRoot(profile) === 'docs/specs') return stopResult(branch, 'no-active-spec');

  const persisted = uniqueActiveCandidates(persistedCandidates(persistedState));
  const invalidPersisted = persisted.find((candidate) => hasRuntimeIdentityMismatch(candidate, root, profile));
  if (invalidPersisted) return stopResult(branch, invalidPersisted.runtimeStateReason || 'corrupt-runtime-state', [invalidPersisted]);
  if (persisted.length === 1) return readyResult({ branch, candidate: persisted[0], profile, source: 'persisted-state' });
  if (persisted.length > 1) return stopResult(branch, 'multiple-persisted-specs', persisted);

  const normalized = normalizedBranch(branch);
  if (!normalized || PROTECTED_BRANCHES.has(normalized.toLowerCase())) return stopResult(branch, 'protected-or-unavailable-branch');
  const derived = canonicalBranchChangeName(normalized);
  if (!derived) return stopResult(branch, 'unusable-branch-name');
  if (existingChangeNames(existingChanges).has(derived)) return stopResult(branch, 'branch-derived-name-conflict', [{ name: derived }]);
  return readyResult({ branch, change: derived, profile, source: 'branch' });
}

export function resolveResume({ branch = '', activeChanges = [], persistedState = null, profile = null, root = ROOT } = {}) {
  const candidates = uniqueActiveCandidates(activeChanges);
  const associated = candidates.filter((candidate) => candidateMatchesBranch(candidate, branch));
  const result = resolveChangeName({ branch, activeChanges: candidates, persistedState, profile, root });
  if (result.source === 'branch' && candidates.length === 0) return stopResult(branch, 'no-active-spec');
  if (result.source === 'active' && associated.length === 1) return { ...result, source: 'branch' };
  if (result.source === 'active' && candidates.length === 1 && associated.length === 0) return { ...result, source: 'single-active' };
  if (result.reason === 'protected-or-unavailable-branch' && candidates.length === 0) return { ...result, reason: 'no-active-spec' };
  return result;
}

export function formatResumeResult(result) {
  if (result.status === 'READY') {
    const checkpoint = result.checkpoint;
    const checkpointText = [checkpoint.phase, checkpoint.artifact, checkpoint.status].filter(Boolean).join(' / ') || 'not recorded';
    return [
      `resolved SPEC: ${result.change}`,
      `current branch: ${result.branch}`,
      `recovered lifecycle checkpoint: ${checkpointText}`,
      `next canonical action: ${result.next}`,
      `delegation: ${result.delegation}`,
    ].join('\n');
  }
  if (result.reason === 'multiple-active-specs' || result.reason === 'multiple-persisted-specs') return ['STOP', ...result.candidates].join('\n');
  return `STOP: ${result.reason || 'no valid active SPEC was resolved'}; use /sdd-direct <SPEC-directory>.`;
}

export function currentBranch(cwd = ROOT) {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function discoverExistingChangeNames(changesRoot = join(ROOT, 'openspec', 'changes')) {
  if (!existsSync(changesRoot)) return [];
  let entries;
  try {
    entries = readdirSync(changesRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((entry) => entry.isDirectory() && entry.name !== 'archive' && isValidChangeName(entry.name)).map((entry) => entry.name).sort((left, right) => left.localeCompare(right));
}

export function resolveRepositoryChangeName({ cwd = ROOT, branch = undefined, explicitChange = undefined, persistedState = null, changesRoot = undefined, profile = undefined } = {}) {
  const repositoryRoot = resolve(cwd);
  const current = branch === undefined ? currentBranch(repositoryRoot) : branch;
  let localProfile;
  try {
    localProfile = profileFor(profile, repositoryRoot);
  } catch {
    return stopResult(current, 'invalid-project-profile');
  }
  const activeRoot = changesRoot || join(repositoryRoot, profileRoot(localProfile));
  const allActive = discoverActiveChanges(activeRoot, { profile: localProfile });
  const activeChanges = allActive;
  const result = resolveChangeName({
    branch: current,
    explicitChange,
    activeChanges,
    persistedState,
    existingChanges: discoverExistingChangeNames(activeRoot),
    root: repositoryRoot,
    profile: localProfile,
  });
  if (localProfile?.changesRoot === 'docs/specs' && result.source === 'branch' && activeChanges.length === 0 && !explicitChangeProvided(explicitChange)) {
    return stopResult(current, 'no-active-spec');
  }
  return result;
}

export function resolveRepositoryResume(options = {}) {
  const { cwd = ROOT, persistedState = null, profile = undefined } = options;
  const repositoryRoot = resolve(cwd);
  const branch = currentBranch(repositoryRoot);
  let localProfile;
  try {
    localProfile = profileFor(profile, repositoryRoot);
  } catch {
    return stopResult(branch, 'invalid-project-profile');
  }
  const activeChanges = discoverActiveChanges(join(repositoryRoot, profileRoot(localProfile)), { profile: localProfile });
  return resolveResume({ branch, activeChanges, persistedState, profile: localProfile, root: repositoryRoot });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const direct = process.argv.includes('--resolve-direct');
  const result = direct ? resolveRepositoryChangeName() : resolveRepositoryResume();
  if (direct) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.status !== 'READY') process.exitCode = 2;
  } else {
    process.stdout.write(`${formatResumeResult(result)}\n`);
    if (result.status !== 'READY') process.exitCode = 2;
  }
}
