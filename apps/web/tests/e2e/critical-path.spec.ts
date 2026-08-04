import { expect, test } from "@playwright/test";

test("parcours de démonstration : accès, preuve, questionnaire et passeport", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Ravi de vous revoir." })).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir l’espace de démonstration" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Bonjour Vincent/ })).toBeVisible();

  await page.getByRole("link", { name: "Contrôles", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Contrôles de sécurité" })).toBeVisible();
  await page.getByPlaceholder("Rechercher par intitulé ou identifiant…").fill("MFA");
  await expect(
    page.getByText("MFA des comptes administrateurs", { exact: true }).first()
  ).toBeVisible();

  await page.goto("/evidence/new");
  await page.getByLabel("Titre de la preuve").fill("Revue MFA août 2026");
  await page
    .getByLabel("Description")
    .fill("Cette preuve documente la revue mensuelle de la couverture MFA.");
  await page.getByLabel("Source").fill("Console de démonstration");
  await page.getByLabel("Contrôle associé").selectOption("mfa-admin");
  await page.getByRole("button", { name: "Ajouter la preuve" }).click();
  await expect(page.getByText(/aucune donnée n’a été enregistrée/i)).toBeVisible();

  await page.goto("/questionnaires/import");
  await page.locator('input[type="file"]').setInputFiles({
    name: "questionnaire-demo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("ID,Question\n1,Utilisez-vous le MFA ?")
  });
  await page.getByRole("button", { name: /Analyser le fichier/ }).click();
  await expect(page.getByText("Aperçu des premières lignes")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer l’import" }).click();
  await expect(page).toHaveURL(/\/questionnaires\/q-grandcompte$/);
  await expect(page.getByText("Revue humaine obligatoire").first()).toBeVisible();

  await page.goto("/passport/new");
  await page.getByRole("button", { name: "Créer le lien limité" }).click();
  await expect(page.getByRole("heading", { name: "Passeport prêt à partager" })).toBeVisible();
  await page.goto("/p/demo-access-2026");
  await expect(page.getByRole("heading", { name: "Acme Cloud Europe" })).toBeVisible();
  await expect(page.getByText("Passeport de démonstration.", { exact: false })).toBeVisible();
  await expect(page.getByText(/vincent@/i)).toHaveCount(0);
  await expect(page.getByText(/81d9/i)).toHaveCount(0);
});

test("la navigation mobile reste utilisable au clavier", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  await page.getByRole("link", { name: "Preuves", exact: true }).click();
  await expect(page.getByRole("heading", { name: /preuves exploitables/i })).toBeVisible();
});
