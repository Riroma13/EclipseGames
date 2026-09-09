import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
  bootstrapChange,
  persistExecutorOutcome,
  projectCanonicalWorkflow,
  sha256,
} from './sdd-runtime.mjs';
import {
  discoverActiveChanges,
  resolveChangeName,
  resolveRepositoryChangeName,
  resolveRepositoryResume,
  resolveResume,
} from './sdd-resume.mjs';

const profile = {
  project: 'eclipsegames',
  project_profile: {
    name: 'EclipseGames',
    memory_key: 'eclipsegames',
    changes_root: 'docs/specs',
    runtime_directory: '.sdd-runtime',
    runtime_layout: { state: 'state.json', trace: 'trace', recovery: 'recovery', locks: 'locks', checkpoints: 'checkpoints' },
    archive_behavior: 'in-place',
    authority_refs: { workflow: 'docs/SDD-WORKFLOW.md', modelMap: '.opencode/sdd-model-map.json', config: '.opencode/sdd-model-map.json' },
    context_sources: ['AGENTS.md'],
    invariant_sources: ['AGENTS.md'],
    semantic_validation: {
      profile: 'eclipsegames',
      required_topics: ['intent', 'approach', 'architecture', 'contracts', 'boundaries', 'working_set', 'testing', 'rollout', 'simplicity'],
      heading_aliases: {
        intent: ['Context'],
        approach: ['Technical Approach'],
        architecture: ['Architecture Decisions'],
        contracts: ['Data Flow and Contracts'],
        boundaries: ['Failure and Privacy Boundaries'],
        working_set: ['Working Set and Read Order'],
        testing: ['Testing Strategy'],
        rollout: ['Migration / Rollout'],
        simplicity: ['Simplicity Check'],
      },
      optional_topics: [],
      review_semantics: {
        artifact: 'ARCHITECTURE-REVIEW.md',
        required_meanings: ['outcome', 'evidence', 'findings', 'next step'],
        heading_aliases: ['Review'],
      },
    },
    git_boundary: {
      owner: 'HUMAN',
      terminal: 'Repository Ready',
      operations: ['git add', 'git commit', 'git push', 'git branch', 'git config', 'git notes', 'git apply', 'pull request', 'CI wait', 'merge', 'release', 'tag'],
    },
    lifecycle_artifacts: {
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
    },
    lifecycle: {
      phases: ['Design', 'Architecture Review', 'Design Refinement', 'Tasks', 'Tasks Review', 'Tasks Refinement', 'Apply', 'Apply Summary', 'Verify', 'Archive', 'Health Report', 'Repository Ready'],
      edges: {
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
      },
      roles: {
        Design: 'HIGH',
        'Architecture Review': 'HIGH',
        'Design Refinement': 'HIGH',
        Tasks: 'MID',
        'Tasks Review': 'MID',
        'Tasks Refinement': 'MID',
        Apply: 'MID',
        'Apply Summary': 'MID',
        Verify: 'HIGH',
        Archive: 'LOW',
        'Health Report': 'LOW',
        'Repository Ready': 'LOW',
      },
      terminal: 'Repository Ready',
    },
  },
};
const authorityContents = Object.freeze({
  workflow: 'workflow authority fixture\n',
  modelMap: 'model map authority fixture\n',
});
const hashes = {
  workflow: sha256(authorityContents.workflow),
  modelMap: sha256(authorityContents.modelMap),
  config: sha256(authorityContents.modelMap),
  artifacts: {},
};

async function specRoot() {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-resume-'));
  await mkdir(join(root, 'docs', 'specs'), { recursive: true });
  await mkdir(join(root, '.opencode'), { recursive: true });
  await writeFile(join(root, 'docs', 'SDD-WORKFLOW.md'), authorityContents.workflow);
  await writeFile(join(root, '.opencode', 'sdd-model-map.json'), authorityContents.modelMap);
  return root;
}

