import { ArrowDown, ChevronLeft, ChevronRight, LoaderCircle, Search, UserRound } from "lucide-react";
import { formatDate } from "../formatDate";
import type { Lead, ServiceOption } from "../types";

type Props = {
  leads: Lead[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  filter: string;
  serviceOptions: ServiceOption[];
  loading: boolean;
  hasLoadError: boolean;
  hasServiceLoadError: boolean;
  servicesLoading: boolean;
  onFilterChange: (filter: string) => void;
  onPageChange: (page: number) => void;
  onSelectLead: (leadId: string) => void;
};

export default function Dashboard({
  leads,
  totalCount,
  page,
  pageSize,
  pageCount,
  filter,
  serviceOptions,
  loading,
  hasLoadError,
  hasServiceLoadError,
  servicesLoading,
  onFilterChange,
  onPageChange,
  onSelectLead,
}: Props) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Lead register</h1>
        </div>
        <div className="lead-total" aria-live="polite">
          <span className="total-number">{totalCount}</span>
          <span className="total-label">TOTAL LEADS</span>
        </div>
      </div>

      <section className="lead-panel" aria-labelledby="leads-heading">
        <div className="panel-heading">
          <div>
            <h2 id="leads-heading">All enquiries</h2>
            <p>Newest enquiries appear first</p>
          </div>
          <label className="filter-control">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Filter leads by service</span>
            <select value={filter} onChange={(event) => onFilterChange(event.target.value)} disabled={servicesLoading || hasServiceLoadError}>
              <option value="">All services</option>
              {serviceOptions.map((service) => <option value={service.code} key={service.code}>{service.label}</option>)}
            </select>
          </label>
        </div>

        {hasLoadError && <p className="state state-error">Lead list failed to load.</p>}
        {hasServiceLoadError && <p className="state state-error">Service list failed to load.</p>}
        {loading && leads.length === 0 && <div className="state state-loading"><LoaderCircle className="spinner" size={17} /> Loading leads</div>}
        {!loading && !hasLoadError && leads.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon"><UserRound size={19} /></span>
            <strong>No leads found</strong>
            <span>{filter ? "Try another service filter." : "New enquiries will appear here."}</span>
          </div>
        )}

        {leads.length > 0 && <>
          <div className="table-scroll">
            <table className="lead-table">
              <thead><tr>
                <th scope="col">CONTACT <ArrowDown size={12} aria-hidden="true" /></th>
                <th scope="col">POSTCODE</th>
                <th scope="col">INTERESTS</th>
                <th scope="col">ADDED</th>
              </tr></thead>
              <tbody>{leads.map((lead) => <tr
                key={lead.id}
                className="lead-row"
                tabIndex={0}
                aria-label={`Open lead details for ${lead.name}`}
                onClick={(event) => {
                  if (!(event.target instanceof Element) || !event.target.closest('a')) {
                    onSelectLead(lead.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onSelectLead(lead.id);
                  }
                }}
              >
                <td>
                  <span className="lead-select">{lead.name}</span>
                  <a className="contact-email" href={`mailto:${lead.email}`}>{lead.email}</a>
                  {lead.mobile && <a className="contact-mobile" href={`tel:${lead.mobile}`}>{lead.mobile}</a>}
                </td>
                <td className="postcode">{lead.postcode}</td>
                <td><div className="service-tags">{lead.services.map((code) => {
                  const label = serviceOptions.find((option) => option.code === code)?.label ?? code;
                  return <span className="service-tag" key={code}>{label}</span>;
                })}</div></td>
                <td className="date-cell">{formatDate(lead.created_at)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}</span>
            <div className="page-controls">
              <button type="button" className="icon-button" aria-label="Previous page" disabled={page === 0 || loading} onClick={() => onPageChange(Math.max(0, page - 1))}><ChevronLeft size={16} /></button>
              <span>Page {page + 1} of {Math.max(pageCount, 1)}</span>
              <button type="button" className="icon-button" aria-label="Next page" disabled={page + 1 >= pageCount || loading} onClick={() => onPageChange(page + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>
        </>}
      </section>
    </>
  );
}