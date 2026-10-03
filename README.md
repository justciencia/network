# justciencia network (draft 2: members only, key-based access)

A static page (plain HTML, CSS and JavaScript, no build step). The list of members is **private**:
the Google script only returns it to someone holding a valid personal key. Everyone else sees a locked
page with a headcount and no names.

## What is in this folder
- `index.html`, `assets/network.css`, `assets/network.js`: the page
- `config.js`: where you paste your Google script URL and a contact email
- `data/sample-members.json`: fake people for demo mode
- `network-google-script.txt`: code for Google Apps Script (do NOT upload to GitHub)

## How access works
1. You approve a member (tick **Approved** in the sheet). A long random **Key** appears in their row,
   and a **Personal link** is built from it.
2. You email them that link. Opening it loads the list and remembers them on that device.
   The key is removed from the address bar right after loading.
3. A visitor with no key, or a wrong or revoked key, sees only the locked page and a headcount.
4. To cut someone off (or after a leak): clear their Key cell. A new key is issued on the next page load,
   and the old link stops working.
5. Requests are sent by members, so the page knows who is asking. Requests go to you first; members are
   never emailed automatically.

## Step 1. Try it locally in demo mode
With `config.js` empty, the page uses fake data and sends nothing.

    python3 -m http.server 8000
    http://localhost:8000/             -> the locked page (fake headcount)
    http://localhost:8000/?key=demo    -> the members area with fake people

## Step 2. Create the backend (new Sheet, new script)
1. Make a NEW Google Sheet called "justciencia network". Do not reuse your other sheets.
2. Extensions > Apps Script. Replace the code with `network-google-script.txt`.
3. Run `setup` and approve the permissions. It creates Members, Requests and Settings tabs.
4. In **Settings**, put your network page address in **B2** (for example `https://justciencia.github.io/network/`).
   Optionally put an email address in **B1** to receive request notices (blank = your Google account).
5. Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone**. Copy the URL.
6. Paste the URL into `config.js` as `scriptUrl`, and set `contactEmail`.
7. After any later script change: Deploy > Manage deployments > edit > New version.

## Step 3. Add a member (after you interview and publish them)
Fill a row in Members and tick **Approved**. Reload the page once (or open the script URL) and their
ID and Key appear. Copy the **Personal link** and email it with a short welcome and: "Please don't share
this link or the list."
- **Stage**: In school, Industry, or Postdoc or faculty. "In school" shows as "Future mentor" with no request button, but they can use the network and send requests.
- **Open to**: comma-separated, for example `Referrals, Resume review, Quick chat`.
- **Status**: Open or Paused (the availability toggle; change it when a member emails you).
- **Show company / Show region / Show LinkedIn**: unticked hides that detail from other members.
- **Private email**: never sent to the page. Used only by you.

## Step 4. Put it on GitHub
1. Create a repository named `network`. Upload everything except `network-google-script.txt`.
2. Settings > Pages > deploy from `main`, root folder.
3. It first appears at `justciencia.github.io/network` (or your account name). Paths are relative, so any address works.
4. A subdomain such as `network.justciencia.com` is the dependable route to a cleaner address (CNAME record, then set the custom domain in Pages settings). Update Settings!B2 in the sheet if the address changes.

## Public profiles on your main site
Since the network list is the members' perk, consider showing only **first name, title and field** on public
profiles, and leaving company, LinkedIn and region for the network. This slows down the easy path of
name + company + LinkedIn, but it cannot stop a determined person.

## Bug-hunting checklist
- [ ] No key: only the locked page and a headcount; no names anywhere in the page source or Network tab
- [ ] Wrong key: locked page with a clear message; the stored key is cleared
- [ ] Good key: list loads, key disappears from the address bar, page works after refresh
- [ ] Clear a Key cell in the sheet: the old link stops working
- [ ] Paused member shows a disabled button; in-school member never has a request button
- [ ] Hidden company / region / LinkedIn really are absent from the data the page receives
- [ ] Request: short message and missing tick show clear errors; success logs a row and emails you
- [ ] You cannot request an intro with yourself
- [ ] Works on a phone and with the keyboard only
- [ ] Private emails and keys never appear in what the page receives

## Honest limits
- Anyone holding a member's link can see the list. Per-person keys let you revoke one without affecting the rest.
- Not bank-grade security, but keys are long enough that guessing is not realistic.
- Members can screenshot or forward details; the pledge and the "please don't share" note are the other half of the protection.
- No self-service editing or "lost my link" reset yet: members email you.
- Update the member consent: details are visible to approved members only (not the public).
- The rate limit (5 requests per member per 6 hours) is basic.
