# Exemples d’utilisation de l’API

## Statut et source de vérité

Ces exemples visent l’API FastAPI sous `/api/v1`. Ils utilisent les noms de champs camelCase produits/acceptés par les schémas Pydantic. **Le schéma réellement servi par `GET /openapi.json` et l’interface `/docs` restent les sources de vérité.** Après toute modification de route, exécuter la vérification indiquée à la fin de ce document.

Les valeurs sont fictives. Ne copiez jamais un token, cookie, mot de passe ou lien de passeport réel dans le dépôt, un ticket ou un journal partagé.

Les endpoints de diagnostic ne sont pas versionnés :

```bash
curl --fail-with-body --silent --show-error http://localhost:8000/health | jq
curl --fail-with-body --silent --show-error http://localhost:8000/ready | jq
```

`/health` confirme le processus ; `/ready` vérifie aussi une requête PostgreSQL. OpenAPI, Swagger et ReDoc sont exposés en développement mais volontairement désactivés lorsque `APP_ENV=production`.

## Préparer une session locale

Les commandes supposent `curl` et `jq` :

```bash
export API_ORIGIN='http://localhost:8000'
export API_BASE="${API_ORIGIN}/api/v1"
export COOKIE_JAR="$(mktemp)"
export DEMO_PASSWORD='ChangeMe-42-Local!'
```

Le cookie d’accès est `HttpOnly`. L’API renvoie aussi un token CSRF, qui doit accompagner toute mutation lorsque l’authentification repose sur le cookie.

### Créer un compte

```bash
AUTH_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/auth/register" \
    --header 'Content-Type: application/json' \
    --cookie-jar "${COOKIE_JAR}" \
    --data "$(jq -n \
      --arg email 'owner@acme-demo.test' \
      --arg fullName 'Responsable sécurité' \
      --arg password "${DEMO_PASSWORD}" \
      '{email: $email, fullName: $fullName, password: $password}')"
)"

export CSRF_TOKEN="$(printf '%s' "${AUTH_JSON}" | jq --raw-output '.csrfToken')"
printf '%s' "${AUTH_JSON}" | jq '{expiresIn, user}'
```

Réponse représentative, données variables omises :

```json
{
  "expiresIn": 1800,
  "user": {
    "id": "00000000-0000-0000-0000-000000000000",
    "email": "owner@acme-demo.test",
    "fullName": "Responsable sécurité"
  }
}
```

La réponse complète contient aussi `accessToken` et `csrfToken`. L’exemple les garde uniquement dans le processus local et ne les affiche pas.

### Se connecter à un compte existant

```bash
AUTH_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/auth/login" \
    --header 'Content-Type: application/json' \
    --cookie-jar "${COOKIE_JAR}" \
    --data "$(jq -n \
      --arg email 'owner@acme-demo.test' \
      --arg password "${DEMO_PASSWORD}" \
      '{email: $email, password: $password}')"
)"
export CSRF_TOKEN="$(printf '%s' "${AUTH_JSON}" | jq --raw-output '.csrfToken')"
```

### Lire l’identité courante

```bash
curl --fail-with-body --silent --show-error \
  "${API_BASE}/auth/me" \
  --cookie "${COOKIE_JAR}" | jq
```

### Fermer la session

À exécuter en fin de parcours :

```bash
curl --fail-with-body --silent --show-error \
  --request POST "${API_BASE}/auth/logout" \
  --cookie "${COOKIE_JAR}" \
  --header "X-CSRF-Token: ${CSRF_TOKEN}" | jq
```

## Créer et sélectionner une organisation

### Création

```bash
ORG_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/organizations" \
    --header 'Content-Type: application/json' \
    --header "X-CSRF-Token: ${CSRF_TOKEN}" \
    --cookie "${COOKIE_JAR}" \
    --cookie-jar "${COOKIE_JAR}" \
    --data '{
      "name": "Acme Démonstration",
      "description": "Organisation fictive sans donnée sensible"
    }'
)"

export ORGANIZATION_ID="$(printf '%s' "${ORG_JSON}" | jq --raw-output '.id')"
printf '%s' "${ORG_JSON}" | jq
```

La création initialise les contrôles du `CyberPass Starter Framework` et place l’organisation dans un cookie de contexte. Pour rendre le tenant visible dans les scripts, les exemples envoient également l’en-tête suivant :

```bash
--header "X-Organization-ID: ${ORGANIZATION_ID}"
```

Cet en-tête est un sélecteur, pas une autorisation. L’API vérifie toujours l’adhésion de l’utilisateur.

