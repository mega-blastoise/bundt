import cac from 'cac';
import { DEFAULT_MODEL } from './constants';
import { launchClaude, selectModelInteractively } from './utils';
import {
  init,
  doctor,
  configShow,
  configPaths,
  dockerUp,
  dockerDown,
  dockerStatus,
  dockerLogs,
  dockerRestart,
  modelsList,
  modelsPull,
  modelsRm,
  modelsShow,
  modelsRun
} from './commands';

// CLI setup
const cli = cac('loclaude');

// =============================================================================
// run command: Run Claude with Ollama (default when no command specified)
// =============================================================================

cli
  .command('run [...args]', 'Run Claude Code with local Ollama', {
    allowUnknownOptions: true
  })
  .alias('x')
  .option('-m, --model <name>', 'Specify model to use')
  .action(async (args: string[], options: { model?: string }) => {
    let model: string;

    if (options.model) {
      model = options.model;
    } else if (args.includes('--help') || args.includes('-h')) {
      // Pass through help without prompting
      model = DEFAULT_MODEL;
    } else {
      model = await selectModelInteractively();
    }

    await launchClaude(model, args);
  });

// =============================================================================
// init command
// =============================================================================

cli
  .command('init', 'Initialize a new loclaude project')
  .option('--force', 'Overwrite existing files')
  .option('--no-webui', 'Skip Open WebUI in docker-compose')
  .option('--gpu', 'Force GPU mode (NVIDIA)')
  .option('--no-gpu', 'Force CPU-only mode')
  .option('--local-models', 'Use per-project models directory instead of shared global')
  .action(async (options: { force?: boolean; noWebui?: boolean; gpu?: boolean; noGpu?: boolean; localModels?: boolean }) => {
    await init(options);
  });

// =============================================================================
// doctor command
// =============================================================================

cli.command('doctor', 'Check system requirements and health').action(async () => {
  await doctor();
});

// =============================================================================
// config commands
// =============================================================================

cli.command('config', 'Show current configuration').action(async () => {
  await configShow();
});

cli.command('config-paths', 'Show config file search paths').action(async () => {
  await configPaths();
});

// =============================================================================
// docker commands
// =============================================================================

cli
  .command('docker-up', 'Start Ollama and Open WebUI containers')
  .option('-f, --file <path>', 'Path to docker-compose.yml')
  .option('--no-detach', "Run in foreground (don't detach)")
  .action(async (options: { file?: string; detach?: boolean }) => {
    await dockerUp(options);
  });

cli
  .command('docker-down', 'Stop containers')
  .option('-f, --file <path>', 'Path to docker-compose.yml')
  .action(async (options: { file?: string }) => {
    await dockerDown(options);
  });

cli
  .command('docker-status', 'Show container status')
  .option('-f, --file <path>', 'Path to docker-compose.yml')
  .action(async (options: { file?: string }) => {
    await dockerStatus(options);
  });

cli
  .command('docker-logs', 'Show container logs')
  .option('-f, --file <path>', 'Path to docker-compose.yml')
  .option('--follow', 'Follow log output')
  .option('-s, --service <name>', 'Show logs for specific service')
  .action(async (options: { file?: string; follow?: boolean; service?: string }) => {
    await dockerLogs(options);
  });

cli
  .command('docker-restart', 'Restart containers')
  .option('-f, --file <path>', 'Path to docker-compose.yml')
  .action(async (options: { file?: string }) => {
    await dockerRestart(options);
  });

// =============================================================================
// models commands
// =============================================================================

cli.command('models', 'List installed Ollama models').action(async () => {
  await modelsList();
});

cli.command('models-pull <name>', 'Pull a model from Ollama registry').action(async (name: string) => {
  await modelsPull(name);
});

cli.command('models-rm <name>', 'Remove an installed model').action(async (name: string) => {
  await modelsRm(name);
});

cli.command('models-show <name>', 'Show model information').action(async (name: string) => {
  await modelsShow(name);
});

cli.command('models-run <name>', 'Run a model interactively').action(async (name: string) => {
  await modelsRun(name);
});

// =============================================================================
// CLI configuration
// =============================================================================

cli.help();
cli.version('0.0.5');

export const help = () => cli.outputHelp();
export const version = () => cli.outputVersion();

export const run_cli = (): void => {
      // Show help if no command provided (just "loclaude" with no args)
    const args = process.argv.slice(2);
    if (args.length === 0) {
      help();
      return;
    }
    cli.parse();
  
};

export { cli };
