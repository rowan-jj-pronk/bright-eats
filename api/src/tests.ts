import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { afterEach, beforeEach } from 'node:test';
import { GraphQLError } from 'graphql';
import { openDatabase, type Db } from './db.js';
import { getLead, listLeads, listServiceOptions, registerLead } from './leadService.js';
import { createRateLimiter } from './rateLimiter.js';

let db: Db;

beforeEach(() => {
  db = openDatabase(':memory:');
  db.exec(readFileSync(join(process.cwd(), 'src/schema/schema.sql'), 'utf8'));

  db.prepare('INSERT INTO services (code, label) VALUES (?, ?)')
    .run('delivery', 'delivery');
  db.prepare('INSERT INTO services (code, label) VALUES (?, ?)')
    .run('pick-up', 'pick-up pumps');
  db.prepare('INSERT INTO services (code, label, is_active) VALUES (?, ?, 0)')
    .run('retired', 'Retired');
});

afterEach(() => db.close());

function insertLead(name: string, email: string, postcode: string): number {
  const result = db.prepare(`
    INSERT INTO leads (name, email, postcode) VALUES (?, ?, ?)
  `).run(name, email, postcode);

  return Number(result.lastInsertRowid);
}

function addService(leadId: number, serviceCode: string): void {
  db.prepare(`
    INSERT INTO lead_services (lead_id, service_code) VALUES (?, ?)
  `).run(leadId, serviceCode);
}

test('listServiceOptions returns active services ordered by label', () => {
  assert.deepEqual(listServiceOptions(db), [
    { code: 'delivery', label: 'delivery' },
    { code: 'pick-up', label: 'pick-up pumps' },
  ]);
});

test('rate limiter isolates keys and resets after the window', () => {
  let currentTime = 0;
  const allow = createRateLimiter(2, 60_000, () => currentTime);

  assert.equal(allow('ada@example.com'), true);
  assert.equal(allow('ada@example.com'), true);
  assert.equal(allow('ada@example.com'), false);

  // Another email has its own allowance.
  assert.equal(allow('lin@example.com'), true);

  currentTime = 59_999;
  assert.equal(allow('ada@example.com'), false);

  currentTime = 60_000;
  assert.equal(allow('ada@example.com'), true);
});

test('getLead returns the lead and all its services', () => {
  const id = insertLead('Ada', 'ada@example.com', '1234');
  addService(id, 'delivery');
  addService(id, 'pick-up');

  const lead = getLead(db, id);

  assert.ok(lead);
  assert.equal(lead.id, id);
  assert.equal(lead.name, 'Ada');
  assert.equal(lead.email, 'ada@example.com');
  assert.equal(lead.mobile, null);
  assert.match(lead.created_at, /^\d{4}-\d{2}-\d{2} /);
  assert.deepEqual([...lead.services].sort(), ['delivery', 'pick-up']);
  assert.equal(getLead(db, 999), null);
});

test('listLeads filters, paginates, and keeps the count on an empty page', () => {
  const firstId = insertLead('Ada', 'ada@example.com', '1234');
  const secondId = insertLead('Lin', 'lin@example.com', '2345');
  insertLead('Sam', 'sam@example.com', '3456');

  addService(firstId, 'delivery');
  addService(secondId, 'delivery');
  addService(secondId, 'pick-up');

  const firstPage = listLeads(db, {
    limit: 1,
    offset: 0,
    service: 'delivery',
  });

  assert.equal(firstPage.totalCount, 2);
  assert.equal(firstPage.items.length, 1);
  assert.equal(firstPage.items[0]?.id, secondId);
  assert.deepEqual(
    [...(firstPage.items[0]?.services ?? [])].sort(),
    ['delivery', 'pick-up'],
  );

  const beyondLastPage = listLeads(db, {
    limit: 10,
    offset: 10,
    service: 'delivery',
  });

  assert.deepEqual(beyondLastPage, { items: [], totalCount: 2 });
});

test('listLeads rejects pagination that would return unbounded or invalid pages', () => {
  for (const options of [
    { limit: -1, offset: 0, field: 'limit' },
    { limit: 0, offset: 0, field: 'limit' },
    { limit: 51, offset: 0, field: 'limit' },
    { limit: 10, offset: -1, field: 'offset' },
  ]) {
    assert.throws(
      () => listLeads(db, options),
      (error: unknown) =>
        error instanceof GraphQLError &&
        error.extensions.code === 'BAD_USER_INPUT' &&
        error.extensions.field === options.field,
    );
  }
});

