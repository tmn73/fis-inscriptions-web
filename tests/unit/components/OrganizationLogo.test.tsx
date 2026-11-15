import {describe, it, expect} from "vitest";
import {render, screen, fireEvent} from "@testing-library/react";
import {
  OrganizationLogo,
  DEFAULT_ORGANIZATION_LOGO,
} from "@/app/inscriptions/[id]/pdf/components/OrganizationLogo";

describe("OrganizationLogo", () => {
  it("uses the configured logo when there is one", () => {
    render(<OrganizationLogo src="https://example.com/logo.png" alt="Logo" />);
    expect(screen.getByAltText("Logo").getAttribute("src")).toBe(
      "https://example.com/logo.png"
    );
  });

  it("uses the bundled logo when none is configured", () => {
    render(<OrganizationLogo src={null} alt="Logo" />);
    expect(screen.getByAltText("Logo").getAttribute("src")).toBe(
      DEFAULT_ORGANIZATION_LOGO
    );
  });

  it("falls back to the bundled logo when the configured one fails to load", () => {
    render(<OrganizationLogo src="https://example.com/broken.png" alt="Logo" />);
    fireEvent.error(screen.getByAltText("Logo"));
    expect(screen.getByAltText("Logo").getAttribute("src")).toBe(
      DEFAULT_ORGANIZATION_LOGO
    );
  });

  it("does not loop when the bundled logo itself fails", () => {
    render(<OrganizationLogo src={null} alt="Logo" />);
    fireEvent.error(screen.getByAltText("Logo"));
    expect(screen.getByAltText("Logo").getAttribute("src")).toBe(
      DEFAULT_ORGANIZATION_LOGO
    );
  });
});
