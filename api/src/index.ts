import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { openDatabase } from './db.js';
import { resolvers } from './resolvers.js';
import { schema } from './schema.js';

const db = openDatabase();
const server = new ApolloServer<{ db: typeof db }>({
  typeDefs: schema,
  resolvers,
});
const port = Number(process.env.PORT ?? 4000);

const { url } = await startStandaloneServer(server, {
  listen: { host: '0.0.0.0', port },
  context: async () => ({ db }),
});

console.log(`Bright-Eats API ready at ${url}`);
