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

## Tests

```bash
pytest
```
