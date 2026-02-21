import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RadioGroup, RadioGroupItem } from "../radio-group";

describe("RadioGroupItem", () => {
  it("renders with the radio role", () => {
    render(
      <RadioGroup>
        <RadioGroupItem value="option-1" aria-label="Option 1" />
      </RadioGroup>,
    );

    const radio = screen.getByRole("radio", { name: "Option 1" });
    expect(radio).toBeDefined();
  });

  it("has touch target expansion classes for WCAG 2.5.8 compliance", () => {
    render(
      <RadioGroup>
        <RadioGroupItem value="option-1" aria-label="Option 1" />
      </RadioGroup>,
    );

    const radio = screen.getByRole("radio", { name: "Option 1" });
    expect(radio.className).toContain("relative");
    expect(radio.className).toContain("after:absolute");
    expect(radio.className).toContain("after:content-['']");
    expect(radio.className).toContain("after:-inset-[14px]");
  });

  it("preserves visual size of size-4", () => {
    render(
      <RadioGroup>
        <RadioGroupItem value="option-1" aria-label="Option 1" />
      </RadioGroup>,
    );

    const radio = screen.getByRole("radio", { name: "Option 1" });
    expect(radio.className).toContain("size-4");
  });
});
