import assert from 'node:assert/strict';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  atomicWriteJson,
  bootstrapChange,
  buildInitialState,
  canonicalCheckpointArtifact,
  createTraceEvent,
  dispatchUntilTerminal,
  gitMutationBarrier,
  hashObject,
  loadProjectProfile,
  persistExecutorOutcome,
  projectCanonicalWorkflow,
  recoverLegacyChange,
  recoverStrandedCheckpoint,
  readTraceEvents,
  reconcileTraceState,
  resolveConfiguredRoute,
  resolveBlockedTransition,
  selectNextTransition,
  sha256,
  STRANDED_RECOVERY_AUTHORITY_REFERENCES,
  validateIdentity,
  validateOutcomePacket,
  validateRuntimeState,
} from './sdd-runtime.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(readFileSync(join(ROOT, '.opencode', 'sdd-model-map.json'), 'utf8'));
const hashes = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64), artifacts: {} };

function outcomeFor(change, action, selectedProfile = profile, overrides = {}) {
  const workflow = projectCanonicalWorkflow(selectedProfile);
  const checkpointArtifact = canonicalCheckpointArtifact(action, workflow);
  return {
    change,
    action,
    role: workflow.roles[action],
    status: 'PASS',
    checkpointArtifact,
    artifacts: [checkpointArtifact],
    evidence: [`test:${action}`],
    next: workflow.edges[action] ?? 'STOP',
    ...overrides,
  };
}

test('default Portable identity remains openspec-based while EclipseGames uses docs/specs', () => {
  assert.deepEqual(validateIdentity({ root: '/repo', change: 'demo-change' }), {
    root: '/repo',
    change: 'demo-change',
    changePath: '/repo/openspec/changes/demo-change',
  });
  assert.equal(
    validateIdentity({ root: '/repo', change: 'SPEC-0001-foundation', profile }).changePath,
    '/repo/docs/specs/SPEC-0001-foundation',
  );
  assert.equal(existsSync(join(ROOT, 'openspec', 'specs')), false);
  assert.equal(STRANDED_RECOVERY_AUTHORITY_REFERENCES.config, 'openspec/config.yaml');
  assert.equal(projectCanonicalWorkflow().edges['Tasks Review'], 'Workload Guard');
  assert.equal(projectCanonicalWorkflow(profile).edges.Apply, 'Apply Summary');
});

