# justciencia network (draft 1, no login)

A static page (plain HTML, CSS and JavaScript, no build step) that shows the vetted members of the
justciencia network. Members live in a private Google Sheet; the page only ever receives the public
fields. People can request an intro, and the request goes to YOU first.

## What is in this folder
- `index.html`, `assets/network.css`, `assets/network.js`: the page
- `config.js`: where you paste your Google script URL
- `data/sample-members.json`: fake people for demo mode
- `network-google-script.txt`: code for Google Apps Script (do NOT upload to GitHub)

## Step 1. Try it locally in demo mode
With `config.js` empty, the page shows fake people and sends nothing. Open it through a local server
(opening the file directly can block loading the sample data):

    python3 -m http.server 8000      # then visit http://localhost:8000

## Step 2. Create the backend (new Sheet, new script)
1. Make a NEW Google Sheet called "justciencia network". Do not reuse your other sheets.
2. Extensions > Apps Script. Replace the code with `network-google-script.txt`.
3. Pick `setup` in the function dropdown and Run it. Approve the permissions.
   It creates three tabs: Members, Requests, Settings.
4. Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone**. Copy the web app URL.
5. Paste that URL into `config.js` as `scriptUrl`.
6. Whenever you change the script later: Deploy > Manage deployments > edit > New version.

## Step 3. Add a member (after you interview and publish them)
Fill a row in Members and tick **Approved**. The ID fills itself in the first time the page loads.
- **Stage**: In school, Industry, or Postdoc or faculty. "In school" always shows as "Future mentor" with no request button.
- **Open to**: comma-separated, for example `Referrals, Resume review, Quick chat`.
- **Status**: Open or Paused. This is the availability toggle. If a member emails you to pause, change it here.
- **Show company / Show region / Show LinkedIn**: unticked means that detail is hidden from the public.
- **Private email**: never sent to the page. Only you see it.
- **Story URL**: link to their justciencia profile (must start with https://).

## Step 4. Put it on GitHub
1. Create a repository named `network`. Upload everything except `network-google-script.txt`.
2. Settings > Pages > deploy from the `main` branch, root folder.
3. It will first appear at `justciencia.github.io/network` (or your account name). Asset paths are relative, so it works at any address.
4. Later, a subdomain such as `network.justciencia.com` is the dependable route: add a CNAME record for `network`
   pointing to your GitHub Pages address, then set the custom domain in this repository's Pages settings.
   Whether the page can also appear at `justciencia.com/network` depends on how your main site's Pages is set up, so check that when you get there.

## How requests work
1. A visitor fills the form on a card.
2. The script checks it, saves it in the Requests tab, and emails you (or the address in Settings!B1).
3. You read it, forward it to the member if appropriate, and tick Handled.
Members are never emailed automatically, so you can screen everything.

## Bug-hunting checklist
- [ ] Filters combine correctly (stage + open to + industry + only open now)
- [ ] Search finds name, field, company and region
- [ ] Paused member shows a disabled button, not a request button
- [ ] In-school member never shows a request button, even if Status is Open
- [ ] A member with Show company unticked does not show their company anywhere
- [ ] Request form: empty fields, bad email, short message all show a clear error
- [ ] A request shows up in Requests and in your inbox
- [ ] Works on a phone, and with the keyboard only (Tab, Enter, Escape)
- [ ] Private email never appears in the page or in the browser's Network tab

## Known limits of draft 1
- No logins: you edit availability and details in the Sheet.
- No backgrounds or profile pictures yet (aesthetics come later). Cards show initials.
- The rate limit (3 requests per email per 6 hours) is basic, not bulletproof.
- Google caps how many emails a script can send per day, which is plenty at this size.
- Before launch, add a short privacy note, and get members' written consent to be listed.
