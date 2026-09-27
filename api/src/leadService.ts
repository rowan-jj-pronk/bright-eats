import { Db } from './db.js';
import { LeadFormInput } from './types/inputs.js';
import type { LeadRegistration, LeadRow, ServiceOption } from './types/common.js';
import { GraphQLError } from 'graphql';

export function registerLead(db: Db, rawInput: unknown) {
  const result = LeadFormInput.safeParse(rawInput);

  if (!result.success) {
    const issue = result.error.issues[0];
    throw new GraphQLError(issue.message, {
      extensions: {
        code: 'BAD_USER_INPUT',
        field: String(issue.path[0] ?? 'register'),
      },
    });
  }

  const input: LeadRegistration = result.data;
  const services = [...new Set(input.services)];

  // Keep the lead and its interests in one transaction.
  return db.transaction(() => {
    const insertResult = db.prepare(`
      INSERT INTO leads (name, email, mobile, postcode)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO NOTHING
    `).run(input.name, input.email, input.mobile || null, input.postcode);

    if (insertResult.changes === 0) {
      const row = db.prepare('SELECT id FROM leads WHERE email = ?')
        .get(input.email) as { id: number } | undefined;
      const existing = row ? getLead(db, row.id) : null;

      // If the existing lead has the same details as the new input, return it instead of throwing an error.
      if (
        existing &&
        existing.name === input.name &&
        existing.mobile === (input.mobile || null) &&
        existing.postcode === input.postcode &&
        existing.services.length === services.length &&
        services.every((code) => existing.services.includes(code))
      ) {
        return existing;
      }

      //otherwise, throw an error indicating that a lead with this email already exists.
      throw new GraphQLError('A lead with this email address already exists', {
        extensions: { code: 'BAD_USER_INPUT', field: 'email' },
      });
    }

    const availableServiceCodes = new Set(
      listServiceOptions(db).map((service) => service.code),
    );

    if (services.some((code) => !availableServiceCodes.has(code))) {
      throw new GraphQLError('A selected service is unavailable', {
        extensions: { code: 'BAD_USER_INPUT', field: 'services' },
      });
    }

    const lead = db.prepare(`
      SELECT id FROM leads WHERE email = ?
    `).get(input.email) as { id: number };

    const addService = db.prepare(`
      INSERT INTO lead_services (lead_id, service_code)
      VALUES (?, ?)
      ON CONFLICT(lead_id, service_code) DO NOTHING
    `);

    for (const code of services) addService.run(lead.id, code);

    return getLead(db, lead.id);
  })();
}

export function listLeads(
  db: Db,
  options: {
    limit: number;
    offset: number;
    service?: string | null;
  },
) {
  const { limit, offset, service } = options;

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new GraphQLError('Limit must be between 1 and 50', {
      extensions: { code: 'BAD_USER_INPUT', field: 'limit' },
    });
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new GraphQLError('Offset must be a non-negative integer', {
      extensions: { code: 'BAD_USER_INPUT', field: 'offset' },
    });
  }

  const whereClause = service
    ? 'WHERE id IN (SELECT lead_id FROM lead_services WHERE service_code = ?)'
    : '';
  const filterParams = service ? [service] : [];

  const { totalCount } = db.prepare(`
    SELECT COUNT(*) AS totalCount
    FROM leads
    ${whereClause}
  `).get(...filterParams) as { totalCount: number };

  const leads = db.prepare(`
    SELECT *
    FROM leads
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...filterParams, limit, offset) as LeadRow[];

  const servicesByLead = new Map<number, string[]>();

  if (leads.length > 0) {
    const placeholders = leads.map(() => '?').join(', ');
    const serviceRows = db.prepare(`
      SELECT lead_id, service_code
      FROM lead_services
      WHERE lead_id IN (${placeholders})
      ORDER BY service_code
    `).all(...leads.map(lead => lead.id)) as Array<{
      lead_id: number;
      service_code: string;
    }>;

    for (const row of serviceRows) {
      const leadServices = servicesByLead.get(row.lead_id) ?? [];
      leadServices.push(row.service_code);
      servicesByLead.set(row.lead_id, leadServices);
    }
  }

  return {
    items: leads.map(lead => ({
      ...lead,
      services: servicesByLead.get(lead.id) ?? [],
    })),
    totalCount,
  };
}

export function listServiceOptions(db: Db) {
  return db.prepare(`
    SELECT code, label
    FROM services
    WHERE is_active = 1
    ORDER BY label COLLATE NOCASE
  `).all() as ServiceOption[];
}

export function getLead(db: Db, id: number) {
  const lead = db.prepare(`
    SELECT * FROM leads WHERE id = ?
  `).get(id) as LeadRow | undefined;
  if (!lead) return null;

  const services = db.prepare(`
    SELECT service_code FROM lead_services WHERE lead_id = ?
    ORDER BY service_code
  `).all(id) as Array<{ service_code: string }>;

  return {
    ...lead,
    services: services.map(service => service.service_code),
  };
}
