import { MockedProvider } from "@apollo/client/testing";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { gql } from "@apollo/client";
import { GraphQLError } from "graphql";
import { expect, test, vi } from "vitest";
import App from "./App";

const GET_LEADS = gql`
  query GetLeads($limit: Int!, $offset: Int!, $service: String) {
    leads(limit: $limit, offset: $offset, service: $service) {
      items { id name email mobile postcode created_at services }
      totalCount
    }
  }
`;

const GET_SERVICE_OPTIONS = gql`
  query GetServiceOptions {
    serviceOptions { code label }
  }
`;

const GET_LEAD = gql`
  query GetLead($id: ID!) {
    lead(id: $id) { id name email mobile postcode created_at services }
  }
`;

const REGISTER_LEAD = gql`
  mutation RegisterLead(
    $name: String!
    $email: String!
    $mobile: String
    $postcode: String!
    $services: [String!]!
  ) {
    register(
      name: $name
      email: $email
      mobile: $mobile
      postcode: $postcode
      services: $services
    ) { id name email }
  }
`;

const serviceOptions = [
  { code: "delivery", label: "Delivery", __typename: "ServiceOption" },
];

const serviceOptionsMock = {
  request: { query: GET_SERVICE_OPTIONS },
  result: { data: { serviceOptions } },
};

function makeLead(id: string) {
  return {
    id,
    name: `Lead ${id}`,
    email: `lead${id}@example.com`,
    mobile: null,
    postcode: "1234",
    created_at: "2026-09-27 12:00:00",
    services: ["delivery"],
    __typename: "Lead",
  };
}
test("paginates and filters the lead list", async () => {
  const user = userEvent.setup();
  const firstPage = Array.from({ length: 8 }, (_, index) => makeLead(String(index + 1)));
  const mocks = [
    serviceOptionsMock,
    {
      request: { query: GET_LEADS, variables: { limit: 8, offset: 0, service: null } },
      result: { data: { leads: { items: firstPage, totalCount: 9, __typename: "LeadPage" } } },
    },
    {
      request: { query: GET_LEADS, variables: { limit: 8, offset: 8, service: null } },
      result: { data: { leads: { items: [makeLead("9")], totalCount: 9, __typename: "LeadPage" } } },
    },
    {
      request: { query: GET_LEADS, variables: { limit: 8, offset: 0, service: "delivery" } },
      result: { data: { leads: { items: [makeLead("1")], totalCount: 1, __typename: "LeadPage" } } },
    },
  ];

  render(<MockedProvider mocks={mocks}>
    <App />
  </MockedProvider>);


  expect(await screen.findByText("Page 1 of 2")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(await screen.findByText("Page 2 of 2")).toBeTruthy();
  expect(screen.getByText("Lead 9")).toBeTruthy();

  await user.selectOptions(screen.getByRole("combobox", { name: "Filter leads by service" }), "delivery");
  expect(await screen.findByText("Page 1 of 1")).toBeTruthy();
  await waitFor(() => expect(screen.getByText("Lead 1")).toBeTruthy());
});

test("opens a lead from the list and returns to the list", async () => {
  const user = userEvent.setup();
  const lead = makeLead("1");
  render(<MockedProvider mocks={[
    serviceOptionsMock,
    {
      request: { query: GET_LEADS, variables: { limit: 8, offset: 0, service: null } },
      result: { data: { leads: { items: [lead], totalCount: 1, __typename: "LeadPage" } } },
    },
    {
      request: { query: GET_LEAD, variables: { id: "1" } },
      result: { data: { lead } },
    },
  ]}><App /></MockedProvider>);

  await user.click(await screen.findByRole("row", { name: "Open lead details for Lead 1" }));
  expect(await screen.findByRole("heading", { name: "Lead 1" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "lead1@example.com" })).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Back to leads" }));
  expect(await screen.findByRole("heading", { name: "All enquiries" })).toBeTruthy();
});

test("keeps a successful registration successful if the list refresh fails", async () => {
  const user = userEvent.setup();
  const lead = { ...makeLead("1"), name: "Alex Example", email: "alex@example.com" };
  const refresh = vi.fn(() => ({ errors: [new GraphQLError("List is unavailable")] }));

  render(<MockedProvider mocks={[
    serviceOptionsMock,
    {
      request: { query: GET_LEADS, variables: { limit: 8, offset: 0, service: null } },
      result: { data: { leads: { items: [], totalCount: 0, __typename: "LeadPage" } } },
    },
    {
      request: { query: REGISTER_LEAD, variables: {
        name: "Alex Example", email: "alex@example.com", mobile: null,
        postcode: "1234", services: ["delivery"],
      } },
      result: { data: { register: lead } },
    },
    {
      request: { query: GET_LEADS, variables: { limit: 8, offset: 0, service: null } },
      result: refresh,
    },
    {
      request: { query: GET_LEAD, variables: { id: "1" } },
      result: { data: { lead } },
    },
  ]}><App /></MockedProvider>);

  await screen.findByText("No leads found");
  await user.click(screen.getByRole("button", { name: "Register a Lead" }));
  await user.type(screen.getByLabelText("Full name"), "Alex Example");
  await user.type(screen.getByLabelText("Email address"), "alex@example.com");
  await user.type(screen.getByLabelText("Postcode"), "1234");
  await user.click(screen.getByRole("checkbox", { name: "Delivery" }));
  await user.click(screen.getByRole("button", { name: "Add to register" }));

  expect(await screen.findByRole("heading", { name: "Alex Example" })).toBeTruthy();
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(/Could not connect to the API or save this lead/)).toBeNull();
});
