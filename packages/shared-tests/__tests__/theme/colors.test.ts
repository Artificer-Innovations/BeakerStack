import { colors } from '@beakerstack/shared/theme/colors';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const GRAY_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

describe('colors', () => {
  describe('palette scales', () => {
    it.each(GRAY_STEPS)('gray.%i is a hex color', step => {
      expect(colors.gray[step]).toMatch(HEX_COLOR);
    });

    it.each(GRAY_STEPS)('indigo.%i is a hex color', step => {
      expect(colors.indigo[step]).toMatch(HEX_COLOR);
    });

    it('exports white as a hex color', () => {
      expect(colors.white).toMatch(HEX_COLOR);
    });
  });

  describe('web + mobile brand alignment', () => {
    it('maps brand to indigo-600 for Tailwind primary parity', () => {
      expect(colors.brand).toBe(colors.indigo[600]);
      expect(colors.brandDark).toBe(colors.indigo[700]);
      expect(colors.brandLight).toBe(colors.indigo[100]);
    });
  });

  describe('semantic surface + text tokens', () => {
    it('derives page and card backgrounds from gray/white', () => {
      expect(colors.pageBg).toBe(colors.gray[50]);
      expect(colors.cardBg).toBe(colors.white);
      expect(colors.border).toBe(colors.gray[200]);
      expect(colors.rowDivider).toBe(colors.gray[100]);
    });

    it('derives text tokens from the gray scale', () => {
      expect(colors.textPrimary).toBe(colors.gray[900]);
      expect(colors.textSecondary).toBe(colors.gray[800]);
      expect(colors.textBody).toBe(colors.gray[700]);
      expect(colors.textSubtle).toBe(colors.gray[600]);
      expect(colors.textMuted).toBe(colors.gray[500]);
      expect(colors.textFaint).toBe(colors.gray[400]);
    });
  });

  describe('status + feature tokens', () => {
    it('keeps success and feature-on backgrounds on the same green-50 shade', () => {
      expect(colors.successBg).toBe(colors.featureOnBg);
      expect(colors.successBg).toBe('#f0fdf4');
    });

    it('exports hex colors for status groups', () => {
      for (const key of [
        'errorBg',
        'errorBadgeBg',
        'errorBorder',
        'errorText',
        'errorTextAlt',
        'errorIcon',
        'successBorder',
        'successText',
        'successTextAlt',
        'warnBg',
        'warnBorder',
        'warnText',
        'infoBg',
        'infoBorder',
        'infoText',
      ] as const) {
        expect(colors[key]).toMatch(HEX_COLOR);
      }
    });

    it('exports hex colors for feature gate UI', () => {
      for (const key of [
        'featureOnBorder',
        'featureOnIconBg',
        'featureOnIcon',
        'featureBOnBg',
        'featureOffBg',
        'iconOffBg',
      ] as const) {
        expect(colors[key]).toMatch(HEX_COLOR);
      }
    });
  });

  describe('code + illustration tokens', () => {
    it('exports dark code block colors', () => {
      expect(colors.codeBg).toMatch(HEX_COLOR);
      expect(colors.codeText).toMatch(HEX_COLOR);
      expect(colors.codeValTrue).toMatch(HEX_COLOR);
      expect(colors.codeValFalse).toMatch(HEX_COLOR);
    });

    it('derives flask illustration tokens from indigo', () => {
      expect(colors.iconBg).toBe(colors.indigo[600]);
      expect(colors.iconFill).toBe(colors.indigo[100]);
      expect(colors.iconNeck).toBe(colors.indigo[200]);
      expect(colors.iconLiquid).toBe(colors.indigo[400]);
      expect(colors.iconStroke).toMatch(HEX_COLOR);
    });
  });

  describe('type safety', () => {
    it('exports a readonly colors object', () => {
      const palette: typeof colors = colors;
      expect(palette.brand).toBe('#4f46e5');
    });
  });
});
