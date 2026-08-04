# Hypothèses et décisions réversibles

## Objet

Ce registre rend visibles les choix nécessaires pour avancer lorsque le cahier des charges laisse plusieurs options raisonnables. Une hypothèse n’est ni une fonctionnalité livrée, ni une garantie de sécurité. Tout élément marqué **à synchroniser** doit être aligné sur le code et les tests avant la livraison.

## Hypothèses produit

| Réf. | Hypothèse retenue pour le MVP | Conséquence | Statut |
|---|---|---|---|
| P-01 | CyberPass est un outil de collecte, revue et partage de preuves, pas un certificateur. | Un avertissement explicite figure dans les passeports et aucune formulation ne garantit une conformité. | Contractuel |
| P-02 | Le premier parcours est celui du fournisseur ; l’évaluateur consulte un lien externe ciblé sans compte. | Pas de portail acheteur multi-fournisseurs dans le MVP. | Contractuel |
| P-03 | Une organisation est le tenant de sécurité et de facturation futur. | Toutes les ressources métier appartenant au client portent `organization_id`. | Contractuel |
| P-04 | Un utilisateur peut appartenir à plusieurs organisations et choisit une organisation active. | Le changement de contexte est validé côté serveur contre `Membership`. | Contractuel |
| P-05 | Le catalogue `CyberPass Starter Framework` est une démonstration interne. | Aucun logo, identifiant ou texte ne laisse croire à une intégration officielle ISO 27001, NIS2 ou ReCyF. | Contractuel |
| P-06 | Les statuts de contrôles sont des déclarations de suivi de l’organisation. | `VERIFIED` ne vaut pas certification indépendante ; son sens et sa provenance doivent rester traçables. | Contractuel |
| P-07 | Toute réponse issue de l’IA est un brouillon. | L’approbation humaine est obligatoire et distincte de la génération. | Contractuel |
| P-08 | Les preuves confidentielles peuvent soutenir une réponse interne sans être publiées. | Les références internes et la projection du passeport sont deux politiques d’exposition séparées. | Contractuel |

## Identité et autorisations

| Réf. | Décision par défaut | Justification | À synchroniser |
|---|---|---|---|
| I-01 | JWT HS256 transmis par `cyberpass_access` (`HttpOnly`) pour le navigateur et accepté en Bearer ; mutations cookie protégées par `cyberpass_csrf` en double-submit ; contexte mémorisé dans `cyberpass_organization`. | Réduit l’exposition au JavaScript tout en gardant un contrat API utilisable. | Rotation/révocation et contrôle d’origine avant production |
| I-02 | Mot de passe haché avec la configuration moderne recommandée de `pwdlib` ; les paramètres doivent être vérifiés sur l’environnement déployé. | Évite d’inscrire dans la documentation un algorithme que la configuration pourrait faire évoluer. | Algorithme et paramètres effectifs à consigner au rapport |
| I-03 | `OWNER` peut gérer rôles et organisation ; `ADMIN` gère le contenu ; `ANALYST` crée et révise ; `VIEWER` lit le contenu interne autorisé. | Matrice simple, explicite et testable. | Matrice exacte route par route |
| I-04 | Le dernier `OWNER` ne peut pas être supprimé ou rétrogradé. | Évite une organisation orpheline. | Couverture de test |
| I-05 | Les invitations complètes et la récupération de mot de passe peuvent être différées si elles compromettent le vertical slice. | Le cahier des charges accepte une structure prête pour les invitations et qualifie la récupération de raisonnable. | Fonctionnalités réellement exposées |
| I-06 | Les refus inter-tenant répondent comme une ressource inexistante. | Limite l’énumération et les IDOR. | Code HTTP uniforme réellement utilisé |

## Données et persistance

| Réf. | Décision par défaut | Justification | À synchroniser |
|---|---|---|---|
| D-01 | UUID pour les identifiants publics ; clés internes éventuelles jamais exposées. | Réduit l’énumération sans remplacer l’autorisation. | Type UUID exact et sérialisation |
| D-02 | Horodatages stockés en UTC, rendus dans le fuseau de l’utilisateur. | Comparaisons et expirations cohérentes. | Gestion effective du fuseau côté UI |
| D-03 | PostgreSQL est la source de vérité ; MinIO ne contient que les objets privés. | Transactions relationnelles et stockage d’objets séparés. | Versions et configuration réelles |
| D-04 | Les ressources sensibles utilisent une suppression logique lorsque l’historique/audit l’exige ; l’objet est supprimé ou mis en rétention selon la politique choisie. | Conciliation audit, récupération et minimisation. | Politique de rétention et purge |
| D-05 | L’audit est append-only au niveau applicatif ; l’immuabilité forte de base/stockage est hors MVP. | Fournit une traçabilité utile sans prétendre à une preuve inviolable. | Permissions SQL et mécanisme d’écriture réels |
| D-06 | Redis n’est pas requis tant que les imports et générations restent bornés et synchrones. | Évite une infrastructure prématurée. | Introduire une file avant charges longues ou reprise automatique |

