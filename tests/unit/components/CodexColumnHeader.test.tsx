import React from "react";
import {render, screen, fireEvent} from "@testing-library/react";
import {vi, describe, it, expect} from "vitest";
import {CodexColumnHeader} from "@/app/inscriptions/[id]/CodexColumnHeader";

const renderHeader = (overrides: Partial<React.ComponentProps<typeof CodexColumnHeader>> = {}) => {
  const onToggleSort = vi.fn();
  render(
    <CodexColumnHeader
      date="19/11/26"
      codex={456}
      eventCode="GS"
      categoryCode="NJR"
      genderCode="M"
      registeredCount={4}
      registeredLabel="4 inscrits"
      sorted={false}
      onToggleSort={onToggleSort}
      {...overrides}
    />
  );
  return onToggleSort;
};

describe("CodexColumnHeader", () => {
  it("shows date, codex, discipline, level and the count in front of the gender", () => {
    renderHeader();
    expect(screen.getByText("19/11/26")).toBeTruthy();
    expect(screen.getByText("456")).toBeTruthy();
    expect(screen.getByText("GS")).toBeTruthy();
    expect(screen.getByText("NJR")).toBeTruthy();
    expect(screen.getByText("4 M")).toBeTruthy();
  });

  it("no longer prints the '(4 inscrits)' line, but keeps it as a tooltip", () => {
    renderHeader();
    expect(screen.queryByText(/inscrits/)).toBeNull();
    expect(screen.getByTitle("4 inscrits").textContent).toBe("4 M");
  });

  it("gives the women column its own colour and count", () => {
    renderHeader({genderCode: "W", registeredCount: 7, registeredLabel: "7 inscrits"});
    const count = screen.getByText("7 W");
    expect(count.className).toContain("text-pink-600");
  });

  it("shows a count of 0 and any level, even an unknown one", () => {
    renderHeader({registeredCount: 0, categoryCode: "XYZ"});
    expect(screen.getByText("0 M")).toBeTruthy();
    expect(screen.getByText("XYZ")).toBeTruthy();
  });

  it("shows no level badge when the race has none", () => {
    renderHeader({categoryCode: undefined});
    expect(screen.queryByText("NJR")).toBeNull();
  });

  it("shows the sort arrow and toggles the sort on click", () => {
    const onToggleSort = renderHeader({sorted: "asc"});
    expect(screen.getByText("↑")).toBeTruthy();
    fireEvent.click(screen.getByText("456"));
    expect(onToggleSort).toHaveBeenCalledTimes(1);
  });
});
