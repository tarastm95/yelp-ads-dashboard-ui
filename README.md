# Yelp Ads Campaign Manager

This repository contains two projects:

- **frontend/** – React application built with Vite
- **backend/** – Django REST Framework API

## Backend

1. Create a virtual environment and install dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and adjust credentials. The default PostgreSQL
user and password are both `yelpadmin`. When running via Docker Compose set
`DATABASE_URL` to use `db` as the host instead of `localhost`.

   The backend automatically creates a Django user using `YELP_API_KEY` and
   `YELP_API_SECRET` from the environment. These values must match the login
   and password you use on the frontend so that requests authenticated with
   `BasicAuthentication` are accepted.

   Credentials supplied via Basic authentication are stored in the database and
   reused for all requests sent to the Yelp partner API.

3. Apply migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

4. Run the development server

```bash
python manage.py runserver
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Tests

From the `backend` directory run:

```bash
pytest
```

## Development with Docker Compose

Running `docker compose up` starts both services with source code mounted in the
containers. Any file changes automatically reload Django and Vite.

If file watching does not work on your system (for example on Windows or
certain virtualized environments), Vite can be forced to poll for changes by
setting the `CHOKIDAR_USEPOLLING` environment variable.  This repository already
enables the variable in `docker-compose.yml` for convenience.

```bash
docker compose up --build
```

To continuously watch the output of both containers, run:

```bash
docker compose logs -f backend frontend
```

Adjust backend log verbosity via the `LOG_LEVEL` variable in `backend/.env`.

## Checking Program Status

After creating or editing a reseller program you can poll its status via
`/v1/reseller/status/<program_id>`.  The endpoint returns details for each
business that was updated.

Example request:

```
GET https://partner-api.yelp.com/v1/reseller/status/LYhR2q1OsOd2KYsE2y67_A
```

Example response:

```json
{
  "business_results": [
    {
      "status": "COMPLETED",
      "identifier": "e2JTWqyUwRHXjpG8TCZ7Ow",
      "identifier_type": "BUSINESS",
      "update_results": {
        "program_added": {
          "yelp_business_id": {
            "requested_value": "e2JTWqyUwRHXjpG8TCZ7Ow",
            "status": "COMPLETED"
          }
        }
      }
    }
  ],
  "status": "COMPLETED",
  "created_at": "2025-07-11T12:54:46+00:00",
  "completed_at": "2025-07-11T12:55:44+00:00"
}
```