async function persistedDesignFixture(root, change) {
  const specPath = join(root, 'docs', 'specs', change);
  const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
  await writeFile(join(specPath, 'DESIGN.md'), '# Current\n\nStatus: PASS\n');
  await persistExecutorOutcome({
    changePath: specPath,
    state: bootstrapped.state,
    profile,
    outcome: {
      change,
      action: 'Design',
      role: 'HIGH',
      status: 'PASS',
      checkpointArtifact: 'DESIGN.md',
      artifacts: ['DESIGN.md'],
      evidence: ['integrity fixture'],
      next: 'Architecture Review',
    },
  });
  return { specPath, statePath: join(specPath, '.sdd-runtime', 'state.json') };
}

test('zero active SPECs returns an explicit no-active stop', async () => {
  const root = await specRoot();
  try {
    const result = resolveRepositoryResume({ cwd: root, branch: 'main', profile });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'no-active-spec');
    const direct = resolveRepositoryChangeName({ cwd: root, branch: 'feature/no-spec', profile });
    assert.equal(direct.status, 'STOP');
    assert.equal(direct.reason, 'no-active-spec');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stale persisted archived candidate cannot override zero active on-disk SPECs', async () => {
  const root = await specRoot();
  try {
    const result = resolveRepositoryResume({
      cwd: root,
      branch: 'feature/stale-recovery',
      profile,
      persistedState: { current: { name: 'SPEC-HISTORICAL-archived', active: true } },
    });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'no-active-spec');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('one active SPEC is selected deterministically and explicit selector is preserved', async () => {
  const root = await specRoot();
  try {
    const specPath = join(root, 'docs', 'specs', 'SPEC-010-current');
    await mkdir(specPath, { recursive: true });
    await writeFile(join(specPath, 'DESIGN.md'), '# Current\n\nStatus: Approved\n');
    const candidates = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.deepEqual(candidates.map((candidate) => candidate.name), ['SPEC-010-current']);
    const result = resolveResume({ branch: 'main', activeChanges: candidates, profile });
    assert.equal(result.status, 'READY');
    assert.equal(result.change, 'SPEC-010-current');
    assert.equal(result.source, 'single-active');
    const explicit = resolveChangeName({ branch: 'main', explicitChange: 'SPEC-010-current', activeChanges: candidates, profile, root });
    assert.equal(explicit.status, 'READY');
    assert.equal(explicit.source, 'explicit');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resume fails closed when runtime state identity does not match the discovered or explicit SPEC path', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-IDENTITY-mismatch';
    const specPath = join(root, 'docs', 'specs', change);
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    await writeFile(join(specPath, 'DESIGN.md'), '# Current\n\nStatus: Approved\n');
    const invalidState = {
      ...bootstrapped.state,
      canonicalPath: join(root, 'docs', 'specs', 'not-the-selected-spec'),
    };
    await writeFile(join(specPath, '.sdd-runtime', 'state.json'), JSON.stringify(invalidState));

    const candidates = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].runtimeStateInvalid, true);
    assert.equal(
      resolveRepositoryResume({ cwd: root, branch: 'main', profile }).reason,
      'corrupt-runtime-state',
    );
    assert.equal(
      resolveRepositoryChangeName({ cwd: root, branch: 'main', explicitChange: change, profile }).reason,
      'corrupt-runtime-state',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('multiple active candidates stop without choosing the highest-numbered directory', async () => {
  const root = await specRoot();
  try {
    for (const name of ['SPEC-002-current', 'SPEC-099-current']) {
      const path = join(root, 'docs', 'specs', name);
      await mkdir(path, { recursive: true });
      await writeFile(join(path, 'DESIGN.md'), `# ${name}\n\nStatus: Approved\n`);
    }
    const candidates = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    const result = resolveResume({ branch: 'main', activeChanges: candidates, profile });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'multiple-active-specs');
    assert.deepEqual(result.candidates, ['SPEC-002-current', 'SPEC-099-current']);
    assert.equal(result.change, undefined);
    const direct = resolveRepositoryChangeName({ cwd: root, branch: 'feature/unrelated', profile });
    assert.equal(direct.status, 'STOP');
    assert.equal(direct.reason, 'multiple-active-specs');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('branch association cannot narrow multiple plausible active SPECs', async () => {
  const root = await specRoot();
  try {
    for (const name of ['feature-spec-a', 'other-active']) {
      const path = join(root, 'docs', 'specs', name);
      await mkdir(path, { recursive: true });
      await writeFile(join(path, 'DESIGN.md'), `# ${name}\n\nStatus: Approved\n`);
    }
    const candidates = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    const result = resolveResume({ branch: 'feature/spec-a', activeChanges: candidates, profile });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'multiple-active-specs');
    assert.deepEqual(result.candidates, ['feature-spec-a', 'other-active']);

    const direct = resolveRepositoryChangeName({ cwd: root, branch: 'feature/spec-a', profile });
    assert.equal(direct.status, 'STOP');
    assert.equal(direct.reason, 'multiple-active-specs');
    assert.deepEqual(direct.candidates, ['feature-spec-a', 'other-active']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('historical SPEC-DEMO-001 and stale runtime state cannot reactivate', async () => {
  const root = await specRoot();
  try {
    const specPath = join(root, 'docs', 'specs', 'SPEC-DEMO-001-client-preview-mvp');
    await mkdir(specPath, { recursive: true });
    await writeFile(join(specPath, 'DESIGN.md'), '# Historical\n\n**Status:** Archived\n');
    await writeFile(join(specPath, 'ARCHIVE-REPORT.md'), '# Archive\nstatus: ARCHIVED\n');
    await writeFile(join(specPath, 'REPOSITORY-READY.md'), '# Repository Ready\nRepository Ready: YES\n');
    await bootstrapChange({ root, change: 'SPEC-DEMO-001-client-preview-mvp', profile, fingerprints: hashes });
    assert.deepEqual(discoverActiveChanges(join(root, 'docs', 'specs'), { profile }), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resume reconciles an interrupted trace and exposes the next dependency-ready action', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-RECOVERY-current';
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    await writeFile(join(bootstrapped.changePath, 'DESIGN.md'), '# Design\n\nStatus: PASS\n');
    await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: bootstrapped.state,
      profile,
      outcome: {
        change,
        action: 'Design',
        role: 'HIGH',
        status: 'PASS',
        checkpointArtifact: 'DESIGN.md',
        artifacts: ['DESIGN.md'],
        evidence: ['interruption fixture'],
        next: 'Architecture Review',
      },
    });
    await writeFile(join(bootstrapped.changePath, '.sdd-runtime', 'state.json'), `${JSON.stringify(bootstrapped.state)}\n`);
    const [candidate] = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidate.reconciled, true);
    assert.equal(candidate.runtimeState.checkpoint.next, 'Architecture Review');
    const result = resolveResume({ branch: 'main', activeChanges: [candidate], profile });
    assert.equal(result.status, 'READY');
    assert.equal(result.next, 'Architecture Review');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resume stops when same-sequence state materialization or authority fingerprints are tampered', async () => {
  for (const [label, mutate] of [
    ['checkpoint', (state) => ({ ...state, checkpoint: { ...state.checkpoint, next: 'Tasks' } })],
    ['materialized phase', (state) => ({
      ...state,
      checkpoint: { ...state.checkpoint, phase: 'Tasks', artifact: 'TASKS.md' },
    })],
    ['authority fingerprint', (state) => ({
      ...state,
      fingerprints: { ...state.fingerprints, workflow: 'd'.repeat(64) },
    })],
  ]) {
    const root = await specRoot();
    try {
      const change = `SPEC-TAMPER-${label.replace(/\W+/g, '-').toUpperCase()}`;
      const { statePath } = await persistedDesignFixture(root, change);
      const state = JSON.parse(await readFile(statePath, 'utf8'));
      await writeFile(statePath, `${JSON.stringify(mutate(state))}\n`);

      const [candidate] = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
      assert.equal(candidate.runtimeStateInvalid, true, `${label} should invalidate runtime state`);
      const result = resolveRepositoryResume({ cwd: root, branch: 'main', profile });
      assert.equal(result.status, 'STOP', label);
      assert.equal(result.reason, 'corrupt-runtime-state', label);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('resume stops when a configured authority artifact changes after persistence', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-AUTHORITY-CHANGED';
    await persistedDesignFixture(root, change);
    await writeFile(join(root, 'docs', 'SDD-WORKFLOW.md'), 'changed workflow authority\n');

    const [candidate] = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidate.runtimeStateInvalid, true);
    const result = resolveRepositoryResume({ cwd: root, branch: 'main', profile });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'corrupt-runtime-state');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resume stops when a trace event does not match its state materialization', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-TRACE-STATE-MISMATCH';
    const { specPath } = await persistedDesignFixture(root, change);
    const tracePath = join(specPath, '.sdd-runtime', 'trace');
    const [traceName] = await readdir(tracePath);
    const event = JSON.parse(await readFile(join(tracePath, traceName), 'utf8'));
    event.stateMaterialization.checkpoint.next = 'Tasks';
    await writeFile(join(tracePath, traceName), `${JSON.stringify(event)}\n`);

    const [candidate] = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidate.runtimeStateInvalid, true);
    const result = resolveRepositoryResume({ cwd: root, branch: 'main', profile });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'corrupt-runtime-state');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resume stops when a trace filename is renamed away from canonical provenance', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-TRACE-FILENAME-MISMATCH';
    const { specPath } = await persistedDesignFixture(root, change);
    const tracePath = join(specPath, '.sdd-runtime', 'trace');
    const [traceName] = await readdir(tracePath);
    await rename(join(tracePath, traceName), join(tracePath, 'not-a-canonical-trace-name.json'));

    const [candidate] = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidate.runtimeStateInvalid, true);
    const result = resolveRepositoryResume({ cwd: root, branch: 'main', profile });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'corrupt-runtime-state');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Repository Ready candidates stop instead of advancing into Git', () => {
  const result = resolveResume({
    branch: 'main',
    profile,
    activeChanges: [{
      name: 'SPEC-terminal',
      runtimeState: {
        checkpoint: { phase: 'Repository Ready', artifact: 'REPOSITORY-READY.md', verdict: 'PASS', next: null },
      },
    }],
  });
  assert.equal(result.status, 'STOP');
  assert.equal(result.reason, 'human-git-handoff');
});

test('artifact-only recovery rejects a later checkpoint when predecessor evidence is missing', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-ARTIFACT-GAP';
    const specPath = join(root, 'docs', 'specs', change);
    await mkdir(specPath, { recursive: true });
    await writeFile(join(specPath, 'APPLY-SUMMARY.md'), 'status: PASS\n');

    const candidates = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].lifecycleInvalid, true);
    const result = resolveResume({ branch: 'main', activeChanges: candidates, profile, root });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'inconsistent-lifecycle');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resume stops when a completed checkpoint artifact is deleted', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-DELETED-DESIGN';
    const { specPath } = await persistedDesignFixture(root, change);
    await rm(join(specPath, 'DESIGN.md'));

    const [candidate] = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidate.runtimeStateInvalid, true);
    const result = resolveRepositoryResume({ cwd: root, branch: 'main', profile });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'missing-authoritative-artifact');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resume stops when a completed checkpoint artifact changes after persistence', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-CHANGED-DESIGN';
    const { specPath } = await persistedDesignFixture(root, change);
    await writeFile(join(specPath, 'DESIGN.md'), '# Current\n\nstatus: PASS\n\nUnexpected material change.\n');

    const [candidate] = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidate.runtimeStateInvalid, true);
    const result = resolveRepositoryResume({ cwd: root, branch: 'main', profile });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'artifact-state-divergence');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('an explicitly selected archived SPEC.md cannot be activated', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-ARCHIVED-EXPLICIT';
    const specPath = join(root, 'docs', 'specs', change);
    await mkdir(specPath, { recursive: true });
    await writeFile(join(specPath, 'SPEC.md'), 'status: ARCHIVED\n');

    const result = resolveRepositoryChangeName({
      cwd: root,
      branch: 'feature/archived-explicit',
      explicitChange: change,
      profile,
    });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'historical-or-terminal-spec');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a malformed configured EclipseGames profile fails closed instead of falling back to Portable', async () => {
  for (const contents of ['{"project_profile":', '{"project":"eclipsegames","project_profile":{}}']) {
    const root = await mkdtemp(join(tmpdir(), 'eclipse-invalid-profile-'));
    try {
      await mkdir(join(root, '.opencode'), { recursive: true });
      await writeFile(join(root, '.opencode', 'sdd-model-map.json'), contents);

      const result = resolveRepositoryChangeName({ cwd: root, branch: 'feature/should-stop' });
      assert.equal(result.status, 'STOP');
      assert.equal(result.reason, 'invalid-project-profile');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('persisted HUMAN_HANDOFF is a terminal human boundary', () => {
  const candidate = {
    name: 'SPEC-HUMAN-HANDOFF',
    runtimeState: {
      status: 'HUMAN_HANDOFF',
      checkpoint: { phase: 'Verify', artifact: 'VERIFY-REPORT.md', verdict: 'BLOCKED', next: null },
    },
  };
  const result = resolveResume({
    branch: 'main',
    profile,
    activeChanges: [candidate],
  });
  assert.equal(result.status, 'STOP');
  assert.equal(result.reason, 'human-git-handoff');
  const explicit = resolveChangeName({
    branch: 'main',
    profile,
    explicitChange: candidate.name,
    activeChanges: [candidate],
  });
  assert.equal(explicit.status, 'STOP');
  assert.equal(explicit.reason, 'human-git-handoff');
});

test('discovered Repository Ready evidence stops at the human Git boundary', async () => {
  const root = await specRoot();
  try {
    const change = 'SPEC-REPOSITORY-READY';
    const specPath = join(root, 'docs', 'specs', change);
    await mkdir(specPath, { recursive: true });
    for (const artifact of ['DESIGN.md', 'ARCHITECTURE-REVIEW.md', 'TASKS.md', 'TASKS-REVIEW.md', 'APPLY-PROGRESS.md', 'APPLY-SUMMARY.md', 'VERIFY-REPORT.md', 'ARCHIVE-REPORT.md', 'HEALTH-REPORT.md']) {
      await writeFile(join(specPath, artifact), 'status: PASS\n');
    }
    await writeFile(join(specPath, 'REPOSITORY-READY.md'), 'Repository Ready: YES\n');

    const candidates = discoverActiveChanges(join(root, 'docs', 'specs'), { profile });
    assert.equal(candidates.length, 1);
    const result = resolveResume({ branch: 'main', activeChanges: candidates, profile, root });
    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'human-git-handoff');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generic Portable discovery retains tasks-only and statusless design evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'portable-discovery-'));
  const changesRoot = join(root, 'openspec', 'changes');
  try {
    const tasksOnly = join(changesRoot, 'tasks-only-change');
    const statuslessDesign = join(changesRoot, 'statusless-design-change');
    await mkdir(tasksOnly, { recursive: true });
    await mkdir(statuslessDesign, { recursive: true });
    await writeFile(join(tasksOnly, 'tasks.md'), '# Tasks\n\nImplementation remains incomplete.\n');
    await writeFile(join(statuslessDesign, 'design.md'), '# Design\n\nThe bounded solution preserves the current contract.\n');

    const candidates = discoverActiveChanges(changesRoot);
    assert.deepEqual(candidates.map((candidate) => candidate.name), ['statusless-design-change', 'tasks-only-change']);
    const designCandidate = candidates.find((candidate) => candidate.name === 'statusless-design-change');
    const tasksCandidate = candidates.find((candidate) => candidate.name === 'tasks-only-change');
    assert.equal(designCandidate.checkpoint.phase, 'Design');
    assert.notEqual(designCandidate.checkpoint.phase, 'Design Refinement');
    assert.equal(designCandidate.checkpoint.next, 'Design');
    assert.equal(tasksCandidate.checkpoint.phase, 'Tasks');
    assert.equal(tasksCandidate.checkpoint.next, 'Design');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
