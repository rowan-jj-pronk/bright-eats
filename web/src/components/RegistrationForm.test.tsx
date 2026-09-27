import { ApolloError } from "@apollo/client";
import { GraphQLError } from "graphql";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import RegistrationForm from "./RegistrationForm";

test("shows a generic registration failure and allows the user to retry", async () => {
  const user = userEvent.setup();
  const onRegister = vi.fn()
    .mockRejectedValueOnce(new Error("SQLITE_CONSTRAINT: internal detail"))
    .mockResolvedValueOnce(undefined);

  render(
    <RegistrationForm
      serviceOptions={[{ code: "delivery", label: "Delivery" }]}
      servicesLoading={false}
      servicesLoadFailed={false}
      onRegister={onRegister}
    />,
  );

  await user.type(screen.getByLabelText("Full name"), "Alex Example");
  await user.type(screen.getByLabelText("Email address"), "alex@example.com");
  await user.type(screen.getByLabelText("Postcode"), "1234");
  await user.click(screen.getByRole("checkbox", { name: "Delivery" }));
  await user.click(screen.getByRole("button", { name: "Add to register" }));

  expect((await screen.findByRole("alert")).textContent).toContain(
    "We could not confirm whether the lead was saved.",
  );
  expect(screen.queryByText(/SQLITE_CONSTRAINT|internal detail/)).toBeNull();
  expect((screen.getByLabelText("Email address") as HTMLInputElement).value).toBe("alex@example.com");

  await user.click(screen.getByRole("button", { name: "Add to register" }));

  expect((await screen.findByRole("status")).textContent).toContain("Lead saved to the register.");
  expect(onRegister).toHaveBeenCalledTimes(2);
  expect(onRegister.mock.calls[1]?.[0]).toEqual(onRegister.mock.calls[0]?.[0]);
});

test("shows a duplicate email error returned by the API", async () => {
  const user = userEvent.setup();
  const onRegister = vi.fn().mockRejectedValue(new ApolloError({
    graphQLErrors: [new GraphQLError("A lead with this email address already exists", {
      extensions: { code: "BAD_USER_INPUT", field: "email" },
    })],
  }));

  render(<RegistrationForm
    serviceOptions={[{ code: "delivery", label: "Delivery" }]}
    servicesLoading={false}
    servicesLoadFailed={false}
    onRegister={onRegister}
  />);

  await user.type(screen.getByLabelText("Full name"), "Alex Example");
  await user.type(screen.getByLabelText("Email address"), "alex@example.com");
  await user.type(screen.getByLabelText("Postcode"), "1234");
  await user.click(screen.getByRole("checkbox", { name: "Delivery" }));
  await user.click(screen.getByRole("button", { name: "Add to register" }));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Email address: A lead with this email address already exists",
  );
});

test("shows a wait message when registration is rate limited", async () => {
  const user = userEvent.setup();
  const onRegister = vi.fn().mockRejectedValue(new ApolloError({
    graphQLErrors: [new GraphQLError("Too many requests", {
      extensions: { code: "TOO_MANY_REQUESTS" },
    })],
  }));

  render(<RegistrationForm
    serviceOptions={[{ code: "delivery", label: "Delivery" }]}
    servicesLoading={false}
    servicesLoadFailed={false}
    onRegister={onRegister}
  />);

  await user.type(screen.getByLabelText("Full name"), "Alex Example");
  await user.type(screen.getByLabelText("Email address"), "alex@example.com");
  await user.type(screen.getByLabelText("Postcode"), "1234");
  await user.click(screen.getByRole("checkbox", { name: "Delivery" }));
  await user.click(screen.getByRole("button", { name: "Add to register" }));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Too many registration attempts. Please try again later.",
  );
  expect(onRegister).toHaveBeenCalledTimes(1);
});
