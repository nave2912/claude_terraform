import { describe, expect, it } from "@jest/globals";
import { stripStrayCarets } from "../src/cli/readMessage.js";

describe("stripStrayCarets", () => {
  it("removes carets inserted before spaces (observed Windows shell corruption)", () => {
    const corrupted =
      '^Create^ an^ Azure^ resource^ group^ named^ azure-learning-test4^ in^ eastus.^';
    expect(stripStrayCarets(corrupted)).toBe(
      "Create an Azure resource group named azure-learning-test4 in eastus."
    );
  });

  it("leaves a clean message untouched", () => {
    const clean = "Create a resource group named foo in eastus, owner platform-team.";
    expect(stripStrayCarets(clean)).toBe(clean);
  });

  it("does not touch a legitimate caret in the middle of a word", () => {
    const withCaret = "the value is 2^10 in this system";
    expect(stripStrayCarets(withCaret)).toBe(withCaret);
  });
});
