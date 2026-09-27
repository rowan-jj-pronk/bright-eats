import { ArrowLeft, LoaderCircle, UserRound } from "lucide-react";
import { formatDate } from "../formatDate";
import type { Lead, ServiceOption } from "../types";

type Props = {
  lead: Lead | null;
  loading: boolean;
  hasLoadError: boolean;
  serviceOptions: ServiceOption[];
  onBack: () => void;
};

export default function LeadDetail({ lead, loading, hasLoadError, serviceOptions, onBack }: Props) {
  return (
    <section className="detail-view">
      <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to leads</button>
      {loading && <p className="state state-loading"><LoaderCircle className="spinner" size={17} /> Loading lead details ...</p>}
      {hasLoadError && <p className="state state-error">Lead details failed to load.</p>}
      {lead && <>
        <div className="detail-heading">
          <div className="detail-avatar"><UserRound size={22} /></div>
          <div><p className="eyebrow">LEAD DETAILS</p><h1 id="detail-heading">{lead.name}</h1></div>
        </div>
        <dl className="detail-list">
          <div><dt>Email</dt><dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd></div>
          <div><dt>Mobile</dt><dd>{lead.mobile ? <a href={`tel:${lead.mobile}`}>{lead.mobile}</a> : "Not provided"}</dd></div>
          <div><dt>Postcode</dt><dd>{lead.postcode}</dd></div>
          <div><dt>Services</dt><dd className="service-tags">{lead.services.map((code) => <span className="service-tag" key={code}>{serviceOptions.find((option) => option.code === code)?.label ?? code}</span>)}</dd></div>
          <div><dt>Added</dt><dd>{formatDate(lead.created_at)}</dd></div>
        </dl>
      </>}
    </section>
  );
}