## Fichiers et preuves

| Réf. | Décision par défaut | Justification | À synchroniser |
|---|---|---|---|
| F-01 | Les buckets sont privés ; toute lecture passe par une autorisation serveur puis une URL signée brève. La valeur locale prévue est de 300 secondes. | Empêche l’accès public permanent. | Confirmer `SIGNED_URL_SECONDS` dans l’environnement livré |
| F-02 | La clé objet est aléatoire et générée côté serveur ; le nom original n’est qu’une métadonnée assainie. | Évite path traversal, collision et divulgation de chemin. | Schéma exact des clés |
| F-03 | Type autorisé par liste blanche, vérifié par extension, type déclaré/normalisé et signature pour les formats connus. La limite configurée par défaut est de 10 Mio. | Le type fourni par le navigateur n’est pas fiable. | Renforcer la détection de contenu générique et confirmer `MAX_UPLOAD_BYTES` |
| F-04 | SHA-256 sert à l’intégrité et à l’identification, pas à prouver l’authenticité d’un document. | Un condensat seul ne signe ni l’auteur ni la date. | Affichage UX de cette nuance |
| F-05 | Le MVP prépare un état de quarantaine mais n’affirme pas analyser les fichiers par antivirus. | ClamAV est explicitement hors premier milestone. | Comportement tant qu’aucun scan n’existe |
| F-06 | Une preuve expirée reste historique mais est signalée et ne doit pas être décrite comme actuelle. | Préserve la traçabilité sans induire l’évaluateur en erreur. | Règles de présentation et de génération IA |

## Questionnaires

| Réf. | Décision par défaut | Justification | À synchroniser |
|---|---|---|---|
| Q-01 | CSV UTF-8 et XLSX moderne sont les formats obligatoires ; PDF est différé. | Réduit l’ambiguïté d’extraction et sécurise le vertical slice. | Encodages CSV de secours réellement pris en charge |
| Q-02 | La détection feuille/colonne est heuristique et toujours confirmable dans un aperçu. | Les questionnaires clients ne suivent pas un schéma unique. | Algorithme, score et UI réels |
| Q-03 | Les colonnes originales sont conservées sous forme structurée bornée. | Permet correction et export sans perdre le contexte. | Format de stockage et limites |
| Q-04 | Formules non exécutées ; les cellules sont lues comme valeurs/données. | Réduit les risques de formules malveillantes et d’effets de bord. | Bibliothèque et options exactes |
| Q-05 | Les feuilles très cachées, macros et classeurs chiffrés ne sont pas traités dans le MVP. | Réduit la surface d’attaque. | Messages d’erreur réels |

## Intelligence artificielle

| Réf. | Décision par défaut | Justification | À synchroniser |
|---|---|---|---|
| AI-01 | Sans clé OpenAI, un fournisseur mock déterministe génère une sortie valide et clairement identifiable comme telle. | Développement, démonstration et tests reproductibles hors ligne. | Algorithme et libellé UI réels |
| AI-02 | Avec une clé, le modèle provient exclusivement de `OPENAI_MODEL`. | Évite un modèle codé en dur et rend le déploiement explicite. | Variables exactes et valeur requise |
| AI-03 | Les documents et questions sont encadrés comme contenu non fiable ; ils ne peuvent modifier le rôle système ni appeler d’outil. | Première barrière contre la prompt injection. | Construction exacte du prompt |
| AI-04 | Seuls les extraits nécessaires et autorisés sont envoyés au fournisseur externe. | Minimise fuite, coût et surface d’injection. | Recherche, taille du contexte et redaction réelles |
| AI-05 | Le contenu `CONFIDENTIAL` ou `RESTRICTED` n’est pas envoyé à OpenAI sans consentement explicite et traçable. | Respect du principe de minimisation et du cahier des charges. | UX et persistance du consentement |
| AI-06 | Les `evidenceIds` et `controlIds` retournés sont revalidés en base dans le tenant actif ; les identifiants inconnus sont retirés ou font échouer la génération. | Le modèle n’est pas une source d’autorité. | Politique exacte de rejet |
| AI-07 | Le score de confiance est une indication de complétude/cohérence, pas une probabilité certifiée. | Évite une précision trompeuse. | Formulation UI et calcul mock |
| AI-08 | Aucune réponse n’est auto-approuvée, même avec une confiance élevée. | Contrôle humain obligatoire. | Test de transition d’état |
| AI-09 | L’adaptateur OpenAI utilise la Responses API avec parsing vers un schéma Pydantic, puis revalide les références autorisées. | Rend le contrat plus strict sans faire du fournisseur une autorité. | Compatibilité avec la version de SDK verrouillée et tests de refus/sorties malformées |
| AI-10 | Source, collecte et expiration entrent dans le contexte ; le mock ajoute `EVIDENCE_EXPIRED` et réduit sa confiance. | Une preuve citée mais expirée ne doit pas être présentée comme actuelle. | Appliquer aussi un drapeau de péremption déterministe côté serveur aux sorties externes |

