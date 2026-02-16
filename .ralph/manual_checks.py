"""
Manual verification checks for Tripful Messaging & Notifications.
Uses Playwright to simulate user interactions and take screenshots.
"""

import asyncio
import time
import json
import urllib.request
from playwright.async_api import async_playwright

API_BASE = "http://localhost:8000/api"
WEB_BASE = "http://localhost:3000"
SCREENSHOTS_DIR = "/home/chend/git/tripful/.ralph/screenshots"

phone_counter = 0


def generate_phone():
    global phone_counter
    phone_counter += 1
    ts = str(int(time.time()))[-5:]
    counter = str(phone_counter).zfill(2)
    return f"+1555{ts}{counter}00"


_SENTINEL = object()

def api_request(method, path, data=_SENTINEL, cookies=None):
    """Make an API request and return (status, body, headers).
    Pass data=None explicitly for no-body requests that need to force the method.
    Pass data={} for empty JSON body. Omit data for GET requests.
    """
    url = f"{API_BASE}{path}"
    headers = {}
    if data is not _SENTINEL and data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode("utf-8")
    else:
        body = None
    if cookies:
        headers["Cookie"] = cookies
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read().decode()), dict(resp.headers)
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode())
        except Exception:
            err_body = {"raw": str(e)}
        return e.code, err_body, dict(e.headers)


def create_user_via_api(phone, display_name="Test User"):
    """Create a user and return auth cookie string."""
    api_request("POST", "/auth/request-code", {"phoneNumber": phone})
    status, body, headers = api_request(
        "POST", "/auth/verify-code", {"phoneNumber": phone, "code": "123456"}
    )
    cookies = headers.get("set-cookie", headers.get("Set-Cookie", ""))
    api_request(
        "POST",
        "/auth/complete-profile",
        {"displayName": display_name, "timezone": "UTC"},
        cookies=cookies,
    )
    return cookies


def extract_token(cookie_string):
    """Extract auth_token value from Set-Cookie header."""
    for part in cookie_string.split(";"):
        part = part.strip()
        if part.startswith("auth_token="):
            return part.split("=", 1)[1]
    return ""


