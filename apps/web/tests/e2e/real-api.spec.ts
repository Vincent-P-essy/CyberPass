import { expect, test } from "@playwright/test";

test.skip(
  process.env.E2E_REAL_API !== "1",
  "Activez E2E_REAL_API=1 avec la stack Compose et les données Starter chargées."
);

test("parcours réel API : preuve, questionnaire, passeport et révocation", async ({
  page,
  context
}) => {
  test.setTimeout(120_000);
  const unique = Date.now().toString(36);
  const email = `vincent.e2e.${unique}@example.com`;
  const organizationName = `CyberPass E2E ${unique}`;
  const evidenceTitle = `Preuve MFA E2E ${unique}`;
  const questionnaireName = `Questionnaire E2E ${unique}`;

  await page.goto("/register");
  await page.getByLabel(/^Prénom/).fill("Vincent");
  await page.getByLabel(/^Nom/).fill("Plessy");
  await page.getByLabel(/^E-mail professionnel/).fill(email);
  await page.getByLabel(/^Mot de passe/).fill("CyberPass-E2E-2026");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel(/^Nom de l’organisation/).fill(organizationName);
  await page.getByLabel(/^Effectif/).selectOption("20-49");
  await page.getByLabel(/^Votre rôle/).selectOption("security");
  await page.getByRole("button", { name: /Créer l’espace de l’organisation/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Données de démonstration.", { exact: false })).toHaveCount(0);

  await page.goto("/controls");
  await page
    .getByRole("link", { name: /MFA pour les administrateurs/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "MFA pour les administrateurs" })).toBeVisible();
  await page.getByLabel("Statut").selectOption("IMPLEMENTED");
  await page.getByLabel("Note de revue").fill("Contrôle vérifié par le parcours E2E réel.");
  await page.getByRole("button", { name: "Enregistrer la revue" }).click();
  await expect(page.getByText("Modifications enregistrées.")).toBeVisible();

  await page.getByRole("link", { name: "Associer une preuve" }).click();
  await page.getByLabel(/^Titre de la preuve/).fill(evidenceTitle);
  await page
    .getByLabel(/^Description/)
    .fill("Cette preuve documente la couverture MFA des comptes administrateurs.");
  await page.getByLabel(/^Type/).selectOption("MANUAL_ATTESTATION");
  await page.getByLabel(/^Confidentialité/).selectOption("SHARED_SUMMARY");
  await page
    .getByLabel(/^Résumé partageable/)
    .fill("La couverture MFA des accès administratifs a été revue et documentée.");
  await page.getByLabel(/^Source/).fill("Parcours Playwright réel");
  await page.getByRole("button", { name: "Ajouter la preuve" }).click();
  await expect(page).toHaveURL(/\/evidence$/);
  await expect(page.getByText(evidenceTitle).first()).toBeVisible();

  await page.goto("/questionnaires/import");
  await page.getByLabel("Nom du questionnaire").fill(questionnaireName);
  await page.locator('input[type="file"]').setInputFiles({
    name: `questionnaire-${unique}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(
      "ID,Question\nQ1,L’authentification multifacteur est-elle imposée aux comptes administrateurs ?\nQ2,Disposez-vous de preuves datées ?"
    )
  });
  await page.getByRole("button", { name: /Analyser le fichier/ }).click();
  await expect(page.getByText("Aperçu des premières lignes")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer l’import" }).click();
  await expect(page).toHaveURL(/\/questionnaires\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: questionnaireName })).toBeVisible();

  await page.getByRole("button", { name: "Regénérer" }).click();
  await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
  await page.reload();
  const answer = page.getByLabel("Réponse à transmettre");
  await expect(answer).not.toHaveValue("");
  await page.getByRole("button", { name: "Approuver la réponse" }).click();
  await expect(page.getByText("Approuvée").first()).toBeVisible();

  await page.goto("/passport/new");
  const evidenceCheckbox = page.getByRole("checkbox", { name: new RegExp(evidenceTitle) });
  await expect(evidenceCheckbox).toBeVisible();
  await evidenceCheckbox.check();
  await page.getByRole("button", { name: "Créer le lien limité" }).click();
  await expect(page.getByRole("heading", { name: "Passeport prêt à partager" })).toBeVisible();
  const publicUrl = (await page.locator("code").textContent())?.trim();
  expect(publicUrl).toMatch(/\/p\/[A-Za-z0-9_-]+$/);

  const publicPage = await context.newPage();
  await publicPage.goto(publicUrl as string);
  await expect(publicPage.getByRole("heading", { name: organizationName })).toBeVisible();
  await expect(publicPage.getByText("MFA pour les administrateurs")).toBeVisible();
  await expect(publicPage.getByText("Résumé de preuve partagé")).toBeVisible();
  await expect(
    publicPage.getByText("La couverture MFA des accès administratifs a été revue et documentée.")
  ).toBeVisible();
  await expect(publicPage.getByText(evidenceTitle)).toHaveCount(0);

  await page.getByRole("button", { name: "Révoquer le lien" }).click();
  await expect(page.getByRole("heading", { name: "Lien révoqué" })).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByRole("heading", { name: "Passeport indisponible" })).toBeVisible();
});
