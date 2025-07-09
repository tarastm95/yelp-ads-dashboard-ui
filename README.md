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
user and password are both `yelpadmin`.

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
