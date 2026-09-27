import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import Dashboard from "./components/Dashboard";
import LeadDetail from "./components/LeadDetail";
import RegistrationForm from "./components/RegistrationForm";
import type { Lead, LeadPageData, LeadRegistration, ServiceOption } from "./types";

const PAGE_SIZE = 8;

const GET_LEADS = gql`
  query GetLeads($limit: Int!, $offset: Int!, $service: String) {
    leads(limit: $limit, offset: $offset, service: $service) {
      items {
        id
        name
        email
        mobile
        postcode
        created_at
        services
      }
      totalCount
    }
  }
`;

const GET_SERVICE_OPTIONS = gql`
  query GetServiceOptions {
    serviceOptions {
      code
      label
    }
  }
`;

const GET_LEAD = gql`
  query GetLead($id: ID!) {
    lead(id: $id) {
      id
      name
      email
      mobile
      postcode
      created_at
      services
    }
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
    ) {
      id
      name
      email
    }
  }
`;

export default function App() {
  const [view, setView] = useState<"dashboard" | "register">("dashboard");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const { data: leadData, loading: leadsLoading, error: leadsError, refetch } = useQuery<{
    leads: LeadPageData;
  }>(GET_LEADS, {
    variables: { limit: PAGE_SIZE, offset: page * PAGE_SIZE, service: filter || null },
    notifyOnNetworkStatusChange: true,
  });
  const {
    data: serviceData,
    loading: servicesLoading,
    error: servicesError,
  } = useQuery<{ serviceOptions: ServiceOption[] }>(GET_SERVICE_OPTIONS);
  const {
    data: selectedLeadData,
    loading: detailLoading,
    error: detailError,
  } = useQuery<{ lead: Lead | null }>(GET_LEAD, {
    variables: { id: selectedLeadId ?? "" },
    skip: selectedLeadId === null,
  });
  const [registerLead] = useMutation(REGISTER_LEAD);

  const leads = leadData?.leads.items ?? [];
  const totalCount = leadData?.leads.totalCount ?? 0;
  const pageCount = Math.ceil(totalCount / PAGE_SIZE);
  const serviceOptions = serviceData?.serviceOptions ?? [];

  async function handleRegister(input: LeadRegistration) {
    const result = await registerLead({
      variables: input,
    });
    const newLeadId = result.data?.register.id;
    setPage(0);
    setFilter("");
    if (newLeadId) {
      setSelectedLeadId(newLeadId);
      setView("dashboard");
    }
    // The lead is saved; a failed list refresh should not turn that into a form error.
    void refetch({ limit: PAGE_SIZE, offset: 0, service: null }).catch(() => {});
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="BrightEats home">
          <span className="brand-mark"><span /></span>
          <span>brighteats<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <nav className="main-nav" aria-label="Main navigation">
            <button className={view === "dashboard" ? "active" : ""} onClick={() => { setView("dashboard"); setSelectedLeadId(null); }}>Dashboard</button>
            <button className={`register-action${view === "register" ? " active" : ""}`} onClick={() => setView("register")}>Register a Lead</button>
          </nav>
        </div>
      </header>

      <div className="page-content">
        {view === "dashboard" && selectedLeadId === null && <Dashboard
          leads={leads}
          totalCount={totalCount}
          page={page}
          pageSize={PAGE_SIZE}
          pageCount={pageCount}
          filter={filter}
          serviceOptions={serviceOptions}
          loading={leadsLoading}
          hasLoadError={Boolean(leadsError)}
          hasServiceLoadError={Boolean(servicesError)}
          servicesLoading={servicesLoading}
          onFilterChange={(value) => { setFilter(value); setPage(0); }}
          onPageChange={setPage}
          onSelectLead={setSelectedLeadId}
        />}

        {view === "dashboard" && selectedLeadId !== null && <LeadDetail
          lead={selectedLeadData?.lead ?? null}
          loading={detailLoading}
          hasLoadError={Boolean(detailError)}
          serviceOptions={serviceOptions}
          onBack={() => setSelectedLeadId(null)}
        />}

        {view === "register" && <RegistrationForm
          serviceOptions={serviceOptions}
          servicesLoading={servicesLoading}
          servicesLoadFailed={Boolean(servicesError)}
          onRegister={handleRegister}
        />}
      </div>

    </main>
  );
}
