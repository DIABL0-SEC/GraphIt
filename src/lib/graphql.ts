import {
  parse,
  print,
  getIntrospectionQuery,
  buildClientSchema,
  printSchema,
  type GraphQLSchema,
  type DocumentNode,
  type IntrospectionQuery,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLType,
  type GraphQLField,
  type GraphQLInputField,
  type GraphQLArgument,
} from 'graphql';

export function parseQuery(query: string): DocumentNode | null {
  try {
    return parse(query);
  } catch {
    return null;
  }
}

export function prettifyQuery(query: string): string {
  const doc = parseQuery(query);
  if (!doc) return query;
  return print(doc);
}

export function minifyQuery(query: string): string {
  return query
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}():,])\s*/g, '$1')
    .trim();
}

export function getOperationNames(query: string): string[] {
  const doc = parseQuery(query);
  if (!doc) return [];
  return doc.definitions
    .filter((def): def is import('graphql').OperationDefinitionNode =>
      def.kind === 'OperationDefinition' && !!def.name
    )
    .map(def => def.name!.value);
}

export function getOperationType(query: string, operationName?: string): 'query' | 'mutation' | 'subscription' | null {
  const doc = parseQuery(query);
  if (!doc) return null;

  const ops = doc.definitions.filter(
    (def): def is import('graphql').OperationDefinitionNode =>
      def.kind === 'OperationDefinition'
  );

  let op = ops[0];
  if (operationName) {
    op = ops.find(o => o.name?.value === operationName) || ops[0];
  }

  return op?.operation || null;
}

