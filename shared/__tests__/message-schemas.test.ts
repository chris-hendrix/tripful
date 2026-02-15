// Tests for message validation schemas

import { describe, it, expect } from "vitest";
import {
  createMessageSchema,
  updateMessageSchema,
  toggleReactionSchema,
  pinMessageSchema,
} from "../schemas/index.js";

describe("createMessageSchema", () => {
  it("should accept a valid message", () => {
    const message = { content: "Hello, everyone!" };
    expect(() => createMessageSchema.parse(message)).not.toThrow();
  });

  it("should accept a valid message with parentId", () => {
    const message = {
      content: "This is a reply",
      parentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };
    expect(() => createMessageSchema.parse(message)).not.toThrow();
  });

  it("should reject empty content", () => {
    const message = { content: "" };
    const result = createMessageSchema.safeParse(message);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Message cannot be empty",
      );
    }
  });

  it("should reject content over 2000 characters", () => {
    const message = { content: "a".repeat(2001) };
    const result = createMessageSchema.safeParse(message);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Message too long");
    }
  });

  it("should accept content at exactly 2000 characters", () => {
    const message = { content: "a".repeat(2000) };
    expect(() => createMessageSchema.parse(message)).not.toThrow();
  });

  it("should reject invalid parentId (not a UUID)", () => {
    const message = { content: "Hello", parentId: "not-a-uuid" };
    const result = createMessageSchema.safeParse(message);
    expect(result.success).toBe(false);
  });

  it("should strip control characters from content", () => {
    const message = { content: "Hello\x00World\x01!" };
    const parsed = createMessageSchema.parse(message);
    expect(parsed.content).toBe("HelloWorld!");
  });
});

describe("updateMessageSchema", () => {
  it("should accept a valid update", () => {
    const update = { content: "Updated message" };
    expect(() => updateMessageSchema.parse(update)).not.toThrow();
  });

  it("should reject empty content", () => {
    const update = { content: "" };
    const result = updateMessageSchema.safeParse(update);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Message cannot be empty",
      );
    }
  });

  it("should reject content over 2000 characters", () => {
    const update = { content: "a".repeat(2001) };
    const result = updateMessageSchema.safeParse(update);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Message too long");
    }
  });
});

describe("toggleReactionSchema", () => {
  it("should accept all valid emoji identifiers", () => {
    const validEmojis = [
      "heart",
      "thumbs_up",
      "laugh",
      "surprised",
      "party",
      "plane",
    ] as const;

    validEmojis.forEach((emoji) => {
      expect(() => toggleReactionSchema.parse({ emoji })).not.toThrow();
    });
  });

  it("should reject invalid emoji identifiers", () => {
    const invalidEmojis = ["smile", "fire", "invalid", "", "HEART"];

    invalidEmojis.forEach((emoji) => {
      const result = toggleReactionSchema.safeParse({ emoji });
      expect(result.success).toBe(false);
    });
  });
});

describe("pinMessageSchema", () => {
  it("should accept valid boolean values", () => {
    expect(() => pinMessageSchema.parse({ pinned: true })).not.toThrow();
    expect(() => pinMessageSchema.parse({ pinned: false })).not.toThrow();
  });

  it("should reject non-boolean values", () => {
    const invalidValues = [
      { pinned: "true" },
      { pinned: 1 },
      { pinned: null },
      {},
    ];

    invalidValues.forEach((value) => {
      const result = pinMessageSchema.safeParse(value);
      expect(result.success).toBe(false);
    });
  });
});
