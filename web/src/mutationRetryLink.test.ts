import { ApolloLink, execute, gql, Observable } from "@apollo/client";
import { getOperationAST } from "graphql";
import { expect, test } from "vitest";
import { mutationRetryLink } from "./mutationRetryLink";

test("retries transient mutation failures but not query failures", async () => {
  let mutationAttempts = 0;
  let queryAttempts = 0;
  const observedVariables: Record<string, unknown>[] = [];
  const downstreamLink = new ApolloLink((operation) => new Observable((observer) => {
    const isMutation = getOperationAST(operation.query, operation.operationName)?.operation === "mutation";
    if (isMutation) {
      mutationAttempts += 1;
      observedVariables.push(operation.variables);
      if (mutationAttempts === 1) {
        observer.error(new Error("Temporary network failure"));
        return;
      }

      observer.next({ data: { register: { id: "1" } } });
      observer.complete();
      return;
    }

    queryAttempts += 1;
    observer.error(new Error("Temporary network failure"));
  }));
  const link = ApolloLink.from([mutationRetryLink, downstreamLink]);
  const variables = { email: "ada@example.com" };

  const mutationResult = await new Promise((resolve, reject) => {
    execute(link, { query: gql`mutation RegisterLead($email: String!) { register(email: $email) }`, variables }).subscribe({
      next: resolve,
      error: reject,
    });
  });

  expect(mutationResult).toEqual({ data: { register: { id: "1" } } });
  expect(mutationAttempts).toBe(2);
  expect(observedVariables).toEqual([variables, variables]);

  await expect(new Promise((resolve, reject) => {
    execute(link, { query: gql`query Leads { leads }` }).subscribe({
      next: resolve,
      error: reject,
    });
  })).rejects.toThrow("Temporary network failure");
  expect(queryAttempts).toBe(1);
});

test.each([400, 429])("does not retry a registration rejected with HTTP %i", async (statusCode) => {
  let attempts = 0;
  const error = Object.assign(new Error("Request rejected"), { statusCode });
  const downstreamLink = new ApolloLink(() => new Observable((observer) => {
    attempts += 1;
    observer.error(error);
  }));
  const link = ApolloLink.from([mutationRetryLink, downstreamLink]);

  await expect(new Promise((resolve, reject) => {
    execute(link, { query: gql`mutation RegisterLead { register }` }).subscribe({
      next: resolve,
      error: reject,
    });
  })).rejects.toThrow("Request rejected");
  expect(attempts).toBe(1);
});
