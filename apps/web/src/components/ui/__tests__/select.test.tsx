import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  selectTriggerVariants,
} from "../select";

describe("selectTriggerVariants", () => {
  it("default size includes h-9", () => {
    const classes = selectTriggerVariants({ size: "default" });
    expect(classes).toContain("h-9");
  });

  it("sm size includes h-8", () => {
    const classes = selectTriggerVariants({ size: "sm" });
    expect(classes).toContain("h-8");
  });

  it("uses default size when no size is specified", () => {
    const classes = selectTriggerVariants();
    expect(classes).toContain("h-9");
  });
});

describe("SelectTrigger", () => {
  it("renders with default size class h-9", () => {
    render(
      <Select>
        <SelectTrigger aria-label="test-trigger">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
      </Select>,
    );

    const trigger = screen.getByRole("combobox", { name: "test-trigger" });
    expect(trigger.className).toContain("h-9");
  });

  it("renders with sm size class h-8", () => {
    render(
      <Select>
        <SelectTrigger size="sm" aria-label="test-trigger-sm">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
      </Select>,
    );

    const trigger = screen.getByRole("combobox", { name: "test-trigger-sm" });
    expect(trigger.className).toContain("h-8");
  });

  it("sets data-size attribute", () => {
    render(
      <Select>
        <SelectTrigger aria-label="test-trigger-data">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
      </Select>,
    );

    const trigger = screen.getByRole("combobox", {
      name: "test-trigger-data",
    });
    expect(trigger.getAttribute("data-size")).toBe("default");
  });
});
