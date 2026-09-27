import { useState } from "react";
import type { FormEvent } from "react";
import { ApolloError } from "@apollo/client";
import { Check, LoaderCircle, Plus } from "lucide-react";
import type { LeadRegistration, ServiceOption } from "../types";

const fieldLabels: Record<string, string> = {
  name: "Full name",
  email: "Email address",
  mobile: "Mobile",
  postcode: "Postcode",
  services: "Services",
};

type Props = {
  serviceOptions: ServiceOption[];
  servicesLoading: boolean;
  servicesLoadFailed: boolean;
  onRegister: (input: LeadRegistration) => Promise<void>;
};

export default function RegistrationForm({ serviceOptions, servicesLoading, servicesLoadFailed, onRegister }: Props) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");
    setFormError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSaving(true);

    try {
      await onRegister({
        name: String(formData.get("name")).trim(),
        email: String(formData.get("email")).trim(),
        mobile: String(formData.get("mobile")).trim() || null,
        postcode: String(formData.get("postcode")).trim(),
        services: selectedServices,
      });
      form.reset();
      setSelectedServices([]);
      setFormMessage("Lead saved to the register.");
    } catch (error) {
      const validationError = error instanceof ApolloError
        ? error.graphQLErrors.find((item) => item.extensions?.code === "BAD_USER_INPUT")
        : undefined;
      const rateLimited = error instanceof ApolloError
        && error.graphQLErrors.some((item) => item.extensions?.code === "TOO_MANY_REQUESTS");
      const field = validationError?.extensions?.field;
      const label = typeof field === "string" ? fieldLabels[field] : undefined;
      setFormError(validationError
        ? `${label ? `${label}: ` : ""}${validationError.message}`
        : rateLimited
          ? "Too many registration attempts. Please try again later."
          : "We could not confirm whether the lead was saved. Try again with the same details; this will not create a second lead.");
    } finally {
      setSaving(false);
    }
  }

  function toggleService(code: string) {
    setSelectedServices((current) => current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code]);
  }

  return (
    <div className="register-view">
      <div className="page-heading">
        <div><p className="eyebrow">CUSTOMER INTAKE</p><h1>Register a lead</h1><p className="page-subtitle">Enter the customer details and services of interest.</p></div>
      </div>
      <section className="form-panel" aria-labelledby="new-lead-heading">
        <div className="form-heading">
          <span className="form-icon"><Plus size={16} /></span>
          <div><h2 id="new-lead-heading">New enquiry</h2><p>Enter the customer details below.</p></div>
        </div>
        <form className="lead-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" placeholder="e.g. Alex Morgan" required maxLength={100} />
          <label className="field-label" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="alex@example.com" required />
          <label className="field-label" htmlFor="mobile">Mobile <span>OPTIONAL</span></label>
          <input id="mobile" name="mobile" type="tel" autoComplete="tel" placeholder="04xx xxx xxx" />
          <label className="field-label" htmlFor="postcode">Postcode</label>
          <input id="postcode" name="postcode" inputMode="numeric" autoComplete="postal-code" placeholder="4 digits" required pattern="[0-9]{4}" maxLength={4} title="Enter a 4-digit postcode" />

          <fieldset className="service-fieldset">
            <legend>Services of interest <span>SELECT AT LEAST ONE</span></legend>
            {servicesLoading && <p className="field-hint">Loading services ...</p>}
            {servicesLoadFailed && <p className="field-hint state-error">Service list failed to load.</p>}
            {!servicesLoading && serviceOptions.length === 0 && !servicesLoadFailed && <p className="field-hint">No active services are available.</p>}
            <div className="service-options">{serviceOptions.map((service) => {
              const checked = selectedServices.includes(service.code);
              return <label className={`service-option${checked ? " selected" : ""}`} key={service.code}>
                <input type="checkbox" checked={checked} onChange={() => toggleService(service.code)} />
                <span className="checkmark">{checked && <Check size={12} />}</span>
                <span>{service.label}</span>
              </label>;
            })}</div>
          </fieldset>

          {formError && <p className="form-feedback feedback-error" role="alert">{formError}</p>}
          {formMessage && <p className="form-feedback feedback-success" role="status">{formMessage}</p>}
          <button className="submit-button" type="submit" disabled={saving || servicesLoading || selectedServices.length === 0}>
            {saving ? <LoaderCircle className="spinner" size={16} /> : <Plus size={16} />}
            {saving ? "Saving enquiry" : "Add to register"}
          </button>
        </form>
      </section>
    </div>
  );
}