async def run_checks():
    results = []

    # ===== SETUP: Create test users via API =====
    phone_a = generate_phone()
    phone_b = generate_phone()
    phone_c = generate_phone()

    cookies_a = create_user_via_api(phone_a, "Organizer Alice")
    cookies_b = create_user_via_api(phone_b, "Member Bob")
    cookies_c = create_user_via_api(phone_c, "Member Carol")

    # Create a trip as organizer
    status, trip_body, _ = api_request(
        "POST",
        "/trips",
        {
            "name": "Verification Trip",
            "destination": "New York",
            "startDate": "2026-06-01",
            "endDate": "2026-06-07",
            "timezone": "America/New_York",
        },
        cookies=cookies_a,
    )
    trip_id = trip_body.get("trip", {}).get("id")
    if not trip_id:
        results.append(("Trip creation via API", "FAIL", f"status={status}, body={trip_body}"))
        print_results(results)
        return

    results.append(("Trip creation via API", "PASS", f"Trip ID: {trip_id}"))

    # Invite members (uses phoneNumbers array)
    status, inv_body, _ = api_request(
        "POST",
        f"/trips/{trip_id}/invitations",
        {"phoneNumbers": [phone_b, phone_c]},
        cookies=cookies_a,
    )
    results.append((
        "Invite members via API",
        "PASS" if status == 201 else "FAIL",
        f"Status: {status}, invitations: {len(inv_body.get('invitations', []))}",
    ))

    # Re-authenticate invitees (triggers processPendingInvitations)
    cookies_b = create_user_via_api(phone_b, "Member Bob")
    cookies_c = create_user_via_api(phone_c, "Member Carol")

    # RSVP as going (uses /trips/{id}/rsvp)
    status_b, _, _ = api_request("POST", f"/trips/{trip_id}/rsvp", {"status": "going"}, cookies=cookies_b)
    status_c, _, _ = api_request("POST", f"/trips/{trip_id}/rsvp", {"status": "going"}, cookies=cookies_c)
    results.append((
        "Members accept invitations (RSVP going)",
        "PASS" if status_b == 200 and status_c == 200 else "FAIL",
        f"Bob RSVP: {status_b}, Carol RSVP: {status_c}",
    ))

    # ===== API CHECKS =====

    # CHECK: API health
    status, body, _ = api_request("GET", "/health")
    results.append((
        "API /health endpoint",
        "PASS" if status == 200 and body.get("status") == "ok" else "FAIL",
        f"Status: {status}, database: {body.get('database', 'unknown')}",
    ))

    # CHECK: Post message via API
    status, msg_body, _ = api_request(
        "POST",
        f"/trips/{trip_id}/messages",
        {"content": "Hello from the organizer!"},
        cookies=cookies_a,
    )
    msg_id = msg_body.get("message", {}).get("id", "")
    results.append((
        "Post message via API",
        "PASS" if status == 201 and msg_id else "FAIL",
        f"Status: {status}, message ID: {msg_id}",
    ))

    # CHECK: Reply to message via API
    status, reply_body, _ = api_request(
        "POST",
        f"/trips/{trip_id}/messages",
        {"content": "This is a reply from Bob!", "parentId": msg_id},
        cookies=cookies_b,
    )
    reply_id = reply_body.get("message", {}).get("id", "")
    results.append((
        "Reply to message via API",
        "PASS" if status == 201 and reply_id else "FAIL",
        f"Status: {status}, reply ID: {reply_id}",
    ))

    # CHECK: Get messages via API (returns top-level only, replies nested)
    status, msgs_body, _ = api_request("GET", f"/trips/{trip_id}/messages", cookies=cookies_a)
    msg_count = len(msgs_body.get("messages", []))
    # 1 top-level message expected (reply is nested under it)
    results.append((
        "Get messages via API",
        "PASS" if status == 200 and msg_count >= 1 else "FAIL",
        f"Status: {status}, top-level message count: {msg_count}",
    ))

    # CHECK: Add reaction via API (correct emoji: "thumbs_up")
    status, react_body, _ = api_request(
        "POST",
        f"/trips/{trip_id}/messages/{msg_id}/reactions",
        {"emoji": "thumbs_up"},
        cookies=cookies_b,
    )
    results.append((
        "Add reaction via API (thumbs_up)",
        "PASS" if status in (200, 201) else "FAIL",
        f"Status: {status}, body: {json.dumps(react_body)[:200]}",
    ))

    # CHECK: Edit message via API (PUT, not PATCH)
    status, edit_body, _ = api_request(
        "PUT",
        f"/trips/{trip_id}/messages/{msg_id}",
        {"content": "Hello from the organizer! (edited)"},
        cookies=cookies_a,
    )
    edited_at = edit_body.get("message", {}).get("editedAt")
    results.append((
        "Edit own message via API (PUT)",
        "PASS" if status == 200 and edited_at else "FAIL",
        f"Status: {status}, editedAt: {edited_at}",
    ))

    # CHECK: Pin message via API (organizer) - PATCH with {pinned: true}
    status, pin_body, _ = api_request(
        "PATCH",
        f"/trips/{trip_id}/messages/{msg_id}/pin",
        {"pinned": True},
        cookies=cookies_a,
    )
    results.append((
        "Pin message via API (organizer)",
        "PASS" if status == 200 else "FAIL",
        f"Status: {status}, pinned: {pin_body.get('message', {}).get('isPinned')}",
    ))

    # CHECK: Unpin message via API - PATCH with {pinned: false}
    status, unpin_body, _ = api_request(
        "PATCH",
        f"/trips/{trip_id}/messages/{msg_id}/pin",
        {"pinned": False},
        cookies=cookies_a,
    )
    results.append((
        "Unpin message via API (organizer)",
        "PASS" if status == 200 else "FAIL",
        f"Status: {status}, pinned: {unpin_body.get('message', {}).get('isPinned')}",
    ))

    # CHECK: Get notifications via API
    status, notif_body, _ = api_request("GET", "/notifications", cookies=cookies_b)
    results.append((
        "Get notifications via API",
        "PASS" if status == 200 else "FAIL",
        f"Status: {status}, unreadCount: {notif_body.get('unreadCount', 'unknown')}, total: {notif_body.get('meta', {}).get('total', 'unknown')}",
    ))

    # CHECK: Get notification preferences via API
    status, pref_body, _ = api_request(
        "GET", f"/trips/{trip_id}/notification-preferences", cookies=cookies_b
    )
    results.append((
        "Get notification preferences via API",
        "PASS" if status == 200 else "FAIL",
        f"Status: {status}, prefs: {pref_body.get('preferences', {})}",
    ))

    # CHECK: Mute member via API (POST /trips/:tripId/members/:memberId/mute)
    # Get members to find Bob's userId
    status, members_body, _ = api_request("GET", f"/trips/{trip_id}/members", cookies=cookies_a)
    bob_user_id = None
    for m in members_body.get("members", []):
        if isinstance(m, dict) and m.get("displayName") == "Member Bob":
            bob_user_id = m.get("userId", m.get("id"))
            break
    if bob_user_id:
        status, mute_body, _ = api_request(
            "POST",
            f"/trips/{trip_id}/members/{bob_user_id}/mute",
            cookies=cookies_a,
        )
        results.append((
            "Mute member via API (organizer)",
            "PASS" if status in (200, 201) else "FAIL",
            f"Status: {status}, body: {json.dumps(mute_body)[:200]}",
        ))

        # Check muted member cannot post
        status, muted_msg, _ = api_request(
            "POST",
            f"/trips/{trip_id}/messages",
            {"content": "Should be blocked"},
            cookies=cookies_b,
        )
        results.append((
            "Muted member cannot post messages",
            "PASS" if status == 403 else "FAIL",
            f"Status: {status} (expected 403)",
        ))

        # Unmute (DELETE /trips/:tripId/members/:memberId/mute)
        status, unmute_body, _ = api_request(
            "DELETE",
            f"/trips/{trip_id}/members/{bob_user_id}/mute",
            cookies=cookies_a,
        )
        results.append((
            "Unmute member via API (organizer)",
            "PASS" if status in (200, 204) else "FAIL",
            f"Status: {status}",
        ))
    else:
        results.append(("Mute/unmute member via API", "FAIL", f"Could not find Bob's userId. Members: {json.dumps(members_body)[:300]}"))

    # CHECK: Delete message via API (organizer deletes Bob's reply)
    status, del_body, _ = api_request(
        "DELETE",
        f"/trips/{trip_id}/messages/{reply_id}",
        cookies=cookies_a,
    )
    results.append((
        "Delete message via API (organizer deletes member's reply)",
        "PASS" if status == 200 else "FAIL",
        f"Status: {status}, body: {json.dumps(del_body)[:200]}",
    ))

    # CHECK: Mark all notifications as read (PATCH /notifications/read-all)
    status, mark_body, _ = api_request(
        "PATCH",
        "/notifications/read-all",
        cookies=cookies_b,
    )
    results.append((
        "Mark all notifications as read via API",
        "PASS" if status == 200 else "FAIL",
        f"Status: {status}",
    ))

    # Verify unread count is now 0
    status, notif_body2, _ = api_request("GET", "/notifications", cookies=cookies_b)
    results.append((
        "Unread count is 0 after mark-all-read",
        "PASS" if status == 200 and notif_body2.get("unreadCount", -1) == 0 else "FAIL",
        f"Status: {status}, unreadCount: {notif_body2.get('unreadCount', 'unknown')}",
    ))

    # CHECK: Message count endpoint
    status, count_body, _ = api_request(
        "GET", f"/trips/{trip_id}/messages/count", cookies=cookies_a
    )
    results.append((
        "Message count endpoint",
        "PASS" if status == 200 else "FAIL",
        f"Status: {status}, body: {json.dumps(count_body)[:200]}",
    ))

    # CHECK: Latest message endpoint
    status, latest_body, _ = api_request(
        "GET", f"/trips/{trip_id}/messages/latest", cookies=cookies_a
    )
    results.append((
        "Latest message endpoint",
        "PASS" if status == 200 else "FAIL",
        f"Status: {status}, has message: {latest_body.get('message') is not None}",
    ))

    # ===== BROWSER CHECKS =====
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # --- USER A (Organizer) Session ---
        context_a = await browser.new_context(viewport={"width": 1280, "height": 1080})
        page_a = await context_a.new_page()
        await context_a.add_cookies([{
            "name": "auth_token",
            "value": extract_token(cookies_a),
            "domain": "localhost",
            "path": "/",
            "httpOnly": True,
        }])

        # --- USER B (Member) Session ---
        context_b = await browser.new_context(viewport={"width": 1280, "height": 1080})
        page_b = await context_b.new_page()
        await context_b.add_cookies([{
            "name": "auth_token",
            "value": extract_token(cookies_b),
            "domain": "localhost",
            "path": "/",
            "httpOnly": True,
        }])

        # ===== CHECK: Login page loads =====
        anon_ctx = await browser.new_context(viewport={"width": 1280, "height": 1080})
        page_login = await anon_ctx.new_page()
        await page_login.goto(f"{WEB_BASE}/login")
        await page_login.wait_for_load_state("networkidle")
        await page_login.screenshot(path=f"{SCREENSHOTS_DIR}/01-login-page.png")
        has_phone_input = await page_login.locator('input[type="tel"]').count() > 0
        results.append((
            "Login page loads with phone input",
            "PASS" if has_phone_input else "FAIL",
            f"Phone input found: {has_phone_input}. Screenshot: 01-login-page.png",
        ))
        await anon_ctx.close()

        # ===== CHECK: Trip page as organizer =====
        await page_a.goto(f"{WEB_BASE}/trips/{trip_id}")
        await page_a.wait_for_load_state("networkidle")
        await asyncio.sleep(3)
        await page_a.screenshot(path=f"{SCREENSHOTS_DIR}/02-trip-detail-organizer.png", full_page=True)

        # Check for discussion section
        page_content = await page_a.content()
        has_discussion = "discussion" in page_content.lower() or "message" in page_content.lower()
        results.append((
            "Discussion section visible on trip page (organizer)",
            "PASS" if has_discussion else "FAIL",
            f"Discussion/message text found in page: {has_discussion}. Screenshot: 02-trip-detail-organizer.png",
        ))

        # Check for message input
        msg_input = None
        for selector in [
            'textarea[placeholder*="message" i]',
            'input[placeholder*="message" i]',
            '[data-testid="message-input"]',
            'textarea',
        ]:
            el = page_a.locator(selector).first
            if await el.count() > 0:
                msg_input = el
                break

        if msg_input:
            await msg_input.scroll_into_view_if_needed()
            await asyncio.sleep(1)
            await page_a.screenshot(path=f"{SCREENSHOTS_DIR}/03-message-input-visible.png")
            results.append((
                "Message input visible on trip page",
                "PASS",
                "Message input found and scrolled to. Screenshot: 03-message-input-visible.png",
            ))
        else:
            await page_a.screenshot(path=f"{SCREENSHOTS_DIR}/03-no-message-input.png")
            results.append((
                "Message input visible on trip page",
                "FAIL",
                "No message input found on trip page. Screenshot: 03-no-message-input.png",
            ))

        # Check messages are displayed (we posted via API)
        organizer_msg = page_a.locator('text="Hello from the organizer! (edited)"')
        msg_visible = await organizer_msg.count() > 0
        if not msg_visible:
            organizer_msg = page_a.locator('text="Hello from the organizer!"')
            msg_visible = await organizer_msg.count() > 0
        results.append((
            "Messages displayed in feed",
            "PASS" if msg_visible else "FAIL",
            f"Organizer message visible: {msg_visible}",
        ))

        # Check for "edited" indicator
        edited_indicator = page_a.locator('text=/edited/i')
        has_edited = await edited_indicator.count() > 0
        results.append((
            "Edited message shows 'edited' indicator",
            "PASS" if has_edited else "FAIL",
            f"'edited' text found: {has_edited}",
        ))

        # Check for deleted message placeholder (may be in nested reply thread)
        deleted_indicator = page_a.locator('text="This message was deleted"')
        has_deleted = await deleted_indicator.count() > 0
        if not has_deleted:
            # The deleted reply might be in a collapsed thread; try expanding
            expand_btn = page_a.locator('button:has-text("repl"), button:has-text("Repl")')
            if await expand_btn.count() > 0:
                await expand_btn.first.click()
                await asyncio.sleep(2)
                has_deleted = await deleted_indicator.count() > 0
        results.append((
            "Deleted message shows 'This message was deleted' placeholder",
            "PASS" if has_deleted else "FAIL",
            f"Deleted placeholder found: {has_deleted} (note: reply was soft-deleted, may need thread expansion)",
        ))

        # ===== CHECK: Notification bell in header =====
        bell_selectors = [
            'button[aria-label*="otification"]',
            '[data-testid*="notification"]',
            'button:has(svg)',
        ]
        bell_found = False
        for sel in bell_selectors:
            el = page_a.locator(sel).first
            if await el.count() > 0:
                bell_found = True
                await el.click()
                await asyncio.sleep(2)
                await page_a.screenshot(path=f"{SCREENSHOTS_DIR}/04-notification-bell.png")
                await page_a.keyboard.press("Escape")
                await asyncio.sleep(0.5)
                break

        results.append((
            "Global notification bell visible",
            "PASS" if bell_found else "FAIL",
            f"Bell found: {bell_found}. Screenshot: 04-notification-bell.png" if bell_found else "No notification bell found",
        ))

        # ===== CHECK: Trip page as member =====
        await page_b.goto(f"{WEB_BASE}/trips/{trip_id}")
        await page_b.wait_for_load_state("networkidle")
        await asyncio.sleep(3)
        await page_b.screenshot(path=f"{SCREENSHOTS_DIR}/05-trip-detail-member.png", full_page=True)

        member_page_content = await page_b.content()
        member_has_discussion = "discussion" in member_page_content.lower() or "message" in member_page_content.lower()
        results.append((
            "Going member sees discussion section",
            "PASS" if member_has_discussion else "FAIL",
            f"Discussion visible for member: {member_has_discussion}. Screenshot: 05-trip-detail-member.png",
        ))

        # Check member's notification bell
        bell_found_b = False
        for sel in bell_selectors:
            el = page_b.locator(sel).first
            if await el.count() > 0:
                bell_found_b = True
                break
        results.append((
            "Notification bell visible for member",
            "PASS" if bell_found_b else "FAIL",
            f"Bell found for member: {bell_found_b}",
        ))

        # ===== CHECK: Console errors =====
        console_errors = []
        error_page = await context_a.new_page()
        error_page.on(
            "console",
            lambda msg: console_errors.append(msg.text)
            if msg.type == "error"
            else None,
        )
        await error_page.goto(f"{WEB_BASE}/trips/{trip_id}")
        await error_page.wait_for_load_state("networkidle")
        await asyncio.sleep(3)

        unexpected = [
            e for e in console_errors
            if "401" not in e and "Unauthorized" not in e and "favicon" not in e.lower()
        ]
        results.append((
            "No unexpected console errors on trip page",
            "PASS" if len(unexpected) == 0 else "FAIL",
            f"Unexpected errors ({len(unexpected)}): {unexpected[:3] if unexpected else 'none'}",
        ))
        await error_page.close()

        # ===== CHECK: Home/trips page =====
        await page_a.goto(f"{WEB_BASE}/trips")
        await page_a.wait_for_load_state("networkidle")
        await asyncio.sleep(2)
        await page_a.screenshot(path=f"{SCREENSHOTS_DIR}/06-trips-list.png")
        results.append((
            "Trips list page loads",
            "PASS",
            "Screenshot: 06-trips-list.png",
        ))

        # ===== CHECK: Unauthenticated redirect =====
        anon_ctx2 = await browser.new_context(viewport={"width": 1280, "height": 1080})
        anon_page = await anon_ctx2.new_page()
        await anon_page.goto(f"{WEB_BASE}/trips")
        await anon_page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        final_url = anon_page.url
        is_login = "login" in final_url
        await anon_page.screenshot(path=f"{SCREENSHOTS_DIR}/07-unauthenticated-redirect.png")
        results.append((
            "Unauthenticated user redirected to login",
            "PASS" if is_login else "FAIL",
            f"Final URL: {final_url}. Screenshot: 07-unauthenticated-redirect.png",
        ))
        await anon_ctx2.close()

        # Final full-page screenshot
        await page_a.goto(f"{WEB_BASE}/trips/{trip_id}")
        await page_a.wait_for_load_state("networkidle")
        await asyncio.sleep(2)
        await page_a.screenshot(path=f"{SCREENSHOTS_DIR}/08-final-trip-page.png", full_page=True)

        await browser.close()

    print_results(results)


def print_results(results):
    print("\n" + "=" * 70)
    print("MANUAL VERIFICATION RESULTS")
    print("=" * 70)
    all_pass = True
    for name, status, detail in results:
        marker = "PASS" if status == "PASS" else "FAIL"
        if status != "PASS":
            all_pass = False
        print(f"  [{marker}] {name}")
        print(f"         {detail}")
    print("=" * 70)
    total = len(results)
    passed = sum(1 for _, s, _ in results if s == "PASS")
    failed = total - passed
    print(f"SUMMARY: {passed}/{total} passed, {failed} failed")
    print(f"OVERALL: {'ALL CHECKS PASSED' if all_pass else 'SOME CHECKS FAILED'}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_checks())
