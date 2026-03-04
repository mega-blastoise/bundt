import {
  createDriver,
  createContextBuilder,
  type BcpDriver,
  type DriverConfig,
  type ContextBuilder
} from '@bit-context-protocol/driver';
import { warn, info } from '../ui';

let cachedDriver: BcpDriver | null = null;

const getDriver = (): BcpDriver => {
  if (!cachedDriver) {
    cachedDriver = createDriver();
  }
  return cachedDriver;
};

export interface BcpContextOptions {
  filePath: string;
  budget?: number;
  mode?: DriverConfig['mode'];
  verbosity?: DriverConfig['verbosity'];
}

export interface BcpContextResult {
  text: string;
  blockCount: number;
  totalSize: number;
}

export const isBcpAvailable = async (): Promise<boolean> => {
  try {
    return await getDriver().available();
  } catch {
    return false;
  }
};

export const prepareBcpContext = async (
  options: BcpContextOptions
): Promise<BcpContextResult | null> => {
  const driver = getDriver();

  const available = await driver.available();
  if (!available) {
    warn('bcp binary not found — skipping BCP context preparation.');
    warn('Install from https://github.com/nicholasgasior/bit-context-protocol or set BCP_CLI_PATH.');
    return null;
  }

  const inspectResult = await driver.inspect(options.filePath);
  info(
    `BCP: ${inspectResult.blockCount} blocks, ${inspectResult.totalSize} bytes`
  );

  const config: DriverConfig = {
    mode: options.mode ?? 'xml',
    verbosity: options.budget ? 'adaptive' : 'full',
    tokenBudget: options.budget
  };

  const decodeResult = await driver.decode(options.filePath, config);

  return {
    text: decodeResult.text,
    blockCount: inspectResult.blockCount,
    totalSize: inspectResult.totalSize
  };
};

export const validateBcpFile = async (
  filePath: string
): Promise<{ valid: boolean; errors: string[] }> => {
  const driver = getDriver();

  const available = await driver.available();
  if (!available) {
    return { valid: false, errors: ['bcp binary not available'] };
  }

  const result = await driver.validate(filePath);
  return { valid: result.valid, errors: result.errors };
};

export const createContext = (description?: string): ContextBuilder => {
  return createContextBuilder({
    driver: getDriver(),
    description
  });
};

export interface BuildAndDecodeOptions {
  budget?: number;
  mode?: DriverConfig['mode'];
  compress?: boolean;
}

export const buildAndDecodeContext = async (
  builder: ContextBuilder,
  options?: BuildAndDecodeOptions
): Promise<BcpContextResult | null> => {
  const driver = getDriver();

  const available = await driver.available();
  if (!available) {
    warn('bcp binary not found — skipping BCP context assembly.');
    return null;
  }

  const result = await builder.buildAndDecode(
    {
      compressBlocks: options?.compress
    },
    {
      mode: options?.mode ?? 'xml',
      verbosity: options?.budget ? 'adaptive' : 'full',
      tokenBudget: options?.budget
    }
  );

  info(`BCP context: ${result.blockCount} blocks assembled`);

  return {
    text: result.text,
    blockCount: result.blockCount,
    totalSize: result.text.length
  };
};
