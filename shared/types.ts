export type LeadFields = {
  name: string;
  email: string;
  mobile: string | null;
  postcode: string;
  created_at: string;
  services: string[];
};

export type Lead = LeadFields & {
  id: string;
};

export type LeadRegistration = {
  name: string;
  email: string;
  mobile?: string | null;
  postcode: string;
  services: string[];
};

export type LeadListOptions = {
  limit: number;
  offset: number;
  service?: string | null;
};

export type LeadPageData = {
  items: Lead[];
  totalCount: number;
};

export type ServiceOption = {
  code: string;
  label: string;
};