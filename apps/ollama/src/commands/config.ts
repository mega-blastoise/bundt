/**
 * config command - Show and manage configuration
 */

import { loadConfig, getActiveConfigPath, getConfigSearchPaths } from '../config';
import { header, info, dim, green, cyan, magenta, file, cmd, labelValue, bold } from '../output';

export async function configShow(): Promise<void> {
  const config = loadConfig();
  const activePath = getActiveConfigPath();

  header('Current Configuration');
  console.log('');

  // Ollama settings
  console.log(cyan('Ollama:'));
  labelValue('  URL', config.ollama.url);
  labelValue('  Default Model', magenta(config.ollama.defaultModel));
  console.log('');

   // Models settings
  console.log(cyan('Models:'));
  labelValue('  Path', config.models.path);
  console.log('');

  // Docker settings
  console.log(cyan('Docker:'));
  labelValue('  Compose File', config.docker.composeFile);
  labelValue('  GPU Mode', config.docker.gpu ? green('enabled') : dim('disabled'));
  console.log('');

  // Claude settings
  console.log(cyan('Claude:'));
  if (config.claude.extraArgs.length > 0) {
    labelValue('  Extra Args', config.claude.extraArgs.join(' '));
  } else {
    labelValue('  Extra Args', dim('none'));
  }
  console.log('');

  // Config source
  console.log(dim('─'.repeat(40)));
  if (activePath) {
    console.log(dim(`Loaded from: ${file(activePath)}`));
  } else {
    console.log(dim('Using default configuration (no config file found)'));
  }
}

export async function configPaths(): Promise<void> {
  const paths = getConfigSearchPaths();
  const activePath = getActiveConfigPath();

  header('Config Search Paths');
  console.log('');
  console.log(dim('Files are checked in priority order (first found wins):'));
  console.log('');

  for (let i = 0; i < paths.length; i++) {
    const configPath = paths[i];
    if (!configPath) continue;

    const isActive = configPath === activePath;
    const num = `${i + 1}.`;

    if (isActive) {
      console.log(`  ${num} ${file(configPath)} ${green('← active')}`);
    } else {
      console.log(`  ${num} ${dim(configPath)}`);
    }
  }

  console.log('');

  if (!activePath) {
    console.log(info('No config file found. Using defaults.'));
    console.log(dim(`  Run ${cmd('ollama-bundt init')} to create a project config.`));
  }
}
