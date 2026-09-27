import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, ApolloLink, ApolloProvider, HttpLink, InMemoryCache } from "@apollo/client";
import App from "./App";
import { mutationRetryLink } from "./mutationRetryLink";
import "./styles.css";

const client = new ApolloClient({
  link: ApolloLink.from([
    mutationRetryLink,
    new HttpLink({ uri: "/graphql" }),
  ]),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>,
);