import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { gitMutationBarrier, resolveConfiguredPhaseRoute, resolveConfiguredRoute, validateProjectProfile } from './sdd-runtime.mjs';
import { validateDesignFile, validateSemanticDesign } from './validate-design-semantics.mjs';
import { validateEnterpriseDesign } from './validate-enterprise-design.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const profile = JSON.parse(readFileSync(join(ROOT, '.opencode', 'sdd-model-map.json'), 'utf8'));

const aliasDesign = [
  ['# 1. Context', 'The scope and purpose are bounded by the approved classroom workflow.'],
  ['### 2. Technical approach', 'The solution reuses existing modules and implements only the approved change.'],
  ['#### Decisions', 'The architecture decision preserves component ownership and the current invariant.'],
  ['## 4. Data Flow', 'The contract data flows through the existing API and typed interface boundary.'],
  ['### Threat matrix', 'The privacy and failure boundary rejects unsafe input and preserves recovery.'],
  ['# Expected files', 'The working set identifies the files to modify and the files that remain untouched.'],
  ['#### Evidence Plan', 'Vitest and acceptance evidence verify the behavior and regression scenarios.'],
  ['## Deployment and rollback', 'The rollout has a bounded deployment and rollback path with no migration.'],
  ['### Simplicity', 'The simplicity check keeps the scope minimal and avoids future complexity.'],
].map(([heading, body]) => `${heading}\n\n${body}`).join('\n\n');

test('existing EclipseGames Design is accepted by semantic meaning, not heading shape', () => {
  const result = validateDesignFile({
    designPath: join(ROOT, 'docs/specs/SPEC-DEMO-003-presentable-teacher-mvp/DESIGN.md'),
    profile,
  });
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(Object.keys(result.topics).length, profile.project_profile.semantic_validation.required_topics.length);
});

test('semantic validator rejects a genuinely missing mandatory topic', () => {
  const design = readFileSync(join(ROOT, 'docs/specs/SPEC-DEMO-003-presentable-teacher-mvp/DESIGN.md'), 'utf8')
    .replace(/^## Testing Strategy[\s\S]*?(?=^## Threat Matrix)/m, '');
  const result = validateSemanticDesign(design, profile.project_profile.semantic_validation);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /testing/i);
});

test('semantic validator rejects placeholder-only bodies while accepting aliases and depth differences', () => {
  const placeholder = profile.project_profile.semantic_validation.required_topics
    .map((topic) => {
      const heading = profile.project_profile.semantic_validation.heading_aliases[topic][0];
      return `## ${heading}\nScope: TBD TBD TBD TBD TBD TBD`;
    })
    .join('\n');
  const rejected = validateSemanticDesign(placeholder, profile.project_profile.semantic_validation);
  assert.equal(rejected.valid, false);
  assert.match(rejected.errors.join('\n'), /substantive|required meaning/i);

  const accepted = validateSemanticDesign(aliasDesign, profile.project_profile.semantic_validation);
  assert.equal(accepted.valid, true, accepted.errors.join('; '));
  assert.equal(Object.keys(accepted.topics).length, 9);
});

test('semantic validator rejects near-template boilerplate and accepts a concise real Design fixture', () => {
  const boilerplate = readFileSync(join(ROOT, 'scripts/fixtures/design-semantic-boilerplate.md'), 'utf8');
  const concise = readFileSync(join(ROOT, 'scripts/fixtures/design-semantic-concise.md'), 'utf8');

  const rejected = validateSemanticDesign(boilerplate, profile.project_profile.semantic_validation);
  assert.equal(rejected.valid, false);
  assert.match(rejected.errors.join('\n'), /substantive content/i);

  const accepted = validateSemanticDesign(concise, profile.project_profile.semantic_validation);
  assert.equal(accepted.valid, true, accepted.errors.join('; '));
  assert.equal(Object.keys(accepted.topics).length, 9);
});

