"""
Manual smoke test for the full invitation flow.
Screenshots saved to .ralph/screenshots/
"""
import json
import time
import http.client
import http.cookiejar
import urllib.request

from playwright.sync_api import sync_playwright

API_BASE = "localhost"
API_PORT = 8000
WEB_BASE = "http://localhost:3000"
SCREENSHOTS = "/home/chend/git/tripful/.ralph/screenshots"

# Unique phone numbers using timestamp
ts = str(int(time.time()))[-6:]
organizer_phone = f"+1555{ts}01"
invitee_phone = f"+1555{ts}02"


def api_call(method, path, data=None, cookie=None):
    """Make an API request using http.client, returns (result, cookie)."""
    conn = http.client.HTTPConnection(API_BASE, API_PORT)
    headers = {"Content-Type": "application/json", "Origin": "http://localhost:3000"}
    if cookie:
        headers["Cookie"] = cookie
    body = json.dumps(data) if data else None
    conn.request(method, path, body, headers)
    resp = conn.getresponse()
    # Extract set-cookie
    new_cookie = None
    for header, value in resp.getheaders():
        if header.lower() == "set-cookie":
            new_cookie = value.split(";")[0]  # Just "auth_token=xxx"
    resp_body = resp.read().decode()
    if resp.status >= 400:
        raise Exception(f"API {method} {path} returned {resp.status}: {resp_body}")
    result = json.loads(resp_body) if resp_body else {}
    conn.close()
    return result, new_cookie or cookie


def create_user(phone, name):
    """Create a user via the auth flow and return the cookie."""
    _, cookie = api_call("POST", "/api/auth/request-code", {"phoneNumber": phone})
    _, cookie = api_call("POST", "/api/auth/verify-code", {"phoneNumber": phone, "code": "123456"}, cookie)
    _, cookie = api_call("POST", "/api/auth/complete-profile", {"displayName": name}, cookie)
    return cookie