test('registerLead normalises input and deduplicates services', () => {
  const lead = registerLead(db, {
    name: '  Ada  ',
    email: 'ADA@EXAMPLE.COM',
    mobile: '  555-0100  ',
    postcode: '1234',
    services: ['delivery', 'delivery', 'pick-up'],
  });

  assert.ok(lead);
  assert.equal(lead.name, 'Ada');
  assert.equal(lead.email, 'ada@example.com');
  assert.equal(lead.mobile, '555-0100');
  assert.deepEqual([...lead.services].sort(), ['delivery', 'pick-up']);

  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM lead_services
    WHERE lead_id = ?
  `).get(lead.id) as { count: number };

  assert.equal(row.count, 2);
});

test('a new service type works without changing validation code', () => {
  db.prepare('INSERT INTO services (code, label) VALUES (?, ?)')
    .run('wind', 'Wind');

  const lead = registerLead(db, {
    name: 'Ada',
    email: 'ada@example.com',
    postcode: '1234',
    services: ['wind'],
    // Mobile is optional.
  });

  assert.ok(lead);
  assert.equal(lead.mobile, null);
  assert.deepEqual(lead.services, ['wind']);
});

test('registerLead reports invalid input as a user error', () => {
  assert.throws(
    () => registerLead(db, {
      name: '',
      email: 'ada@example.com',
      postcode: '1234',
      services: ['delivery'],
    }),
    (error: unknown) =>
      error instanceof GraphQLError &&
      error.extensions.code === 'BAD_USER_INPUT' &&
      error.extensions.field === 'name',
  );
});

test('registerLead rejects an inactive service without creating a lead', () => {
  assert.throws(
    () => registerLead(db, {
      name: 'Ada',
      email: 'ada@example.com',
      postcode: '1234',
      services: ['delivery', 'retired'],
    }),
    (error: unknown) =>
      error instanceof GraphQLError &&
      error.extensions.code === 'BAD_USER_INPUT' &&
      error.extensions.field === 'services',
  );

  const row = db.prepare('SELECT COUNT(*) AS count FROM leads')
    .get() as { count: number };

  assert.equal(row.count, 0);
});

test('registerLead rejects a duplicate email without changing the existing lead', () => {
  const originalId = insertLead('Ada', 'ada@example.com', '1234');
  addService(originalId, 'delivery');

  assert.throws(
    () => registerLead(db, {
      name: 'Different name',
      email: 'ADA@example.com',
      postcode: '9999',
      services: ['pick-up'],
    }),
    (error: unknown) =>
      error instanceof GraphQLError &&
      error.extensions.code === 'BAD_USER_INPUT' &&
      error.extensions.field === 'email' &&
      error.message === 'A lead with this email address already exists',
  );

  assert.throws(
    () => registerLead(db, {
      name: 'Ada',
      email: 'ada@example.com',
      postcode: '1234',
      services: ['delivery', 'pick-up'],
    }),
    (error: unknown) =>
      error instanceof GraphQLError &&
      error.extensions.code === 'BAD_USER_INPUT' &&
      error.extensions.field === 'email',
  );

  const existingLead = getLead(db, originalId);
  assert.ok(existingLead);
  assert.equal(existingLead.name, 'Ada');
  assert.equal(existingLead.postcode, '1234');
  assert.deepEqual(existingLead.services, ['delivery']);

  const row = db.prepare('SELECT COUNT(*) AS count FROM leads')
    .get() as { count: number };
  assert.equal(row.count, 1);
});

test('registerLead returns the saved lead after an identical retry', () => {
  const request = {
    name: 'Ada',
    email: 'ada@example.com',
    postcode: '1234',
    services: ['delivery'],
  };

  const first = registerLead(db, request);
  assert.ok(first);
  const replay = registerLead(db, request);
  assert.deepEqual(replay, first);
  const normalisedReplay = registerLead(db, {
    ...request,
    name: ' Ada ',
    email: 'ADA@EXAMPLE.COM',
    services: ['delivery', 'delivery'],
  });
  assert.deepEqual(normalisedReplay, first);

  const row = db.prepare('SELECT COUNT(*) AS count FROM leads')
    .get() as { count: number };
  assert.equal(row.count, 1);

  const serviceRow = db.prepare('SELECT COUNT(*) AS count FROM lead_services WHERE lead_id = ?')
    .get(first.id) as { count: number };
  assert.equal(serviceRow.count, 1);
});
