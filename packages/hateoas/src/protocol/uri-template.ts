/**
 * RFC 6570 URI Template processor (Level 3)
 * Supports: simple, reserved, fragment, label, path, query, query continuation
 */

type Operator = '' | '+' | '#' | '.' | '/' | ';' | '?' | '&';

type Expression = {
  operator: Operator;
  variables: VariableSpec[];
};

type VariableSpec = {
  name: string;
  explode: boolean;
  maxLength?: number;
};

const OPERATOR_CONFIG: Record<
  Operator,
  { prefix: string; separator: string; named: boolean; allowReserved: boolean }
> = {
  '': { prefix: '', separator: ',', named: false, allowReserved: false },
  '+': { prefix: '', separator: ',', named: false, allowReserved: true },
  '#': { prefix: '#', separator: ',', named: false, allowReserved: true },
  '.': { prefix: '.', separator: '.', named: false, allowReserved: false },
  '/': { prefix: '/', separator: '/', named: false, allowReserved: false },
  ';': { prefix: ';', separator: ';', named: true, allowReserved: false },
  '?': { prefix: '?', separator: '&', named: true, allowReserved: false },
  '&': { prefix: '&', separator: '&', named: true, allowReserved: false }
};

function parseExpression(expr: string): Expression {
  const operators = ['+', '#', '.', '/', ';', '?', '&'] as const;
  let operator: Operator = '';

  if (operators.includes(expr[0] as (typeof operators)[number])) {
    operator = expr[0] as Operator;
    expr = expr.slice(1);
  }

  const variables = expr.split(',').map((v): VariableSpec => {
    const explode = v.endsWith('*');
    if (explode) v = v.slice(0, -1);

    const colonIdx = v.indexOf(':');
    if (colonIdx !== -1) {
      return {
        name: v.slice(0, colonIdx),
        explode,
        maxLength: parseInt(v.slice(colonIdx + 1), 10)
      };
    }

    return { name: v, explode };
  });

  return { operator, variables };
}

function encodeValue(value: string, allowReserved: boolean): string {
  if (allowReserved) {
    return encodeURI(value).replace(/%25/g, '%');
  }
  return encodeURIComponent(value);
}

function expandVariable(
  spec: VariableSpec,
  value: unknown,
  config: (typeof OPERATOR_CONFIG)[Operator]
): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    if (spec.explode) {
      return value
        .map((v) => {
          const encoded = encodeValue(String(v), config.allowReserved);
          return config.named ? `${spec.name}=${encoded}` : encoded;
        })
        .join(config.separator);
    }
    const joined = value.map((v) => encodeValue(String(v), config.allowReserved)).join(',');
    return config.named ? `${spec.name}=${joined}` : joined;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return undefined;
    if (spec.explode) {
      return entries
        .map(
          ([k, v]) =>
            `${encodeValue(k, config.allowReserved)}=${encodeValue(String(v), config.allowReserved)}`
        )
        .join(config.separator);
    }
    const joined = entries
      .map(
        ([k, v]) =>
          `${encodeValue(k, config.allowReserved)},${encodeValue(String(v), config.allowReserved)}`
      )
      .join(',');
    return config.named ? `${spec.name}=${joined}` : joined;
  }

  let str = String(value);
  if (spec.maxLength !== undefined) {
    str = str.slice(0, spec.maxLength);
  }
  const encoded = encodeValue(str, config.allowReserved);
  if (config.named) {
    return str === '' ? spec.name : `${spec.name}=${encoded}`;
  }
  return encoded;
}

export function expandUriTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{([^}]+)\}/g, (_, expr: string) => {
    const { operator, variables: specs } = parseExpression(expr);
    const config = OPERATOR_CONFIG[operator];

    const expanded = specs
      .map((spec) => expandVariable(spec, variables[spec.name], config))
      .filter((v): v is string => v !== undefined);

    if (expanded.length === 0) return '';
    return config.prefix + expanded.join(config.separator);
  });
}

export function extractTemplateVariables(template: string): string[] {
  const vars: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    const expr = match[1]!;
    const operators = ['+', '#', '.', '/', ';', '?', '&'];
    const body = operators.includes(expr[0]!) ? expr.slice(1) : expr;
    for (const v of body.split(',')) {
      const name = v.replace(/[*]$/, '').replace(/:.*$/, '');
      if (!vars.includes(name)) vars.push(name);
    }
  }
  return vars;
}

export function isUriTemplate(str: string): boolean {
  return /\{[^}]+\}/.test(str);
}
