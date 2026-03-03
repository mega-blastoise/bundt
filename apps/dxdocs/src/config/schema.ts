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

export const voidConfigSchema = z.object({
  title: z.string().default('DXDocs'),
  description: z.string().default(''),
  base: z.string().default('/'),
  logo: z.string().optional(),
  favicon: z.string().optional(),

  navigation: z.array(navigationItemSchema).default([]),
  headerLinks: z.array(headerLinkSchema).default([]),

  theme: z
    .object({
      accentColor: z.string().optional(),
      darkMode: z
        .union([z.literal('media'), z.literal('light'), z.literal('dark')])
        .default('media')
    })
    .default({ darkMode: 'media' }),

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
