import type { LeadFields } from '../../../shared/types.js';

export type {
    Lead,
    LeadFields,
    LeadListOptions,
    LeadPageData,
    LeadRegistration,
    ServiceOption,
} from '../../../shared/types.js';

// Ommitting services and adding ID as a number for database rows. Used internally in the API.
export type LeadRow = Omit<LeadFields, 'services'> & { id: number };