### Lister et sélectionner

```bash
curl --fail-with-body --silent --show-error \
  "${API_BASE}/organizations" \
  --cookie "${COOKIE_JAR}" | jq

curl --fail-with-body --silent --show-error \
  --request POST "${API_BASE}/organizations/${ORGANIZATION_ID}/select" \
  --header "X-CSRF-Token: ${CSRF_TOKEN}" \
  --cookie "${COOKIE_JAR}" \
  --cookie-jar "${COOKIE_JAR}" | jq

curl --fail-with-body --silent --show-error \
  "${API_BASE}/organizations/current" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" | jq
```

### Préparer une invitation

Le MVP crée une invitation hashée et expirante, mais l’envoi/acceptation doit être vérifié dans le périmètre réellement livré.

```bash
curl --fail-with-body --silent --show-error \
  --request POST "${API_BASE}/organizations/current/invitations" \
  --header 'Content-Type: application/json' \
  --header "X-CSRF-Token: ${CSRF_TOKEN}" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" \
  --data '{"email":"analyst@acme-demo.test","role":"ANALYST"}' | jq
```

L’API ne renvoie pas le token brut de l’invitation dans cette réponse.

## Consulter et modifier les contrôles

```bash
curl --fail-with-body --silent --show-error \
  "${API_BASE}/frameworks" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" | jq

CONTROLS_JSON="$(
  curl --fail-with-body --silent --show-error \
    "${API_BASE}/controls?status=NOT_ASSESSED" \
    --header "X-Organization-ID: ${ORGANIZATION_ID}" \
    --cookie "${COOKIE_JAR}"
)"
export CONTROL_ID="$(printf '%s' "${CONTROLS_JSON}" | jq --raw-output '.[0].id')"
printf '%s' "${CONTROLS_JSON}" | jq '.[0]'
```

Marquer le contrôle comme partiellement implémenté :

```bash
curl --fail-with-body --silent --show-error \
  --request PATCH "${API_BASE}/controls/${CONTROL_ID}" \
  --header 'Content-Type: application/json' \
  --header "X-CSRF-Token: ${CSRF_TOKEN}" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" \
  --data '{
    "status": "PARTIAL",
    "notes": "Déploiement en cours — état interne, pas une certification."
  }' | jq
```

Le passage à `VERIFIED` est refusé si aucune preuve active n’est reliée au contrôle.

## Ajouter et télécharger une preuve

### Upload multipart

Créer un fichier de démonstration local :

```bash
export DEMO_FILE="$(mktemp --suffix=.txt)"
printf '%s\n' \
  'Politique fictive de démonstration. Ne contient aucune donnée réelle.' \
  > "${DEMO_FILE}"
```

Créer la preuve et la relier au contrôle :

```bash
EVIDENCE_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/evidences" \
    --header "X-CSRF-Token: ${CSRF_TOKEN}" \
    --header "X-Organization-ID: ${ORGANIZATION_ID}" \
    --cookie "${COOKIE_JAR}" \
    --form 'title=Politique MFA de démonstration' \
    --form 'description=Procédure fictive révisée trimestriellement.' \
    --form 'publicSummary=Une procédure MFA documentée est revue périodiquement.' \
    --form 'evidenceType=POLICY' \
    --form 'confidentiality=SHARED_SUMMARY' \
    --form 'source=Démonstration locale' \
    --form "controlIds=[\"${CONTROL_ID}\"]" \
    --form "file=@${DEMO_FILE};type=text/plain"
)"

export EVIDENCE_ID="$(printf '%s' "${EVIDENCE_JSON}" | jq --raw-output '.id')"
printf '%s' "${EVIDENCE_JSON}" | jq
```

Pour `SHARED_SUMMARY`, `publicSummary` est obligatoire. La création renvoie le hash SHA-256 et les métadonnées, jamais la clé objet interne.

### Lecture et téléchargement authentifié

```bash
curl --fail-with-body --silent --show-error \
  "${API_BASE}/evidences/${EVIDENCE_ID}" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" | jq

curl --fail-with-body --silent --show-error --location \
  "${API_BASE}/evidences/${EVIDENCE_ID}/download" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" \
  --output /tmp/cyberpass-download.txt
```

Créer un lien de téléchargement très court :

```bash
DOWNLOAD_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/evidences/${EVIDENCE_ID}/download-url" \
    --header "X-CSRF-Token: ${CSRF_TOKEN}" \
    --header "X-Organization-ID: ${ORGANIZATION_ID}" \
    --cookie "${COOKIE_JAR}"
)"
printf '%s' "${DOWNLOAD_JSON}" | jq '{expiresIn}'
```

