import type { Config } from 'tailwindcss'

/**
 * Every value here resolves to a custom property declared in src/styles/tokens.css.
 * The scales are *replaced*, not extended, so an off-scale utility (p-6, rounded-md,
 * text-lg, z-50) simply does not compile. That is the enforcement mechanism for
 * CLAUDE.md's "never write a raw hex, raw px, or raw duration in a component file".
 */

const rgb = (token: string) => `rgb(var(${token}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },

    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',

      canvas: {
        DEFAULT: rgb('--color-canvas'),
        sunken: rgb('--color-canvas-sunken'),
      },
      background: rgb('--color-background'),

      surface: {
        DEFAULT: rgb('--color-surface'),
        raised: rgb('--color-surface-raised'),
        sunken: rgb('--color-surface-sunken'),
        inset: rgb('--color-surface-inset'),
        hover: rgb('--color-surface-hover'),
        pressed: rgb('--color-surface-pressed'),
        selected: rgb('--color-surface-selected'),
        overlay: rgb('--color-surface-overlay'),
      },

      fg: {
        DEFAULT: rgb('--color-foreground'),
        secondary: rgb('--color-foreground-secondary'),
        muted: rgb('--color-foreground-muted'),
        subtle: rgb('--color-foreground-subtle'),
        inverted: rgb('--color-foreground-inverted'),
        'on-accent': rgb('--color-foreground-on-accent'),
      },

      primary: {
        DEFAULT: rgb('--color-primary'),
        hover: rgb('--color-primary-hover'),
        pressed: rgb('--color-primary-pressed'),
        subtle: rgb('--color-primary-subtle'),
        'subtle-hover': rgb('--color-primary-subtle-hover'),
        border: rgb('--color-primary-border'),
        fg: rgb('--color-primary-foreground'),
      },

      secondary: {
        DEFAULT: rgb('--color-secondary'),
        hover: rgb('--color-secondary-hover'),
        pressed: rgb('--color-secondary-pressed'),
        border: rgb('--color-secondary-border'),
        fg: rgb('--color-secondary-foreground'),
      },

      accent: {
        DEFAULT: rgb('--color-accent'),
        hover: rgb('--color-accent-hover'),
        pressed: rgb('--color-accent-pressed'),
        subtle: rgb('--color-accent-subtle'),
        border: rgb('--color-accent-border'),
        fg: rgb('--color-accent-foreground'),
        wash: rgb('--accent-ai-wash'),
        'wash-border': rgb('--accent-ai-wash-border'),
      },

      emb: {
        leaf: rgb('--color-emb-leaf'),
      },

      neutral: {
        DEFAULT: rgb('--color-neutral'),
        subtle: rgb('--color-neutral-subtle'),
        border: rgb('--color-neutral-border'),
        fg: rgb('--color-neutral-foreground'),
      },

      success: {
        DEFAULT: rgb('--color-success'),
        subtle: rgb('--color-success-subtle'),
        border: rgb('--color-success-border'),
        fg: rgb('--color-success-foreground'),
      },
      warning: {
        DEFAULT: rgb('--color-warning'),
        subtle: rgb('--color-warning-subtle'),
        border: rgb('--color-warning-border'),
        fg: rgb('--color-warning-foreground'),
      },
      destructive: {
        DEFAULT: rgb('--color-destructive'),
        hover: rgb('--color-destructive-hover'),
        pressed: rgb('--color-destructive-pressed'),
        subtle: rgb('--color-destructive-subtle'),
        border: rgb('--color-destructive-border'),
        fg: rgb('--color-destructive-foreground'),
      },
      info: {
        DEFAULT: rgb('--color-info'),
        subtle: rgb('--color-info-subtle'),
        border: rgb('--color-info-border'),
        fg: rgb('--color-info-foreground'),
      },

      urgency: {
        critical: rgb('--color-urgency-critical'),
        'critical-subtle': rgb('--color-urgency-critical-subtle'),
        'critical-border': rgb('--color-urgency-critical-border'),
        warning: rgb('--color-urgency-warning'),
        'warning-subtle': rgb('--color-urgency-warning-subtle'),
        'warning-border': rgb('--color-urgency-warning-border'),
        normal: rgb('--color-urgency-normal'),
        'normal-subtle': rgb('--color-urgency-normal-subtle'),
        'normal-border': rgb('--color-urgency-normal-border'),
      },

      border: {
        DEFAULT: rgb('--color-border'),
        strong: rgb('--color-border-strong'),
        subtle: rgb('--color-border-subtle'),
      },
      divider: rgb('--color-divider'),
      overlay: rgb('--color-overlay'),
      focus: rgb('--color-focus'),
      selection: rgb('--color-selection'),
      disabled: {
        DEFAULT: rgb('--color-disabled'),
        border: rgb('--color-disabled-border'),
        fg: rgb('--color-disabled-foreground'),
      },

      chart: {
        1: rgb('--color-chart-1'),
        2: rgb('--color-chart-2'),
        3: rgb('--color-chart-3'),
        4: rgb('--color-chart-4'),
        5: rgb('--color-chart-5'),
        6: rgb('--color-chart-6'),
        7: rgb('--color-chart-7'),
        8: rgb('--color-chart-8'),
      },
    },

    spacing: {
      0: '0px',
      hair: 'var(--space-hair)',
      2: 'var(--space-2)',
      4: 'var(--space-4)',
      8: 'var(--space-8)',
      12: 'var(--space-12)',
      16: 'var(--space-16)',
      20: 'var(--space-20)',
      24: 'var(--space-24)',
      32: 'var(--space-32)',
      40: 'var(--space-40)',
      48: 'var(--space-48)',
      64: 'var(--space-64)',
      80: 'var(--space-80)',
      96: 'var(--space-96)',
    },

    borderRadius: {
      none: '0px',
      field: 'var(--radius-field)',
      control: 'var(--radius-control)',
      card: 'var(--radius-card)',
      overlay: 'var(--radius-overlay)',
      full: 'var(--radius-full)',
    },

    borderWidth: {
      0: '0px',
      DEFAULT: 'var(--border-width)',
      2: 'var(--border-width-strong)',
      accent: 'var(--border-width-accent)',
    },

    fontFamily: {
      sans: 'var(--font-sans)',
      mono: 'var(--font-mono)',
    },

    // Each entry is one of CLAUDE.md's NAMED styles: size, line-height,
    // letter-spacing and weight travel together and cannot be split. The range
    // spans 11px metadata to 72px display on purpose.
    fontSize: {
      'display-xl': ['var(--type-display-xl)', { lineHeight: '0.96', letterSpacing: '-0.034em', fontWeight: '700' }],
      display: ['var(--type-display)', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '500' }],
      'display-l': ['var(--type-display-l)', { lineHeight: '1.02', letterSpacing: '-0.028em', fontWeight: '700' }],
      'display-m': ['var(--type-display-m)', { lineHeight: '1.08', letterSpacing: '-0.024em', fontWeight: '700' }],
      'display-s': ['var(--type-display-s)', { lineHeight: '1.15', letterSpacing: '-0.018em', fontWeight: '600' }],
      'page-title': ['var(--type-page-title)', { lineHeight: '1.25', letterSpacing: '-0.016em', fontWeight: '600' }],
      'section-title': ['var(--type-section-title)', { lineHeight: '1.3', letterSpacing: '-0.013em', fontWeight: '650' }],
      'panel-title': ['var(--type-panel-title)', { lineHeight: '1.4', letterSpacing: '-0.006em', fontWeight: '600' }],
      'body-l': ['var(--type-body-l)', { lineHeight: '1.6', letterSpacing: '-0.004em', fontWeight: '400' }],
      body: ['var(--type-body)', { lineHeight: '1.55', letterSpacing: '0em', fontWeight: '400' }],
      'body-strong': ['var(--type-body)', { lineHeight: '1.55', letterSpacing: '-0.002em', fontWeight: '600' }],
      'secondary-body': ['var(--type-secondary-body)', { lineHeight: '1.62', letterSpacing: '-0.003em', fontWeight: '400' }],
      'secondary-body-strong': ['var(--type-secondary-body)', { lineHeight: '1.62', letterSpacing: '-0.005em', fontWeight: '600' }],
      'micro-label': ['var(--type-micro-label)', { lineHeight: '1.3', letterSpacing: '0.11em', fontWeight: '600' }],
      label: ['var(--type-label)', { lineHeight: '1.4', letterSpacing: '0.005em', fontWeight: '600' }],
      caption: ['var(--type-caption)', { lineHeight: '1.45', letterSpacing: '0.003em', fontWeight: '400' }],
      'caption-strong': ['var(--type-caption)', { lineHeight: '1.45', letterSpacing: '0.003em', fontWeight: '600' }],
      metadata: ['var(--type-metadata)', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '450' }],
      'metadata-strong': ['var(--type-metadata)', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '600' }],
      button: ['var(--type-button)', { lineHeight: '1.2', letterSpacing: '-0.002em', fontWeight: '600' }],
      'button-sm': ['var(--type-button-sm)', { lineHeight: '1.2', letterSpacing: '0.002em', fontWeight: '600' }],
      'card-description': ['var(--type-body)', { lineHeight: 'var(--type-description-leading)', letterSpacing: '0em', fontWeight: '400' }],
      'table-cell': ['var(--type-table-cell)', { lineHeight: '1.4', letterSpacing: '0em', fontWeight: '400' }],
      'kpi-value': ['var(--type-kpi-value)', { lineHeight: '1.1', letterSpacing: '-0.022em', fontWeight: '600' }],
      'kpi-label': ['var(--type-kpi-label)', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '600' }],
      code: ['var(--type-code)', { lineHeight: '1.5', letterSpacing: '-0.005em', fontWeight: '500' }],
      helper: ['var(--type-helper)', { lineHeight: '1.45', letterSpacing: '0.002em', fontWeight: '400' }],
    },

    boxShadow: {
      none: 'none',
      workspace: 'var(--elevation-workspace)',
      card: 'var(--elevation-card)',
      'card-interactive': 'var(--elevation-card-interactive)',
      button: 'var(--elevation-button)',
      dropdown: 'var(--elevation-dropdown)',
      drawer: 'var(--elevation-drawer)',
      dialog: 'var(--elevation-dialog)',
      palette: 'var(--elevation-palette)',
      tooltip: 'var(--elevation-tooltip)',
      'inset-line': 'var(--elevation-inset-line)',
    },

    zIndex: {
      base: 'var(--z-base)',
      sticky: 'var(--z-sticky)',
      nav: 'var(--z-nav)',
      dropdown: 'var(--z-dropdown)',
      popover: 'var(--z-popover)',
      drawer: 'var(--z-drawer)',
      dialog: 'var(--z-dialog)',
      toast: 'var(--z-toast)',
      tooltip: 'var(--z-tooltip)',
    },

    transitionDuration: {
      0: '0ms',
      micro: 'var(--duration-micro)',
      fast: 'var(--duration-fast)',
      standard: 'var(--duration-standard)',
      emphasis: 'var(--duration-emphasis)',
      surface: 'var(--duration-surface)',
      slow: 'var(--duration-slow)',
    },

    transitionTimingFunction: {
      out: 'var(--ease-out)',
      in: 'var(--ease-in)',
      'in-out': 'var(--ease-in-out)',
      linear: 'linear',
    },

    opacity: {
      0: '0',
      tint: 'var(--opacity-tint)',
      disabled: 'var(--opacity-disabled)',
      muted: 'var(--opacity-muted)',
      recessed: 'var(--opacity-recessed)',
      scrim: 'var(--opacity-scrim)',
      100: '1',
    },

    extend: {
      maxWidth: {
        lede: 'var(--measure-lede)',
        prose: 'var(--measure-prose)',
        form: 'var(--measure-form)',
        panel: 'var(--measure-panel)',
        workspace: 'var(--measure-workspace)',
        editorial: 'var(--measure-editorial)',
        cards: 'var(--measure-cards)',
        module: 'var(--measure-module)',
        content: 'var(--measure-cards)',
        landing: 'var(--measure-landing)',
        step: 'var(--measure-step)',
        'col-title': 'var(--size-col-title)',
        'col-tender': 'var(--size-col-tender)',
        'col-assignee': 'var(--size-col-assignee)',
        'col-reason': 'var(--size-col-reason)',
      },
      minWidth: {
        panel: 'var(--measure-panel)',
        bar: 'var(--size-bar-min)',
        'col-numeric': 'var(--size-col-numeric)',
        'col-deadline': 'var(--size-col-deadline)',
        'col-source': 'var(--size-col-source)',
        'col-credential': 'var(--size-col-credential)',
        'col-partner': 'var(--size-col-partner)',
      },
      height: {
        'control-sm': 'var(--size-control-sm)',
        'control-md': 'var(--size-control-md)',
        'control-lg': 'var(--size-control-lg)',
        'control-action': 'var(--size-control-action)',
        mark: 'var(--size-mark)',
        wordmark: 'var(--size-wordmark)',
        logo: 'var(--size-logo)',
        'panel-title': 'var(--type-panel-title)',
        'row-comfortable': 'var(--size-row-comfortable)',
        'row-compact': 'var(--size-row-compact)',
        'step-row': 'var(--size-step-row)',
        'canvas-fit': 'var(--size-canvas-fit)',
      },
      minHeight: {
        'step-row': 'var(--size-step-row)',
        workspace: 'var(--size-workspace-min)',
        description: 'var(--size-description-block)',
      },
      maxHeight: {
        preview: 'var(--size-preview)',
      },
      width: {
        mark: 'var(--size-mark)',
        rail: 'var(--size-rail)',
        drawer: 'var(--size-drawer)',
        palette: 'var(--size-palette)',
        import: 'var(--size-import)',
        'control-sm': 'var(--size-control-sm)',
        'control-md': 'var(--size-control-md)',
        'control-lg': 'var(--size-control-lg)',
        'rule-short': 'var(--size-rule-short)',
        'col-severity': 'var(--size-col-severity)',
        'icon-sm': 'var(--size-icon-sm)',
        filter: 'var(--size-filter)',
        ordinal: 'var(--size-ordinal)',
      },
      gridTemplateColumns: {
        // Editorial split: content holds the left two thirds, the right third
        // stays open. Never an even multi-column grid.
        editorial: 'minmax(0, 2fr) minmax(0, 1fr)',
        // The RFP summary: a fixed snapshot rail beside the analysis that matters.
        summary: 'minmax(0, 35fr) minmax(0, 65fr)',
      },
      keyframes: {
        'spin-token': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        // The only looping animation in the system. It reports that an async
        // action is still pending; nothing here loops for decoration.
        spinner: 'spin-token var(--duration-spinner) linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