test('semantic validator rejects normalized nine-topic restatements', () => {
  const design = profile.project_profile.semantic_validation.required_topics.map((topic) => {
    const heading = profile.project_profile.semantic_validation.heading_aliases[topic][0];
    return `## ${heading}\n\nThe approved design defines the required ${topic} behavior for this change.`;
  }).join('\n\n');
  const result = validateSemanticDesign(design, profile.project_profile.semantic_validation);
  assert.equal(result.valid, false);
  assert.equal(result.errors.filter((error) => /substantive content/.test(error)).length, 9);
});

test('active-only Design validation checks active files and bypasses historical diagnostics explicitly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'design-validation-'));
  try {
    const activePath = join(root, 'active', 'DESIGN.md');
    const historicalPath = join(root, 'historical', 'DESIGN.md');
    await mkdir(join(root, 'active'), { recursive: true });
    await mkdir(join(root, 'historical'), { recursive: true });
    await writeFile(activePath, aliasDesign);
    await writeFile(historicalPath, '**Status:** Archived\n\n## Context\nTBD\n');

    const active = validateDesignFile({ designPath: activePath, profile, root, activeOnly: true });
    assert.equal(active.valid, true, active.errors.join('; '));
    assert.equal(active.skipped, false);

    const historical = validateDesignFile({ designPath: historicalPath, profile, root, activeOnly: true });
    assert.equal(historical.valid, true);
    assert.equal(historical.skipped, true);
    assert.equal(historical.historical, true);
    assert.ok(historical.diagnosticErrors.length > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generic Portable enterprise validator remains available for its declared shape', () => {
  const titles = [
    'Executive Summary', 'Technical Approach', 'Architecture Decisions', 'Data Flow',
    'Working Set', 'Read Order', 'Expected Commands', 'Design Confidence',
    'Exploration Budget', 'Risks', 'Testing Strategy', 'Doorbell Tests',
    'Required ADRs', 'Boundaries', 'Extensibility', 'Interfaces / Contracts',
    'Migration Strategy', 'Open Questions',
  ];
  const topics = ['Scalability', 'Open/Closed Principle (OCP)', 'Ownership', 'Data Retention', 'Idempotency', 'Shared Contracts', 'Partitioning Strategy'];
  const design = titles.map((title, index) => `## ${index + 1}. ${title}\nDecision and Rationale for ${title}.`).join('\n')
    + '\n## Architecture Review Preparation\n'
    + topics.map((topic, index) => `### ${String.fromCharCode(65 + index)}. ${topic}\n**Decision:** bounded. **Rationale:** evidence.`).join('\n');
  assert.equal(validateEnterpriseDesign(design).valid, true);
});

test('control-plane boundary has no second product/spec tree and apps/packages are untouched', () => {
  assert.equal(existsSync(join(ROOT, 'openspec/specs')), false);
  const changed = execFileSync('git', ['diff', '--name-only', '68b683c'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  assert.equal(changed.some((file) => file.startsWith('apps/') || file.startsWith('packages/')), false);
});

test('retired sdd-apply cannot run and canonical commands use Portable Direct', () => {
  const command = readFileSync(join(ROOT, '.opencode/commands/sdd-apply.md'), 'utf8');
  const agent = readFileSync(join(ROOT, '.opencode/agents/sdd-apply.md'), 'utf8');
  const skill = readFileSync(join(ROOT, '.opencode/skills/sdd-apply/SKILL.md'), 'utf8');
  const direct = readFileSync(join(ROOT, '.opencode/commands/sdd-direct.md'), 'utf8');
  for (const text of [command, agent, skill]) {
    assert.match(text, /STOP/);
    assert.doesNotMatch(text, /agent:\s*sdd-orchestrator|dispatch.*executor|launch.*executor/i);
  }
  assert.match(command, /^agent:\s*sdd-apply$/m);
  assert.doesNotMatch(command, /sdd-direct-orchestrator/);
  assert.equal(JSON.parse(readFileSync(join(ROOT, 'opencode.json'), 'utf8')).agent['sdd-apply'].disable, true);
  assert.match(direct, /docs\/specs/);
  assert.match(direct, /Repository Ready[\s\S]*STOP/);
});

test('Repository Ready has no Git executor and the runtime mutation barrier fails closed', () => {
  const ready = readFileSync(join(ROOT, '.opencode/agents/sdd-direct-repository-ready.md'), 'utf8');
  assert.match(ready, /terminal/i);
  assert.match(ready, /never stage, commit, push/i);
  for (const operation of [
    'add', 'commit', 'push', 'branch', 'config', 'notes', 'apply', 'pr', 'merge',
    'release', 'tag', 'ci', 'workflow', 'run', 'checks', 'pull request', 'CI wait',
  ]) {
    assert.throws(() => gitMutationBarrier({ operation }), /HUMAN_GIT/);
  }
});

test('project permissions deny every Git handoff and mutation category', () => {
  const config = JSON.parse(readFileSync(join(ROOT, 'opencode.json'), 'utf8'));
  const requiredPatterns = [
    'git add*', 'git commit*', 'git push*', 'git branch*', 'git config*', 'git notes*',
    'git apply*', 'git merge*', 'git tag*', 'gh pr *', 'gh workflow *', 'gh run *',
  ];
  for (const pattern of requiredPatterns) {
    assert.equal(config.permission.bash[pattern], 'deny', `${pattern} must be denied`);
  }
  for (const agent of ['sdd-orchestrator', 'sdd-apply']) {
    for (const pattern of requiredPatterns) {
      assert.equal(config.agent[agent].permission.bash[pattern], 'deny', `${agent} ${pattern} must be denied`);
    }
  }
  assert.doesNotMatch(JSON.stringify(config), /"git [^"]+":\s*"allow"/i);
  assert.doesNotMatch(JSON.stringify(profile.project_profile.authority_refs), /openspec/i);
});

test('project profile validation checks lifecycle, semantic, and Git boundary mappings', () => {
  const invalidEdge = structuredClone(profile);
  invalidEdge.project_profile.lifecycle.edges.Apply = 'Unknown Phase';
  assert.throws(() => validateProjectProfile(invalidEdge), /unknown phase/i);

  const cyclicEdge = structuredClone(profile);
  cyclicEdge.project_profile.lifecycle.edges.Apply = 'Apply';
  assert.throws(() => validateProjectProfile(cyclicEdge), /cycle/i);

  const invalidSemantic = structuredClone(profile);
  delete invalidSemantic.project_profile.semantic_validation.heading_aliases.testing;
  assert.throws(() => validateProjectProfile(invalidSemantic), /heading_aliases\.testing/i);

  const invalidGitBoundary = structuredClone(profile);
  invalidGitBoundary.project_profile.git_boundary.operations = invalidGitBoundary.project_profile.git_boundary.operations.filter(
    (operation) => operation !== 'git config',
  );
  assert.throws(() => validateProjectProfile(invalidGitBoundary), /git config/i);
  assert.doesNotThrow(() => validateProjectProfile(profile));
});

test('runtime lifecycle dispatch does not invoke a Git subprocess', () => {
  const runtime = readFileSync(join(ROOT, 'scripts/sdd-runtime.mjs'), 'utf8');
  assert.doesNotMatch(runtime, /execFile|spawn|exec\(/);
});

test('configured profile exposes exact model identities and phase routing', async () => {
  assert.equal(profile.roles.SOL.model, 'openai/gpt-5.6-sol');
  assert.equal(profile.roles.HIGH.model, 'openai/gpt-5.6-terra');
  assert.equal(profile.roles.MID.model, 'openai/gpt-5.6-luna');
  assert.equal(profile.roles.LOW.model, 'openai/gpt-5.6-luna');
  assert.equal(profile.phase_roles.Design, 'SOL');
  assert.equal(profile.phase_roles['Design Refinement'], 'SOL');
  assert.equal(profile.phase_roles['Architecture Review'], 'HIGH');
  assert.equal(profile.phase_roles.Verify, 'HIGH');
  assert.equal(profile.local_agent_roles['sdd-direct-orchestrator'], 'MID');
  assert.equal(profile.local_agent_roles['sdd-direct-design'], 'SOL');
  assert.doesNotMatch(JSON.stringify(profile), /-fast\b/i);
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'SOL', requiredCapability: 'design' })).resolved,
    'sol-design',
  );
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'HIGH', requiredCapability: 'architecture' })).resolved,
    'terra-high',
  );
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'HIGH', requiredCapability: 'verification' })).resolved,
    'terra-high',
  );
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'MID', requiredCapability: 'orchestration' })).resolved,
    'luna-mid',
  );
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'MID', requiredCapability: 'implementation' })).resolved,
    'luna-mid',
  );
  assert.equal(
    (await resolveConfiguredRoute({ modelMap: profile, role: 'LOW', requiredCapability: 'evidence' })).resolved,
    'luna-low-bounded',
  );
  assert.deepEqual(profile.project_profile.lifecycle_artifacts, {
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
});

