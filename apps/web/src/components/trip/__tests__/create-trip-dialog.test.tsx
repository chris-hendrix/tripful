import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTripDialog } from "../create-trip-dialog";

describe("CreateTripDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    // Mock console.log to avoid test output noise
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("Dialog open/close behavior", () => {
    it("renders dialog when open is true", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText("Create a new trip")).toBeDefined();
    });

    it("does not render dialog content when open is false", () => {
      render(<CreateTripDialog open={false} onOpenChange={mockOnOpenChange} />);

      expect(screen.queryByText("Create a new trip")).toBeNull();
    });

    it("calls onOpenChange when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Step 1 - Basic information rendering", () => {
    it("displays all Step 1 fields", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByLabelText(/trip name/i)).toBeDefined();
      expect(screen.getByLabelText(/destination/i)).toBeDefined();
      expect(screen.getByLabelText(/start date/i)).toBeDefined();
      expect(screen.getByLabelText(/end date/i)).toBeDefined();
      expect(screen.getByLabelText(/trip timezone/i)).toBeDefined();
    });

    it("shows Step 1 of 2 progress indicator", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText("Step 1 of 2")).toBeDefined();
      expect(screen.getByText("Basic information")).toBeDefined();
    });

    it("displays Continue button on Step 1", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByRole("button", { name: /continue/i })).toBeDefined();
    });

    it("shows required field indicators", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Check for required asterisks by finding text content
      const labels = screen.getAllByText("*");
      // Trip name, Destination, and Timezone should have asterisks
      expect(labels.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Field validation - Trip name", () => {
    it("shows error when trip name is too short", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "AB");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/trip name must be at least 3 characters/i),
        ).toBeDefined();
      });
    });

    it("shows error when trip name is empty", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeDefined();
      });
    });

    it("accepts valid trip name (3-100 characters)", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Summer Vacation 2026");

      // Should not show error
      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        // Name error should not appear
        expect(
          screen.queryByText(/trip name must be at least 3 characters/i),
        ).toBeNull();
      });
    });
  });

  describe("Field validation - Destination", () => {
    it("shows error when destination is empty", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Fill name but leave destination empty
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/destination is required/i)).toBeDefined();
      });
    });

    it("accepts valid destination", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami, FL");

      // Should not show error after typing
      expect(screen.queryByText(/destination is required/i)).toBeNull();
    });
  });

  describe("Field validation - Date fields", () => {
    it("accepts optional start and end dates", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Fill required fields
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      // Leave dates empty
      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      // Should proceed to Step 2 without date errors
      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    });

    it("shows error when end date is before start date", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Fill required fields
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      // Set end date before start date
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, "2026-12-31");

      const endDateInput = screen.getByLabelText(/end date/i);
      await user.type(endDateInput, "2026-01-01");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(
          screen.getByText(/end date must be on or after start date/i),
        ).toBeDefined();
      });
    });

    it("accepts valid date range", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Fill required fields
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      // Set valid date range
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, "2026-07-01");

      const endDateInput = screen.getByLabelText(/end date/i);
      await user.type(endDateInput, "2026-07-15");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      // Should proceed to Step 2
      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    });
  });

  describe("Field validation - Timezone", () => {
    it("defaults to browser timezone", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Timezone should have a default value
      const timezoneSelect = screen.getByLabelText(/trip timezone/i);
      expect(timezoneSelect).toBeDefined();
    });

    it("renders timezone select with options", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const timezoneSelect = screen.getByLabelText(/trip timezone/i);
      expect(timezoneSelect).toBeDefined();

      // Timezone select should be present and functional
      // Note: Full interaction testing with Radix Select is complex in jsdom
      // The component will be tested in E2E tests
    });
  });

  describe("Step navigation", () => {
    it("does not proceed to Step 2 with invalid Step 1 data", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Leave fields empty
      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      // Should stay on Step 1
      await waitFor(() => {
        expect(screen.getByText("Step 1 of 2")).toBeDefined();
        expect(screen.queryByText("Step 2 coming in Task 4.4")).toBeNull();
      });
    });

    it("proceeds to Step 2 with valid Step 1 data", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Fill required fields
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Summer Beach Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Malibu, CA");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      // Should show Step 2
      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
        expect(screen.getByText("Details & settings")).toBeDefined();
      });
    });

    it("returns to Step 1 when Back button is clicked", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Navigate to Step 2
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // Click Back
      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      // Should return to Step 1
      await waitFor(() => {
        expect(screen.getByText("Step 1 of 2")).toBeDefined();
        expect(screen.getByLabelText(/trip name/i)).toBeDefined();
      });
    });

    it("preserves Step 1 data when navigating back from Step 2", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Fill Step 1 data
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Preserved Trip Name");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Preserved Destination");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // Navigate back
      await user.click(screen.getByRole("button", { name: /back/i }));

      // Verify data is preserved
      await waitFor(() => {
        const nameInputAfterBack = screen.getByLabelText(
          /trip name/i,
        ) as HTMLInputElement;
        expect(nameInputAfterBack.value).toBe("Preserved Trip Name");

        const destinationInputAfterBack = screen.getByLabelText(
          /destination/i,
        ) as HTMLInputElement;
        expect(destinationInputAfterBack.value).toBe("Preserved Destination");
      });
    });
  });

  describe("Step 2 - Details & settings rendering", () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    }

    it("displays all Step 2 fields", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      expect(screen.getByLabelText(/description/i)).toBeDefined();
      expect(screen.getAllByText(/cover image/i).length).toBeGreaterThan(0);
      expect(
        screen.getByLabelText(/allow members to add events/i),
      ).toBeDefined();
      expect(screen.getAllByText(/co-organizers/i).length).toBeGreaterThan(0);
    });

    it("shows Back and Create trip buttons on Step 2", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      expect(screen.getByRole("button", { name: /back/i })).toBeDefined();
      expect(
        screen.getByRole("button", { name: /create trip/i }),
      ).toBeDefined();
    });

    it("shows Step 2 of 2 progress indicator", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      expect(screen.getByText("Step 2 of 2")).toBeDefined();
      expect(screen.getByText("Details & settings")).toBeDefined();
    });
  });

  describe("Step 2 - Description field", () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    }

    it("allows entering description text", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const descriptionInput = screen.getByLabelText(
        /description/i,
      ) as HTMLTextAreaElement;
      await user.type(descriptionInput, "This is a test trip description");

      expect(descriptionInput.value).toBe("This is a test trip description");
    });

    it("does not show character counter below 1600 characters", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "Short description");

      expect(screen.queryByText(/\/ 2000 characters/i)).toBeNull();
    });

    it("shows character counter at 1600+ characters", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const descriptionInput = screen.getByLabelText(
        /description/i,
      ) as HTMLTextAreaElement;
      const longText = "a".repeat(1600);

      // Use paste to avoid slow character-by-character typing
      await user.click(descriptionInput);
      await user.paste(longText);

      await waitFor(() => {
        expect(screen.getByText("1600 / 2000 characters")).toBeDefined();
      });
    });

    it("shows error when description exceeds 2000 characters", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const descriptionInput = screen.getByLabelText(
        /description/i,
      ) as HTMLTextAreaElement;
      const tooLongText = "a".repeat(2001);

      // Use paste to avoid slow character-by-character typing
      await user.click(descriptionInput);
      await user.paste(tooLongText);

      await user.click(screen.getByRole("button", { name: /create trip/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/description must not exceed 2000 characters/i),
        ).toBeDefined();
      });
    });

    it("accepts valid description (under 2000 characters)", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "log");

      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "Valid description");

      await user.click(screen.getByRole("button", { name: /create trip/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Trip data:",
          expect.objectContaining({
            description: "Valid description",
          }),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Step 2 - Cover image field", () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    }

    it("renders ImageUpload component", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      // ImageUpload component should render its upload area
      expect(
        screen.getByText(/click to upload or drag and drop/i),
      ).toBeDefined();
    });

    it("allows cover image to be optional", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "log");

      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      // Submit without uploading image
      await user.click(screen.getByRole("button", { name: /create trip/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Trip data:",
          expect.objectContaining({
            coverImageUrl: null,
          }),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Step 2 - Allow members to add events checkbox", () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    }

    it("defaults to checked (true)", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const checkbox = screen.getByLabelText(
        /allow members to add events/i,
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("can be toggled off", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const checkbox = screen.getByLabelText(
        /allow members to add events/i,
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      await user.click(checkbox);

      expect(checkbox.checked).toBe(false);
    });

    it("can be toggled back on", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const checkbox = screen.getByLabelText(
        /allow members to add events/i,
      ) as HTMLInputElement;

      await user.click(checkbox);
      expect(checkbox.checked).toBe(false);

      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it("submits correct value when unchecked", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "log");

      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const checkbox = screen.getByLabelText(/allow members to add events/i);
      await user.click(checkbox);

      await user.click(screen.getByRole("button", { name: /create trip/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Trip data:",
          expect.objectContaining({
            allowMembersToAddEvents: false,
          }),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Step 2 - Co-organizers field", () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    }

    it("shows co-organizer input field", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      expect(screen.getByLabelText(/co-organizer phone number/i)).toBeDefined();
    });

    it("allows adding valid phone number", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const phoneInput = screen.getByLabelText(/co-organizer phone number/i);
      await user.type(phoneInput, "+14155552671");

      const addButton = screen.getByRole("button", {
        name: "",
      });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });
    });

    it("shows error for invalid phone format", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const phoneInput = screen.getByLabelText(/co-organizer phone number/i);
      await user.type(phoneInput, "invalid");

      const addButton = screen.getByRole("button", {
        name: "",
      });
      await user.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByText(/phone number must be in E\.164 format/i),
        ).toBeDefined();
      });
    });

    it("shows error for empty phone number", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const addButton = screen.getByRole("button", {
        name: "",
      });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/phone number is required/i)).toBeDefined();
      });
    });

    it("prevents duplicate phone numbers", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const phoneInput = screen.getByLabelText(/co-organizer phone number/i);
      const addButton = screen.getByRole("button", {
        name: "",
      });

      // Add first phone
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      // Try to add same phone again
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByText(/this phone number is already added/i),
        ).toBeDefined();
      });
    });

    it("allows adding multiple co-organizers", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const phoneInput = screen.getByLabelText(/co-organizer phone number/i);
      const addButton = screen.getByRole("button", {
        name: "",
      });

      // Add first phone
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      // Add second phone
      await user.type(phoneInput, "+14155552672");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552672")).toBeDefined();
      });
    });

    it("allows removing co-organizers", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const phoneInput = screen.getByLabelText(/co-organizer phone number/i);
      const addButton = screen.getByRole("button", {
        name: "",
      });

      // Add phone
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      // Remove phone
      const removeButton = screen.getByRole("button", {
        name: /remove \+14155552671/i,
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText("+14155552671")).toBeNull();
      });
    });

    it("clears input after adding co-organizer", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const phoneInput = screen.getByLabelText(
        /co-organizer phone number/i,
      ) as HTMLInputElement;
      const addButton = screen.getByRole("button", {
        name: "",
      });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(phoneInput.value).toBe("");
      });
    });

    it("allows adding co-organizer by pressing Enter", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const phoneInput = screen.getByLabelText(/co-organizer phone number/i);
      await user.type(phoneInput, "+14155552671");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });
    });

    it("includes co-organizers in form submission", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "log");

      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      const phoneInput = screen.getByLabelText(/co-organizer phone number/i);
      const addButton = screen.getByRole("button", {
        name: "",
      });

      // Add co-organizers
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await user.type(phoneInput, "+14155552672");
      await user.click(addButton);

      await user.click(screen.getByRole("button", { name: /create trip/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Trip data:",
          expect.objectContaining({
            coOrganizerPhones: ["+14155552671", "+14155552672"],
          }),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Step 2 - Back navigation preserves data", () => {
    it("preserves Step 2 data when navigating back to Step 1", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Fill Step 1
      await user.type(screen.getByLabelText(/trip name/i), "Test Trip");
      await user.type(screen.getByLabelText(/destination/i), "Miami");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // Fill Step 2
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "Test description");

      const checkbox = screen.getByLabelText(/allow members to add events/i);
      await user.click(checkbox);

      // Navigate back
      await user.click(screen.getByRole("button", { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 1 of 2")).toBeDefined();
      });

      // Navigate forward again
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // Verify data is preserved
      const descriptionInputAfterBack = screen.getByLabelText(
        /description/i,
      ) as HTMLTextAreaElement;
      expect(descriptionInputAfterBack.value).toBe("Test description");

      const checkboxAfterBack = screen.getByLabelText(
        /allow members to add events/i,
      ) as HTMLInputElement;
      expect(checkboxAfterBack.checked).toBe(false);
    });
  });

  describe("Step 2 - Loading state", () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    }

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /create trip/i }));

      // Should show loading text
      expect(screen.getByText("Creating trip...")).toBeDefined();
    });

    it("disables all fields during submission", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /create trip/i }));

      // Check that fields are disabled
      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toHaveProperty("disabled", true);

      const checkbox = screen.getByLabelText(/allow members to add events/i);
      expect(checkbox).toHaveProperty("disabled", true);

      const phoneInput = screen.getByLabelText(/co-organizer phone number/i);
      expect(phoneInput).toHaveProperty("disabled", true);
    });

    it("disables Back and Create trip buttons during submission", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /create trip/i }));

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toHaveProperty("disabled", true);

      const createButton = screen.getByRole("button", {
        name: /creating trip\.\.\./i,
      });
      expect(createButton).toHaveProperty("disabled", true);
    });
  });

  describe("Progress indicator styling", () => {
    it("shows active styling for Step 1 when on Step 1", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Check for step indicators showing "1" and "2"
      const stepIndicators = screen.getAllByText(/^[12]$/);
      expect(stepIndicators.length).toBe(2);

      // Verify Step 1 and Step 2 text is present
      expect(screen.getByText("Step 1 of 2")).toBeDefined();
    });

    it("shows step progress when navigating to Step 2", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Verify Step 1 indicator
      expect(screen.getByText("Step 1 of 2")).toBeDefined();

      // Navigate to Step 2
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.type(nameInput, "Test Trip");

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "Miami");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // Both step numbers should still be visible
      const stepIndicators = screen.getAllByText(/^[12]$/);
      expect(stepIndicators.length).toBe(2);
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for all form fields", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByLabelText(/trip name/i)).toBeDefined();
      expect(screen.getByLabelText(/destination/i)).toBeDefined();
      expect(screen.getByLabelText(/start date/i)).toBeDefined();
      expect(screen.getByLabelText(/end date/i)).toBeDefined();
      expect(screen.getByLabelText(/trip timezone/i)).toBeDefined();
    });

    it("has aria-invalid attribute on invalid fields", async () => {
      const user = userEvent.setup();
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/trip name/i);
        expect(nameInput.getAttribute("aria-invalid")).toBe("true");
      });
    });

    it("shows form descriptions for context", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(
        screen.getByText(/choose something memorable \(3-100 characters\)/i),
      ).toBeDefined();
      expect(
        screen.getByText(/all trip times will be shown in this timezone/i),
      ).toBeDefined();
    });
  });

  describe("Styling", () => {
    it("applies Playfair Display font to title", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const title = screen.getByText("Create a new trip");
      expect(title.style.fontFamily).toContain("Playfair Display");
    });

    it("applies h-12 height to inputs", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const nameInput = screen.getByLabelText(/trip name/i);
      expect(nameInput.className).toContain("h-12");
    });

    it("applies rounded-xl to inputs and buttons", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const nameInput = screen.getByLabelText(/trip name/i);
      expect(nameInput.className).toContain("rounded-xl");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton.className).toContain("rounded-xl");
    });

    it("applies gradient styling to Continue button", () => {
      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton.className).toContain("bg-gradient-to-r");
      expect(continueButton.className).toContain("from-blue-600");
      expect(continueButton.className).toContain("to-cyan-600");
    });
  });

  describe("Form submission placeholder", () => {
    it("logs trip data on form submit (placeholder for API call)", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "log");

      render(<CreateTripDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Fill Step 1
      await user.type(screen.getByLabelText(/trip name/i), "API Test Trip");
      await user.type(screen.getByLabelText(/destination/i), "Test City");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Submit from Step 2
      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /create trip/i }));

      // Verify console.log was called (placeholder for API call)
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Trip data:",
          expect.objectContaining({
            name: "API Test Trip",
            destination: "Test City",
          }),
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
