#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverActiveChanges } from './sdd-resume.mjs';
import { validateProjectProfile } from './sdd-runtime.mjs';
import { validateDesignFile } from './validate-design-semantics.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];
const fail = (message) => failures.push(message);
const pathOf = (...parts) => join(ROOT, ...parts);
const read = (file) => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};
const json = (file) => {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    fail(`${file.replace(`${ROOT}/`, '')}: invalid JSON (${error.message})`);
    return null;
  }
};

const requiredFiles = [
  'AGENTS.md',
  '.ai/context/PROJECT.md',
  '.ai/context/SESSION.md',
  '.ai/context/DECISIONS.md',
  '.ai/context/KNOWN_ISSUES.md',
  '.ai/context/ROADMAP.md',
  'docs/SDD-WORKFLOW.md',
  'docs/SDD-PORTABILITY.md',
  'docs/architecture/sdd-direct.md',
  '.opencode/sdd-model-map.json',
  '.opencode/commands/sdd-direct.md',
  '.opencode/commands/sdd-resume.md',
  '.opencode/commands/sdd-apply.md',
  '.opencode/agents/sdd-direct-orchestrator.md',
  '.opencode/agents/sdd-direct-design.md',
  '.opencode/agents/sdd-direct-architecture-review.md',
  '.opencode/agents/sdd-direct-tasks.md',
  '.opencode/agents/sdd-direct-tasks-review.md',
  '.opencode/agents/sdd-direct-apply.md',
  '.opencode/agents/sdd-direct-verify.md',
  '.opencode/agents/sdd-direct-archive.md',
  '.opencode/agents/sdd-direct-health-report.md',
  '.opencode/agents/sdd-direct-repository-ready.md',
  '.opencode/agents/sdd-apply.md',
  '.opencode/skills/sdd-apply/SKILL.md',
  'scripts/sdd-runtime.mjs',
  'scripts/sdd-resume.mjs',
  'scripts/validate-design-semantics.mjs',
  'scripts/validate-enterprise-design.mjs',
  'package.json',
  'opencode.json',
];
for (const file of requiredFiles) if (!existsSync(pathOf(file))) fail(`${file}: required file is missing`);

if (existsSync(pathOf('openspec', 'specs'))) fail('openspec/specs must not exist');
const modelMap = json(pathOf('.opencode', 'sdd-model-map.json'));
const projectConfig = json(pathOf('opencode.json'));
const packageJson = json(pathOf('package.json'));
let profile = null;
try {
  profile = validateProjectProfile(modelMap);
} catch (error) {
  fail(`project profile: ${error.message}`);
}

if (profile) {
  if (profile.id !== 'eclipsegames' || profile.name !== 'EclipseGames' || profile.memoryKey !== 'eclipsegames') fail('profile identity is not EclipseGames');
  if (profile.changesRoot !== 'docs/specs') fail('profile changes root must be docs/specs');
  if (profile.archiveBehavior !== 'in-place') fail('profile archive behavior must be in-place');
  for (const entry of ['state', 'trace', 'recovery', 'locks', 'checkpoints']) {
    if (!profile.runtimeLayout?.[entry]) fail(`profile runtime layout is missing ${entry}`);
  }
  for (const [phase, artifact] of Object.entries({
    Design: 'DESIGN.md',
    'Architecture Review': 'ARCHITECTURE-REVIEW.md',
    Tasks: 'TASKS.md',
    'Tasks Review': 'TASKS-REVIEW.md',
    Apply: 'APPLY-PROGRESS.md',
    'Apply Summary': 'APPLY-SUMMARY.md',
    Verify: 'VERIFY-REPORT.md',
    Archive: 'ARCHIVE-REPORT.md',
    'Health Report': 'HEALTH-REPORT.md',
    'Repository Ready': 'REPOSITORY-READY.md',
  })) {
    if (profile.lifecycleArtifacts[phase] !== artifact) fail(`profile artifact mapping for ${phase} must be ${artifact}`);
  }
  const requiredContext = ['AGENTS.md', '.ai/context/PROJECT.md', '.ai/context/DECISIONS.md', '.ai/context/ROADMAP.md', '.ai/context/KNOWN_ISSUES.md', 'docs/SDD-WORKFLOW.md'];
  for (const source of requiredContext) if (!profile.contextSources.includes(source)) fail(`profile context source missing: ${source}`);
  if (!profile.contextSources.includes('docs/specs/<SPEC-DIRECTORY>/DESIGN.md')) fail('profile active SPEC context source is missing');
}

const workflow = read(pathOf('docs/SDD-WORKFLOW.md'));
const direct = read(pathOf('.opencode/commands/sdd-direct.md'));
const resume = read(pathOf('.opencode/commands/sdd-resume.md'));
const legacy = read(pathOf('.opencode/commands/sdd-apply.md'));
const legacyAgent = read(pathOf('.opencode/agents/sdd-apply.md'));
const legacySkill = read(pathOf('.opencode/skills/sdd-apply/SKILL.md'));
const allLocal = [direct, resume, legacy, legacyAgent, legacySkill, read(pathOf('docs/architecture/sdd-direct.md'))].join('\n');