test('profile lifecycle preserves current artifact names and runtime nesting', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-runtime-'));
  try {
    const change = 'SPEC-TEST-001';
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    assert.equal(bootstrapped.disposition, 'CREATED');
    assert.equal(bootstrapped.changePath, join(root, 'docs/specs', change));
    assert.equal(existsSync(join(bootstrapped.changePath, '.sdd-runtime', 'state.json')), true);
    for (const directory of ['trace', 'recovery', 'locks', 'checkpoints']) {
      assert.equal(existsSync(join(bootstrapped.changePath, '.sdd-runtime', directory)), true);
    }
    assert.equal(canonicalCheckpointArtifact('Apply Summary', profile), 'APPLY-SUMMARY.md');
    await writeFile(join(bootstrapped.changePath, 'DESIGN.md'), '# Design\n\nstatus: PASS\n');
    const result = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: bootstrapped.state,
      outcome: outcomeFor(change, 'Design'),
      profile,
    });
    assert.equal(result.state.checkpoint.next, 'Architecture Review');
    assert.equal(result.state.canonicalPath, bootstrapped.changePath);
    assert.equal(result.state.fingerprints.artifacts['DESIGN.md'], sha256('# Design\n\nstatus: PASS\n'));
    assert.equal(existsSync(join(root, 'docs/specs', 'archive')), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generic Portable archive behavior still relocates after event persistence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'portable-archive-'));
  try {
    const change = 'portable-archive';
    const bootstrapped = await bootstrapChange({ root, change, fingerprints: hashes });
    const workflow = projectCanonicalWorkflow();
    const actions = [
      'Design',
      'Architecture Review',
      'Tasks',
      'Tasks Review',
      'Workload Guard',
      'Apply 7.1 Foundation',
      'Apply 7.2 Core Engine',
      'Apply 7.3 Feature Implementation',
      'Apply 7.4 Integration',
      'Apply 7.5 Testing',
      'Apply 7.6 Apply Summary',
      'Verify',
    ];
    let state = bootstrapped.state;
    for (const action of actions) {
      await writeFile(join(bootstrapped.changePath, canonicalCheckpointArtifact(action)), `status: PASS\n`);
      const outcome = {
        change,
        action,
        role: workflow.roles[action],
        status: 'PASS',
        checkpointArtifact: canonicalCheckpointArtifact(action),
        artifacts: [canonicalCheckpointArtifact(action)],
        evidence: ['generic archive fixture'],
        next: workflow.edges[action],
      };
      state = (
        await persistExecutorOutcome({
          changePath: bootstrapped.changePath,
          state,
          outcome,
        })
      ).state;
    }
    await writeFile(join(bootstrapped.changePath, 'archive-report.md'), 'status: PASS\n');
    const archived = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state,
      outcome: {
        change,
        action: 'Archive',
        role: 'LOW',
        status: 'PASS',
        checkpointArtifact: 'archive-report.md',
        artifacts: ['archive-report.md'],
        evidence: ['generic archive fixture'],
        next: 'Health Report',
      },
    });
    assert.equal(archived.state.checkpoint.next, 'Health Report');
    assert.notEqual(archived.state.canonicalPath, bootstrapped.changePath);
    await assert.rejects(() => lstat(bootstrapped.changePath), { code: 'ENOENT' });
    assert.equal((await lstat(archived.state.canonicalPath)).isDirectory(), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('legacy artifact reconstruction does not infer a later checkpoint across a missing predecessor chain', async () => {
  const root = await mkdtemp(join(tmpdir(), 'portable-legacy-gap-'));
  try {
    const change = 'portable-legacy-gap';
    const changePath = join(root, 'openspec', 'changes', change);
    await mkdir(changePath, { recursive: true });
    await writeFile(join(changePath, 'apply-7.6-apply-summary.md'), 'status: PASS\n');
    await assert.rejects(
      () => recoverLegacyChange({ root, change, changePath, fingerprints: hashes }),
      /inconsistent-lifecycle|missing-authoritative-artifact/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('event-first interruption is reconciled before the next phase', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-recovery-'));
  try {
    const change = 'SPEC-RECOVERY-001';
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    await writeFile(join(bootstrapped.changePath, 'DESIGN.md'), '# Design\n\nstatus: PASS\n');
    const persisted = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: bootstrapped.state,
      outcome: outcomeFor(change, 'Design'),
      profile,
    });
    const trace = await readTraceEvents(bootstrapped.changePath, profile);
    assert.equal(trace.length, 1);
    await atomicWriteJson(join(bootstrapped.changePath, '.sdd-runtime', 'state.json'), bootstrapped.state);
    const recovered = reconcileTraceState(bootstrapped.state, trace);
    assert.equal(recovered.reconciled, true);
    assert.equal(recovered.state.checkpoint.next, 'Architecture Review');
    assert.equal(recovered.state.traceCursor.eventHash, persisted.event.eventHash);
    assert.equal(JSON.parse(await readFile(join(bootstrapped.changePath, '.sdd-runtime', 'state.json'))).checkpoint.next, 'Design');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stale duplicate transition is rejected without rewinding the persisted state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-stale-transition-'));
  try {
    const change = 'SPEC-STALE-001';
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    await writeFile(join(bootstrapped.changePath, 'DESIGN.md'), 'status: PASS\n');
    const firstOutcome = outcomeFor(change, 'Design', profile, { evidence: ['first transition'] });
    const first = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: bootstrapped.state,
      outcome: firstOutcome,
      profile,
    });
    await writeFile(join(bootstrapped.changePath, 'ARCHITECTURE-REVIEW.md'), 'status: PASS\n');
    const second = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: first.state,
      outcome: outcomeFor(change, 'Architecture Review', profile, { evidence: ['second transition'] }),
      profile,
    });

    await assert.rejects(
      () => persistExecutorOutcome({
        changePath: bootstrapped.changePath,
        state: bootstrapped.state,
        outcome: firstOutcome,
        profile,
      }),
      /stale|sequence|advanced/i,
    );
    const persisted = JSON.parse(await readFile(join(bootstrapped.changePath, '.sdd-runtime', 'state.json'), 'utf8'));
    assert.equal(second.state.sequence, 2);
    assert.equal(persisted.sequence, 2);
    assert.equal(persisted.checkpoint.next, 'Tasks');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('concurrent transitions serialize and never publish duplicate trace sequences', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-concurrent-transition-'));
  try {
    const change = 'SPEC-CONCURRENT-001';
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    await writeFile(join(bootstrapped.changePath, 'DESIGN.md'), 'status: PASS\n');
    const attempt = (evidence) => persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: bootstrapped.state,
      outcome: outcomeFor(change, 'Design', profile, { evidence: [evidence] }),
      profile,
    });
    const results = await Promise.allSettled([attempt('concurrent-a'), attempt('concurrent-b')]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    assert.match(results.find((result) => result.status === 'rejected').reason.message, /stale|sequence|advanced/i);
    const trace = await readTraceEvents(bootstrapped.changePath, profile);
    assert.deepEqual(trace.map((event) => event.sequence), [1]);
    const traceFiles = await readdir(join(bootstrapped.changePath, '.sdd-runtime', 'trace'));
    assert.equal(traceFiles.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('identical concurrent transitions converge to the persisted event and state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-identical-concurrent-transition-'));
  const OriginalDate = globalThis.Date;
  try {
    const change = 'SPEC-CONCURRENT-IDENTICAL-001';
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    await writeFile(join(bootstrapped.changePath, 'DESIGN.md'), 'status: PASS\n');
    const outcome = outcomeFor(change, 'Design', profile, { evidence: ['identical replay'] });
    const timestamps = [
      '2026-01-01T00:00:00.001Z',
      '2026-01-01T00:00:00.002Z',
    ];
    globalThis.Date = class extends OriginalDate {
      constructor(...args) {
        super(...(args.length === 0 && timestamps.length > 0 ? [timestamps.shift()] : args));
      }

      static now() {
        return OriginalDate.now();
      }
    };

    const attempt = () => persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: bootstrapped.state,
      outcome,
      profile,
    });
    const results = await Promise.all([attempt(), attempt()]);
    assert.equal(results.filter((result) => result.persisted).length, 1);
    assert.equal(results.filter((result) => !result.persisted).length, 1);
    assert.deepEqual(results[0].state, results[1].state);
    assert.equal(results[0].event.eventHash, results[1].event.eventHash);
    assert.equal(results[0].event.timestamp, results[1].event.timestamp);
    assert.deepEqual((await readTraceEvents(bootstrapped.changePath, profile)).map((event) => event.sequence), [1]);
    assert.equal((await readdir(join(bootstrapped.changePath, '.sdd-runtime', 'trace'))).length, 1);
  } finally {
    globalThis.Date = OriginalDate;
    await rm(root, { recursive: true, force: true });
  }
});

