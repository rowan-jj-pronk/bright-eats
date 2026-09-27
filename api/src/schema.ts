export const schema = `#graphql
  type Lead {
    id: ID!
    name: String!
    email: String!
    mobile: String
    postcode: String!
    created_at: String!
    services: [String!]!
  }

  type LeadPage {
    items: [Lead!]!
    totalCount: Int!
  }

  type ServiceOption {
    code: String!
    label: String!
  }

  type Query {
    leads(limit: Int = 20, offset: Int = 0, service: String): LeadPage!
    lead(id: ID!): Lead
    serviceOptions: [ServiceOption!]!
  }

  type Mutation {
    register(
      name: String!
      email: String!
      mobile: String
      postcode: String!
      services: [String!]!
    ): Lead!
  }
`;