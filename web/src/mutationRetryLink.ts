import { getOperationAST } from "graphql";
import { RetryLink } from "@apollo/client/link/retry";

export const mutationRetryLink = new RetryLink({
  delay: { initial: 300, max: 3000, jitter: true },
  attempts: {
    max: 2,
    retryIf: (error, operation) => {
      const definition = getOperationAST(operation.query, operation.operationName);
      if (definition?.operation !== "mutation" || definition.name?.value !== "RegisterLead") {
        return false;
      }

      const status = (error as { statusCode?: number }).statusCode;
      return status === undefined || status === 408 || status >= 500;
    },
  },
});
