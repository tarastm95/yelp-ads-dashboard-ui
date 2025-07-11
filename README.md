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

```bash
docker compose up --build
```

Adjust backend log verbosity via the `LOG_LEVEL` variable in `backend/.env`.