test('phase executor bindings are explicit and model-specific', async () => {
  const expectations = [
    ['Design', 'sdd-direct-design', 'openai/gpt-5.6-sol'],
    ['Architecture Review', 'sdd-direct-architecture-review', 'openai/gpt-5.6-terra'],
    ['Verify', 'sdd-direct-verify', 'openai/gpt-5.6-terra'],
    ['Apply', 'sdd-direct-apply', 'openai/gpt-5.6-luna'],
  ];
  for (const [phase, executor, model] of expectations) {
    const route = await resolveConfiguredPhaseRoute({ modelMap: profile, phase });
    assert.deepEqual(route, { phase, executor, role: profile.phase_roles[phase], resolved: executor, model });
  }
  assert.notEqual(profile.phase_executors.Design, profile.phase_executors['Architecture Review']);
  assert.notEqual(profile.phase_executors.Apply, profile.local_agent_roles['sdd-direct-orchestrator']);
});

test('every configured phase executor declares the uniform isolation contract', () => {
  const marker = /<!-- PORTABLE_V1_EXECUTOR_ISOLATION -->([\s\S]*?)<!-- END PORTABLE_V1_EXECUTOR_ISOLATION -->/;
  const required = [
    /only its assigned phase/i,
    /exactly one structured executor outcome packet/i,
    /must\s+not\s+write, mutate, or reconcile `\.sdd-runtime` state/i,
    /append or modify\s+lifecycle trace/i,
    /invoke recovery/i,
    /select or route another lifecycle phase/i,
    /Tasks Refinement/i,
    /native Task tool to dispatch a\s+lifecycle phase/i,
    /Git\/VCS handoff or mutation/i,
    /may report BLOCKED/i,
    /must not execute or route\s+that action/i,
    /sdd-direct-orchestrator.*alone owns/i,
  ];
  const executors = [...new Set(Object.values(profile.phase_executors))];
  assert.ok(executors.length > 0);
  for (const executor of executors) {
    const agent = readFileSync(join(ROOT, '.opencode', 'agents', `${executor}.md`), 'utf8');
    const match = agent.match(marker);
    assert.ok(match, `${executor} is missing the isolation contract`);
    for (const pattern of required) assert.match(match[1], pattern, `${executor} is missing ${pattern}`);
    const outsideContract = agent.replace(match[0], '');
    assert.doesNotMatch(outsideContract, /route one bounded refinement/i, `${executor} grants refinement routing authority`);
    assert.doesNotMatch(outsideContract, /\b(?:may|can|should)\s+(?:write|mutate|reconcile|dispatch|select|route|invoke|perform)\b[\s\S]{0,80}\b(?:runtime|trace|phase|lifecycle|Git|VCS|Task)/i, `${executor} grants child lifecycle authority`);
  }
  const tasksReview = readFileSync(join(ROOT, '.opencode', 'agents', 'sdd-direct-tasks-review.md'), 'utf8');
  assert.match(tasksReview, /identify Tasks Refinement as\s+the\s+canonical requested next action/i);
  assert.doesNotMatch(tasksReview, /route(?:s|d)?\s+(?:one bounded refinement|Tasks Refinement)/i);
});