test('distinct same-sequence transitions remain conflicting events', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-distinct-transition-'));
  try {
    const change = 'SPEC-CONCURRENT-DISTINCT-001';
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    await writeFile(join(bootstrapped.changePath, 'DESIGN.md'), 'status: PASS\n');
    const outcome = (evidence) => outcomeFor(change, 'Design', profile, { evidence: [evidence] });
    await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: bootstrapped.state,
      outcome: outcome('first event'),
      profile,
    });
    await assert.rejects(
      () => persistExecutorOutcome({
        changePath: bootstrapped.changePath,
        state: bootstrapped.state,
        outcome: outcome('different event'),
        profile,
      }),
      /conflicting trace sequence|conflicting duplicate trace event/i,
    );
    assert.deepEqual((await readTraceEvents(bootstrapped.changePath, profile)).map((event) => event.sequence), [1]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const STRANDED_RECOVERY_PREFIX = [
  'Design',
  'Architecture Review',
  'Tasks',
  'Tasks Review',
  'Workload Guard',
  'Apply 7.1 Foundation',
  'Apply 7.2 Core Engine',
];

async function strandedRecoveryFixture({ missing = [], order = STRANDED_RECOVERY_PREFIX } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-stranded-recovery-'));
  await mkdir(join(root, 'docs'), { recursive: true });
  await mkdir(join(root, '.opencode'), { recursive: true });
  await writeFile(join(root, 'docs', 'SDD-WORKFLOW.md'), 'workflow recovery authority\n');
  await writeFile(join(root, '.opencode', 'sdd-model-map.json'), 'model map recovery authority\n');
  const authorityFingerprints = {
    workflow: sha256('workflow recovery authority\n'),
    modelMap: sha256('model map recovery authority\n'),
    config: sha256('model map recovery authority\n'),
    artifacts: {},
  };
  const change = 'SPEC-STRANDED-RECOVERY-001';
  const specPath = join(root, 'docs', 'specs', change);
  const target = 'Apply 7.3 Feature Implementation';
  const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
  const workflow = projectCanonicalWorkflow();
  let state = bootstrapped.state;
  let sequence = 0;

  for (const action of [...order.filter((phase) => !missing.includes(phase)), target]) {
    sequence += 1;
    const artifact = canonicalCheckpointArtifact(action, workflow);
    const status = action === target ? 'BLOCKED' : 'PASS';
    await writeFile(join(specPath, artifact), `status: ${status}\n`);
    const inputHash = hashObject({ fixture: 'stranded-recovery', action, sequence });
    const outcomeHash = hashObject({ fixture: 'stranded-recovery-outcome', action, status });
    const afterWithoutCursor = validateRuntimeState({
      ...state,
      status: action === target ? 'HUMAN_HANDOFF' : 'READY',
      sequence,
      checkpoint: {
        phase: action,
        artifact,
        verdict: status,
        next: action === target ? null : workflow.edges[action],
      },
      traceCursor: { sequence, eventHash: null, chainHash: null },
      lastTransition: {
        inputHash,
        outcomeHash,
        afterStateHash: hashObject({ action, status }),
      },
    });
    const event = createTraceEvent({
      change,
      sequence,
      action,
      role: workflow.roles[action],
      inputHash,
      outcomeHash,
      beforeState: state,
      afterState: afterWithoutCursor,
    });
    state = validateRuntimeState({
      ...afterWithoutCursor,
      traceCursor: { sequence, eventHash: event.eventHash, chainHash: event.chainHash },
    });
    await atomicWriteJson(
      join(specPath, '.sdd-runtime', 'trace', `${String(sequence).padStart(20, '0')}-${event.eventHash}.json`),
      event,
    );
  }
  await atomicWriteJson(join(specPath, '.sdd-runtime', 'state.json'), state);
  return { root, change, specPath, target, expectedSequence: sequence, authorityFingerprints };
}

test('docs/specs recovery uses nested profile runtime metadata and no OpenSpec authority', async () => {
  const fixture = await strandedRecoveryFixture();
  const { root, change, specPath, target, expectedSequence, authorityFingerprints } = fixture;
  try {
    const authorization = { actor: 'HUMAN / MAINTAINER', approval: 'recover the stranded checkpoint' };
    const recovered = await recoverStrandedCheckpoint({
      root,
      change,
      canonicalPath: specPath,
      expectedSequence,
      target,
      authorityRefs: profile.project_profile.authority_refs,
      fingerprints: authorityFingerprints,
      authorization,
      profile,
    });
    assert.equal(recovered.state.sequence, expectedSequence + 1);
    assert.equal(recovered.state.canonicalPath, specPath);
    assert.equal(recovered.state.checkpoint.next, target);
    assert.equal((await readTraceEvents(specPath, profile)).length, expectedSequence + 1);
    assert.equal(existsSync(join(specPath, '.sdd-runtime', 'locks', 'stranded-recovery.lock')), false);
    assert.equal(existsSync(join(specPath, '.sdd-runtime', 'state.json')), true);
    assert.equal(existsSync(join(root, 'openspec')), false);
    assert.doesNotMatch(profile.project_profile.authority_refs.config, /openspec/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stranded recovery rejects missing predecessor phases and impossible ordering', async () => {
  const missingCases = [
    'Architecture Review',
    'Tasks',
    'Tasks Review',
    'Apply 7.1 Foundation',
    'Apply 7.2 Core Engine',
  ];
  for (const missing of missingCases) {
    const fixture = await strandedRecoveryFixture({ missing: [missing] });
    try {
      await assert.rejects(
        () => recoverStrandedCheckpoint({
          root: fixture.root,
          change: fixture.change,
          canonicalPath: fixture.specPath,
          expectedSequence: fixture.expectedSequence,
          target: fixture.target,
          authorityRefs: profile.project_profile.authority_refs,
           fingerprints: fixture.authorityFingerprints,
          authorization: { actor: 'HUMAN / MAINTAINER', approval: `reject missing ${missing}` },
          profile,
        }),
        /invalid-recovery-chain/,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }

  const impossible = await strandedRecoveryFixture({
    order: ['Design', 'Tasks', 'Architecture Review', ...STRANDED_RECOVERY_PREFIX.slice(3)],
  });
  try {
    await assert.rejects(
      () => recoverStrandedCheckpoint({
        root: impossible.root,
        change: impossible.change,
        canonicalPath: impossible.specPath,
        expectedSequence: impossible.expectedSequence,
        target: impossible.target,
        authorityRefs: profile.project_profile.authority_refs,
        fingerprints: impossible.authorityFingerprints,
        authorization: { actor: 'HUMAN / MAINTAINER', approval: 'reject impossible sequence' },
        profile,
      }),
      /invalid-recovery-chain/,
    );
  } finally {
    await rm(impossible.root, { recursive: true, force: true });
  }
});

test('recovery lock contention fails closed without removing the active recovery lock', async () => {
    const root = await mkdtemp(join(tmpdir(), 'eclipse-recovery-lock-'));
  try {
    await mkdir(join(root, 'docs'), { recursive: true });
    await mkdir(join(root, '.opencode'), { recursive: true });
    await writeFile(join(root, 'docs', 'SDD-WORKFLOW.md'), 'workflow recovery authority\n');
    await writeFile(join(root, '.opencode', 'sdd-model-map.json'), 'model map recovery authority\n');
    const change = 'SPEC-RECOVERY-LOCK-001';
    const bootstrapped = await bootstrapChange({ root, change, profile, fingerprints: hashes });
    const lockPath = join(bootstrapped.changePath, '.sdd-runtime', 'locks', 'stranded-recovery.lock');
    await writeFile(lockPath, 'held by another recovery');
    await assert.rejects(
      () => recoverStrandedCheckpoint({
        root,
        change,
        canonicalPath: bootstrapped.changePath,
        expectedSequence: 1,
        target: 'Apply 7.3 Feature Implementation',
        authorityRefs: profile.project_profile.authority_refs,
         fingerprints: {
           workflow: sha256('workflow recovery authority\n'),
           modelMap: sha256('model map recovery authority\n'),
           config: sha256('model map recovery authority\n'),
           artifacts: {},
         },
        authorization: { actor: 'HUMAN / MAINTAINER', approval: 'recovery lock test' },
        profile,
      }),
      { code: 'EEXIST' },
    );
    assert.equal(await readFile(lockPath, 'utf8'), 'held by another recovery');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Repository Ready is terminal and the runtime rejects Git mutation', () => {
  const state = buildInitialState({ root: '/repo', change: 'terminal-change', profile, fingerprints: hashes });
  const workflow = projectCanonicalWorkflow(profile);
  const actions = ['Design', 'Architecture Review', 'Tasks', 'Tasks Review', 'Apply', 'Apply Summary', 'Verify', 'Archive', 'Health Report', 'Repository Ready'];
  const result = dispatchUntilTerminal({
    state,
    projection: workflow,
    outcomes: actions.map((action) => outcomeFor('terminal-change', action, profile)),
  });
  assert.equal(result.status, 'HUMAN_HANDOFF');
  assert.equal(result.state.checkpoint.phase, 'Repository Ready');
  assert.equal(result.state.checkpoint.next, null);
  for (const operation of ['add', 'commit', 'push', 'merge', 'release', 'tag']) {
    assert.throws(() => gitMutationBarrier({ operation }), /HUMAN_GIT/);
  }
});

test('configured routing uses Terra HIGH, Luna MID, and bounded truthful Luna LOW', async () => {
  const loaded = await loadProjectProfile({ modelMap: profile });
  assert.equal(loaded.name, 'EclipseGames');
  assert.equal(profile.roles.SOL.model, 'openai/gpt-5.6-sol');
  assert.equal(profile.roles.HIGH.model, 'openai/gpt-5.6-terra');
  assert.equal(profile.roles.MID.model, 'openai/gpt-5.6-luna');
  assert.equal(profile.roles.LOW.model, 'openai/gpt-5.6-luna');
  assert.equal(profile.runtime_routing.candidates.LOW[0].execution_profile.no_git_mutation, true);
  assert.equal(profile.runtime_routing.candidates.LOW[0].execution_profile.no_architecture_decisions, true);
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'SOL', requiredCapability: 'design' })).resolved,
    'sol-design',
  );
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'HIGH', requiredCapability: 'architecture' })).resolved,
    'terra-high',
  );
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'MID', requiredCapability: 'planning' })).resolved,
    'luna-mid',
  );
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'LOW', requiredCapability: 'evidence' })).resolved,
    'luna-low-bounded',
  );
});

