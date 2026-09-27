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
    "Could not connect to the API or save this lead.",
  );
  expect(screen.queryByText(/SQLITE_CONSTRAINT|internal detail/)).toBeNull();

  await user.click(screen.getByRole("button", { name: "Add to register" }));

  expect((await screen.findByRole("status")).textContent).toContain("Lead saved to the register.");
  expect(onRegister).toHaveBeenCalledTimes(2);
});

test("shows field-specific feedback returned by the API", async () => {
  const user = userEvent.setup();
  const onRegister = vi.fn().mockRejectedValue(new ApolloError({
    graphQLErrors: [new GraphQLError("Select an available service", {
      extensions: { code: "BAD_USER_INPUT", field: "services" },
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

  expect((await screen.findByRole("alert")).textContent).toBe("Services: Select an available service");
});