## Partage externe

| Réf. | Décision par défaut | Justification | À synchroniser |
|---|---|---|---|
| S-01 | Token opaque généré par CSPRNG avec au moins 128 bits d’entropie ; seul son hash est stocké. | Rend le lien non prédictible et limite l’impact d’une fuite de base. | Taille, encodage et algorithme de hash réels |
| S-02 | Expiration obligatoire et révocation immédiate côté serveur. | Réduit la durée d’exposition. | Durée par défaut/maximale et cache HTTP |
| S-03 | Le token peut être placé dans le chemin du MVP mais doit être expurgé des logs et ne jamais être transmis à des tiers. | Simplicité du partage avec précautions de fuite. | Politique Referrer et redaction réelles |
| S-04 | La page publique est construite à partir d’un DTO en liste blanche, jamais par sérialisation directe des modèles. | Évite l’exposition accidentelle de nouveaux champs. | Schéma public exact |
| S-05 | Une preuve `CONFIDENTIAL` ou `RESTRICTED` ne publie ni fichier, ni métadonnée sensible ; un résumé séparé n’est visible que s’il a été explicitement autorisé. | Sépare existence, contenu et partage. | Règles exactes pour `SHARED_SUMMARY` |
| S-06 | Le mot de passe secondaire du lien est différé si le vertical slice ne l’implémente pas proprement. | Fonction optionnelle dans le cahier des charges. | Fonctionnalité réellement livrée |

## Exploitation et qualité

| Réf. | Décision par défaut | Justification | À synchroniser |
|---|---|---|---|
| O-01 | Déploiement MVP en une application web, une API, PostgreSQL et MinIO ; TLS terminé par le proxy de production. | Architecture simple et portable. | Hébergeur, proxy et politique TLS réels |
| O-02 | CORS limité à l’origine web configurée ; aucune origine générique avec credentials. | Réduit les lectures inter-origines non autorisées. | Origines effectives par environnement |
| O-03 | Le rate limiting protège authentification, génération IA, import, téléchargement et lien public. | Réduit brute force, coûts et déni de service. | Backend de compteur et seuils réels |
| O-04 | Les journaux sont structurés et expurgent mots de passe, cookies, tokens, clés, URL signées et contenus de preuves. | Réduit l’impact des logs. | Filtres et tests réels |
| O-05 | Sauvegardes, restauration testée, supervision, WAF et gestion d’incident relèvent du déploiement de production. | Le code seul ne fournit pas ces garanties opérationnelles. | Runbooks et responsabilités avant production |

## Décisions explicitement hors MVP

- aucun référentiel officiel NIS2, ReCyF ou ISO 27001 sans données validées et licence vérifiée ;
- aucune certification ou attestation juridique émise par CyberPass ;
- aucune analyse antivirus effective tant qu’un moteur n’est pas intégré et supervisé ;
- aucune extraction PDF ;
- aucun SSO SAML/OIDC, SCIM ou portail acheteur multi-fournisseurs ;
- aucune synchronisation automatique Microsoft 365, GitHub, GitLab ou cloud ;
- aucun chiffrement KMS, signature cryptographique avancée, marque blanche ou facturation ;
- aucune promesse d’immuabilité cryptographique du journal d’audit.

Ces limites doivent rester visibles dans la documentation utilisateur et le backlog, sans empêcher le parcours critique local.
