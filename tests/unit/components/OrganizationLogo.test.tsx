import {describe, it, expect, afterEach} from "vitest";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
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

  describe("image that already failed before React took over", () => {
    const proto = HTMLImageElement.prototype;
    const original = {
      complete: Object.getOwnPropertyDescriptor(proto, "complete"),
      naturalWidth: Object.getOwnPropertyDescriptor(proto, "naturalWidth"),
    };
    afterEach(() => {
      if (original.complete) Object.defineProperty(proto, "complete", original.complete);
      if (original.naturalWidth) Object.defineProperty(proto, "naturalWidth", original.naturalWidth);
    });
    const mockLoaded = (complete: boolean, naturalWidth: number) => {
      Object.defineProperty(proto, "complete", {configurable: true, get: () => complete});
      Object.defineProperty(proto, "naturalWidth", {configurable: true, get: () => naturalWidth});
    };

    it("falls back to the bundled logo even though onError never fired", async () => {
      mockLoaded(true, 0);
      render(<OrganizationLogo src="https://example.com/broken.png" alt="Logo" />);
      await waitFor(() =>
        expect(screen.getByAltText("Logo").getAttribute("src")).toBe(DEFAULT_ORGANIZATION_LOGO)
      );
    });

    it("keeps a configured logo that loaded fine", () => {
      mockLoaded(true, 300);
      render(<OrganizationLogo src="https://example.com/logo.png" alt="Logo" />);
      expect(screen.getByAltText("Logo").getAttribute("src")).toBe("https://example.com/logo.png");
    });

    it("keeps a configured logo that is still loading", () => {
      mockLoaded(false, 0);
      render(<OrganizationLogo src="https://example.com/logo.png" alt="Logo" />);
      expect(screen.getByAltText("Logo").getAttribute("src")).toBe("https://example.com/logo.png");
    });
  });
});
