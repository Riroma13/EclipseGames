import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');
const exists = (relativePath) => existsSync(join(root, relativePath));
const config = JSON.parse(read('opencode.json'));
const resolveCommand = (relativePath, argumentsText, userMessage) => {
  const source = read(relativePath);
  const [, frontMatter, body] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const agent = frontMatter.match(/^agent:\s*(\S+)$/m)?.[1];
  return {
    agent,
    prompt: `${body.replaceAll('$ARGUMENTS', argumentsText)}\nUser request: ${userMessage}`,
  };
};

test('SDD Lite exposes exactly the four public commands', () => {
  for (const command of ['sdd-start', 'sdd-resume', 'sdd-verify', 'sdd-ship']) {
    assert.ok(exists(`.opencode/commands/${command}.md`));
  }
  for (const retired of ['sdd-apply', 'sdd-direct']) {
    assert.equal(exists(`.opencode/commands/${retired}.md`), false);
  }
});

test('SDD Lite routing and Git boundary are explicit', () => {
  const start = resolveCommand('.opencode/commands/sdd-start.md', 'M1 calendar', 'Start the change.');
  const verifyCommand = resolveCommand('.opencode/commands/sdd-verify.md', 'SPEC-0018', 'Verify the change.');
  const orchestrator = read('.opencode/agents/sdd-lite-orchestrator.md');
  const design = read('.opencode/agents/sdd-lite-design.md');
  const build = read('.opencode/agents/sdd-lite-build.md');
  const verify = read('.opencode/agents/sdd-lite-verify-luna.md');
  const terraReview = read('.opencode/agents/sdd-lite-review-terra.md');
  const terraVerify = read('.opencode/agents/sdd-lite-verify-terra.md');
  const ship = read('.opencode/agents/sdd-lite-ship.md');

  assert.equal(start.agent, 'sdd-lite-orchestrator');
  assert.equal(verifyCommand.agent, 'sdd-lite-orchestrator');
  assert.match(verifyCommand.prompt, /Levels A\/B go directly to `sdd-lite-verify-luna`/);
  assert.match(verifyCommand.prompt, /Level C goes directly to the\s+existing `sdd-lite-verify-terra` agent/);
  assert.match(verifyCommand.prompt, /SPEC-0018 is Level C and must use Terra/);
  assert.doesNotMatch(verifyCommand.prompt, /gentle-orchestrator|Portable orchestrator/);
  assert.match(orchestrator, /Explore[^\n]*Luna[\s\S]*Design[^\n]*sdd-lite-design[^\n]*Sol[\s\S]*Terra Review[^\n]*sdd-lite-review-terra[\s\S]*Build[^\n]*sdd-lite-build[^\n]*Luna[\s\S]*Verify[^\n]*sdd-lite-verify-terra[^\n]*Level C/);
  assert.match(orchestrator, /Terra must never author or rewrite DESIGN\.md/);
  assert.match(design, /openai\/gpt-5\.6-sol/);
  assert.match(build, /openai\/gpt-5\.6-luna/);
  assert.match(verify, /openai\/gpt-5\.6-luna/);
  assert.match(terraReview, /openai\/gpt-5\.6-terra/);
  assert.match(terraReview, /Review DESIGN\.md/);
  assert.match(terraReview, /Never author or rewrite DESIGN\.md/);
  assert.match(terraVerify, /openai\/gpt-5\.6-terra/);
  assert.match(ship, /sole SDD Lite agent\s+allowed to perform Git\/VCS actions/);
  assert.match(read('docs/architecture/sdd-lite.md'), /DESIGN -> BUILD -> VERIFY -> SHIP/);
  assert.match(read('docs/SDD-WORKFLOW.md'), /No other lifecycle artifact or state store/);
});


