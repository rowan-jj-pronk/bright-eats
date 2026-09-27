# Brighte Eats

A small lead register with a React frontend, a TypeScript/Apollo GraphQL API, and SQLite storage.

## How to run

You need Node.js 20+ and npm for local development, or Docker with Compose for the container setup. Run the commands below from the repository root.

### Docker

```sh
docker compose up --build
```

The API creates the schema and seeds delivery, pick-up, and payment on first startup. Its database is stored in `./data/brighte-eats.sqlite` so it survives container restarts. Docker Compose runs the frontend with a proxy to the API container.

### Without Docker

```sh
cp api/.env.sample api/.env
npm --prefix api ci
npm --prefix web ci
(cd api && node scripts/create-db.mjs)
```

The bootstrap script creates the tables and indexes and seeds the three initial services. It can be rerun without deleting existing data. `api/.env` defaults to port `4000` and `DB_PATH=./data/brighte-eats.sqlite`; the database path is relative to `api/`.

Start the API and frontend in separate terminals, from the repository root:

```sh
npm --prefix api run dev
```

```sh
npm --prefix web run dev
```

Open the frontend at <http://localhost:5173> or the GraphQL API at <http://localhost:4000/>. For local development, Vite proxies `/graphql` to `http://localhost:4000`; Docker Compose sets its proxy target to `http://api:4000` inside the container network.

### Tests and build

```sh
npm --prefix api test
npm --prefix web test
npm --prefix web run build
```

The API tests build the TypeScript code first. The suites cover registration, validation, changing service types, duplicate prevention, rate limiting, pagination, form errors, and frontend retry rules.

## Why SQLite and React

SQLite keeps this exercise easy to run while still giving us transactions, foreign keys, and unique constraints. A database server would add setup work without improving this small local workflow. React and Vite keep the form, list, and detail view straightforward; Apollo Client connects them to the GraphQL API.

## Data modelling trade-offs

Service types live in `services`; `lead_services` holds the many-to-many interests and has a unique `(lead_id, service_code)` key. Adding a service means inserting a row rather than editing a TypeScript enum. 

The leads query uses limit/offset pagination, a service filter, and newest-first sorting. The API caps pages at 50. Indexes support recent leads and service filtering; it loads interests for the page in one query instead of querying once per lead.

## Validation strategy

The form gives immediate required-field and format feedback and disables submission until a service is selected. The API independently validates and normalises input with Zod, verifies that selected services are active, and uses parameterised SQL. GraphQL errors include a field for validation failures so the form can show useful feedback. 

The form shows loading, success, duplicate-email, rate-limit, and other error states. It keeps entered values after a failure. A successful registration opens that lead in the dashboard; 

## Idempotency and retries

Email is unique in SQLite without regard to case, and the lead/service pair is also unique. Registration runs in a transaction. An identical submission, after normalisation and regardless of service order, returns the saved lead without changing it. A submission with the same email but different details or interests returns a field error and leaves the original unchanged. 

The frontend automatically retries `RegisterLead` once after a connection failure, HTTP 408, or HTTP 5xx; it does not retry validation or rate-limit responses. 

The optional register rate limiter is applied with retries included in the request count.

## Schema evolution

The bootstrap script creates missing tables and seeds the initial services; it does not alter existing table definitions. New service types are data changes. Column or constraint changes would need versioned migrations, tested against an existing database rather than only a fresh one.

## What I would change at 10× scale

I would move to a managed relational database with migrations, a shared store for rate limits, and authentication and authorisation for the dashboard and write operations. I would measure query performance before changing the pagination approach; cursor pagination could replace offsets if deep scans become a problem. If registration gained external side effects, I would use a persistent request ID to make retries safe for those effects too.

## TODOs and known gaps

- Dashboard access has no authentication; it is intended for this local exercise.
- The API has no authentication for the same reason. 
- Caching was not considered on the API side.
- UI / UX was implemented at a basic level needs some work.
- The SQLite bootstrap is not a migration framework, and the in-memory rate limiter does not coordinate multiple API instances.

## AI Assistance

GitHub Copilot helped with Docker, environment, and dependency scaffolding and parts of the frontend markup and CSS. Github copilot autocomplete was also used for code completion test scafolding and keeping tests in line with code changes. 

## Project layout

- `api/`: Apollo Server, validation, SQLite access, and tests
- `web/`: React frontend and tests
- `shared/`: shared TypeScript types
- `docker-compose.yml`: local container development