La propriété `url` contient un jeton temporaire : ne l’affichez pas dans un log ou une CI. Pour MinIO/S3, l’API peut ensuite rediriger vers une URL présignée.

## Importer et revoir un questionnaire

Les exemples utilisent un CSV fictif. Le même contrat accepte un fichier `.xlsx` ; `sheetName` permet alors de choisir une feuille.

```bash
export QUESTIONNAIRE_FILE="$(mktemp --suffix=.csv)"
printf '%s\n' \
  'Identifiant;Question;Commentaire' \
  'Q-01;Les comptes administrateurs utilisent-ils la MFA ?;Démonstration' \
  'Q-02;À quelle fréquence les sauvegardes sont-elles testées ?;Démonstration' \
  > "${QUESTIONNAIRE_FILE}"
```

### Prévisualiser et confirmer le mapping

```bash
PREVIEW_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/questionnaires/preview" \
    --header "X-CSRF-Token: ${CSRF_TOKEN}" \
    --header "X-Organization-ID: ${ORGANIZATION_ID}" \
    --cookie "${COOKIE_JAR}" \
    --form "file=@${QUESTIONNAIRE_FILE};type=text/csv"
)"

printf '%s' "${PREVIEW_JSON}" \
  | jq '{sourceFormat, columns, suggestedQuestionColumn, detectedQuestionCount, rows}'
```

L’aperçu ne persiste pas le questionnaire. L’interface doit montrer `columns`, `rows` et `suggestedQuestionColumn`, puis permettre une correction humaine.

```bash
QUESTION_COLUMN="$(printf '%s' "${PREVIEW_JSON}" | jq --raw-output '.suggestedQuestionColumn')"

QUESTIONNAIRE_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/questionnaires/import" \
    --header "X-CSRF-Token: ${CSRF_TOKEN}" \
    --header "X-Organization-ID: ${ORGANIZATION_ID}" \
    --cookie "${COOKIE_JAR}" \
    --form "file=@${QUESTIONNAIRE_FILE};type=text/csv" \
    --form 'name=Questionnaire client fictif' \
    --form "questionColumn=${QUESTION_COLUMN}"
)"

export QUESTIONNAIRE_ID="$(printf '%s' "${QUESTIONNAIRE_JSON}" | jq --raw-output '.id')"
printf '%s' "${QUESTIONNAIRE_JSON}" | jq
```

Pour un XLSX, envoyer en plus `--form 'sheetName=Nom de la feuille'` si l’utilisateur remplace la feuille proposée.

### Générer des brouillons sourcés

Charger le détail et retenir une question :

```bash
QUESTIONNAIRE_DETAIL="$(
  curl --fail-with-body --silent --show-error \
    "${API_BASE}/questionnaires/${QUESTIONNAIRE_ID}" \
    --header "X-Organization-ID: ${ORGANIZATION_ID}" \
    --cookie "${COOKIE_JAR}"
)"
export QUESTION_ID="$(printf '%s' "${QUESTIONNAIRE_DETAIL}" | jq --raw-output '.questions[0].id')"
```

Générer avec le fournisseur mock déterministe :

```bash
GENERATED_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/questionnaires/${QUESTIONNAIRE_ID}/generate" \
    --header 'Content-Type: application/json' \
    --header "X-CSRF-Token: ${CSRF_TOKEN}" \
    --header "X-Organization-ID: ${ORGANIZATION_ID}" \
    --cookie "${COOKIE_JAR}" \
    --data "$(jq -n --arg id "${QUESTION_ID}" \
      '{questionIds: [$id], allowExternalProvider: false}')"
)"

printf '%s' "${GENERATED_JSON}" \
  | jq '.questions[] | select(.id == env.QUESTION_ID) | {
      answerStatus,
      proposedAnswer: .answer.proposedAnswer,
      confidence: .answer.confidence,
      evidenceIds: .answer.evidenceIds,
      missingInformation: .answer.missingInformation,
      riskFlags: .answer.riskFlags,
      requiresHumanReview: .answer.requiresHumanReview,
      modelVersion: .answer.modelVersion
    }'
```

Pour autoriser OpenAI, passer `allowExternalProvider: true`. Cela autorise l’envoi des seuls contenus `PUBLIC` et résumés `SHARED_SUMMARY`, après masquage. OpenAI n’est réellement sélectionné que si `OPENAI_API_KEY` **et** `OPENAI_MODEL` sont configurés ; sinon le mock reste utilisé. Ne pas activer ce drapeau sans base juridique, information utilisateur et configuration de traitement adaptées.

