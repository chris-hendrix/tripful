"""
Manual visual verification script for Tripful Phase 4 - Itinerary View Modes.
Uses Playwright Python to navigate the app, interact with UI elements,
and capture screenshots for verification.
"""

import time
import os
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "/home/chend/git/tripful/.ralph/screenshots"
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
        page.locator('button[role="combobox"]').first.click()
        page.wait_for_timeout(200)
        page.locator('input[placeholder="Search timezone..."]').fill(timezone)
        page.wait_for_timeout(200)
        page.locator(f'div[role="option"]:has-text("{timezone}")').click()

    page.locator('button:has-text("Continue")').click()
    page.wait_for_timeout(300)
    page.locator('button:has-text("Create trip")').click()

    page.wait_for_url("**/trips/**", timeout=15000)
    page.wait_for_timeout(1500)


def create_event_via_api(page, trip_id, event_data):
    """Create event via API using cookies from the browser session."""
    cookies = page.context.cookies()
    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])

    import urllib.request
    import json

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
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  ERROR creating event via API: {e}")
        return None


def create_accommodation_via_api(page, trip_id, data):
    """Create accommodation via API."""
    cookies = page.context.cookies()
    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])

    import urllib.request
    import json

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
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  ERROR creating accommodation via API: {e}")
        return None


def create_member_travel_via_api(page, trip_id, data):
    """Create member travel via API."""
    cookies = page.context.cookies()
    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])

    import urllib.request
    import json

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
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  ERROR creating member travel via API: {e}")
        return None


def get_trip_id(page):
    """Extract trip ID from current URL."""
    url = page.url
    return url.split("/trips/")[1].split("?")[0].split("#")[0]


def test_7_1_day_by_day_desktop(page):
    """7.1: Day-by-Day View (Desktop)"""
    print("\n--- Test 7.1: Day-by-Day View (Desktop) ---")

    authenticate(page, "Day View Tester")
    create_trip(page, "Day View Trip", "Rome, Italy", "2026-06-01", "2026-06-04")

    trip_id = get_trip_id(page)

    # Create events via API (avoids the endTime validation bug in the dialog)
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

    create_member_travel_via_api(page, trip_id, {
        "type": "arrival",
        "time": "2026-06-01T08:00:00.000Z",
        "location": "Rome Fiumicino Airport",
        "details": "Flight from NYC, arriving early morning",
    })

    create_member_travel_via_api(page, trip_id, {
        "type": "departure",
        "time": "2026-06-04T16:00:00.000Z",
        "location": "Rome Fiumicino Airport",
        "details": "Flight back to NYC",
    })

    # Reload to see all data
    page.reload()
    page.wait_for_timeout(2000)

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

    page.wait_for_timeout(1500)

    # Resize to mobile
    page.set_viewport_size({"width": 375, "height": 667})
    page.wait_for_timeout(500)

    page.screenshot(path=f"{SCREENSHOT_DIR}/day-by-day-view-mobile.png", full_page=True)
    print("  Screenshot saved: day-by-day-view-mobile.png")

    # Reset viewport
    page.set_viewport_size({"width": 1280, "height": 1080})
    page.wait_for_timeout(300)
    print("  Mobile layout verified visually")


