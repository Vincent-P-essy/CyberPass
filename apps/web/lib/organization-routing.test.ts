import { describe, expect, it } from "vitest";
import { requiresOrganizationSelection } from "./organization-routing";

describe("requiresOrganizationSelection", () => {
  it.each([400, 404])("redirige une organisation courante absente avec le statut %s", (status) => {
    expect(requiresOrganizationSelection(status, "/organizations/current")).toBe(true);
  });

  it("ne masque pas les autres erreurs API", () => {
    expect(requiresOrganizationSelection(500, "/organizations/current")).toBe(false);
    expect(requiresOrganizationSelection(404, "/organizations/unknown")).toBe(false);
  });
});