test('blocked review resolution is canonical and rejects arbitrary or Apply targets', () => {
  const projection = projectCanonicalWorkflow(profile);
  const blocker = { class: 'AUTO_REFINE', human_required: false, reason: 'design evidence is incomplete', resume_phase: 'Design Refinement' };
  assert.equal(resolveBlockedTransition({ phase: 'Architecture Review', next: 'Design Refinement', blocker, projection }).next, 'Design Refinement');
  assert.throws(() => resolveBlockedTransition({ phase: 'Architecture Review', next: 'Apply', blocker, projection }), /canonical refinement|resume_phase/);
  assert.throws(() => resolveBlockedTransition({ phase: 'Architecture Review', next: 'Tasks', blocker: { ...blocker, resume_phase: 'Tasks' }, projection }), /canonical refinement|resume_phase/);

  const tasksBlocker = { class: 'AUTO_REFINE', human_required: false, reason: 'tasks evidence is incomplete', resume_phase: 'Tasks Refinement' };
  assert.equal(resolveBlockedTransition({ phase: 'Tasks Review', next: 'Tasks Refinement', blocker: tasksBlocker, projection }).next, 'Tasks Refinement');
  assert.throws(() => resolveBlockedTransition({ phase: 'Tasks Review', next: 'Archive', blocker: { ...tasksBlocker, resume_phase: 'Archive' }, projection }), /canonical refinement|resume_phase/);
});

