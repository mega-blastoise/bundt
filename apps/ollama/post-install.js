#!/usr/bin/env node

if (process.env.OLLAMA_BUNDT_SKIP_POSTINSTALL === 'true') {
  process.exit(0);
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const c = colors;

// ASCII Art Logo
const logo = `
${c.brightCyan}    ╔═╗╦  ╦  ╔═╗╔╦╗╔═╗${c.reset}
${c.cyan}    ║ ║║  ║  ╠═╣║║║╠═╣${c.reset}
${c.brightBlue}    ╚═╝╩═╝╩═╝╩ ╩╩ ╩╩ ╩${c.reset}
${c.dim}         @bundt/ollama${c.reset}
`;

const box = (content, title = '') => {
  const lines = content.split('\n').filter(l => l);
  const width = Math.max(...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length), title.length + 4);

  const top = `${c.dim}╭${'─'.repeat(width + 2)}╮${c.reset}`;
  const bottom = `${c.dim}╰${'─'.repeat(width + 2)}╯${c.reset}`;
  const titleLine = title ? `${c.dim}│${c.reset} ${c.bold}${c.brightCyan}${title}${c.reset}${' '.repeat(width - title.length)} ${c.dim}│${c.reset}` : '';
  const separator = title ? `${c.dim}├${'─'.repeat(width + 2)}┤${c.reset}` : '';

  const body = lines.map(line => {
    const plainLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const padding = ' '.repeat(Math.max(0, width - plainLength));
    return `${c.dim}│${c.reset} ${line}${padding} ${c.dim}│${c.reset}`;
  }).join('\n');

  return [top, titleLine, separator, body, bottom].filter(Boolean).join('\n');
};

const sparkles = `${c.brightYellow}✨${c.reset}`;
const rocket = `${c.brightCyan}🚀${c.reset}`;
const check = `${c.brightGreen}✓${c.reset}`;
const llama_emoji = `${c.yellow}🦙${c.reset}`;

console.log();
console.log(logo);
console.log();

const installMessage = box([
  `${check} ${c.brightGreen}Successfully installed!${c.reset}`,
  '',
  `${c.dim}Run local LLMs with Claude Code${c.reset}`,
  '',
  `${c.brightWhite}Quick Start:${c.reset}`,
  `  ${c.cyan}$${c.reset} ${c.brightWhite}ollama-bundt init${c.reset}      ${c.dim}# Set up project${c.reset}`,
  `  ${c.cyan}$${c.reset} ${c.brightWhite}ollama-bundt docker-up${c.reset} ${c.dim}# Start Ollama${c.reset}`,
  `  ${c.cyan}$${c.reset} ${c.brightWhite}ollama-bundt run${c.reset}       ${c.dim}# Launch Claude${c.reset}`,
  '',
  `${c.brightWhite}Commands:${c.reset}`,
  `  ${c.yellow}doctor${c.reset}       ${c.dim}Check system requirements${c.reset}`,
  `  ${c.yellow}models${c.reset}       ${c.dim}List available models${c.reset}`,
  `  ${c.yellow}models-pull${c.reset}  ${c.dim}Download a model${c.reset}`,
  `  ${c.yellow}config${c.reset}       ${c.dim}Show configuration${c.reset}`,
  '',
  '',
  `${c.dim}Docs: ${c.brightBlue}https://www.npmjs.com/package/@bundt/ollama${c.reset}`,
].join('\n'), `${llama_emoji} @bundt/ollama`);

console.log(installMessage);
console.log();
console.log(`  ${sparkles} ${c.brightMagenta}Happy hacking!${c.reset} ${rocket}`);
console.log();
