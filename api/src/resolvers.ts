import { getLead, listLeads, listServiceOptions, registerLead } from './leadService.js';
import type { LeadListOptions, LeadRegistration } from './types/common.js';
import type { Db } from './db.js';
import { GraphQLError } from 'graphql';
import { createRateLimiter } from './rateLimiter.js';
const allowTotalRegistrations = createRateLimiter(30, 60_000);
const allowRegistrationsForEmail = createRateLimiter(5, 10 * 60_000);

type Context = { db: Db };

export const resolvers = {
  Query: {
    leads: (
      _parent: unknown,
      args: LeadListOptions,
      { db }: Context,
    ) => {
      if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50) {
        throw new GraphQLError('limit must be between 1 and 50', {
          extensions: { code: 'BAD_USER_INPUT', field: 'limit' },
        });
      }

      if (!Number.isInteger(args.offset) || args.offset < 0) {
        throw new GraphQLError('offset must be zero or greater', {
          extensions: { code: 'BAD_USER_INPUT', field: 'offset' },
        });
      }

      return listLeads(db, args);
    },

    lead: (
      _parent: unknown,
      args: { id: string },
      { db }: Context,
    ) => {
      const id = Number(args.id);

      if (!/^[1-9]\d*$/.test(args.id) || !Number.isSafeInteger(id)) {
        throw new GraphQLError('Invalid lead ID', {
          extensions: { code: 'BAD_USER_INPUT', field: 'id' },
        });
      }

      return getLead(db, id);
    },

    serviceOptions: (
      _parent: unknown,
      _args: unknown,
      { db }: Context,
    ) => listServiceOptions(db),
  },

  Mutation: {
    register: (
      _parent: unknown,
      args: LeadRegistration,
      { db }: Context,
    ) => {
      const email = args.email.trim().toLowerCase();

      if (
        !allowTotalRegistrations('register') ||
        !allowRegistrationsForEmail(email)
      ) {
        throw new GraphQLError('Too many registration attempts. Please try again later.', {
          extensions: { code: 'TOO_MANY_REQUESTS' },
        });
      }

      return registerLead(db, args);
    },
  },
};
