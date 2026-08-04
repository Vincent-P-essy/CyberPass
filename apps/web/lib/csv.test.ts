import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "./csv";

describe("CSV sûr", () => {
  it.each(["=1+1", " +CMD", "-2+3", "  @SUM(A1:A2)"])(
    "neutralise les formules tableur dans %s",
    (value) => {
      expect(csvCell(value)).toContain(`'${value}`);
    }
  );

  it("échappe les guillemets et conserve les cellules ordinaires", () => {
    expect(csvRow(['Texte "cité"', "Approuvé"])).toBe('"Texte ""cité""","Approuvé"');
  });
});
