import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildHelpContent,
  lineAt,
  markdownToPlainText,
  parseHelpMarkdown,
  runIfMainModule,
  shouldRunMain,
} from './build-help.ts';

const legal = {
  brandName: 'Beaker Stack',
  brandUrl: 'https://beakerstack.com',
  legalEntityName: 'Artificer Innovations, LLC',
  contactEmail: 'contact@artificerinnovations.com',
  contactPhone: '',
  mailingAddress: 'Spokane, WA',
};

describe('parseHelpMarkdown', () => {
  it('parses title, subtitle, and sections from markdown', () => {
    const markdown = `# Help & Support

Everything you need to know about {{brandName}}.

## Getting Started

Sign up today.

## Billing

See [plans](/billing/plans).
`;

    const help = parseHelpMarkdown(markdown, legal);

    expect(help.title).toBe('Help & Support');
    expect(help.subtitle).toBe(
      'Everything you need to know about Beaker Stack.'
    );
    expect(help.sections).toHaveLength(2);
    expect(help.sections[0]?.title).toBe('Getting Started');
    expect(help.sections[0]?.id).toBe('getting-started');
    expect(help.sections[0]?.html).toContain('<p>Sign up today.</p>');
    expect(help.sections[1]?.searchText).toContain('plans');
  });

  it('uses defaults and skips non-section lines before headings', () => {
    const help = parseHelpMarkdown(
      'intro line\n\n## Only Section\n\nBody copy.',
      legal
    );
    expect(help.title).toBe('Help & Support');
    expect(help.subtitle).toBe('intro line');
    expect(help.sections).toEqual([
      expect.objectContaining({
        id: 'only-section',
        title: 'Only Section',
      }),
    ]);
  });

  it('substitutes all legal tokens', () => {
    const help = parseHelpMarkdown(
      `# {{brandName}}

{{brandUrl}} {{legalEntityName}} {{contactEmail}} {{contactPhone}} {{mailingAddress}}

## Section

Done.
`,
      legal
    );
    expect(help.subtitle).toContain('https://beakerstack.com');
    expect(help.subtitle).toContain('contact@artificerinnovations.com');
  });

  it('preserves hyphens in searchText for compound terms', () => {
    const help = parseHelpMarkdown(
      `## Security

OAuth-secured MCP-compatible row-level access.
`,
      legal
    );

    expect(help.sections[0]?.searchText).toContain('OAuth-secured');
    expect(help.sections[0]?.searchText).toContain('MCP-compatible');
    expect(help.sections[0]?.searchText).toContain('row-level');
  });

  it('strips list bullets without removing inline hyphens', () => {
    expect(markdownToPlainText('- OAuth-secured\n- row-level')).toBe(
      'OAuth-secured row-level'
    );
  });

  it('lineAt returns empty string for out-of-range indexes', () => {
    expect(lineAt(['a'], 3)).toBe('');
  });

  it('strips unsafe html from generated sections', () => {
    const help = parseHelpMarkdown(
      '## Test\n\n<script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">Click</a>\n\nSafe text.',
      legal
    );

    expect(help.sections[0]?.html).not.toContain('<script');
    expect(help.sections[0]?.html).not.toContain('javascript:');
    expect(help.sections[0]?.html).not.toContain('onclick=');
    expect(help.sections[0]?.html).toContain('Safe text');
  });
});

describe('buildHelpContent', () => {
  it('writes generated help.ts from markdown input', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'beakerstack-help-build-'));
    const contentFile = join(dir, 'help.md');
    const outputFile = join(dir, 'generated', 'help.ts');
    writeFileSync(
      contentFile,
      '# Help\n\nSubtitle.\n\n## Topic\n\nBody.\n',
      'utf-8'
    );

    await buildHelpContent(legal, contentFile, outputFile);

    const generated = readFileSync(outputFile, 'utf-8');
    expect(generated).toContain('export const HELP');
    expect(generated).toContain("title: 'Help'");
    expect(generated).toContain("title: 'Topic'");
  });

  it('loads legal from adopter config when omitted', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'beakerstack-help-build-legal-'));
    const contentFile = join(dir, 'help.md');
    const outputFile = join(dir, 'generated', 'help.ts');
    writeFileSync(
      contentFile,
      '# Help\n\nSubtitle.\n\n## Topic\n\nBody.\n',
      'utf-8'
    );

    await buildHelpContent(undefined, contentFile, outputFile);

    expect(readFileSync(outputFile, 'utf-8')).toContain("title: 'Help'");
  });
});

describe('shouldRunMain', () => {
  const originalArgv = process.argv[1];

  afterEach(() => {
    process.argv[1] = originalArgv;
  });

  it('returns false when argv[1] is missing', () => {
    process.argv[1] = undefined as unknown as string;
    expect(shouldRunMain()).toBe(false);
  });

  it('returns false when invoked from a test module', () => {
    expect(shouldRunMain()).toBe(false);
  });

  it('returns true when argv[1] matches the build script path', () => {
    const moduleUrl = 'file:///tmp/packages/help/scripts/build-help.ts';
    expect(
      shouldRunMain('/tmp/packages/help/scripts/build-help.ts', moduleUrl)
    ).toBe(true);
  });

  it('returns false when argv[1] does not match the module url', () => {
    expect(shouldRunMain('/tmp/other-script.ts', import.meta.url)).toBe(false);
  });
});

describe('main', () => {
  it('builds help content from provided paths', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'skein-help-main-'));
    const contentFile = join(dir, 'help.md');
    const outputFile = join(dir, 'generated', 'help.ts');
    writeFileSync(
      contentFile,
      '# Help\n\nSubtitle.\n\n## Topic\n\nBody.\n',
      'utf-8'
    );

    const { main } = await import('./build-help.ts');
    await expect(main(contentFile, outputFile)).resolves.toBeUndefined();
    expect(readFileSync(outputFile, 'utf-8')).toContain("title: 'Topic'");
  });
});

describe('runCli', () => {
  it('runs main by default', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'skein-help-runcli-'));
    const contentFile = join(dir, 'help.md');
    const outputFile = join(dir, 'generated', 'help.ts');
    writeFileSync(
      contentFile,
      '# Help\n\nSubtitle.\n\n## Topic\n\nBody.\n',
      'utf-8'
    );

    const { runCli, main } = await import('./build-help.ts');
    await expect(
      runCli(() => main(contentFile, outputFile))
    ).resolves.toBeUndefined();
  });

  it('logs and exits when main fails', async () => {
    const { runCli } = await import('./build-help.ts');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as typeof process.exit);

    await runCli(() => Promise.reject(new Error('boom')));

    expect(errorSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

describe('runIfMainModule', () => {
  it('invokes runCli when shouldRunMain returns true', () => {
    const cli = vi.fn().mockResolvedValue(undefined);
    runIfMainModule(() => true, cli);
    expect(cli).toHaveBeenCalled();
  });

  it('skips runCli when shouldRunMain returns false', () => {
    const cli = vi.fn().mockResolvedValue(undefined);
    runIfMainModule(() => false, cli);
    expect(cli).not.toHaveBeenCalled();
  });
});
