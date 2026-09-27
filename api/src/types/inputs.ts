import * as z from 'zod';

export const LeadFormInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  mobile: z.string().trim().nullable().optional(),
  postcode: z.string().regex(/^\d{4}$/),
  services: z.array(z.string().min(1)).min(1).max(10),
});