export async function fetchIntrospection(
  endpoint: string,
  headers: Record<string, string> = {},
  useProxy = false
): Promise<{ schema: GraphQLSchema; sdl: string; raw: string }> {
  const query = getIntrospectionQuery();
  const url = useProxy ? `/api/introspect` : endpoint;

  const body = JSON.stringify({ query });
  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (useProxy) {
    fetchHeaders['X-GraphIt-Target'] = endpoint;
    for (const [key, value] of Object.entries(headers)) {
      fetchHeaders[`X-GraphIt-Header-${key}`] = value;
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: fetchHeaders,
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  const introspectionResult = result.data as IntrospectionQuery;
  const schema = buildClientSchema(introspectionResult);
  const sdl = printSchema(schema);

  return {
    schema,
    sdl,
    raw: JSON.stringify(introspectionResult),
  };
}

export function getTypeName(type: GraphQLType): string {
  if (type instanceof GraphQLNonNull) {
    return `${getTypeName(type.ofType)}!`;
  }
  if (type instanceof GraphQLList) {
    return `[${getTypeName(type.ofType)}]`;
  }
  return type.name;
}

export function getNamedType(type: GraphQLType): GraphQLType {
  if (type instanceof GraphQLNonNull || type instanceof GraphQLList) {
    return getNamedType(type.ofType);
  }
  return type;
}

export function isObjectType(type: GraphQLType): type is GraphQLObjectType {
  const named = getNamedType(type);
  return named instanceof GraphQLObjectType;
}

export interface SchemaType {
  name: string;
  kind: 'OBJECT' | 'INPUT_OBJECT' | 'ENUM' | 'SCALAR' | 'INTERFACE' | 'UNION';
  description: string | null;
  fields?: SchemaField[];
  enumValues?: string[];
  interfaces?: string[];
  possibleTypes?: string[];
}

export interface SchemaField {
  name: string;
  type: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
  args?: SchemaArg[];
}

export interface SchemaArg {
  name: string;
  type: string;
  description: string | null;
  defaultValue: string | null;
}

export function extractSchemaTypes(schema: GraphQLSchema): SchemaType[] {
  const types: SchemaType[] = [];
  const typeMap = schema.getTypeMap();

  for (const [name, type] of Object.entries(typeMap)) {
    if (name.startsWith('__')) continue;

    if (type instanceof GraphQLObjectType) {
      types.push({
        name,
        kind: 'OBJECT',
        description: type.description ?? null,
        fields: Object.values(type.getFields()).map(fieldToSchema),
        interfaces: type.getInterfaces().map(i => i.name),
      });
    } else if (type instanceof GraphQLInputObjectType) {
      types.push({
        name,
        kind: 'INPUT_OBJECT',
        description: type.description ?? null,
        fields: Object.values(type.getFields()).map(inputFieldToSchema),
      });
    } else if (type instanceof GraphQLEnumType) {
      types.push({
        name,
        kind: 'ENUM',
        description: type.description ?? null,
        enumValues: type.getValues().map(v => v.name),
      });
    } else if (type instanceof GraphQLScalarType) {
      types.push({
        name,
        kind: 'SCALAR',
        description: type.description ?? null,
      });
    } else if (type instanceof GraphQLInterfaceType) {
      types.push({
        name,
        kind: 'INTERFACE',
        description: type.description ?? null,
        fields: Object.values(type.getFields()).map(fieldToSchema),
      });
    } else if (type instanceof GraphQLUnionType) {
      types.push({
        name,
        kind: 'UNION',
        description: type.description ?? null,
        possibleTypes: type.getTypes().map(t => t.name),
      });
    }
  }

  return types;
}

function fieldToSchema(field: GraphQLField<unknown, unknown>): SchemaField {
  return {
    name: field.name,
    type: getTypeName(field.type),
    description: field.description ?? null,
    isDeprecated: field.deprecationReason != null,
    deprecationReason: field.deprecationReason ?? null,
    args: field.args.map(argToSchema),
  };
}

function inputFieldToSchema(field: GraphQLInputField): SchemaField {
  return {
    name: field.name,
    type: getTypeName(field.type),
    description: field.description ?? null,
    isDeprecated: field.deprecationReason != null,
    deprecationReason: field.deprecationReason ?? null,
  };
}

function argToSchema(arg: GraphQLArgument): SchemaArg {
  return {
    name: arg.name,
    type: getTypeName(arg.type),
    description: arg.description ?? null,
    defaultValue: arg.defaultValue !== undefined ? JSON.stringify(arg.defaultValue) : null,
  };
}

export function getQueryType(schema: GraphQLSchema): GraphQLObjectType | null {
  return schema.getQueryType() ?? null;
}

export function getMutationType(schema: GraphQLSchema): GraphQLObjectType | null {
  return schema.getMutationType() ?? null;
}

export function getSubscriptionType(schema: GraphQLSchema): GraphQLObjectType | null {
  return schema.getSubscriptionType() ?? null;
}

export function generateQueryFromField(
  field: GraphQLField<unknown, unknown>,
  operationType: 'query' | 'mutation' | 'subscription',
  maxDepth = 3,
  visited = new Set<string>()
): string {
  const operationName = `${operationType.charAt(0).toUpperCase()}${operationType.slice(1)}${field.name.charAt(0).toUpperCase()}${field.name.slice(1)}`;

  const args = field.args.map(arg => {
    const varName = `$${arg.name}`;
    return `${arg.name}: ${varName}`;
  }).join(', ');

  const varDefs = field.args.map(arg => {
    return `$${arg.name}: ${getTypeName(arg.type)}`;
  }).join(', ');

  const selection = generateSelectionSet(field.type, maxDepth, 0, visited);

  const argsStr = args ? `(${args})` : '';
  const varDefsStr = varDefs ? `(${varDefs})` : '';

  return `${operationType} ${operationName}${varDefsStr} {
  ${field.name}${argsStr}${selection}
}`;
}

function generateSelectionSet(
  type: GraphQLType,
  maxDepth: number,
  currentDepth: number,
  visited: Set<string>
): string {
  if (currentDepth >= maxDepth) return '';

  const namedType = getNamedType(type);

  if (namedType instanceof GraphQLObjectType || namedType instanceof GraphQLInterfaceType) {
    if (visited.has(namedType.name)) return '';
    visited.add(namedType.name);

    const fields = Object.values(namedType.getFields());
    const scalarFields = fields.filter(f => {
      const t = getNamedType(f.type);
      return t instanceof GraphQLScalarType || t instanceof GraphQLEnumType;
    });

    const objectFields = fields.filter(f => {
      const t = getNamedType(f.type);
      return t instanceof GraphQLObjectType || t instanceof GraphQLInterfaceType;
    });

    const selections: string[] = [];

    for (const f of scalarFields.slice(0, 5)) {
      selections.push(f.name);
    }

    for (const f of objectFields.slice(0, 2)) {
      const nestedVisited = new Set(visited);
      const nested = generateSelectionSet(f.type, maxDepth, currentDepth + 1, nestedVisited);
      if (nested) {
        selections.push(`${f.name}${nested}`);
      }
    }

    visited.delete(namedType.name);

    if (selections.length === 0) return '';
    return ` {\n${'  '.repeat(currentDepth + 2)}${selections.join(`\n${'  '.repeat(currentDepth + 2)}`)}\n${'  '.repeat(currentDepth + 1)}}`;
  }

  if (namedType instanceof GraphQLUnionType) {
    const types = namedType.getTypes().slice(0, 2);
    const fragments = types.map(t => {
      const nestedVisited = new Set(visited);
      const nested = generateSelectionSet(t, maxDepth, currentDepth + 1, nestedVisited);
      return `... on ${t.name}${nested}`;
    });

    if (fragments.length === 0) return '';
    return ` {\n${'  '.repeat(currentDepth + 2)}${fragments.join(`\n${'  '.repeat(currentDepth + 2)}`)}\n${'  '.repeat(currentDepth + 1)}}`;
  }

  return '';
}

