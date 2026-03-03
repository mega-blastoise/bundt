/**
 * doctor command - Check prerequisites and system health
 */

import { getOllamaUrl } from '../config';
import { statusLine, header, success, warn, error, hint, green, yellow, red, dim } from '../output';
import { commandExists, getCommandVersion, spawnCapture } from '../spawn';

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  version?: string;
  hint?: string;
}

async function checkDocker(): Promise<CheckResult> {
  const exists = await commandExists('docker');
  if (!exists) {
    return {
      name: 'Docker',
      status: 'error',
      message: 'Not installed',
      hint: 'Install Docker: https://docs.docker.com/get-docker/'
    };
  }

  const version = await getCommandVersion('docker');
  return {
    name: 'Docker',
    status: 'ok',
    message: 'Installed',
    version: version ?? undefined
  };
}

async function checkDockerCompose(): Promise<CheckResult> {
  // Try docker compose (v2) first
  const result = await spawnCapture(['docker', 'compose', 'version']);
  if (result.exitCode === 0) {
    const version = result.stdout?.trim().split('\n')[0];
    return {
      name: 'Docker Compose',
      status: 'ok',
      message: 'Installed (v2)',
      version: version ?? undefined
    };
  }

  // Fall back to docker-compose (v1)
  const v1Exists = await commandExists('docker-compose');
  if (v1Exists) {
    const version = await getCommandVersion('docker-compose');
    return {
      name: 'Docker Compose',
      status: 'warning',
      message: 'Using legacy v1',
      version: version ?? undefined,
      hint: 'Consider upgrading to Docker Compose v2'
    };
  }

  return {
    name: 'Docker Compose',
    status: 'error',
    message: 'Not installed',
    hint: 'Docker Compose is included with Docker Desktop, or install separately'
  };
}

async function checkNvidiaSmi(): Promise<CheckResult> {
  const exists = await commandExists('nvidia-smi');
  if (!exists) {
    return {
      name: 'NVIDIA GPU',
      status: 'warning',
      message: 'nvidia-smi not found',
      hint: 'GPU support requires NVIDIA drivers. CPU-only mode will be used.'
    };
  }

  const result = await spawnCapture(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader']);
  if (result.exitCode === 0 && result.stdout) {
    const gpus = result.stdout.trim().split('\n').filter(Boolean);
    return {
      name: 'NVIDIA GPU',
      status: 'ok',
      message: `${gpus.length} GPU(s) detected`,
      version: gpus[0]
    };
  }

  return {
    name: 'NVIDIA GPU',
    status: 'warning',
    message: 'nvidia-smi failed',
    hint: 'GPU may not be available. Check NVIDIA drivers.'
  };
}

async function checkNvidiaContainerToolkit(): Promise<CheckResult> {
  // Check if nvidia container runtime is available
  const result = await spawnCapture(['docker', 'info', '--format', '{{.Runtimes}}']);
  if (result.exitCode === 0 && result.stdout?.includes('nvidia')) {
    return {
      name: 'NVIDIA Container Toolkit',
      status: 'ok',
      message: 'nvidia runtime available'
    };
  }

  return {
    name: 'NVIDIA Container Toolkit',
    status: 'warning',
    message: 'nvidia runtime not found',
    hint: 'Install: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html'
  };
}

async function checkClaude(): Promise<CheckResult> {
  const exists = await commandExists('claude');
  if (!exists) {
    return {
      name: 'Claude Code',
      status: 'error',
      message: 'Not installed',
      hint: 'Install: npm install -g @anthropic-ai/claude-code'
    };
  }

  const version = await getCommandVersion('claude');
  return {
    name: 'Claude Code',
    status: 'ok',
    message: 'Installed',
    version: version ?? undefined
  };
}

async function checkOllamaConnection(): Promise<CheckResult> {
  const ollamaUrl = getOllamaUrl();
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = (await response.json()) as { models?: unknown[] };
      const modelCount = data.models?.length ?? 0;
      return {
        name: 'Ollama API',
        status: 'ok',
        message: `Connected (${modelCount} model${modelCount === 1 ? '' : 's'})`,
        version: ollamaUrl
      };
    }

    return {
      name: 'Ollama API',
      status: 'warning',
      message: `HTTP ${response.status}`,
      hint: 'Ollama may not be running. Try: loclaude docker-up'
    };
  } catch (error) {
    return {
      name: 'Ollama API',
      status: 'warning',
      message: 'Not reachable',
      hint: `Cannot connect to ${ollamaUrl}. Start Ollama: loclaude docker-up`
    };
  }
}

