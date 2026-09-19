# Homeowner intake site

A third public surface: a tenant branded page where a homeowner reports a plumbing problem. Frontend only, running on the existing mock data.

## Routes

- `/book/$orgSlug` homepage
- `/book/$orgSlug/report` full form
- `/book/$orgSlug/sent/$ref` confirmation
- `/embed/$orgSlug` bare form, no header or footer

A shared tenant layout resolves the organisation by slug and shows a plain not found page when there is no match. Each route gets its own head metadata built from the business name and towns, and each also carries `robots: noindex, nofollow` while this sits on a preview URL, matching the rules already shipped. Metadata is built now, indexing is switched on at launch, so no invented RCH credentials get indexed under Ray's brand while his real site ranks.

## Tenant data

Add `slug`, `towns`, `hours`, `serviceArea`, and optional credential flags (Gas Safe, VAT registered, no call out charge) to the 12 demo organisations in the platform data, RCH Drainage as `rch-drainage`, Towcester Heating as `towcester-heating`, and so on. Every heading, phone link, email, town chip and job type card reads from that record, nothing hardcoded to RCH.

## Homepage

Sticky dark band with the business name and a red Call now `tel:` button, full width on mobile. Hero with the business name headline, one plain sub line, Report your problem (amber) and Call now (outlined), plus a reassurance line built from the service area and hours.

The quick report card (problem, postcode, phone, Get help) sits inside the hero so it is reachable without scrolling at 390px, and carries its three values into the full form.

Then: six tappable problem cards that prefill the problem field, three how it works steps, a wrapped list of town chips with postcode prefixes, four why us points omitted when the org record lacks the field, and a footer with contact details and a single small "Powered by RCH PlumbFlow" line linking to `/`.

Red is used only for the emergency call band. Amber for every normal action.

## Report page

One question per block: what has gone wrong (textarea with the existing dictation button), emergency choice as two large buttons, optional photos with camera capture held as base64, postcode and address, name, required phone, optional email, and when suits you. Submit reads "Send to " plus the business name.

Validation is inline, never clears input, and scrolls to and focuses the first missing required field. Choosing the emergency option turns the band red and surfaces a call button without blocking the form.

## Submission

A new services file exports `submitEnquiry(payload)` as the only thing that touches the store, plus `notifyPlumber(enquiry)` as a console only stub. It creates an enquiry with the org id from the slug, source `web`, the emergency flag, homeowner photos, and a reference in the existing `E-0000` format, then routes to the confirmation page.

## Confirmation

Large tick, "Got it. <owner> has your details.", the reference with a note to quote it, what happens next with the real number as a call button, and a summary of everything sent including photo thumbnails. No account or login anywhere.

## App side

The enquiry lands at the top of the enquiries list with an amber New chip, shows source as Web form on the detail screen, displays the homeowner photos there and carries them onto the job, and if flagged emergency appears in the Today red strip with the five existing actions.

## Marketing site

One feature block on `/features` ("Your own booking page") and one line added to the pricing inclusions list.

## Technical notes

- The app store holds a single organisation (RCH Drainage). Enquiries submitted for that slug appear in the app. The other 11 slugs render and confirm cleanly with their own reference, they simply have no app to land in. For the demo, `/book/towcester-heating` is shown as Dean's business to make the multi tenant point and nothing is submitted on it.
- Enquiry gains `source` and `photos` fields, and the store gains an enquiry counter plus an `addEnquiry` action alongside the existing add helpers.
- Photos: capped at 3 per submission, downscaled to 1000px on the long edge and re encoded as JPEG at quality 0.6 before being stored as base64.
- Every localStorage write is wrapped in a try catch for QuotaExceededError. On quota failure the enquiry saves without its photos and the confirmation shows a small line saying the photos could not be attached. The submit never fails.
- Phone audit: the RCH tenant uses Ray's real number since it is his own page. Every other tenant and demo contact uses Ofcom reserved ranges only, 07700 900xxx for mobiles (already correct) and the 01xxx 496 0xxx drama range for landlines, replacing the current 555 style landlines, which are a US convention and could reach a real Northampton household.

## Checks

Both `/book/rch-drainage` and `/book/towcester-heating` render different names, phones, towns and job types from the same components; a submission on a non RCH slug confirms without erroring; quick report visible without scrolling at 390px; an emergency submission shows in the Today strip; photos survive to the enquiry detail; three photos still save under quota and a forced quota failure still saves the enquiry; every `tel:` link is Ray's own number or a reserved range; all new routes noindex; no text under 16px, no tap target under 48px, no horizontal scroll, no dashes in copy.
