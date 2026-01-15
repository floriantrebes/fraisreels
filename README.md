# Frais réels

Application FastAPI pour suivre des frais réels (France) par foyer, personne
et véhicule, avec calcul automatique basé sur un barème paramétrable.

## Fonctionnalités

- Création de foyers, personnes et véhicules.
- Saisie mensuelle des kilomètres par véhicule.
- Saisie des frais de repas et des frais professionnels annexes.
- Calcul automatique des déductions pour une année donnée.

## Barème utilisé

Le barème kilométrique est défini dans `app/constants.py` et peut être mis à
jour lorsqu'un nouveau barème est publié.

Les frais de repas utilisent un minimum et un maximum journaliers, également
configurés dans `app/constants.py`.

## Installation

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Lancer l'API

```bash
uvicorn app.main:app --reload
```

## Exemple d'usage

```bash
curl -X POST http://127.0.0.1:8000/households \
  -H 'Content-Type: application/json' \
  -d '{"name": "Foyer Martin"}'
```

## Exemple complet (création des entités)

```bash
#!/usr/bin/env bash
set -euo pipefail

curl -X POST http://127.0.0.1:8000/households \
  -H 'Content-Type: application/json' \
  -d '{"name": "Foyer Martin"}'

curl -X POST http://127.0.0.1:8000/persons \
  -H 'Content-Type: application/json' \
  -d '{"household_id": 1, "first_name": "Alice", "last_name": "Martin"}'

curl -X POST http://127.0.0.1:8000/vehicles \
  -H 'Content-Type: application/json' \
  -d '{"person_id": 1, "name": "Peugeot 308", "power_cv": 5}'

curl -X POST http://127.0.0.1:8000/mileage \
  -H 'Content-Type: application/json' \
  -d '{"person_id": 1, "vehicle_id": 1, "year": 2024, "month": 5, "km": 1200}'

curl -X POST http://127.0.0.1:8000/meals \
  -H 'Content-Type: application/json' \
  -d '{"person_id": 1, "year": 2024, "month": 5, "meal_cost": 18.5}'

curl -X POST http://127.0.0.1:8000/other-expenses \
  -H 'Content-Type: application/json' \
  -d '{
    "person_id": 1,
    "year": 2024,
    "description": "Matériel",
    "amount": 249.9
  }'
```

## Tests

```bash
pytest
```