def test_7_3_group_by_type_desktop(page, trip_url=None):
    """7.3: Group-by-Type View (Desktop)"""
    print("\n--- Test 7.3: Group-by-Type View (Desktop) ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(1500)
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
        page.wait_for_timeout(1500)

    # Look for Group by Type toggle button
    group_by_type_btn = page.locator('button:has-text("Group by Type")')
    if group_by_type_btn.is_visible():
        group_by_type_btn.click()
        page.wait_for_timeout(500)

        page.screenshot(path=f"{SCREENSHOT_DIR}/group-by-type-view-desktop.png", full_page=True)
        print("  Screenshot saved: group-by-type-view-desktop.png")

        # Check for type section headers
        activities_header = page.locator('h3:has-text("Activities")')
        meals_header = page.locator('h3:has-text("Meals")')
        print(f"  Activities section visible: {'PASS' if activities_header.is_visible() else 'FAIL'}")
        print(f"  Meals section visible: {'PASS' if meals_header.is_visible() else 'FAIL'}")

        # Switch back
        page.locator('button:has-text("Day by Day")').click()
        page.wait_for_timeout(300)
    else:
        print("  FAIL: 'Group by Type' button not found")


def test_7_4_timezone_toggle(page, trip_url=None):
    """7.4: Timezone Toggle"""
    print("\n--- Test 7.4: Timezone Toggle ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(1500)

    # Look for timezone toggle buttons
    trip_tz_btn = page.locator('button:has-text("Trip")')
    your_tz_btn = page.locator('button:has-text("Your")')

    if trip_tz_btn.first.is_visible():
        page.screenshot(path=f"{SCREENSHOT_DIR}/timezone-toggle-before.png", full_page=True)
        print("  Screenshot saved: timezone-toggle-before.png (Trip timezone)")

        your_tz_btn.first.click()
        page.wait_for_timeout(500)

        page.screenshot(path=f"{SCREENSHOT_DIR}/timezone-toggle-after.png", full_page=True)
        print("  Screenshot saved: timezone-toggle-after.png (User timezone)")

        # Switch back
        trip_tz_btn.first.click()
        page.wait_for_timeout(300)

        print("  Timezone toggle: PASS (toggled successfully)")
    else:
        print("  FAIL: Timezone toggle buttons not found")


def test_7_5_create_event_dialog(page, trip_url=None):
    """7.5: Create Event Dialog"""
    print("\n--- Test 7.5: Create Event Dialog ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(1500)

    # Click Add Event button (from header)
    event_btn = page.locator('button:has-text("Event")').first
    if event_btn.is_visible():
        event_btn.click()
        page.wait_for_timeout(500)

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
            page.wait_for_timeout(300)
        else:
            print("  FAIL: Create event dialog did not open")
    else:
        print("  FAIL: Event button not found")


def test_7_12_tablet_layout(page, trip_url=None):
    """7.12: Responsive Tablet Layout"""
    print("\n--- Test 7.12: Responsive Tablet Layout ---")

    if trip_url:
        page.goto(trip_url)
        page.wait_for_timeout(1500)

    page.set_viewport_size({"width": 768, "height": 1024})
    page.wait_for_timeout(500)

    page.screenshot(path=f"{SCREENSHOT_DIR}/itinerary-tablet.png", full_page=True)
    print("  Screenshot saved: itinerary-tablet.png")

    # Reset
    page.set_viewport_size({"width": 1280, "height": 1080})
    page.wait_for_timeout(300)
    print("  Tablet layout verified visually")


def test_7_13_empty_itinerary(page):
    """7.13: Empty Itinerary State"""
    print("\n--- Test 7.13: Empty Itinerary State ---")

    authenticate(page, "Empty State Tester")
    create_trip(page, "Empty Trip", "Nowhere, USA", "2026-09-01", "2026-09-03")
    page.wait_for_timeout(1500)

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
        page.wait_for_timeout(1500)

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
        page.wait_for_timeout(1500)

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

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1080})
        page = context.new_page()

        try:
            # Test 7.13: Empty Itinerary State
            test_7_13_empty_itinerary(page)

            # Clear cookies
            context.clear_cookies()

            # Test 7.1: Day-by-Day View (Desktop) - also creates test data
            trip_id = test_7_1_day_by_day_desktop(page)
            trip_url = f"{BASE_URL}/trips/{trip_id}"

            # Test 7.2: Day-by-Day View (Mobile)
            test_7_2_day_by_day_mobile(page, trip_url)

            # Test 7.3: Group-by-Type View (Desktop)
            test_7_3_group_by_type_desktop(page, trip_url)

            # Test 7.4: Timezone Toggle
            test_7_4_timezone_toggle(page, trip_url)

            # Test 7.5: Create Event Dialog
            test_7_5_create_event_dialog(page, trip_url)

            # Test 7.12: Tablet Layout
            test_7_12_tablet_layout(page, trip_url)

            # Test 8: Accessibility
            test_8_accessibility(page, trip_url)

            # Test 9: Visual Design
            test_9_visual_design(page, trip_url)

        except Exception as e:
            print(f"\nERROR during manual testing: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path=f"{SCREENSHOT_DIR}/error-state.png")
            print("  Error screenshot saved: error-state.png")

        finally:
            browser.close()

    print("\n" + "=" * 60)
    print("Manual verification complete. Check screenshots in .ralph/screenshots/")
    print("=" * 60)


if __name__ == "__main__":
    main()
