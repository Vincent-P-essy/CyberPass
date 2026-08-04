# Contribuer à CyberPass

Merci de contribuer à CyberPass. Toute modification doit préserver l’isolation des
organisations, la confidentialité des preuves et la validation humaine des réponses
assistées par IA.

## Avant une proposition

1. créez une branche courte depuis `main` ;
2. installez les dépendances avec `make install` ;
3. ajoutez ou adaptez les tests au même moment que le code ;
4. exécutez `make lint`, `make test` et `make build` ;
5. documentez toute décision de sécurité ou limite nouvelle.

Les commits doivent être signés avec votre propre identité Git. N’ajoutez jamais de
secret, de donnée client ou de preuve réelle dans les fixtures, captures ou journaux.

## Exigences de revue

Une revue sécurité est nécessaire pour toute évolution touchant l’authentification,
les permissions, le stockage, le partage externe, les imports ou l’intégration IA.
Les migrations doivent fournir un chemin de retour documenté et les changements
d’API incompatibles doivent être annoncés explicitement.

## Signaler une vulnérabilité

N’ouvrez pas de ticket public contenant les détails exploitables d’une faille.
Utilisez le canal privé de signalement de sécurité du dépôt GitHub.
