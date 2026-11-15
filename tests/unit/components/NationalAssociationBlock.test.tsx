import React from "react";
import {render, screen} from "@testing-library/react";
import {describe, it, expect} from "vitest";
import {NationalAssociationBlock} from "@/app/inscriptions/[id]/pdf/components/NationalAssociationBlock";

const organization = (overrides: Record<string, unknown>) => ({
  code: "FFS",
  name: "Fédération Française de Ski",
  logo: null,
  contacts: {responsible_for_entry: {address: "2 rue René Dumond - Meythet"}},
  ...overrides,
});

describe("NationalAssociationBlock logo", () => {
  it("always uses the bundled logo for the FFS, whatever address is saved in the database", () => {
    render(<NationalAssociationBlock organization={organization({logo: "https://example.com/old-logo.png"})} />);
    expect(screen.getByAltText("Fédération Française de Ski Logo").getAttribute("src")).toBe("/pdf/ffs-logo.png");
  });

  it("uses the configured logo of another federation", () => {
    render(
      <NationalAssociationBlock
        organization={organization({code: "RFEDI", name: "RFEDI", logo: "https://example.com/rfedi.png"})}
      />
    );
    expect(screen.getByAltText("RFEDI Logo").getAttribute("src")).toBe("https://example.com/rfedi.png");
  });

  it("centres the logo vertically against the text block", () => {
    render(<NationalAssociationBlock organization={organization({})} />);
    const row = screen.getByAltText("Fédération Française de Ski Logo").parentElement?.parentElement;
    expect(row?.className).toContain("flex");
    expect(row?.className).toContain("items-center");
  });
});
