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
  const design = read('.opencode/agents/sdd-lite-design.md');
  const build = read('.opencode/agents/sdd-lite-build.md');
  const verify = read('.opencode/agents/sdd-lite-verify-luna.md');
  const ship = read('.opencode/agents/sdd-lite-ship.md');

  assert.match(design, /openai\/gpt-5\.6-sol/);
  assert.match(build, /openai\/gpt-5\.6-luna/);
  assert.match(verify, /openai\/gpt-5\.6-luna/);
  assert.match(ship, /sole SDD Lite agent\s+allowed to perform Git\/VCS actions/);
  assert.match(read('docs/architecture/sdd-lite.md'), /DESIGN -> BUILD -> VERIFY -> SHIP/);
  assert.match(read('docs/SDD-WORKFLOW.md'), /No other lifecycle artifact or state store/);
});

test('Bare Ship resolves through the authorized command path', () => {
  const resolved = resolveCommand('.opencode/commands/sdd-ship.md', '', 'Ship the verified change.');
  const ship = read('.opencode/agents/sdd-lite-ship.md');

  assert.equal(resolved.agent, 'sdd-lite-ship');
  assert.match(resolved.prompt, /This execution was entered through `\/sdd-ship`\./);
  assert.match(resolved.prompt, /Ship authorization is granted/);
  assert.match(resolved.prompt, /optional SPEC\/change argument/);
  assert.match(resolved.prompt, /when it is empty,\s+infer the\s+candidate from repository\s+evidence/);
  assert.doesNotMatch(ship, /delegated user message[\s\S]*\/sdd-ship/);
  assert.match(ship, /entry point structurally supplies maintainer authorization/);
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