### Modifier puis approuver

L’édition seule place la question dans `MANUALLY_ANSWERED`. Elle n’équivaut pas à une approbation.

```bash
curl --fail-with-body --silent --show-error \
  --request PATCH \
  "${API_BASE}/questionnaires/${QUESTIONNAIRE_ID}/questions/${QUESTION_ID}/answer" \
  --header 'Content-Type: application/json' \
  --header "X-CSRF-Token: ${CSRF_TOKEN}" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" \
  --data '{
    "answer": "Oui, la procédure fictive prévoit une MFA. La portée doit encore être confirmée par le responsable."
  }' | jq '{answerStatus, answer}'

curl --fail-with-body --silent --show-error \
  --request POST \
  "${API_BASE}/questionnaires/${QUESTIONNAIRE_ID}/questions/${QUESTION_ID}/approve" \
  --header 'Content-Type: application/json' \
  --header "X-CSRF-Token: ${CSRF_TOKEN}" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" \
  --data '{}' | jq '{answerStatus, answer}'
```

L’API ne possède aucune route d’auto-approbation et force `requiresHumanReview` à `true` sur les suggestions.

### Exporter les réponses

```bash
curl --fail-with-body --silent --show-error \
  "${API_BASE}/questionnaires/${QUESTIONNAIRE_ID}/export?format=csv" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" \
  --output /tmp/cyberpass-questionnaire.csv

curl --fail-with-body --silent --show-error \
  "${API_BASE}/questionnaires/${QUESTIONNAIRE_ID}/export?format=xlsx" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" \
  --output /tmp/cyberpass-questionnaire.xlsx
```

Le fichier contient l’ordre, la question, la réponse finale, le statut et les UUID des preuves citées. Les exports sont des documents de travail, pas des attestations CyberPass.

## Publier puis révoquer un passeport

La création est réservée à `ADMIN` et `OWNER`. L’expiration doit inclure un fuseau, être future et ne peut pas dépasser un an. La preuve choisie doit être `PUBLIC` ou `SHARED_SUMMARY` et liée à l’un des contrôles partagés.

```bash
export PASSPORT_EXPIRES_AT="$(date --utc --date='+7 days' '+%Y-%m-%dT%H:%M:%SZ')"

SHARE_JSON="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE}/share-links" \
    --header 'Content-Type: application/json' \
    --header "X-CSRF-Token: ${CSRF_TOKEN}" \
    --header "X-Organization-ID: ${ORGANIZATION_ID}" \
    --cookie "${COOKIE_JAR}" \
    --data "$(jq -n \
      --arg title 'Passeport de démonstration' \
      --arg expiresAt "${PASSPORT_EXPIRES_AT}" \
      --arg controlId "${CONTROL_ID}" \
      --arg evidenceId "${EVIDENCE_ID}" \
      '{
        title: $title,
        expiresAt: $expiresAt,
        controlIds: [$controlId],
        evidenceIds: [$evidenceId]
      }')"
)"

export SHARE_ID="$(printf '%s' "${SHARE_JSON}" | jq --raw-output '.id')"
export PUBLIC_PATH="$(printf '%s' "${SHARE_JSON}" | jq --raw-output '.publicPath')"
printf '%s' "${SHARE_JSON}" | jq 'del(.token, .publicPath)'
```

La réponse de création contient le token brut et `publicPath` une seule fois. `SHARE_JSON` et `PUBLIC_PATH` sont donc sensibles pendant cet exemple : ne pas les journaliser ni les exporter dans une CI.

### Consultation sans authentification

```bash
PUBLIC_JSON="$(
  curl --fail-with-body --silent --show-error \
    "${API_ORIGIN}${PUBLIC_PATH}"
)"

printf '%s' "${PUBLIC_JSON}" | jq '{
  organization,
  lastUpdatedAt,
  expiresAt,
  controls,
  disclaimer
}'
```

Vérifications essentielles :

```bash
printf '%s' "${PUBLIC_JSON}" | jq --exit-status \
  --arg controlId "${CONTROL_ID}" \
  --arg expectedSummary "Une procédure MFA documentée est revue périodiquement." '
    (.controls | length) == 1
    and (.controls[0].id == $controlId)
    and (.controls[0].evidences | length) == 1
    and (.controls[0].evidences[0].description == $expectedSummary)
    and (.controls[0].evidences[0] | has("id") | not)
    and (.controls[0].evidences[0] | has("sha256") | not)
    and (.controls[0].evidences[0] | has("objectKey") | not)
    and (.controls[0].evidences[0] | has("downloadUrl") | not)
  '
```

