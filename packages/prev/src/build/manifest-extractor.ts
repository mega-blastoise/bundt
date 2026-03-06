import type { FragmentDefinition, FragmentManifest } from '../types';

function zodToJsonSchema(zodType: unknown): Record<string, unknown> {
  // Simple extraction — handles the common Zod shapes
  if (!zodType || typeof zodType !== 'object') return { type: 'unknown' };

  const t = zodType as Record<string, unknown>;

  if (typeof t['_def'] === 'object' && t['_def'] !== null) {
    const def = t['_def'] as Record<string, unknown>;
    const typeName = def['typeName'] as string | undefined;

    switch (typeName) {
      case 'ZodString': return { type: 'string' };
      case 'ZodNumber': return { type: 'number' };
      case 'ZodBoolean': return { type: 'boolean' };
      case 'ZodArray': return { type: 'array', items: zodToJsonSchema(def['type']) };
      case 'ZodObject': {
        const shape = def['shape'] as Record<string, unknown> | undefined;
        if (!shape) return { type: 'object' };
        const properties: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(shape)) {
          properties[key] = zodToJsonSchema(value);
        }
        return { type: 'object', properties };
      }
      case 'ZodOptional': return { ...zodToJsonSchema(def['innerType']), optional: true };
      case 'ZodDefault': return zodToJsonSchema(def['innerType']);
      case 'ZodUnion': {
        const options = def['options'] as unknown[] | undefined;
        if (!options) return { type: 'unknown' };
        return { oneOf: options.map(zodToJsonSchema) };
      }
      case 'ZodLiteral': return { const: def['value'] };
      case 'ZodRecord': return { type: 'object', additionalProperties: zodToJsonSchema(def['valueType']) };
      default: return { type: 'unknown', zodType: typeName };
    }
  }

  return { type: 'unknown' };
}

export function extractManifest(definition: FragmentDefinition): FragmentManifest {
  const dataRequirements: Record<string, { paramsSchema: Record<string, unknown> }> = {};
  for (const [key, field] of Object.entries(definition.data)) {
    dataRequirements[key] = {
      paramsSchema: field.params ? zodToJsonSchema(field.params) : {}
    };
  }

  const interactions: Record<string, { payloadSchema: Record<string, unknown> }> = {};
  for (const [key, interaction] of Object.entries(definition.interactions)) {
    interactions[key] = {
      payloadSchema: zodToJsonSchema(interaction.payload)
    };
  }

  return {
    id: definition.id,
    version: '1.0.0',
    description: definition.description,
    tags: definition.tags,
    propsSchema: zodToJsonSchema(definition.props),
    dataRequirements,
    interactions,
    layout: definition.layoutHints
  };
}

export function extractManifests(definitions: FragmentDefinition[]): FragmentManifest[] {
  return definitions.map(extractManifest);
}
