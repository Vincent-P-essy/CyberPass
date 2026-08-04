# CyberPass API

API FastAPI du vertical slice CyberPass. Le runtime cible PostgreSQL et un stockage objet S3/MinIO.
SQLite et le stockage local privé sont réservés aux tests et au développement léger.

## Démarrage local

Depuis `apps/api` :

```bash
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
alembic upgrade head
python -m scripts.generate_demo_xlsx
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

La documentation OpenAPI est exposée sur `http://localhost:8000/docs` hors production. Les sondes
sont `GET /health` et `GET /ready`.

## Authentification et organisation active

`POST /api/v1/auth/login` renvoie un JWT utilisable avec `Authorization: Bearer …` et pose aussi un
cookie HttpOnly. En mode cookie, toute mutation doit transmettre la valeur du cookie
`cyberpass_csrf` dans `X-CSRF-Token`. Le cookie sécurisé est obligatoire en staging et production.
Ces environnements refusent également les secrets faibles, les origines CORS non HTTPS, SQLite et
le stockage local.

Les routes locataires attendent `X-Organization-ID`. Le serveur vérifie l'adhésion et le rôle. Le
fallback sans en-tête n'est autorisé que si l'utilisateur ne possède qu'une seule adhésion active.
Les recherches de ressources ajoutent systématiquement l'identifiant d'organisation et répondent
404 en cas d'accès inter-tenant.

## Stockage et génération de réponses

`STORAGE_BACKEND=s3` active S3/MinIO. `S3_ENDPOINT_URL` désigne l'adresse interne et
`S3_PUBLIC_ENDPOINT_URL` l'adresse utilisée pour signer les téléchargements côté navigateur. Les
objets restent privés; le nom physique est généré par le serveur, le contenu est borné et validé,
et son SHA-256 est enregistré. `scan_for_malware` est le point d'extension du futur scanner.
Les jetons de passeport et de téléchargement présents dans des chemins sont masqués par un filtre
sur le journal d'accès Uvicorn. Le proxy d'entrée doit conserver cette règle de masquage. Les
réponses API authentifiées et les téléchargements portent `Cache-Control: private, no-store`.

Le fournisseur de génération est déterministe par défaut. OpenAI n'est utilisé que lorsque
`OPENAI_API_KEY`, `OPENAI_MODEL` et le consentement explicite `allowExternalProvider` sont présents.
Les preuves confidentielles ou restreintes sont alors exclues du contexte envoyé. Aucune réponse
n'est approuvée automatiquement.
Une requête traite au plus 25 questions, subit une limite de débit et l'appel externe possède un
délai maximal configurable.

Les aperçus/imports XLSX contrôlent le volume ZIP décompressé, le taux de compression, le nombre de
feuilles, lignes, colonnes et la taille de chaque cellule. Les feuilles cachées sont ignorées. Les
limites de débit sont appliquées aux authentifications, uploads, téléchargements, générations et
passeports publics; ce dernier combine une borne par jeton et un plafond global de protection.

`GET /questionnaires/{id}/export` reste strictement en lecture. La variante `POST`, protégée par
CSRF en mode cookie, marque le questionnaire `EXPORTED` et ajoute l'événement d'audit. Les listes de
preuves, questionnaires et liens de partage acceptent `limit` (100 par défaut, 500 maximum) et
`offset` tout en conservant une réponse sous forme de tableau.

## Limites explicites du milestone

- La récupération de mot de passe et la livraison des invitations attendent un fournisseur email;
  aucune route ne simule un envoi inexistant.
- L'import de questionnaire PDF reste au backlog; CSV et XLSX sont pris en charge.
- Les limites de débit et le verrou de génération par organisation sont locaux au processus. Une
  exécution multi-instance doit les déplacer vers Redis ou un verrou distribué.
- Le proxy doit masquer les jetons présents dans les URLs de partage et de téléchargement, en plus
  du filtre Uvicorn fourni.
- La suppression ou l'expiration ultérieure d'une preuve ne rétrograde pas encore automatiquement
  un contrôle `VERIFIED`; le tableau de bord signale toutefois les preuves expirées.
- Le point d'extension antivirus est prêt, mais aucun moteur de scan n'est activé par défaut.

## Qualité

```bash
ruff check app tests scripts
mypy app
python -m pytest
```

Les tests d'acceptation couvrent l'isolation des organisations, l'import et l'export d'un
questionnaire, la révocation d'un passeport et la non-divulgation des preuves confidentielles.
