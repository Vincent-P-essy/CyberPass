SHELL := /bin/bash
PYTHON ?= python3.12

.PHONY: help setup install dev demo up down logs migrate seed test test-api test-web test-e2e lint format build clean

help: ## Afficher les commandes disponibles
	@awk 'BEGIN {FS = ":.*## "; printf "CyberPass — commandes\n\n"} /^[a-zA-Z_-]+:.*?## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Générer une configuration locale avec des secrets aléatoires
	@./infra/scripts/bootstrap-env.sh

install: ## Installer les dépendances locales
	npm ci
	$(PYTHON) -m venv apps/api/.venv
	apps/api/.venv/bin/pip install --require-hashes -r apps/api/requirements-dev.lock

dev: up ## Démarrer la plateforme complète

demo: setup up migrate seed ## Préparer et charger la démonstration complète

up: ## Construire et démarrer les services Docker
	docker compose up --build -d
	@printf '\nCyberPass: http://localhost:3000\nAPI: http://localhost:8000/docs\nMinIO: http://localhost:9001\n'

down: ## Arrêter les services sans effacer les données
	docker compose down

logs: ## Suivre les journaux des services
	docker compose logs -f api web

migrate: ## Appliquer les migrations de base de données
	docker compose run --rm api alembic upgrade head

seed: ## Charger les données de démonstration
	docker compose run --rm api python -m scripts.seed

test: test-api test-web ## Exécuter tous les tests

test-api: ## Exécuter les tests backend
	cd apps/api && .venv/bin/python -m pytest

test-web: ## Exécuter les tests frontend
	npm --workspace @cyberpass/web run test

test-e2e: ## Exécuter le parcours critique Playwright
	npm --workspace @cyberpass/web run test:e2e

lint: ## Vérifier le format, le typage et les règles statiques
	cd apps/api && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy app
	npm run lint
	npm run typecheck
	npm --workspace @cyberpass/web run format:check

format: ## Formater le code
	cd apps/api && .venv/bin/ruff format . && .venv/bin/ruff check --fix .
	npm --workspace @cyberpass/web run format

build: ## Construire le frontend de production
	npm run build

clean: ## Supprimer uniquement les artefacts de build locaux
	docker compose down
	find apps -type d \( -name __pycache__ -o -name .pytest_cache -o -name .mypy_cache -o -name .ruff_cache -o -name .next \) -prune -exec rm -rf {} +
