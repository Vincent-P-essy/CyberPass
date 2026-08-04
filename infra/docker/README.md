# Conteneurs locaux

Le fichier `docker-compose.yml` à la racine orchestre les conteneurs. Ce dossier
réserve l’espace aux adaptations d’images et de déploiement qui ne doivent pas être
mélangées au code applicatif.

Les services PostgreSQL et MinIO sont liés uniquement à l’interface locale
de la machine. Les identifiants fournis par défaut sont destinés au développement ;
`make setup` génère des valeurs aléatoires dans un fichier `.env` ignoré par Git.