test('SDD Lite enforces real model-routed child stages', () => {
  const resume = resolveCommand(
    '.opencode/commands/sdd-resume.md',
    'SPEC-0027',
    'Resume the change.',
  );
  const orchestrator = read('.opencode/agents/sdd-lite-orchestrator.md');
  const terraReview = read('.opencode/agents/sdd-lite-review-terra.md');

  assert.equal(resume.agent, 'sdd-lite-orchestrator');

  assert.match(orchestrator, /^mode:\s*primary$/m);
  assert.match(orchestrator, /^model:\s*openai\/gpt-5\.6-luna$/m);
  assert.match(orchestrator, /^\s*edit:\s*deny$/m);
  assert.match(orchestrator, /^\s*"\*":\s*deny$/m);

  const taskBlock = orchestrator.match(/^  task:\n((?:    "[^"]+": (?:allow|deny)\n?)+)/m)?.[1];
  assert.equal(
    taskBlock?.trim().replaceAll(/^    /gm, ''),
    [
      '"*": deny',
      '"sdd-lite-design": allow',
      '"sdd-lite-review-terra": allow',
      '"sdd-lite-build": allow',
      '"sdd-lite-verify-luna": allow',
      '"sdd-lite-verify-terra": allow',
    ].join('\n'),
    'orchestrator must expose exactly the five non-Ship child allows',
  );
  assert.doesNotMatch(taskBlock ?? '', /sdd-lite-ship/);

  for (const child of [
    'sdd-lite-design',
    'sdd-lite-review-terra',
    'sdd-lite-build',
    'sdd-lite-verify-luna',
    'sdd-lite-verify-terra',
  ]) {
    assert.match(
      orchestrator,
      new RegExp(`^\\s*"${child}":\\s*allow$`, 'm'),
      `${child} must be explicitly delegable`,
    );
  }

  for (const [agent, model] of [
    ['sdd-lite-design.md', 'openai/gpt-5.6-sol'],
    ['sdd-lite-review-terra.md', 'openai/gpt-5.6-terra'],
    ['sdd-lite-build.md', 'openai/gpt-5.6-luna'],
    ['sdd-lite-verify-luna.md', 'openai/gpt-5.6-luna'],
    ['sdd-lite-verify-terra.md', 'openai/gpt-5.6-terra'],
  ]) {
    const source = read(`.opencode/agents/${agent}`);
    assert.match(source, /^mode:\s*subagent$/m, `${agent} must be a real subagent`);
    assert.match(
      source,
      new RegExp(`^model:\\s*${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'),
      `${agent} must pin its real model`,
    );
  }

  for (const agent of [
    'sdd-lite-design.md',
    'sdd-lite-review-terra.md',
    'sdd-lite-build.md',
    'sdd-lite-verify-luna.md',
    'sdd-lite-verify-terra.md',
  ]) {
    const source = read(`.opencode/agents/${agent}`);
    assert.match(source, /^\s*task:\n\s+"\*":\s*deny$/m, `${agent} must deny child task delegation`);
  }
  assert.match(terraReview, /^\s*edit:\s*deny$/m, 'Terra Review must remain read-only');

  for (const source of [
    read('.opencode/commands/sdd-start.md'),
    read('.opencode/commands/sdd-resume.md'),
    orchestrator,
  ]) {
    assert.doesNotMatch(source, /\bAct as (?:Sol|Terra)\b/i);
  }
});

test('Professional Engineering Baseline has one canonical owner and stage references', () => {
  const agents = read('AGENTS.md');
  const detailed = read('docs/architecture/sdd-lite.md');
  const workflow = read('docs/SDD-WORKFLOW.md');
  const baselineHeading = /^## Professional Engineering Baseline$/gm;

  assert.equal([...agents.matchAll(baselineHeading)].length, 1);
  assert.equal([...detailed.matchAll(baselineHeading)].length, 0);
  assert.equal([...workflow.matchAll(baselineHeading)].length, 0);

  for (const guide of [detailed, workflow]) {
    assert.match(guide, /Professional Engineering\s+Baseline/);
    assert.match(guide, /root\s+`AGENTS\.md`/);
    assert.match(guide, /Design[\s\S]*Build[\s\S]*Verify/);
    assert.match(guide, /not applicable/);
  }
});

test('Bare Ship resolves through the authorized command path', () => {
  const resolved = resolveCommand('.opencode/commands/sdd-ship.md', '', 'Ship the verified change.');
  const ship = read('.opencode/agents/sdd-lite-ship.md');

  assert.equal(resolved.agent, 'sdd-lite-ship');
  assert.match(resolved.prompt, /This execution was entered through `\/sdd-ship`\./);
  assert.match(resolved.prompt, /Ship authorization is granted/);
  assert.match(resolved.prompt, /optional SPEC\/change argument/);
  assert.match(resolved.prompt, /when it is empty,\s+infer the\s+candidate from repository\s+evidence/);
  assert.doesNotMatch(ship, /delegated user message[\s\S]*ask.*\/sdd-ship/);
  assert.match(ship, /entry point structurally supplies maintainer authorization/);
  assert.match(ship, /Explicit `\/sdd-ship` is sufficient authorization/);
  assert.match(ship, /GitHub issue\s+linkage is optional/);
  assert.match(ship, /branch is unsuitable[\s\S]*create or switch/);
  assert.match(ship, /Stage only files belonging to that change and genuinely related/);
  assert.doesNotMatch(ship, /status:approved|mandatory issue|Require.*issue/);
  assert.match(ship, /never inspect the delegated user message for a\s+command name/);
  assert.match(ship, /current branch, each relevant SPEC, VERIFY\.md, and the working tree/);
  assert.match(ship, /sole verified change when it is the obvious candidate/);
  assert.match(ship, /only when multiple plausible candidates remain/);
});

test('Build and Verify cannot silently Ship', () => {
  for (const agent of ['sdd-lite-design.md', 'sdd-lite-build.md', 'sdd-lite-verify-luna.md', 'sdd-lite-verify-terra.md']) {
    const text = read(`.opencode/agents/${agent}`);
    assert.match(text, /Git\/VCS\s+operations/);
    assert.match(text, /"git \*": deny/);
    assert.match(text, /"gh \*": deny/);
  }
  assert.match(read('.opencode/commands/sdd-ship.md'), /Only this command may perform Git\/VCS actions/);
});

test('Ship contract excludes unrelated work and may correct its branch', () => {
  const command = read('.opencode/commands/sdd-ship.md');
  const ship = read('.opencode/agents/sdd-lite-ship.md');
  const workflow = read('docs/SDD-WORKFLOW.md');

  assert.match(command, /Explicit `\/sdd-ship` invocation is sufficient/);
  assert.match(command, /issues may be linked when they exist, but are\s+optional/);
  assert.match(command, /only the selected change and its\s+genuinely related fixes/);
  assert.match(command, /correct an unsuitable current branch/);
  assert.match(ship, /"git branch --show-current": allow/);
  assert.match(ship, /"git branch \*": allow/);
  assert.match(ship, /"git switch \*": allow/);
  assert.match(ship, /leaving unrelated worktree changes untouched/);
  assert.doesNotMatch(command, /status:approved|missing approval/);
  assert.match(workflow, /may correct an unsuitable candidate\s+branch before committing/);
  assert.doesNotMatch(workflow, /never force, reset, rewrite history, switch\s+branches/);
});

test('Only Ship has Git/VCS capability and no global deny overrides it', () => {
  const globalBash = config.permission.bash;
  assert.equal(globalBash['git *'], undefined);
  assert.equal(globalBash['gh *'], undefined);

  const ship = read('.opencode/agents/sdd-lite-ship.md');
  for (const capability of [
    'git status*',
    'git diff*',
    'git add -- *',
    'git commit *',
    'git push origin HEAD',
    'gh pr create *',
    'gh pr view *',
    'gh pr checks *',
    'gh pr merge *',
  ]) {
    assert.match(ship, new RegExp(`"${capability.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}": allow`));
  }
  assert.doesNotMatch(ship, /"git \*": deny/);
  assert.doesNotMatch(ship, /"gh \*": deny/);
});

test('Portable machinery and replacement runtime are absent', () => {
  for (const path of [
    '.opencode/sdd-model-map.json',
    'docs/architecture/sdd-direct.md',
    'scripts/sdd-runtime.mjs',
    'scripts/sdd-resume.mjs',
    'scripts/validate-sdd-direct.mjs',
    'scripts/validate-design-semantics.mjs',
    'docs/specs/SPEC-0017-functional-canonicalization-gap-audit/.sdd-runtime',
    'docs/specs/SPEC-0017-functional-canonicalization-gap-audit/.sdd-runtime/state.json',
  ]) {
    assert.equal(exists(path), false, path);
  }
  assert.equal(exists('docs/specs/SPEC-0017-functional-canonicalization-gap-audit/VERIFY.md'), true);
});

test('SPEC-0017 closes with preserved Design, Tasks, review history, and Verify evidence', () => {
  assert.match(read('docs/specs/SPEC-0017-functional-canonicalization-gap-audit/DESIGN.md'), /Canonical register/);
  assert.match(read('docs/specs/SPEC-0017-functional-canonicalization-gap-audit/TASKS.md'), /Complete under SDD Lite/);
  assert.match(read('docs/specs/SPEC-0017-functional-canonicalization-gap-audit/ARCHITECTURE-REVIEW.md'), /PASS WITH CONDITIONS/);
  assert.match(read('docs/specs/SPEC-0017-functional-canonicalization-gap-audit/VERIFY.md'), /C-01 remains an open production privacy\/recoverability gate/);
});
