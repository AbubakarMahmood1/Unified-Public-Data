import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from '@apollo/server';
import {
  GraphQLError,
  getNamedType,
  isListType,
  Kind,
  FieldNode,
  SelectionNode,
} from 'graphql';

interface QueryCostPluginOptions {
  maximumCost: number;
  defaultCost?: number;
  scalarCost?: number;
  objectCost?: number;
  listMultiplier?: number;
}

interface CostResult {
  cost: number;
  depth: number;
}

export const queryCostPlugin = (
  options: QueryCostPluginOptions
): ApolloServerPlugin => {
  const {
    maximumCost,
    defaultCost = 1,
    scalarCost = 1,
    objectCost = 1,
    listMultiplier = 10,
  } = options;

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<unknown>> {
      return {
        async didResolveOperation(
          requestContext: GraphQLRequestContext<unknown>
        ) {
          const { schema, document, operationName } = requestContext;

          // Find the operation
          const operation = document.definitions.find(
            (def) =>
              def.kind === Kind.OPERATION_DEFINITION &&
              (!operationName || def.name?.value === operationName)
          );

          if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) {
            return;
          }

          // Calculate query cost
          const calculateSelectionSetCost = (
            selections: readonly SelectionNode[],
            parentType: unknown,
            depth: number
          ): CostResult => {
            let totalCost = 0;
            let maxDepth = depth;

            for (const selection of selections) {
              if (selection.kind === Kind.FIELD) {
                const fieldNode = selection as FieldNode;
                const fieldName = fieldNode.name.value;

                // Skip introspection fields
                if (fieldName.startsWith('__')) {
                  continue;
                }

                let fieldCost = defaultCost;

                // Get field type from schema
                const schemaType = schema.getQueryType();
                if (schemaType) {
                  const field = schemaType.getFields()[fieldName];
                  if (field) {
                    const fieldType = getNamedType(field.type);

                    // Apply list multiplier if field returns a list
                    if (isListType(field.type)) {
                      fieldCost *= listMultiplier;
                    }

                    // If field has selections, recursively calculate cost
                    if (fieldNode.selectionSet) {
                      const nestedResult = calculateSelectionSetCost(
                        fieldNode.selectionSet.selections,
                        fieldType,
                        depth + 1
                      );
                      fieldCost += nestedResult.cost;
                      maxDepth = Math.max(maxDepth, nestedResult.depth);
                    } else {
                      fieldCost += scalarCost;
                    }
                  }
                }

                totalCost += fieldCost;
              } else if (selection.kind === Kind.INLINE_FRAGMENT) {
                const fragmentResult = calculateSelectionSetCost(
                  selection.selectionSet.selections,
                  parentType,
                  depth
                );
                totalCost += fragmentResult.cost;
                maxDepth = Math.max(maxDepth, fragmentResult.depth);
              } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
                // Handle fragment spreads
                const fragmentName = selection.name.value;
                const fragment = document.definitions.find(
                  (def) =>
                    def.kind === Kind.FRAGMENT_DEFINITION &&
                    def.name.value === fragmentName
                );

                if (fragment && fragment.kind === Kind.FRAGMENT_DEFINITION) {
                  const fragmentResult = calculateSelectionSetCost(
                    fragment.selectionSet.selections,
                    parentType,
                    depth
                  );
                  totalCost += fragmentResult.cost;
                  maxDepth = Math.max(maxDepth, fragmentResult.depth);
                }
              }
            }

            return { cost: totalCost, depth: maxDepth };
          };

          const result = calculateSelectionSetCost(
            operation.selectionSet.selections,
            schema.getQueryType(),
            1
          );

          const totalCost = result.cost;

          // Log the cost for monitoring
          console.log(`Query cost: ${totalCost}, Max depth: ${result.depth}`);

          // Reject if cost exceeds maximum
          if (totalCost > maximumCost) {
            throw new GraphQLError(
              `Query cost of ${totalCost} exceeds maximum allowed cost of ${maximumCost}`,
              {
                extensions: {
                  code: 'QUERY_COST_EXCEEDED',
                  cost: totalCost,
                  maximumCost,
                },
              }
            );
          }
        },
      };
    },
  };
};
