import { z } from 'zod';

const navigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('page'),
      path: z.string(),
      title: z.string()
    }),
    z.object({
      type: z.literal('group'),
      title: z.string(),
      items: z.array(navigationItemSchema)
    })
  ])
);

export type NavigationPage = {
  type: 'page';
  path: string;
  title: string;
};

export type NavigationGroup = {
  type: 'group';
  title: string;
  items: NavigationItem[];
};

export type NavigationItem = NavigationPage | NavigationGroup;

const headerLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  icon: z.union([z.literal('github'), z.literal('external')]).optional()
});

export type HeaderLink = z.infer<typeof headerLinkSchema>;

export type LogoConfig =
  | string
  | { light: string; dark: string; height: number };

const themePresetSchema = z.union([
  z.literal('minimal'),
  z.literal('catppuccin'),
  z.literal('ayu'),
  z.literal('nord'),
  z.literal('gruvbox')
]);

const tokenOverrideSchema = z.record(z.string(), z.string()).optional();

const coverpageSchema = z
  .object({
    title: z.string(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    actions: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
          primary: z.boolean().default(false)
        })
      )
      .default([]),
    background: z
      .union([z.literal('gradient'), z.literal('solid'), z.literal('none')])
      .default('gradient')
  })
  .optional();

export type CoverpageConfig = {
  title: string;
  tagline?: string;
  description?: string;
  actions: Array<{
    label: string;
    href: string;
    primary: boolean;
  }>;
  background: 'gradient' | 'solid' | 'none';
};

const footerLinkSchema = z.object({
  label: z.string(),
  href: z.string()
});

const footerColumnSchema = z.object({
  title: z.string(),
  links: z.array(footerLinkSchema)
});

const footerSchema = z
  .object({
    columns: z.array(footerColumnSchema).default([]),
    copyright: z.string().optional(),
    socials: z
      .array(
        z.object({
          icon: z.union([
            z.literal('github'),
            z.literal('twitter'),
            z.literal('discord'),
            z.literal('external')
          ]),
          href: z.string(),
          label: z.string().optional()
        })
      )
      .default([])
  })
  .optional();

export type FooterConfig = {
  columns: Array<{
    title: string;
    links: Array<{ label: string; href: string }>;
  }>;
  copyright?: string;
  socials: Array<{
    icon: 'github' | 'twitter' | 'discord' | 'external';
    href: string;
    label?: string;
  }>;
};

export const voidConfigSchema = z.object({
  title: z.string().default('DXDocs'),
  description: z.string().default(''),
  base: z.string().default('/'),
  logo: z
    .union([
      z.string(),
      z.object({
        light: z.string(),
        dark: z.string(),
        height: z.number().default(28)
      })
    ])
    .optional(),
  favicon: z.string().optional(),

  navigation: z.array(navigationItemSchema).default([]),
  headerLinks: z.array(headerLinkSchema).default([]),

  theme: z
    .object({
      preset: themePresetSchema.default('minimal'),
      accentColor: z.string().optional(),
      darkMode: z
        .union([z.literal('media'), z.literal('light'), z.literal('dark')])
        .default('media'),
      overrides: z
        .object({
          light: tokenOverrideSchema,
          dark: tokenOverrideSchema
        })
        .optional()
    })
    .default({ preset: 'minimal', darkMode: 'media' }),

  coverpage: coverpageSchema,
  footer: footerSchema,

  mdx: z
    .object({
      extensions: z.array(z.string()).default(['.md', '.mdx']),
      gfm: z.boolean().default(true)
    })
    .default({ extensions: ['.md', '.mdx'], gfm: true }),

  output: z
    .object({
      outDir: z.string().default('./dist')
    })
    .default({ outDir: './dist' })
});

export type VoidConfig = z.infer<typeof voidConfigSchema>;
