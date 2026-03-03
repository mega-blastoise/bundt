export const description = `Bundle client side javascript into production assets.`;

export const command = "bundle";

export const options = [
  {
    flags: "-d, --dir <input-directory>",
    description: "The input directory to bundle",
    default: undefined,
  },
  {
    flags: "-o, --out <output-directory>",
    description: 'Where to put the built output files. Default: "waavy-out"',
    default: undefined,
  },
  {
    flags: "--clean",
    description: "Clean the output directory before building.",
    default: false,
  },
  {
    flags: "--verbose",
    description: "Verbose output.",
    default: false,
  },
  {
    flags: "--dry-run",
    description: "Only show what would be built, don't actually build anything.",
    default: false,
  },
] as const;