def main():
    print("=== Smoke Test: Full Invitation Flow ===\n")

    # Step 1: Create organizer and trip via API
    print("1. Creating organizer user...")
    org_cookie = create_user(organizer_phone, "Smoke Organizer")
    print(f"   ✓ Organizer created (phone: {organizer_phone})")

    print("2. Creating trip via API...")
    trip_data = {
        "name": "Smoke Test Trip",
        "destination": "Hawaii",
        "timezone": "Pacific/Honolulu",
    }
    result, org_cookie = api_call("POST", "/api/trips", trip_data, org_cookie)
    trip_id = result["trip"]["id"]
    print(f"   ✓ Trip created (id: {trip_id})")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1080})
        page = context.new_page()

        # Step 2: Login as organizer via cookie injection
        print("3. Logging in as organizer in browser...")
        cookie_name, cookie_value = org_cookie.split("=", 1)
        page.context.add_cookies([{
            "name": cookie_name.strip(),
            "value": cookie_value.strip(),
            "url": WEB_BASE,
        }])

        # Step 3: Navigate to trip detail and screenshot
        print("4. Navigating to trip detail page...")
        page.goto(f"{WEB_BASE}/trips/{trip_id}", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{SCREENSHOTS}/task-6.1-01-trip-detail-organizer.png", full_page=True)
        print("   ✓ Screenshot: trip-detail-organizer.png")

        # Step 4: Open invite dialog
        print("5. Opening invite members dialog...")
        invite_btn = page.get_by_role("button", name="Invite")
        if invite_btn.is_visible():
            invite_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{SCREENSHOTS}/task-6.1-02-invite-dialog-open.png")
            print("   ✓ Screenshot: invite-dialog-open.png")

            # Step 5: Add phone number and send invitation
            print("6. Adding phone number and sending invitation...")
            phone_input = page.locator("input[type='tel']")
            if phone_input.is_visible():
                phone_input.fill(invitee_phone)
                page.wait_for_timeout(500)
                page.get_by_role("button", name="Add").click()
                page.wait_for_timeout(500)
                page.screenshot(path=f"{SCREENSHOTS}/task-6.1-03-phone-added.png")
                print("   ✓ Screenshot: phone-added.png")

                # Send invitations
                page.get_by_role("button", name="Send Invitations").click()
                page.wait_for_timeout(2000)
                page.screenshot(path=f"{SCREENSHOTS}/task-6.1-04-invitation-sent.png")
                print("   ✓ Screenshot: invitation-sent.png")
            else:
                print("   ⚠ Phone input not found")
                page.screenshot(path=f"{SCREENSHOTS}/task-6.1-03-no-phone-input.png")
        else:
            print("   ⚠ Invite button not found on page")
            page.screenshot(path=f"{SCREENSHOTS}/task-6.1-02-no-invite-btn.png")

        # Close dialog if still open
        esc = page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        # Step 6: Check Members tab
        print("7. Checking Members tab...")
        members_tab = page.get_by_role("tab", name="Members")
        if members_tab.is_visible():
            members_tab.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=f"{SCREENSHOTS}/task-6.1-05-members-tab.png", full_page=True)
            print("   ✓ Screenshot: members-tab.png")
        else:
            print("   ⚠ Members tab not found")

        # Step 7: Create invitee user and login as invitee
        print("8. Creating invitee user and authenticating...")
        invitee_cookie = create_user(invitee_phone, "Smoke Invitee")
        print(f"   ✓ Invitee created (phone: {invitee_phone})")

        # Step 8: Login as invitee in new context
        print("9. Logging in as invitee in browser...")
        context2 = browser.new_context(viewport={"width": 1280, "height": 1080})
        page2 = context2.new_page()
        inv_name, inv_value = invitee_cookie.split("=", 1)
        page2.context.add_cookies([{
            "name": inv_name.strip(),
            "value": inv_value.strip(),
            "url": WEB_BASE,
        }])

        # Step 9: Navigate to trip as invitee - should see preview
        print("10. Navigating to trip as invitee (should see preview)...")
        page2.goto(f"{WEB_BASE}/trips/{trip_id}", wait_until="networkidle")
        page2.wait_for_timeout(2000)
        page2.screenshot(path=f"{SCREENSHOTS}/task-6.1-06-invitee-preview.png", full_page=True)
        print("   ✓ Screenshot: invitee-preview.png")

        # Check if preview text is visible
        preview_text = page2.get_by_text("You've been invited")
        if preview_text.is_visible():
            print("   ✓ Preview text 'You've been invited' is visible")
        else:
            print("   ⚠ Preview text not found")

        # Step 10: RSVP as Going
        print("11. RSVPing as Going...")
        going_btn = page2.get_by_role("button", name="Going", exact=True)
        if going_btn.is_visible():
            going_btn.click()
            page2.wait_for_timeout(3000)
            page2.screenshot(path=f"{SCREENSHOTS}/task-6.1-07-after-rsvp-going.png", full_page=True)
            print("   ✓ Screenshot: after-rsvp-going.png")

            # Check we can now see the full itinerary
            itinerary_tab = page2.get_by_role("tab", name="Itinerary")
            members_tab2 = page2.get_by_role("tab", name="Members")
            if itinerary_tab.is_visible() and members_tab2.is_visible():
                print("   ✓ Full trip view visible with Itinerary and Members tabs")
            else:
                print("   ⚠ Expected tabs not visible after RSVP")
        else:
            print("   ⚠ Going button not found")
            page2.screenshot(path=f"{SCREENSHOTS}/task-6.1-07-no-going-btn.png", full_page=True)

        # Step 11: Uninvited user access
        print("12. Testing uninvited user access...")
        context3 = browser.new_context(viewport={"width": 1280, "height": 1080})
        page3 = context3.new_page()
        uninvited_phone = f"+1555{ts}99"
        uninvited_cookie = create_user(uninvited_phone, "Uninvited User")
        un_name, un_value = uninvited_cookie.split("=", 1)
        page3.context.add_cookies([{
            "name": un_name.strip(),
            "value": un_value.strip(),
            "url": WEB_BASE,
        }])
        page3.goto(f"{WEB_BASE}/trips/{trip_id}", wait_until="networkidle")
        page3.wait_for_timeout(2000)
        page3.screenshot(path=f"{SCREENSHOTS}/task-6.1-08-uninvited-404.png", full_page=True)
        print("   ✓ Screenshot: uninvited-404.png")

        # Check for 404 text
        not_found = page3.get_by_text("Trip not found")
        if not_found.is_visible():
            print("   ✓ Uninvited user correctly sees 'Trip not found'")
        else:
            print("   ⚠ Expected 'Trip not found' text not visible")

        # Step 12: RSVP change and member indicator
        print("13. Testing RSVP status change indicator...")

        # First create an event as the invitee (who is currently "going") via API
        event_data = {
            "name": "Invitee's Beach Event",
            "eventType": "activity",
            "startTime": "2026-08-03T10:00:00.000Z",
            "endTime": "2026-08-03T11:30:00.000Z",
        }
        try:
            api_call("POST", f"/api/trips/{trip_id}/events", event_data, invitee_cookie)
            print("   ✓ Event created by invitee")
        except Exception as e:
            print(f"   ⚠ Could not create event: {e}")

        # Change RSVP to "maybe" via API
        api_call("POST", f"/api/trips/{trip_id}/rsvp", {"status": "maybe"}, invitee_cookie)
        print("   ✓ Changed invitee RSVP to 'maybe'")

        # Navigate organizer to trip detail to see indicator
        page.goto(f"{WEB_BASE}/trips/{trip_id}", wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Click Itinerary tab
        itinerary_tab = page.get_by_role("tab", name="Itinerary")
        if itinerary_tab.is_visible():
            itinerary_tab.click()
            page.wait_for_timeout(1000)

        page.screenshot(path=f"{SCREENSHOTS}/task-6.1-09-member-not-attending-indicator.png", full_page=True)
        print("   ✓ Screenshot: member-not-attending-indicator.png")

        # Check for the indicator
        indicator = page.get_by_text("Member no longer attending")
        if indicator.is_visible():
            print("   ✓ 'Member no longer attending' indicator visible!")
        else:
            print("   ⚠ Indicator text not found on page (may need to expand event card)")

        # Cleanup
        page.close()
        page2.close()
        page3.close()
        context.close()
        context2.close()
        context3.close()
        browser.close()

    print("\n=== Smoke Test Complete ===")
    print(f"All screenshots saved to {SCREENSHOTS}/")
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