const MIN_OLLAMA_VERSION = '0.14.2';

/**
 * Parse a semver string into comparable parts
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

/**
 * Compare two semver versions
 * Returns: positive if a > b, negative if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  if (!parsedA || !parsedB) return 0;

  if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major;
  if (parsedA.minor !== parsedB.minor) return parsedA.minor - parsedB.minor;
  return parsedA.patch - parsedB.patch;
}

async function checkOllamaVersion(): Promise<CheckResult> {
  const ollamaUrl = getOllamaUrl();
  try {
    const response = await fetch(`${ollamaUrl}/api/version`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return {
        name: 'Ollama Version',
        status: 'warning',
        message: 'Could not determine version',
        hint: 'Ollama may not be running. Try: loclaude docker-up'
      };
    }

    const data = (await response.json()) as { version?: string };
    const version = data.version;

    if (!version) {
      return {
        name: 'Ollama Version',
        status: 'warning',
        message: 'Unknown version',
        hint: 'Could not parse version from Ollama API'
      };
    }

    const comparison = compareVersions(version, MIN_OLLAMA_VERSION);

    if (comparison > 0) {
      return {
        name: 'Ollama Version',
        status: 'ok',
        message: 'Compatible',
        version
      };
    } else if (comparison === 0) {
      return {
        name: 'Ollama Version',
        status: 'ok',
        message: 'Compatible',
        version,
        hint: `Version ${version} is the minimum. Consider upgrading for best compatibility.`
      };
    } else {
      return {
        name: 'Ollama Version',
        status: 'error',
        message: `Version too old (requires > ${MIN_OLLAMA_VERSION})`,
        version,
        hint: `Upgrade Ollama to a version greater than ${MIN_OLLAMA_VERSION}`
      };
    }
  } catch (error) {
    return {
      name: 'Ollama Version',
      status: 'warning',
      message: 'Could not check version',
      hint: `Cannot connect to ${ollamaUrl}. Start Ollama: loclaude docker-up`
    };
  }
}

function formatCheck(check: CheckResult): string {
  let line = statusLine(check.status, check.name, check.message, check.version);

  if (check.hint) {
    line += `\n    ${dim('→')} ${dim(check.hint)}`;
  }

  return line;
}

export async function doctor(): Promise<void> {
  header('System Health Check');
  console.log('');

  const checks: CheckResult[] = await Promise.all([
    checkDocker(),
    checkDockerCompose(),
    checkNvidiaSmi(),
    checkNvidiaContainerToolkit(),
    checkClaude(),
    checkOllamaConnection(),
    checkOllamaVersion()
  ]);

  for (const check of checks) {
    console.log(formatCheck(check));
  }

  const errors = checks.filter((c) => c.status === 'error');
  const warnings = checks.filter((c) => c.status === 'warning');

  console.log('');

  if (errors.length > 0) {
    console.log(red(`${errors.length} error(s) found.`) + ' Fix these before proceeding.');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(yellow(`${warnings.length} warning(s).`) + ' loclaude may work with limited functionality.');
  } else {
    console.log(green('All checks passed!') + ' Ready to use loclaude.');
  }
}

/**
 * Check if NVIDIA GPU is available (exported for use by init command)
 */
export async function hasNvidiaGpu(): Promise<boolean> {
  const exists = await commandExists('nvidia-smi');
  if (!exists) return false;

  const result = await spawnCapture(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader']);
  return result.exitCode === 0 && Boolean(result.stdout?.trim());
}