Une preuve `SHARED_SUMMARY` expose son résumé public avec un libellé générique, jamais son titre, sa source, sa description interne ni son fichier. Une preuve `CONFIDENTIAL` ou `RESTRICTED` est refusée à la création du partage.

### Révocation

```bash
curl --fail-with-body --silent --show-error \
  --request POST "${API_BASE}/share-links/${SHARE_ID}/revoke" \
  --header "X-CSRF-Token: ${CSRF_TOKEN}" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" | jq '{id, revokedAt}'

curl --silent --output /dev/null --write-out '%{http_code}\n' \
  "${API_ORIGIN}${PUBLIC_PATH}"
```

La dernière commande doit afficher `404`. Le refus ne renvoie aucune donnée du passeport.

## Consulter le tableau de bord et l’audit

Le tableau de bord expose un taux de complétion factuel, pas un score de sécurité :

```bash
curl --fail-with-body --silent --show-error \
  "${API_BASE}/dashboard" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" | jq '{
    assessedControls,
    verifiedControls,
    totalControls,
    completionRate,
    expiredEvidences,
    expiringEvidences,
    activeQuestionnaires,
    answersRequiringReview,
    activeShareLinks
  }'
```

Le journal est paginé par `limit` (1 à 200) et `offset` :

```bash
curl --fail-with-body --silent --show-error \
  "${API_BASE}/audit-events?limit=20&offset=0" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" \
  --cookie "${COOKIE_JAR}" \
  | jq '.[] | {createdAt, action, resourceType, resourceId, eventMetadata}'
```

Les événements ne contiennent pas les cookies, tokens, clés objet, fichiers ou prompts complets.

## Authentification Bearer pour un client API

Un client non navigateur peut extraire `accessToken` de la réponse de connexion et l’envoyer ainsi :

```bash
export ACCESS_TOKEN="$(printf '%s' "${AUTH_JSON}" | jq --raw-output '.accessToken')"

curl --fail-with-body --silent --show-error \
  "${API_BASE}/controls" \
  --header "Authorization: Bearer ${ACCESS_TOKEN}" \
  --header "X-Organization-ID: ${ORGANIZATION_ID}" | jq
```

Lorsqu’un en-tête Bearer est utilisé sans cookie d’accès, le double-submit CSRF ne s’applique pas. Le token Bearer doit néanmoins rester en mémoire, être transmis uniquement par HTTPS et ne jamais être placé dans `localStorage` ou dans une URL.

## Codes d’erreur importants

| Code | Sens attendu |
|---:|---|
| 400 | Contexte d’organisation ambigu ou requête incohérente |
| 401 | Session absente, altérée ou expirée |
| 403 | CSRF invalide ou rôle insuffisant |
| 404 | Ressource absente **ou hors tenant**, sans distinction |
| 409 | Conflit d’unicité ou invariant métier |
| 413 | Fichier au-delà de la limite configurée |
| 422 | Schéma, type de fichier, mapping ou transition invalide |
| 429 | Limite de tentatives atteinte |

Ne déduisez jamais l’existence d’une ressource d’un autre tenant à partir d’un `404`.

## Vérifier les exemples contre OpenAPI

Une fois l’API lancée :

```bash
curl --fail-with-body --silent --show-error \
  "${API_ORIGIN}/openapi.json" \
  | jq --raw-output '.paths | keys[]'
```

Comparer cette liste avec les chemins de ce document. Aucune route absente d’OpenAPI ne doit être présentée comme exécutable ; vérifier aussi méthodes, formats multipart, noms camelCase et codes de réponse.

## Nettoyage de la démonstration locale

```bash
rm -f \
  "${COOKIE_JAR}" \
  "${DEMO_FILE}" \
  "${QUESTIONNAIRE_FILE}" \
  /tmp/cyberpass-download.txt \
  /tmp/cyberpass-questionnaire.csv \
  /tmp/cyberpass-questionnaire.xlsx
unset \
  ACCESS_TOKEN AUTH_JSON CSRF_TOKEN DEMO_PASSWORD EVIDENCE_ID ORGANIZATION_ID \
  QUESTIONNAIRE_ID QUESTION_ID
unset PASSPORT_EXPIRES_AT PUBLIC_JSON PUBLIC_PATH SHARE_ID SHARE_JSON
```