if (!/^semantic_authority:\s*true/m.test(workflow)) fail('workflow must be the semantic authority');
for (const term of ['docs/specs/', 'Apply Summary', 'Repository Ready', 'HUMAN', 'STOP', 'profile-driven', 'historical']) {
  if (!workflow.toLocaleLowerCase().includes(term.toLocaleLowerCase())) fail(`workflow missing required term: ${term}`);
}
if (/Automated Git Handoff/i.test(workflow)) fail('active workflow contains obsolete Automated Git Handoff semantics');
if (!/STOP\s+only|STOP\./i.test(legacy) || !/Portable Direct/i.test(legacy)) fail('legacy sdd-apply command is not a STOP-only Portable Direct shim');
if (!/^agent:\s*sdd-apply$/m.test(legacy) || /agent:\s*sdd-direct-orchestrator/i.test(legacy)) fail('legacy sdd-apply command must route only to the disabled STOP shim');
for (const agent of ['sdd-orchestrator', 'sdd-apply']) {
  if (projectConfig?.agent?.[agent]?.disable !== true) fail(`${agent} compatibility route must be disabled`);
}
for (const [name, text] of [['legacy agent', legacyAgent], ['legacy skill', legacySkill]]) {
  if (!/STOP/i.test(text) || /dispatch|select work|execute Apply|progress a lifecycle/i.test(text) && !/must never|cannot/i.test(text)) fail(`${name} is not a STOP-only shim`);
}
if (/CRM-SDD|CRM-Master|SPEC-0028|Doorbell|Prisma|tenant/i.test(allLocal)) fail('Portable control-plane wiring contains CRM-specific residue');
if (/agent:\s*sdd-continue|scripts\/sdd-continue|invoke\s+\/sdd-continue/i.test(allLocal)) fail('Portable control-plane wiring depends on absent ad-hoc sdd-continue');

const expectedModels = {
  SOL: 'openai/gpt-5.6-sol',
  HIGH: 'openai/gpt-5.6-terra',
  MID: 'openai/gpt-5.6-luna',
  LOW: 'openai/gpt-5.6-luna',
};
for (const [role, model] of Object.entries(expectedModels)) {
  if (modelMap?.roles?.[role]?.model !== model) fail(`role ${role} model must be ${model}`);
  const primary = modelMap?.runtime_routing?.primary?.[role];
  const candidate = modelMap?.runtime_routing?.candidates?.[role]?.find((item) => item.id === primary);
  if (!candidate || candidate.model !== model || candidate.role !== role) fail(`runtime routing ${role} does not match its configured model`);
}
if (/-fast\b/i.test(JSON.stringify(modelMap))) fail('canonical SDD routing must not use -fast model variants');
for (const [phase, role] of Object.entries({
  Design: 'SOL',
  'Design Refinement': 'SOL',
  'Architecture Review': 'HIGH',
  Verify: 'HIGH',
})) {
  if (modelMap?.phase_roles?.[phase] !== role) fail(`${phase} must route to ${role}`);
}
const lowCandidate = modelMap?.runtime_routing?.candidates?.LOW?.[0];
if (!lowCandidate?.execution_profile?.no_git_mutation || !lowCandidate?.execution_profile?.no_architecture_decisions || !Number.isSafeInteger(lowCandidate?.execution_profile?.token_budget)) fail('LOW routing lacks a truthful bounded execution profile');
for (const phase of ['Commit', 'Push', 'Merge']) if (modelMap?.phase_roles?.[phase] !== 'HUMAN') fail(`${phase} must be HUMAN-owned`);
if (/(?:"(?:git|gh) [^"]+":\s*"allow")/i.test(JSON.stringify(projectConfig))) fail('opencode permissions allow Git mutation');

if (packageJson?.scripts?.['sdd:validate'] !== 'node scripts/validate-sdd-direct.mjs') fail('sdd:validate script is missing');
if (packageJson?.scripts?.['sdd:validate:design'] !== 'node scripts/validate-design-semantics.mjs') fail('sdd:validate:design script is missing');
if (packageJson?.scripts?.['test:sdd-runtime'] !== 'node --test scripts/*.test.mjs') fail('test:sdd-runtime script is missing');

let activeDesignCount = 0;
if (profile) {
  const activeRoot = pathOf(profile.changesRoot);
  const activeChanges = discoverActiveChanges(activeRoot, { profile });
  for (const candidate of activeChanges) {
    if (candidate.runtimeStateInvalid) {
      fail(`${candidate.name}: corrupt runtime identity`);
      continue;
    }
    activeDesignCount += 1;
    const designPath = join(candidate.path, profile.lifecycleArtifacts.Design);
    const result = validateDesignFile({ designPath, profile, activeOnly: true });
    if (!result.valid) result.errors.forEach((error) => fail(`${candidate.name} Design semantic validation: ${error}`));
  }
}

if (failures.length > 0) {
  console.error('EclipseGames Portable SDD validation: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('EclipseGames Portable SDD validation: PASS');
  console.log('- docs/specs is the single product/spec authority');
  console.log('- profile-driven lifecycle, artifact mapping, and semantic validation are valid');
  console.log('- legacy Apply route is STOP-only');
  console.log(`- active-only Design validation checked ${activeDesignCount} active SPEC${activeDesignCount === 1 ? '' : 's'}`);
  console.log('- SOL/HIGH/MID/LOW/HUMAN routing and terminal Git boundary are valid');
}
