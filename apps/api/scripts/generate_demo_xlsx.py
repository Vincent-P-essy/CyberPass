from pathlib import Path

from openpyxl import Workbook

QUESTIONS = [
    "L'authentification multifacteur est-elle imposée aux administrateurs ?",
    "Les postes de travail sont-ils chiffrés au repos ?",
    "À quelle fréquence les sauvegardes sont-elles réalisées ?",
    "Quand le dernier test de restauration a-t-il été effectué ?",
    "Comment les correctifs de sécurité critiques sont-ils déployés ?",
    "Disposez-vous d'un processus de gestion des vulnérabilités ?",
    "Les droits d'accès font-ils l'objet d'une revue périodique ?",
    "Quels événements de sécurité sont journalisés ?",
    "Votre procédure de réponse aux incidents est-elle testée ?",
    "Comment évaluez-vous les risques liés à vos fournisseurs ?",
]


def main() -> None:
    target = Path(__file__).resolve().parents[1] / "data" / "questionnaire-demo.xlsx"
    target.parent.mkdir(parents=True, exist_ok=True)
    workbook = Workbook()
    workbook.properties.creator = "Plessy Vincent"
    workbook.properties.lastModifiedBy = "Plessy Vincent"
    sheet = workbook.active
    sheet.title = "Questionnaire sécurité"
    sheet.append(["Référence", "Question", "Commentaire client"])
    for index, question in enumerate(QUESTIONS, start=1):
        sheet.append([f"Q-{index:02d}", question, ""])
    workbook.save(target)
    print(target)


if __name__ == "__main__":
    main()
