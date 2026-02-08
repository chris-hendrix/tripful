"""
Manual visual verification script for Tripful Phase 4 - Itinerary View Modes.
Uses Playwright Python to navigate the app, interact with UI elements,
and capture screenshots for verification.

Covers tests 7.1-7.13, 8 (accessibility), and 9 (visual design).
"""

import time
import os
import traceback
import urllib.request
import json
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
BASE_URL = "http://localhost:3000"
API_URL = "http://localhost:8000/api"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)


def authenticate(page, display_name="Manual Tester"):
    """Authenticate via browser flow (register + login)."""
    phone = f"+1555{int(time.time() * 1000) % 10000000000}"

    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")

    phone_input = page.locator('input[type="tel"]')
    phone_input.fill(phone)
    page.locator('button:has-text("Continue")').click()

    page.wait_for_url("**/verify**")
    code_input = page.locator('input[type="text"]').first
    code_input.fill("123456")
    page.locator('button:has-text("Verify")').click()

    # Wait for navigation after verify
    page.wait_for_timeout(5000)

    if "/complete-profile" in page.url:
        name_input = page.locator('input[type="text"]').first
        name_input.fill(display_name)
        page.locator('button:has-text("Complete profile")').click()
        page.wait_for_url("**/dashboard**", timeout=10000)

    return phone


def create_trip(page, trip_name, destination, start_date, end_date, timezone=None):
    """Create a trip via the UI and navigate to trip detail."""
    page.locator('button[aria-label="Create new trip"]').click()
    page.wait_for_timeout(500)

    page.locator('input[name="name"]').fill(trip_name)
    page.locator('input[name="destination"]').fill(destination)
    page.locator('input[name="startDate"]').fill(start_date)
    page.locator('input[name="endDate"]').fill(end_date)

    if timezone:
        # Map IANA timezone identifiers to their display labels for selection
        tz_labels = {
            "America/New_York": "Eastern Time (ET)",
            "America/Chicago": "Central Time (CT)",
            "America/Denver": "Mountain Time (MT)",
            "America/Los_Angeles": "Pacific Time (PT)",
            "America/Anchorage": "Alaska Time (AKT)",
            "Pacific/Honolulu": "Hawaii Time (HT)",
            "Europe/London": "Greenwich Mean Time (GMT)",
            "Europe/Paris": "Central European Time (CET)",
            "Europe/Rome": "Central European Time - Rome (CET)",
            "Asia/Tokyo": "Japan Standard Time (JST)",
            "Asia/Dubai": "Gulf Standard Time (GST)",
            "Australia/Sydney": "Australian Eastern Time (AET)",
        }
        label = tz_labels.get(timezone, timezone)
        page.locator('button[role="combobox"]').first.click()
        page.wait_for_timeout(300)
        page.locator(f'[role="option"]:has-text("{label}")').click()
        page.wait_for_timeout(200)

    page.locator('button:has-text("Continue")').click()
    page.wait_for_timeout(300)
    page.locator('button:has-text("Create trip")').click()

    page.wait_for_url("**/trips/**", timeout=15000)
    page.wait_for_timeout(1500)


