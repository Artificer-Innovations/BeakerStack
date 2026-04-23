import { promises as fs } from 'node:fs';
import path from 'node:path';

import { SetupQuit } from './setup-manual-instructions.mjs';

/** Shipped template EAS project UUID (must match apps/mobile/app.config.js when unconfigured). */
export const TEMPLATE_EAS_PROJECT_ID = '23c5e522-5341-4342-85f5-f2e46dd6087f';

/**
 * @param {string} id
 */
function escapeForRegExp(id) {
  return id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {{ repoRoot: string }} ctx
 */
export function mobileAppConfigPath(ctx) {
  return path.join(ctx.repoRoot, 'apps', 'mobile', 'app.config.js');
}

/**
 * @param {{ repoRoot: string }} ctx
 */
export function easProjectJsonPath(ctx) {
  return path.join(ctx.repoRoot, 'apps', 'mobile', '.eas', 'project.json');
}

/**
 * @param {{ repoRoot: string; logInfo?: (s: string) => void; logWarn?: (s: string) => void; templateId?: string }} ctx
 */
export async function clearTemplateEasLinkageFromMobileApp(ctx) {
  const logInfo = ctx.logInfo || (() => {});
  const logWarn = ctx.logWarn || (() => {});
  const templateId = ctx.templateId || TEMPLATE_EAS_PROJECT_ID;
  const esc = escapeForRegExp(templateId);
  const projectJson = easProjectJsonPath(ctx);
  const appConfigPath = mobileAppConfigPath(ctx);

  try {
    await fs.unlink(projectJson);
    logInfo('Removed apps/mobile/.eas/project.json (template linkage).');
  } catch {
    /* absent */
  }

  let text;
  try {
    text = await fs.readFile(appConfigPath, 'utf8');
  } catch (e) {
    logWarn(`Could not read app.config.js: ${(e && e.message) || e}`);
    return;
  }

  let next = text;
  // Strip updates block only when it references the template project on Expo's update server
  const updatesRe = new RegExp(`\\n  updates:\\s*\\{[^}]*${esc}[^}]*\\},?`, 'm');
  if (updatesRe.test(next)) {
    next = next.replace(updatesRe, '\n');
    logInfo('Stripped template updates.url block from app.config.js.');
  }

  // Strip extra.eas.projectId block only for the known template UUID
  const easRe = new RegExp(
    `\\n\\s+eas:\\s*\\{\\s*\\n\\s+projectId:\\s*['"]${esc}['"],?\\s*\\n\\s+\\},?`,
    'm',
  );
  if (easRe.test(next)) {
    next = next.replace(easRe, '\n');
    logInfo('Stripped template extra.eas.projectId from app.config.js.');
  }

  if (next !== text) {
    await fs.writeFile(appConfigPath, next, 'utf8');
  }
}

/**
 * @param {string} text
 * @param {string} [templateId]
 * @returns {string} first plausible EAS project UUID not equal to template, else ''
 */
export function extractEasProjectIdFromCliOutput(text, templateId = TEMPLATE_EAS_PROJECT_ID) {
  const combined = String(text || '');
  const re = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const found = combined.match(re) || [];
  const tid = templateId.toLowerCase();
  const nonTemplate = found.filter((id) => id.toLowerCase() !== tid);
  if (nonTemplate.length) {
    return nonTemplate[nonTemplate.length - 1];
  }
  return '';
}

/**
 * @param {string} text
 * @param {string} [templateId]
 */
export function tryRecoverEasProjectFromInitOutput(text, templateId = TEMPLATE_EAS_PROJECT_ID) {
  const id = extractEasProjectIdFromCliOutput(text, templateId);
  if (id) return id;
  const raw = String(text || '');
  const m = raw.match(/project\s*(id|ID)[:\s]+([0-9a-f-]{36})/i);
  if (m) return m[2];
  const m2 = raw.match(/projectId['"]?\s*[:=]\s*['"]?([0-9a-f-]{36})['"]?/i);
  if (m2) return m2[1];
  const m3 = raw.match(/Linked[^\n]*\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  if (m3) return m3[1];
  return '';
}

/**
 * @param {{ repoRoot: string; templateId?: string }} ctx
 * @returns {Promise<string>}
 */
export async function readResolvedEasProjectId(ctx) {
  const templateId = ctx.templateId || TEMPLATE_EAS_PROJECT_ID;
  const pj = easProjectJsonPath(ctx);
  try {
    const raw = await fs.readFile(pj, 'utf8');
    const j = JSON.parse(raw);
    if (j.projectId && typeof j.projectId === 'string') {
      const pid = j.projectId.trim();
      if (pid.toLowerCase() !== templateId.toLowerCase()) {
        return pid;
      }
    }
  } catch {
    /* no file */
  }

  const appConfigPath = mobileAppConfigPath(ctx);
  try {
    const text = await fs.readFile(appConfigPath, 'utf8');
    const tid = templateId.toLowerCase();
    const m = text.match(/eas:\s*\{[^}]*projectId:\s*['"]([0-9a-f-]{36})['"]/is);
    if (m && m[1].toLowerCase() !== tid) return m[1];
    // Any projectId line (multiline-safe; eas init may format extra.eas differently).
    const re = /projectId:\s*['"]([0-9a-f-]{36})['"]/gi;
    let last = '';
    let mm;
    while ((mm = re.exec(text)) !== null) {
      if (mm[1].toLowerCase() !== tid) last = mm[1];
    }
    if (last) return last;
  } catch {
    /* */
  }

  return '';
}

/**
 * @param {string} text
 */
function parseOwnerSlugFromAppConfig(text) {
  const ownerM = text.match(/owner:\s*['"]([^'"]+)['"]/);
  const slugM = text.match(/\bslug:\s*['"]([^'"]+)['"]/);
  return {
    owner: ownerM ? ownerM[1] : 'unknown-owner',
    slug: slugM ? slugM[1] : 'unknown-slug',
  };
}

/**
 * Writes EAS project id + updates URL into app.config.js and .eas/project.json.
 * @param {{ repoRoot: string; logInfo?: (s: string) => void; logWarn?: (s: string) => void }} ctx
 * @param {string} projectId
 */
export async function integrateEasProjectIdForDynamicConfig(ctx, projectId) {
  const logInfo = ctx.logInfo || (() => {});
  const logWarn = ctx.logWarn || (() => {});
  const appConfigPath = mobileAppConfigPath(ctx);
  const projectJson = easProjectJsonPath(ctx);
  const updatesUrl = `https://u.expo.dev/${projectId}`;

  let text;
  try {
    text = await fs.readFile(appConfigPath, 'utf8');
  } catch (e) {
    logWarn(`Could not read app.config.js: ${(e && e.message) || e}`);
    return;
  }

  const { owner, slug } = parseOwnerSlugFromAppConfig(text);
  let next = text;

  if (/updates:\s*\{/.test(next)) {
    next = next.replace(/url:\s*['"]https:\/\/u\.expo\.dev\/[^'"]+['"]/i, `url: '${updatesUrl}'`);
  } else {
    next = next.replace(
      /(runtimeVersion:\s*\{[^}]+\},)(\s*\n)/,
      `$1\n  updates: {\n    url: '${updatesUrl}',\n  },$2`,
    );
  }

  if (/\beas:\s*\{/.test(next) && /projectId:\s*['"]/.test(next)) {
    next = next.replace(/projectId:\s*['"][0-9a-f-]{36}['"]/i, `projectId: '${projectId}'`);
  } else if (!/\beas:\s*\{/.test(next)) {
    next = next.replace(/(extra:\s*\{)/, `$1\n    eas: {\n      projectId: '${projectId}',\n    },`);
  }

  await fs.writeFile(appConfigPath, next, 'utf8');
  logInfo('Updated app.config.js with EAS projectId and updates.url.');

  await fs.mkdir(path.dirname(projectJson), { recursive: true });
  const body = JSON.stringify(
    {
      accountName: owner,
      projectName: slug,
      projectId,
    },
    null,
    2,
  );
  await fs.writeFile(projectJson, `${body}\n`, 'utf8');
  logInfo('Wrote apps/mobile/.eas/project.json.');
}

/**
 * @param {Record<string, string>} acc
 * @param {string} projectJsonPath
 * @param {{ logInfo?: (s: string) => void }} [ctx]
 */
export async function applyEasProjectJsonToAcc(acc, projectJsonPath, ctx = {}) {
  const logInfo = ctx.logInfo || (() => {});
  try {
    const raw = await fs.readFile(projectJsonPath, 'utf8');
    const j = JSON.parse(raw);
    if (j.accountName) acc.EXPO_ACCOUNT = String(j.accountName);
    if (j.projectId) acc.EXPO_PROJECT_ID = String(j.projectId);
    logInfo('Merged Expo account / project id from .eas/project.json into setup accumulator (values not printed).');
  } catch {
    /* */
  }
}

/**
 * @param {Record<string, string>} acc
 */
export function clearExpoKeysFromAcc(acc) {
  for (const k of ['EXPO_TOKEN', 'EXPO_PROJECT_ID', 'EXPO_ACCOUNT']) {
    delete acc[k];
  }
}

/**
 * @param {{ acc: Record<string, string>; repoRoot: string; dryRun: boolean; mobileDir: string; templateId?: string; logInfo: (s: string) => void; logWarn: (s: string) => void; question: (q: string) => Promise<string>; runEasOnTty: (args: string[]) => number; runEasCapture: (args: string[]) => { status: number; stdout: string; stderr: string } }} ctx
 * @returns {Promise<'ok'|'skip'|'fail'>}
 */
export async function ensureNonTemplateEasProject(ctx) {
  const templateId = ctx.templateId || TEMPLATE_EAS_PROJECT_ID;
  let resolved = await readResolvedEasProjectId({ repoRoot: ctx.repoRoot, templateId });
  if (resolved && resolved.toLowerCase() !== templateId.toLowerCase()) {
    ctx.logInfo('Mobile app is already linked to a non-template EAS project.');
    if (!ctx.dryRun) {
      await applyEasProjectJsonToAcc(ctx.acc, easProjectJsonPath(ctx), ctx);
    } else {
      ctx.logInfo('[dry-run] would read .eas/project.json into EXPO_* keys (skipped).');
    }
    return 'ok';
  }

  ctx.logWarn('apps/mobile is still using the template EAS project id (or none). Clearing template linkage…');
  if (!ctx.dryRun) {
    await clearTemplateEasLinkageFromMobileApp(ctx);
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const choice = (await ctx.question('[l] Link existing EAS project UUID, [n] New (eas init), [s] Skip, [q] Quit: '))
      .trim()
      .toLowerCase();

    if (choice === 'q' || choice === 'quit' || choice === 'exit' || choice === 'x') {
      throw new SetupQuit();
    }

    if (choice === 's' || choice === 'skip') {
      return 'skip';
    }

    if (choice === 'l' || choice === 'link') {
      const raw = (await ctx.question('Existing EAS project UUID: ')).trim();
      const id = raw.replace(/['"]/g, '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        ctx.logWarn('That does not look like a UUID; try again.');
        continue;
      }
      if (ctx.dryRun) {
        ctx.logInfo(`[dry-run] would run: npx eas-cli init --id ${id} --force --non-interactive`);
        return 'ok';
      }
      const args = ['--yes', 'eas-cli', 'init', '--id', id, '--force', '--non-interactive'];
      const code = ctx.runEasOnTty(args);
      if (code !== 0) {
        ctx.logWarn(`eas init --id failed (exit ${code}).`);
        continue;
      }
      await integrateEasProjectIdForDynamicConfig(ctx, id);
      await applyEasProjectJsonToAcc(ctx.acc, easProjectJsonPath(ctx), ctx);
      return 'ok';
    }

    if (choice === 'n' || choice === 'new') {
      if (ctx.dryRun) {
        ctx.logInfo('[dry-run] would run: npx --yes eas-cli init --force --non-interactive');
        return 'ok';
      }
      // First --yes is for npx only; eas init accepts --force and --non-interactive (no --yes on eas).
      const args = ['--yes', 'eas-cli', 'init', '--force', '--non-interactive'];
      const r = ctx.runEasCapture(args);
      const combined = `${r.stdout || ''}\n${r.stderr || ''}`.trim();
      // eas init almost always writes apps/mobile/.eas/project.json; CLI output often has no UUID.
      let id = await readResolvedEasProjectId({ repoRoot: ctx.repoRoot, templateId });
      if (id && id.toLowerCase() === templateId.toLowerCase()) {
        id = '';
      }
      if (!id) {
        id =
          tryRecoverEasProjectFromInitOutput(combined, templateId) ||
          extractEasProjectIdFromCliOutput(combined, templateId);
      }
      if (!id && r.status !== 0) {
        ctx.logWarn(`eas init exited with status ${r.status}. Check EXPO_TOKEN / auth (eas whoami).`);
        const tail = combined.slice(-1600);
        if (tail) ctx.logWarn(`EAS CLI output (truncated):\n${tail}`);
      }
      if (!id) {
        ctx.logWarn(
          'No project id found on disk or in CLI output after eas init. If the project was created, copy its ID from https://expo.dev → your account → Projects → open the app → Project settings → Project ID.',
        );
        const pasted = (
          await ctx.question('Project UUID (paste Project ID; blank to return to [l]/[n] menu): ')
        ).trim();
        id = tryRecoverEasProjectFromInitOutput(pasted, templateId) || extractEasProjectIdFromCliOutput(pasted, templateId);
      }
      if (!id) {
        ctx.logWarn('Still no project id; choose [l] to link an existing UUID or [n] to retry after fixing eas whoami / EXPO_TOKEN.');
        continue;
      }
      await integrateEasProjectIdForDynamicConfig(ctx, id);
      await applyEasProjectJsonToAcc(ctx.acc, easProjectJsonPath(ctx), ctx);
      return 'ok';
    }

    ctx.logWarn('Unknown choice; use l, n, s, or q.');
  }
  return 'fail';
}
