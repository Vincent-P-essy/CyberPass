import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { demoQuestionnaires } from "@/lib/demo-data";
import { QuestionnaireReview } from "./questionnaire-review";

describe("QuestionnaireReview", () => {
  it("conserve une approbation humaine explicite en mode démonstration", async () => {
    const user = userEvent.setup();
    const questionnaire = demoQuestionnaires[0];
    if (!questionnaire) throw new Error("Fixture manquante");
    render(<QuestionnaireReview questionnaire={questionnaire} />);
    expect(screen.getByText(/exige une revue humaine/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approuver la réponse" }));
    expect(await screen.findByText(/aucune donnée n’a été enregistrée/i)).toBeInTheDocument();
    expect(screen.getAllByText("Approuvée").length).toBeGreaterThan(0);
  });
});