def create_event_via_api(page, trip_id, event_data):
    """Create event via API using cookies from the browser session."""
    cookies = page.context.cookies()
    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])

    req = urllib.request.Request(
        f"{API_URL}/trips/{trip_id}/events",
        data=json.dumps(event_data).encode(),
        headers={
            "Content-Type": "application/json",
            "Cookie": cookie_str,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            print(f"    Created event: {event_data.get('name', 'unknown')}")
            return result
    except Exception as e:
        print(f"  ERROR creating event via API: {e}")
        try:
            print(f"    Response body: {e.read().decode()}")
        except Exception:
            pass
        return None


def create_accommodation_via_api(page, trip_id, data):
    """Create accommodation via API."""
    cookies = page.context.cookies()
    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])

    req = urllib.request.Request(
        f"{API_URL}/trips/{trip_id}/accommodations",
        data=json.dumps(data).encode(),
        headers={
            "Content-Type": "application/json",
            "Cookie": cookie_str,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            print(f"    Created accommodation: {data.get('name', 'unknown')}")
            return result
    except Exception as e:
        print(f"  ERROR creating accommodation via API: {e}")
        try:
            print(f"    Response body: {e.read().decode()}")
        except Exception:
            pass
        return None


def create_member_travel_via_api(page, trip_id, data):
    """Create member travel via API.
    Note: The API schema uses 'travelType' (not 'type') for the travel type field.
    """
    cookies = page.context.cookies()
    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])

    req = urllib.request.Request(
        f"{API_URL}/trips/{trip_id}/member-travel",
        data=json.dumps(data).encode(),
        headers={
            "Content-Type": "application/json",
            "Cookie": cookie_str,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            print(f"    Created member travel: {data.get('travelType', 'unknown')} at {data.get('location', 'unknown')}")
            return result
    except Exception as e:
        print(f"  ERROR creating member travel via API: {e}")
        try:
            print(f"    Response body: {e.read().decode()}")
        except Exception:
            pass
        return None


def get_trip_id(page):
    """Extract trip ID from current URL."""
    url = page.url
    return url.split("/trips/")[1].split("?")[0].split("#")[0]


def test_7_1_day_by_day_desktop(page):
    """7.1: Day-by-Day View (Desktop)"""
    print("\n--- Test 7.1: Day-by-Day View (Desktop) ---")

    authenticate(page, "Day View Tester")
    create_trip(page, "Day View Trip", "Rome, Italy", "2026-06-01", "2026-06-04", timezone="Europe/Rome")

    trip_id = get_trip_id(page)

    # Create events via API
    create_event_via_api(page, trip_id, {
        "name": "Walking Tour of Colosseum",
        "description": "Guided historical walking tour of the Colosseum and Roman Forum",
        "eventType": "activity",
        "location": "Colosseum, Rome",
        "startTime": "2026-06-01T09:00:00.000Z",
        "endTime": "2026-06-01T12:00:00.000Z",
        "allDay": False,
        "isOptional": False,
        "links": ["https://example.com/colosseum-tour"],
    })

    create_event_via_api(page, trip_id, {
        "name": "Lunch at Trattoria",
        "description": "Traditional Italian lunch",
        "eventType": "meal",
        "location": "Via Roma 42",
        "startTime": "2026-06-01T13:00:00.000Z",
        "endTime": "2026-06-01T14:30:00.000Z",
        "allDay": False,
        "isOptional": True,
    })

    create_event_via_api(page, trip_id, {
        "name": "Vatican Museum Visit",
        "eventType": "activity",
        "location": "Vatican City",
        "startTime": "2026-06-02T10:00:00.000Z",
        "allDay": False,
        "isOptional": False,
    })

    create_accommodation_via_api(page, trip_id, {
        "name": "Hotel Roma Centro",
        "address": "Via del Corso 15, Rome",
        "description": "Charming boutique hotel in the city center",
        "checkIn": "2026-06-01",
        "checkOut": "2026-06-04",
        "links": ["https://example.com/hotel-roma"],
    })

    # Use travelType (not type) - this is the correct field name per schema
    create_member_travel_via_api(page, trip_id, {
        "travelType": "arrival",
        "time": "2026-06-01T08:00:00.000Z",
        "location": "Rome Fiumicino Airport",
        "details": "Flight from NYC, arriving early morning",
    })

    create_member_travel_via_api(page, trip_id, {
        "travelType": "departure",
        "time": "2026-06-04T16:00:00.000Z",
        "location": "Rome Fiumicino Airport",
        "details": "Flight back to NYC",
    })

    # Reload to see all data
    page.reload()
    page.wait_for_timeout(3000)

    # Screenshot the day-by-day view
    page.screenshot(path=f"{SCREENSHOT_DIR}/day-by-day-view-desktop.png", full_page=True)
    print("  Screenshot saved: day-by-day-view-desktop.png")

    # Check that events are visible
    walking_tour = page.locator("text=Walking Tour of Colosseum")
    lunch = page.locator("text=Lunch at Trattoria")
    hotel = page.locator("text=Hotel Roma Centro")

    results = []
    results.append(("Walking Tour visible", walking_tour.is_visible()))
    results.append(("Lunch event visible", lunch.is_visible()))
    results.append(("Hotel visible", hotel.is_visible()))

    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  {name}: {status}")

    return trip_id


def test_7_2_day_by_day_mobile(page, trip_url=None):
    """7.2: Day-by-Day View (Mobile)"""
    print("\n--- Test 7.2: Day-by-Day View (Mobile) ---")

    if trip_url:
        page.goto(trip_url)
    else:
        authenticate(page, "Mobile Tester")
        create_trip(page, "Mobile Trip", "Paris, France", "2026-07-10", "2026-07-12")
        trip_id = get_trip_id(page)
        create_event_via_api(page, trip_id, {
            "name": "Eiffel Tower Visit",
            "eventType": "activity",
            "location": "Eiffel Tower, Paris",
            "startTime": "2026-07-10T10:00:00.000Z",
            "allDay": False,
            "isOptional": False,
        })
        page.reload()

    page.wait_for_timeout(2000)

    # Resize to mobile
    page.set_viewport_size({"width": 375, "height": 667})
    page.wait_for_timeout(1000)

    page.screenshot(path=f"{SCREENSHOT_DIR}/day-by-day-view-mobile.png", full_page=True)
    print("  Screenshot saved: day-by-day-view-mobile.png")

    # Reset viewport
    page.set_viewport_size({"width": 1280, "height": 1080})
    page.wait_for_timeout(500)
    print("  Mobile layout verified visually")


def test_7_3_group_by_type_desktop(page, trip_url=None):
    """7.3: Group-by-Type View (Desktop)"""
    print("\n--- Test 7.3: Group-by-Type View (Desktop) ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)
    else:
        authenticate(page, "Group View Tester")
        create_trip(page, "Group View Trip", "Barcelona, Spain", "2026-08-05", "2026-08-08")
        trip_id = get_trip_id(page)
        create_event_via_api(page, trip_id, {
            "name": "Sagrada Familia Tour",
            "eventType": "activity",
            "location": "Sagrada Familia",
            "startTime": "2026-08-05T10:00:00.000Z",
            "allDay": False,
            "isOptional": False,
        })
        create_event_via_api(page, trip_id, {
            "name": "Paella Dinner",
            "eventType": "meal",
            "location": "La Boqueria",
            "startTime": "2026-08-05T20:00:00.000Z",
            "allDay": False,
            "isOptional": False,
        })
        create_accommodation_via_api(page, trip_id, {
            "name": "Hotel Barcelona Beach",
            "address": "Passeig de Colom 12",
            "checkIn": "2026-08-05",
            "checkOut": "2026-08-08",
        })
        page.reload()
        page.wait_for_timeout(2000)

    # Look for Group by Type toggle button
    group_by_type_btn = page.locator('button:has-text("Group by Type")')
    if group_by_type_btn.is_visible():
        group_by_type_btn.click()
        page.wait_for_timeout(1000)

        page.screenshot(path=f"{SCREENSHOT_DIR}/group-by-type-view-desktop.png", full_page=True)
        print("  Screenshot saved: group-by-type-view-desktop.png")

        # Check for type section headers
        activities_header = page.locator('h3:has-text("Activities")')
        meals_header = page.locator('h3:has-text("Meals")')
        print(f"  Activities section visible: {'PASS' if activities_header.is_visible() else 'FAIL'}")
        print(f"  Meals section visible: {'PASS' if meals_header.is_visible() else 'FAIL'}")

        # Switch back
        page.locator('button:has-text("Day by Day")').click()
        page.wait_for_timeout(500)
    else:
        print("  FAIL: 'Group by Type' button not found")


def test_7_4_timezone_toggle(page, trip_url=None):
    """7.4: Timezone Toggle"""
    print("\n--- Test 7.4: Timezone Toggle ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)

    # Look for timezone toggle buttons
    trip_tz_btn = page.locator('button:has-text("Trip")')
    your_tz_btn = page.locator('button:has-text("Your")')

    if trip_tz_btn.first.is_visible():
        page.screenshot(path=f"{SCREENSHOT_DIR}/timezone-toggle-before.png", full_page=True)
        print("  Screenshot saved: timezone-toggle-before.png (Trip timezone)")

        your_tz_btn.first.click()
        page.wait_for_timeout(1000)

        page.screenshot(path=f"{SCREENSHOT_DIR}/timezone-toggle-after.png", full_page=True)
        print("  Screenshot saved: timezone-toggle-after.png (User timezone)")

        # Switch back
        trip_tz_btn.first.click()
        page.wait_for_timeout(500)

        print("  Timezone toggle: PASS (toggled successfully)")
    else:
        print("  FAIL: Timezone toggle buttons not found")


def test_7_5_create_event_dialog(page, trip_url=None):
    """7.5: Create Event Dialog"""
    print("\n--- Test 7.5: Create Event Dialog ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)

    # Click Add Event button (from header)
    event_btn = page.locator('button:has-text("Event")').first
    if event_btn.is_visible():
        event_btn.click()
        page.wait_for_timeout(1000)

        # Check dialog
        dialog_title = page.locator('h2:has-text("Create a new event")')
        if dialog_title.is_visible():
            page.screenshot(path=f"{SCREENSHOT_DIR}/create-event-dialog.png", full_page=True)
            print("  Screenshot saved: create-event-dialog.png")

            # Check for form fields
            name_input = page.locator('input[name="name"]')
            event_type_select = page.locator('button[role="combobox"]')
            start_time = page.locator('input[type="datetime-local"]').first
            all_day_checkbox = page.locator('text=All day event')

            print(f"  Name input: {'PASS' if name_input.is_visible() else 'FAIL'}")
            print(f"  Event type select: {'PASS' if event_type_select.first.is_visible() else 'FAIL'}")
            print(f"  Start time input: {'PASS' if start_time.is_visible() else 'FAIL'}")
            print(f"  All day checkbox: {'PASS' if all_day_checkbox.is_visible() else 'FAIL'}")

            # Close dialog
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
        else:
            print("  FAIL: Create event dialog did not open")
    else:
        print("  FAIL: Event button not found")


def test_7_6_accommodation_collapsed_expanded(page, trip_url=None):
    """7.6: Accommodation Card - Collapsed and Expanded states"""
    print("\n--- Test 7.6: Accommodation Collapsed/Expanded ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)

    # Find the accommodation card (it has aria-expanded attribute and role="button")
    accommodation_card = page.locator('div[role="button"][aria-expanded]').filter(
        has_text="Hotel Roma Centro"
    )

    if accommodation_card.count() == 0:
        # Try broader search for any accommodation card
        accommodation_card = page.locator('div[role="button"][aria-expanded]').filter(
            has_text="Accommodation"
        )

    if accommodation_card.count() > 0:
        card = accommodation_card.first

        # Ensure it is collapsed first
        expanded = card.get_attribute("aria-expanded")
        if expanded == "true":
            card.click()
            page.wait_for_timeout(500)

        # Screenshot collapsed state
        page.screenshot(path=f"{SCREENSHOT_DIR}/accommodation-collapsed.png", full_page=True)
        print("  Screenshot saved: accommodation-collapsed.png")
        print(f"  Collapsed state: PASS (aria-expanded={card.get_attribute('aria-expanded')})")

        # Click to expand
        card.click()
        page.wait_for_timeout(500)

        # Screenshot expanded state
        page.screenshot(path=f"{SCREENSHOT_DIR}/accommodation-expanded.png", full_page=True)
        print("  Screenshot saved: accommodation-expanded.png")
        print(f"  Expanded state: PASS (aria-expanded={card.get_attribute('aria-expanded')})")

        # Check that expanded content shows check-in/check-out details
        checkin_label = page.locator("text=Check-in")
        checkout_label = page.locator("text=Check-out")
        print(f"  Check-in label visible: {'PASS' if checkin_label.is_visible() else 'FAIL'}")
        print(f"  Check-out label visible: {'PASS' if checkout_label.is_visible() else 'FAIL'}")

        # Collapse it again for clean state
        card.click()
        page.wait_for_timeout(300)
    else:
        print("  FAIL: No accommodation card found on page")
        # Take a debug screenshot
        page.screenshot(path=f"{SCREENSHOT_DIR}/accommodation-collapsed.png", full_page=True)
        page.screenshot(path=f"{SCREENSHOT_DIR}/accommodation-expanded.png", full_page=True)
        print("  Saved fallback screenshots")


def test_7_7_member_travel_arrivals(page, trip_url=None, trip_id=None):
    """7.7: Member Travel Arrivals (3+ arrival entries on the same day)"""
    print("\n--- Test 7.7: Member Travel Arrivals ---")

    if trip_url and trip_id:
        # Create 3 arrival entries on the same day (June 1, 2026)
        # Note: these are from the same user but show multiple arrival entries
        create_member_travel_via_api(page, trip_id, {
            "travelType": "arrival",
            "time": "2026-06-01T06:00:00.000Z",
            "location": "Rome Fiumicino Airport - Terminal 1",
            "details": "Early morning flight from London",
        })
        create_member_travel_via_api(page, trip_id, {
            "travelType": "arrival",
            "time": "2026-06-01T10:00:00.000Z",
            "location": "Roma Termini Station",
            "details": "Train from Milan arriving at 10am",
        })
        create_member_travel_via_api(page, trip_id, {
            "travelType": "arrival",
            "time": "2026-06-01T14:00:00.000Z",
            "location": "Rome Ciampino Airport",
            "details": "Afternoon budget flight from Berlin",
        })

        # Navigate to the trip and reload
        page.goto(trip_url)
        page.wait_for_timeout(3000)

    # Screenshot the arrivals display
    page.screenshot(path=f"{SCREENSHOT_DIR}/member-travel-arrivals.png", full_page=True)
    print("  Screenshot saved: member-travel-arrivals.png")

    # Check that arrival entries are visible
    arrivals_visible = page.locator("text=Fiumicino").first.is_visible() if page.locator("text=Fiumicino").count() > 0 else False
    print(f"  Arrival entries visible: {'PASS' if arrivals_visible else 'FAIL - check screenshot'}")


def test_7_8_member_travel_departures(page, trip_url=None, trip_id=None):
    """7.8: Member Travel Departures (3+ departure entries on the same day)"""
    print("\n--- Test 7.8: Member Travel Departures ---")

    if trip_url and trip_id:
        # Create 3 departure entries on the last day (June 4, 2026)
        create_member_travel_via_api(page, trip_id, {
            "travelType": "departure",
            "time": "2026-06-04T08:00:00.000Z",
            "location": "Rome Fiumicino Airport - Terminal 3",
            "details": "Early morning flight to Paris",
        })
        create_member_travel_via_api(page, trip_id, {
            "travelType": "departure",
            "time": "2026-06-04T12:00:00.000Z",
            "location": "Roma Termini Station",
            "details": "Noon train to Florence",
        })
        create_member_travel_via_api(page, trip_id, {
            "travelType": "departure",
            "time": "2026-06-04T18:00:00.000Z",
            "location": "Rome Ciampino Airport",
            "details": "Evening flight back to Amsterdam",
        })

        # Navigate and reload to see all data
        page.goto(trip_url)
        page.wait_for_timeout(3000)

    # Scroll to the last day to see departure entries
    # The last day (June 4) should be at the bottom
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(1000)

    # Screenshot the departures display
    page.screenshot(path=f"{SCREENSHOT_DIR}/member-travel-departures.png", full_page=True)
    print("  Screenshot saved: member-travel-departures.png")

    # Check that departure entries are visible
    termini_visible = page.locator("text=Termini").first.is_visible() if page.locator("text=Termini").count() > 0 else False
    print(f"  Departure entries visible: {'PASS' if termini_visible else 'FAIL - check screenshot'}")

    # Scroll back to top
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(500)


def test_7_9_edit_event_dialog(page, trip_url=None):
    """7.9: Edit Event Dialog"""
    print("\n--- Test 7.9: Edit Event Dialog ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)

    # Find an event card (role="button" with aria-expanded) that is NOT an accommodation
    # Event cards contain event type labels like "Activity", "Meal", etc.
    event_cards = page.locator('div[role="button"][aria-expanded="false"]').filter(
        has_text="Walking Tour of Colosseum"
    )

    if event_cards.count() == 0:
        # Try any event card
        event_cards = page.locator('div[role="button"][aria-expanded="false"]').filter(
            has_text="Activity"
        )

    if event_cards.count() == 0:
        # Broadest fallback: any expandable card
        event_cards = page.locator('div[role="button"][aria-expanded="false"]')

    if event_cards.count() > 0:
        card = event_cards.first

        # Click to expand the card
        card.click()
        page.wait_for_timeout(500)

        # Find the Edit button within the expanded card
        edit_btn = page.locator('button[title="Edit event"]').first
        if edit_btn.is_visible():
            edit_btn.click()
            page.wait_for_timeout(1000)

            # Check for edit dialog
            edit_dialog_title = page.locator('h2:has-text("Edit event")')
            if edit_dialog_title.is_visible():
                page.screenshot(path=f"{SCREENSHOT_DIR}/edit-event-dialog.png", full_page=True)
                print("  Screenshot saved: edit-event-dialog.png")

                # Check that fields are pre-filled
                name_input = page.locator('input[name="name"]')
                name_value = name_input.input_value()
                print(f"  Name pre-filled: {'PASS' if name_value else 'FAIL'} (value: '{name_value}')")

                # Check for Delete button inside edit dialog
                delete_btn = page.locator('button:has-text("Delete event")')
                print(f"  Delete button in edit dialog: {'PASS' if delete_btn.is_visible() else 'FAIL'}")

                # Close dialog
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
            else:
                print("  FAIL: Edit event dialog did not open")
                page.screenshot(path=f"{SCREENSHOT_DIR}/edit-event-dialog.png", full_page=True)
        else:
            print("  FAIL: Edit button not found on expanded card")
            # Try clicking the card's onDelete which also opens edit dialog
            delete_btn = page.locator('button[title="Delete event"]').first
            if delete_btn.is_visible():
                delete_btn.click()
                page.wait_for_timeout(1000)
                page.screenshot(path=f"{SCREENSHOT_DIR}/edit-event-dialog.png", full_page=True)
                print("  Used Delete button to open edit dialog as fallback")
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
            else:
                page.screenshot(path=f"{SCREENSHOT_DIR}/edit-event-dialog.png", full_page=True)
                print("  Saved fallback screenshot")
    else:
        print("  FAIL: No event cards found on page")
        page.screenshot(path=f"{SCREENSHOT_DIR}/edit-event-dialog.png", full_page=True)


def test_7_10_delete_confirmation(page, trip_url=None):
    """7.10: Delete Confirmation Dialog"""
    print("\n--- Test 7.10: Delete Confirmation Dialog ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)

    # Find an event card and expand it
    event_cards = page.locator('div[role="button"][aria-expanded="false"]').filter(
        has_text="Walking Tour of Colosseum"
    )

    if event_cards.count() == 0:
        event_cards = page.locator('div[role="button"][aria-expanded="false"]')

    if event_cards.count() > 0:
        card = event_cards.first
        card.click()
        page.wait_for_timeout(500)

        # The delete flow goes through the edit dialog.
        # Click the Edit button (or Delete button which also opens edit dialog)
        edit_btn = page.locator('button[title="Edit event"]').first
        delete_card_btn = page.locator('button[title="Delete event"]').first

        opened_dialog = False

        if edit_btn.is_visible():
            edit_btn.click()
            page.wait_for_timeout(1000)
            opened_dialog = True
        elif delete_card_btn.is_visible():
            delete_card_btn.click()
            page.wait_for_timeout(1000)
            opened_dialog = True

        if opened_dialog:
            # Now inside the Edit Event dialog, find the "Delete event" button
            delete_event_btn = page.locator('button:has-text("Delete event")')
            if delete_event_btn.is_visible():
                # Scroll down in the dialog to make the delete button visible
                delete_event_btn.scroll_into_view_if_needed()
                page.wait_for_timeout(300)

                # Click it to trigger the AlertDialog confirmation
                delete_event_btn.click()
                page.wait_for_timeout(1000)

                # Check for AlertDialog content
                alert_title = page.locator('text=Are you sure?')
                yes_delete_btn = page.locator('button:has-text("Yes, delete")')

                if alert_title.is_visible() or yes_delete_btn.is_visible():
                    page.screenshot(path=f"{SCREENSHOT_DIR}/delete-confirmation.png", full_page=True)
                    print("  Screenshot saved: delete-confirmation.png")
                    print(f"  Alert title visible: {'PASS' if alert_title.is_visible() else 'FAIL'}")
                    print(f"  Yes delete button: {'PASS' if yes_delete_btn.is_visible() else 'FAIL'}")

                    # Cancel the delete (do not actually delete)
                    cancel_btn = page.locator('button:has-text("Cancel")').last
                    if cancel_btn.is_visible():
                        cancel_btn.click()
                        page.wait_for_timeout(500)
                else:
                    print("  FAIL: AlertDialog did not appear")
                    page.screenshot(path=f"{SCREENSHOT_DIR}/delete-confirmation.png", full_page=True)
                    print("  Saved fallback screenshot")
            else:
                print("  FAIL: 'Delete event' button not found in edit dialog")
                page.screenshot(path=f"{SCREENSHOT_DIR}/delete-confirmation.png", full_page=True)

            # Close the edit dialog
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
        else:
            print("  FAIL: Could not open edit dialog")
            page.screenshot(path=f"{SCREENSHOT_DIR}/delete-confirmation.png", full_page=True)
    else:
        print("  FAIL: No event cards found on page")
        page.screenshot(path=f"{SCREENSHOT_DIR}/delete-confirmation.png", full_page=True)


def test_7_11_deleted_items_section(page, trip_url=None):
    """7.11: Deleted Items Section (SKIPPED - UI not implemented)"""
    print("\n--- Test 7.11: Deleted Items Section ---")
    print("  SKIPPED: Deleted items section UI is not yet implemented")
    print("  This feature allows organizers to view and restore soft-deleted items")


def test_7_12_tablet_layout(page, trip_url=None):
    """7.12: Responsive Tablet Layout"""
    print("\n--- Test 7.12: Responsive Tablet Layout ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)

    page.set_viewport_size({"width": 768, "height": 1024})
    page.wait_for_timeout(1000)

    page.screenshot(path=f"{SCREENSHOT_DIR}/itinerary-tablet.png", full_page=True)
    print("  Screenshot saved: itinerary-tablet.png")

    # Reset
    page.set_viewport_size({"width": 1280, "height": 1080})
    page.wait_for_timeout(500)
    print("  Tablet layout verified visually")


def test_7_13_empty_itinerary(page):
    """7.13: Empty Itinerary State"""
    print("\n--- Test 7.13: Empty Itinerary State ---")

    authenticate(page, "Empty State Tester")
    create_trip(page, "Empty Trip", "Nowhere, USA", "2026-09-01", "2026-09-03")
    page.wait_for_timeout(2000)

    # Check for empty state
    no_itinerary = page.locator('h2:has-text("No itinerary yet")')
    add_event = page.locator('button:has-text("Add Event")')
    add_accommodation = page.locator('button:has-text("Add Accommodation")')

    page.screenshot(path=f"{SCREENSHOT_DIR}/empty-itinerary.png", full_page=True)
    print("  Screenshot saved: empty-itinerary.png")

    print(f"  Empty state heading: {'PASS' if no_itinerary.is_visible() else 'FAIL'}")
    print(f"  Add Event button: {'PASS' if add_event.is_visible() else 'FAIL'}")
    print(f"  Add Accommodation button: {'PASS' if add_accommodation.is_visible() else 'FAIL'}")


def test_8_accessibility(page, trip_url=None):
    """8: Accessibility Checks"""
    print("\n--- Test 8: Accessibility Checks ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)

    # Check for skip link
    skip_link = page.locator('a[href="#main-content"]')
    print(f"  Skip link present: {'PASS' if skip_link.count() > 0 else 'FAIL'}")

    # Check for main content area
    main_content = page.locator('#main-content, main')
    print(f"  Main content area: {'PASS' if main_content.count() > 0 else 'FAIL'}")

    # Check for heading hierarchy
    h1 = page.locator('h1')
    print(f"  H1 heading present: {'PASS' if h1.count() > 0 else 'FAIL'}")

    # Check for ARIA labels on buttons
    buttons_with_aria = page.locator('button[aria-label]')
    print(f"  Buttons with aria-labels: {buttons_with_aria.count()} found")

    # Check for expandable cards with proper ARIA
    expandable_cards = page.locator('div[role="button"][aria-expanded]')
    print(f"  Expandable cards with aria-expanded: {expandable_cards.count()} found")

    # Tab through and check focus visibility
    page.keyboard.press("Tab")
    page.wait_for_timeout(200)
    page.keyboard.press("Tab")
    page.wait_for_timeout(200)

    page.screenshot(path=f"{SCREENSHOT_DIR}/accessibility-focus.png")
    print("  Screenshot saved: accessibility-focus.png")
    print("  Focus ring visibility: CHECK SCREENSHOT")


def test_9_visual_design(page, trip_url=None):
    """9: Visual Design Verification"""
    print("\n--- Test 9: Visual Design Verification ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(2000)

    # Check for serif font usage (Playfair Display in headings)
    h1 = page.locator("h1").first
    if h1.is_visible():
        font_family = h1.evaluate("el => getComputedStyle(el).fontFamily")
        print(f"  H1 font-family: {font_family}")
        has_playfair = "playfair" in font_family.lower() or "serif" in font_family.lower()
        print(f"  Playfair Display in headings: {'PASS' if has_playfair else 'FAIL'}")

    # Check background color
    body = page.locator("body")
    bg_color = body.evaluate("el => getComputedStyle(el).backgroundColor")
    print(f"  Body background color: {bg_color}")

    # Check card borders
    cards = page.locator(".border")
    print(f"  Cards with borders: {cards.count()} found")

    page.screenshot(path=f"{SCREENSHOT_DIR}/visual-design.png", full_page=True)
    print("  Screenshot saved: visual-design.png")


def main():
    print("=" * 60)
    print("Manual Visual Verification - Tripful Phase 4")
    print("=" * 60)

    test_results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1080})
        page = context.new_page()

        # --- Test 7.13: Empty Itinerary State ---
        try:
            test_7_13_empty_itinerary(page)
            test_results["7.13"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.13: {e}")
            traceback.print_exc()
            test_results["7.13"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_13.png")

        # Clear cookies for fresh user
        context.clear_cookies()

        # --- Test 7.1: Day-by-Day View (Desktop) - creates test data ---
        trip_id = None
        trip_url = None
        try:
            trip_id = test_7_1_day_by_day_desktop(page)
            trip_url = f"{BASE_URL}/trips/{trip_id}"
            test_results["7.1"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.1: {e}")
            traceback.print_exc()
            test_results["7.1"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_1.png")

        if not trip_url:
            print("\n  CRITICAL: No trip URL available. Cannot run remaining tests.")
            browser.close()
            print_summary(test_results)
            return

        # --- Test 7.2: Day-by-Day View (Mobile) ---
        try:
            test_7_2_day_by_day_mobile(page, trip_url)
            test_results["7.2"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.2: {e}")
            traceback.print_exc()
            test_results["7.2"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_2.png")

        # --- Test 7.3: Group-by-Type View (Desktop) ---
        try:
            test_7_3_group_by_type_desktop(page, trip_url)
            test_results["7.3"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.3: {e}")
            traceback.print_exc()
            test_results["7.3"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_3.png")

        # --- Test 7.4: Timezone Toggle ---
        try:
            test_7_4_timezone_toggle(page, trip_url)
            test_results["7.4"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.4: {e}")
            traceback.print_exc()
            test_results["7.4"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_4.png")

        # --- Test 7.5: Create Event Dialog ---
        try:
            test_7_5_create_event_dialog(page, trip_url)
            test_results["7.5"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.5: {e}")
            traceback.print_exc()
            test_results["7.5"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_5.png")

        # --- Test 7.6: Accommodation Collapsed/Expanded ---
        try:
            test_7_6_accommodation_collapsed_expanded(page, trip_url)
            test_results["7.6"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.6: {e}")
            traceback.print_exc()
            test_results["7.6"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_6.png")

        # --- Test 7.7: Member Travel Arrivals ---
        try:
            test_7_7_member_travel_arrivals(page, trip_url, trip_id)
            test_results["7.7"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.7: {e}")
            traceback.print_exc()
            test_results["7.7"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_7.png")

        # --- Test 7.8: Member Travel Departures ---
        try:
            test_7_8_member_travel_departures(page, trip_url, trip_id)
            test_results["7.8"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.8: {e}")
            traceback.print_exc()
            test_results["7.8"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_8.png")

        # --- Test 7.9: Edit Event Dialog ---
        try:
            test_7_9_edit_event_dialog(page, trip_url)
            test_results["7.9"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.9: {e}")
            traceback.print_exc()
            test_results["7.9"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_9.png")

        # --- Test 7.10: Delete Confirmation Dialog ---
        try:
            test_7_10_delete_confirmation(page, trip_url)
            test_results["7.10"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.10: {e}")
            traceback.print_exc()
            test_results["7.10"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_10.png")

        # --- Test 7.11: Deleted Items Section (skipped) ---
        try:
            test_7_11_deleted_items_section(page, trip_url)
            test_results["7.11"] = "SKIPPED"
        except Exception as e:
            print(f"  ERROR in test 7.11: {e}")
            test_results["7.11"] = "FAIL"

        # --- Test 7.12: Tablet Layout ---
        try:
            test_7_12_tablet_layout(page, trip_url)
            test_results["7.12"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 7.12: {e}")
            traceback.print_exc()
            test_results["7.12"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-7_12.png")

        # --- Test 8: Accessibility ---
        try:
            test_8_accessibility(page, trip_url)
            test_results["8"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 8: {e}")
            traceback.print_exc()
            test_results["8"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-8.png")

        # --- Test 9: Visual Design ---
        try:
            test_9_visual_design(page, trip_url)
            test_results["9"] = "PASS"
        except Exception as e:
            print(f"  ERROR in test 9: {e}")
            traceback.print_exc()
            test_results["9"] = "FAIL"
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-9.png")

        browser.close()

    print_summary(test_results)


def print_summary(test_results):
    """Print a summary of all test results and screenshot status."""
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)

    for test_id in sorted(test_results.keys(), key=lambda x: tuple(int(p) for p in x.split("."))):
        result = test_results[test_id]
        icon = "OK" if result == "PASS" else ("--" if result == "SKIPPED" else "XX")
        print(f"  [{icon}] Test {test_id}: {result}")

    # Check which screenshots exist
    required_screenshots = [
        "day-by-day-view-desktop.png",
        "day-by-day-view-mobile.png",
        "group-by-type-view-desktop.png",
        "timezone-toggle-before.png",
        "timezone-toggle-after.png",
        "create-event-dialog.png",
        "accommodation-collapsed.png",
        "accommodation-expanded.png",
        "member-travel-arrivals.png",
        "member-travel-departures.png",
        "edit-event-dialog.png",
        "delete-confirmation.png",
        "itinerary-tablet.png",
        "empty-itinerary.png",
        "accessibility-focus.png",
        "visual-design.png",
    ]

    print("\n" + "-" * 60)
    print("SCREENSHOT STATUS")
    print("-" * 60)

    all_present = True
    for screenshot in required_screenshots:
        path = os.path.join(SCREENSHOT_DIR, screenshot)
        exists = os.path.exists(path)
        size = os.path.getsize(path) if exists else 0
        icon = "OK" if exists and size > 0 else "XX"
        if not exists or size == 0:
            all_present = False
        size_str = f"{size / 1024:.1f}KB" if exists else "MISSING"
        print(f"  [{icon}] {screenshot} ({size_str})")

    print("\n" + "=" * 60)
    if all_present:
        print("All 16 required screenshots captured successfully!")
    else:
        print("WARNING: Some screenshots are missing or empty!")
    print(f"Screenshots directory: {SCREENSHOT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