test('illegal recovery resume phases are rejected by outcome validation', () => {
  const projection = projectCanonicalWorkflow(profile);
  const outcome = outcomeFor('SPEC-BLOCKED', 'Architecture Review', profile, {
    status: 'BLOCKED',
    next: 'Apply',
    blocker: { class: 'AUTO_REFINE', human_required: false, reason: 'blocked', resume_phase: 'Apply' },
  });
  assert.throws(() => validateOutcomePacket(outcome, projection), /canonical refinement|resume_phase/);
});

test('outcome provenance rejects a wrong profile artifact', () => {
  const outcome = outcomeFor('bad-artifact', 'Design');
  assert.throws(
    () => validateOutcomePacket({ ...outcome, checkpointArtifact: 'design.md', artifacts: ['design.md'] }, projectCanonicalWorkflow(profile)),
    /checkpoint artifact/i,
  );
});

test('sample project profile retains generic Portable defaults', () => {
  const sample = {
    project: 'sample-project',
    project_profile: {
      name: 'Sample Project',
      memory_key: 'sample-project',
      context_sources: ['AGENTS.md', 'docs/PROJECT.md'],
      invariant_sources: ['AGENTS.md'],
    },
  };
  assert.equal(projectCanonicalWorkflow(sample).edges['Tasks Review'], 'Workload Guard');
  assert.equal(projectCanonicalWorkflow(sample).edges['Apply 7.6 Apply Summary'], 'Verify');
});
