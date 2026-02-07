import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageUpload } from "../image-upload";

describe("ImageUpload", () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockCreateObjectURL = vi.fn((file) => `blob:${file.name}`);
    mockRevokeObjectURL = vi.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockFile = (name: string, type: string, size: number): File => {
    const blob = new Blob(["x".repeat(size)], { type });
    return new File([blob], name, { type });
  };

  describe("Rendering", () => {
    it("renders upload zone when no image is provided", () => {
      render(<ImageUpload onChange={mockOnChange} />);

      expect(
        screen.getByRole("button", { name: "Upload image" }),
      ).toBeDefined();
      expect(
        screen.getByText("Click to upload or drag and drop"),
      ).toBeDefined();
      expect(screen.getByText("JPG, PNG, or WEBP (max 5MB)")).toBeDefined();
    });

    it("renders file input with correct accept attribute", () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeDefined();
      expect(fileInput.accept).toBe("image/jpeg,image/png,image/webp");
    });

    it("renders preview when value is provided", () => {
      render(
        <ImageUpload
          value="https://example.com/image.jpg"
          onChange={mockOnChange}
        />,
      );

      const preview = screen.getByAltText("Preview") as HTMLImageElement;
      expect(preview).toBeDefined();
      expect(preview.src).toBe("https://example.com/image.jpg");
    });

    it("does not render upload zone when image preview is shown", () => {
      render(
        <ImageUpload
          value="https://example.com/image.jpg"
          onChange={mockOnChange}
        />,
      );

      expect(screen.queryByText("Click to upload or drag and drop")).toBeNull();
    });
  });

  describe("File selection via input", () => {
    it("handles file selection via input change", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      });
    });

    it("triggers file input click when upload zone is clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, "click");

      await user.click(uploadZone);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("triggers file input on Enter key press", () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.keyDown(uploadZone, { key: "Enter" });

      expect(clickSpy).toHaveBeenCalled();
    });

    it("triggers file input on Space key press", () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.keyDown(uploadZone, { key: " " });

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("Drag and drop", () => {
    it("handles drag over event", () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });

      fireEvent.dragOver(uploadZone, {
        dataTransfer: { files: [] },
      });

      expect(uploadZone.className).toContain("border-blue-500");
      expect(screen.getByText("Drop image here")).toBeDefined();
    });

    it("handles drag leave event", () => {
      render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });

      fireEvent.dragOver(uploadZone);
      fireEvent.dragLeave(uploadZone);

      expect(
        screen.getByText("Click to upload or drag and drop"),
      ).toBeDefined();
    });

    it("handles file drop", async () => {
      render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      const file = createMockFile("dropped.jpg", "image/jpeg", 2048);

      fireEvent.drop(uploadZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      });
    });

    it("clears dragging state after drop", async () => {
      render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      const file = createMockFile("dropped.jpg", "image/jpeg", 2048);

      fireEvent.dragOver(uploadZone);
      expect(screen.getByText("Drop image here")).toBeDefined();

      fireEvent.drop(uploadZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.queryByText("Drop image here")).toBeNull();
      });
    });
  });

  describe("File type validation", () => {
    it("accepts JPEG files", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
        expect(screen.queryByText(/Invalid file type/)).toBeNull();
      });
    });

    it("accepts PNG files", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.png", "image/png", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
        expect(screen.queryByText(/Invalid file type/)).toBeNull();
      });
    });

    it("accepts WEBP files", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.webp", "image/webp", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
        expect(screen.queryByText(/Invalid file type/)).toBeNull();
      });
    });

    it("rejects PDF files with correct error message", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.pdf", "application/pdf", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Invalid file type. Only JPG, PNG, and WEBP are allowed",
          ),
        ).toBeDefined();
      });
    });

    it("rejects GIF files", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.gif", "image/gif", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Invalid file type. Only JPG, PNG, and WEBP are allowed",
          ),
        ).toBeDefined();
      });
    });
  });

  describe("File size validation", () => {
    it("accepts files under 5MB", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 4 * 1024 * 1024); // 4MB
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
        expect(screen.queryByText(/Image must be under 5MB/)).toBeNull();
      });
    });

    it("accepts files exactly 5MB", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 5 * 1024 * 1024); // Exactly 5MB
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
        expect(screen.queryByText(/Image must be under 5MB/)).toBeNull();
      });
    });

    it("rejects files over 5MB with correct error message", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 6 * 1024 * 1024); // 6MB
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Image must be under 5MB. Please choose a smaller file",
          ),
        ).toBeDefined();
      });
    });
  });

  describe("Preview display", () => {
    it("shows preview after valid file selection", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const preview = screen.getByAltText("Preview") as HTMLImageElement;
        expect(preview).toBeDefined();
        expect(preview.src).toContain("blob:");
      });
    });

    it("shows file name and size after selection", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("vacation.jpg", "image/jpeg", 2048);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("vacation.jpg")).toBeDefined();
        expect(screen.getByText(/2\.0 KB/)).toBeDefined();
      });
    });

    it("formats file size correctly for bytes", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("tiny.jpg", "image/jpeg", 512);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/512 B/)).toBeDefined();
      });
    });

    it("formats file size correctly for megabytes", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("large.jpg", "image/jpeg", 3 * 1024 * 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/3\.0 MB/)).toBeDefined();
      });
    });

    it("uses URL.createObjectURL for preview", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      });
    });
  });

  describe("Remove functionality", () => {
    it("shows remove button on preview", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Remove image" }),
        ).toBeDefined();
      });
    });

    it("clears selection when remove button is clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByAltText("Preview")).toBeDefined();
      });

      const removeButton = screen.getByRole("button", { name: "Remove image" });
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith(null);
      expect(screen.queryByAltText("Preview")).toBeNull();
      expect(
        screen.getByText("Click to upload or drag and drop"),
      ).toBeDefined();
    });

    it("revokes object URL when removing image", async () => {
      const user = userEvent.setup();
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      const blobUrl = await waitFor(() => {
        const preview = screen.getByAltText("Preview") as HTMLImageElement;
        return preview.src;
      });

      const removeButton = screen.getByRole("button", { name: "Remove image" });
      await user.click(removeButton);

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(blobUrl);
    });

    it("resets file input value on remove", async () => {
      const user = userEvent.setup();
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByAltText("Preview")).toBeDefined();
      });

      const removeButton = screen.getByRole("button", { name: "Remove image" });
      await user.click(removeButton);

      expect(fileInput.value).toBe("");
    });
  });

  describe("Disabled state", () => {
    it("disables file input when disabled prop is true", () => {
      const { container } = render(
        <ImageUpload onChange={mockOnChange} disabled />,
      );

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput.disabled).toBe(true);
    });

    it("prevents interactions when disabled", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ImageUpload onChange={mockOnChange} disabled />,
      );

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, "click");

      await user.click(uploadZone);

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("does not show remove button when disabled", async () => {
      const { container, rerender } = render(
        <ImageUpload onChange={mockOnChange} />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Remove image" }),
        ).toBeDefined();
      });

      rerender(
        <ImageUpload onChange={mockOnChange} disabled value="blob:test" />,
      );

      expect(screen.queryByRole("button", { name: "Remove image" })).toBeNull();
    });

    it("prevents drag and drop when disabled", () => {
      render(<ImageUpload onChange={mockOnChange} disabled />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });

      fireEvent.dragOver(uploadZone);

      expect(uploadZone.className).not.toContain("border-blue-500");
    });

    it("sets tabIndex to -1 when disabled", () => {
      render(<ImageUpload onChange={mockOnChange} disabled />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      expect(uploadZone.tabIndex).toBe(-1);
    });
  });

  describe("Loading state", () => {
    it("shows loading spinner during upload", async () => {
      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({
                  trip: { coverImageUrl: "/uploads/test.jpg" },
                }),
              } as Response);
            }, 100);
          }),
      );

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const spinner = container.querySelector(".animate-spin");
        expect(spinner).toBeDefined();
      });
    });

    it("hides remove button during upload", async () => {
      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({
                  trip: { coverImageUrl: "/uploads/test.jpg" },
                }),
              } as Response);
            }, 100);
          }),
      );

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const spinner = container.querySelector(".animate-spin");
        expect(spinner).toBeDefined();
        expect(
          screen.queryByRole("button", { name: "Remove image" }),
        ).toBeNull();
      });
    });
  });

  describe("Error handling", () => {
    it("displays error messages correctly", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.pdf", "application/pdf", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const errorMessage = screen.getByText(
          "Invalid file type. Only JPG, PNG, and WEBP are allowed",
        );
        expect(errorMessage).toBeDefined();
        expect(errorMessage.className).toContain("text-red-700");
      });
    });

    it("shows error icon with error message", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.pdf", "application/pdf", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const errorContainer = container.querySelector(".bg-red-50");
        expect(errorContainer).toBeDefined();
      });
    });

    it("clears error on new file selection", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      // First, select invalid file
      const invalidFile = createMockFile("test.pdf", "application/pdf", 1024);
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/)).toBeDefined();
      });

      // Then select valid file
      const validFile = createMockFile("test.jpg", "image/jpeg", 1024);
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.queryByText(/Invalid file type/)).toBeNull();
      });
    });
  });

  describe("Upload with tripId", () => {
    it("calls onChange with uploaded URL on successful upload", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ trip: { coverImageUrl: "/uploads/test.jpg" } }),
        } as Response),
      );

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith("/uploads/test.jpg");
      });
    });

    it("sends correct FormData to API", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ trip: { coverImageUrl: "/uploads/test.jpg" } }),
        } as Response),
      );
      global.fetch = mockFetch;

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/api/trips/trip-123/cover-image",
          expect.objectContaining({
            method: "POST",
            credentials: "include",
            body: expect.any(FormData),
          }),
        );
      });
    });

    it("uses centralized API_URL for upload requests", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ trip: { coverImageUrl: "/uploads/test.jpg" } }),
        } as Response),
      );
      global.fetch = mockFetch;

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/api/trips/trip-123/cover-image",
          expect.any(Object),
        );
      });
    });

    it("handles upload error gracefully", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({
            error: { message: "Upload failed due to server error" },
          }),
        } as Response),
      );

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText("Upload failed due to server error"),
        ).toBeDefined();
      });
    });

    it("reverts preview on upload error", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: { message: "Upload failed" } }),
        } as Response),
      );

      const { container } = render(
        <ImageUpload
          onChange={mockOnChange}
          tripId="trip-123"
          value="https://example.com/original.jpg"
        />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const preview = screen.getByAltText("Preview") as HTMLImageElement;
        expect(preview.src).toBe("https://example.com/original.jpg");
      });
    });
  });

  describe("Upload without tripId", () => {
    it("calls onChange with blob URL when no tripId provided", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining("blob:"),
        );
      });
    });

    it("does not make API call when no tripId provided", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has aria-label on file input", () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput?.getAttribute("aria-label")).toBe("Upload image file");
    });

    it("has aria-label on upload zone", () => {
      render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      expect(uploadZone.getAttribute("aria-label")).toBe("Upload image");
    });

    it("has aria-label on remove button", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const removeButton = screen.getByRole("button", {
          name: "Remove image",
        });
        expect(removeButton.getAttribute("aria-label")).toBe("Remove image");
      });
    });

    it("supports keyboard navigation on upload zone", () => {
      render(<ImageUpload onChange={mockOnChange} />);

      const uploadZone = screen.getByRole("button", { name: "Upload image" });
      expect(uploadZone.tabIndex).toBe(0);
    });
  });

  describe("Custom className", () => {
    it("applies custom className to root element", () => {
      const { container } = render(
        <ImageUpload onChange={mockOnChange} className="custom-class" />,
      );

      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain("custom-class");
    });
  });

  describe("Retry functionality", () => {
    it("shows retry button after upload error", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: { message: "Upload failed" } }),
        } as Response),
      );

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Upload failed")).toBeDefined();
        expect(screen.getByText("Try again")).toBeDefined();
      });
    });

    it("does not show retry button for validation errors", async () => {
      const { container } = render(<ImageUpload onChange={mockOnChange} />);

      const file = createMockFile("test.pdf", "application/pdf", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Invalid file type. Only JPG, PNG, and WEBP are allowed",
          ),
        ).toBeDefined();
        expect(screen.queryByText("Try again")).toBeNull();
      });
    });

    it("retries upload when retry button is clicked", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Upload failed" } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ trip: { coverImageUrl: "/uploads/test.jpg" } }),
        } as Response);

      global.fetch = mockFetch;

      const user = userEvent.setup();
      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Upload failed")).toBeDefined();
      });

      const retryButton = screen.getByText("Try again");
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockOnChange).toHaveBeenCalledWith("/uploads/test.jpg");
      });
    });

    it("shows network error message for network failures", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("Failed to fetch")));

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Network error: Please check your connection and try again.",
          ),
        ).toBeDefined();
      });
    });

    it("calls fetch again when retry button is clicked", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Upload failed" } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ trip: { coverImageUrl: "/uploads/test.jpg" } }),
        } as Response);

      global.fetch = mockFetch;

      const user = userEvent.setup();
      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Upload failed")).toBeDefined();
      });

      const retryButton = screen.getByText("Try again") as HTMLButtonElement;
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockOnChange).toHaveBeenCalledWith("/uploads/test.jpg");
      });
    });

    it("clears lastFailedFile on successful upload", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ trip: { coverImageUrl: "/uploads/test.jpg" } }),
        } as Response),
      );

      global.fetch = mockFetch;

      const { container } = render(
        <ImageUpload onChange={mockOnChange} tripId="trip-123" />,
      );

      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith("/uploads/test.jpg");
        expect(screen.queryByText("Try again")).toBeNull();
      });
    });
  });
});
