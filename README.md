# Rapido Clone (plain HTML, CSS and JavaScript,Bootstrap,CDN's)

A bike-taxi website with no React, no framework and no build step. Open `index.html` in a browser, or serve the folder:

## What works
- **Header:** sticky bar, active-section highlight, scroll progress bar, mobile menu, notification bell with unread badge.
- **Hero:** staggered entrance animation, working CTAs, magnetic buttons.
- **About:** "Read more" toggle; floating shapes.
- **Impact:** numbers count up when scrolled into view.
- **Customers / Captains tabs:** animated panel switch, keyboard arrows and dashboards for both the captains and the riders
- **Booking:** validated form with live fare estimate, simulated captain assignment, a 4-step progress tracker, cancel, emergency alert, star rating and feedback, and a saved ride history (cancelled and completed rides).
- **Reviews:** auto-playing carousel with dots, arrows, keyboard and swipe; post your own review.
- **Captain sign-up:** validated form with a success animation.
- **Business:** "Request a business account" opens a modal dialog with validation.
- **Contact:** validated contact form and newsletter subscription.
- **Notifications:** toasts for every action (auto-dismiss, pause on hover, close button), plus a notification centre with mark-all-read and clear. Ride progress, cancellations, reviews, sign-ups and form submissions all notify.
- **Motion:** scroll reveals, ripples, hover lifts, animated stepper and progress bar, toast slide-in, bell shake. Everything is switched off for users who prefer reduced motion.

## Version 3 additions
- **Theme:** dark-and-yellow by default, matching the design screenshots. Use the moon/sun button in the header to switch to the original light look. The choice is remembered on this device.
- `booking.html`: pickup and drop-off search (Bengaluru, Chennai, Hyderabad, Pune localities), click-to-set on the map, bike/auto/cab fares, promo codes, and a confirmation step. Distance comes from the two points, using a road factor of 1.3.
- `register.html`: create a rider, captain or admin account. Production account verification requires a configured authentication service.
- `dashboard.html`: sends you to the dashboard for your role.
- `customer-dashboard.html`: trips, spending, ratings, and profile.
- `captain-dashboard.html`: manage captain ride states and fare-share calculations. Ride dispatch requires a connected backend.
- `admin-dashboard.html`: totals, filterable and sortable ride table, CSV export, fare editor, promo codes, and user list.

Map tiles and the Leaflet library load from CDNs. If they cannot load, booking still works from the lists.
Sign-in is simulated (OTP 123456). Everything is stored in localStorage on this device only.

## Version 3.1 additions
- **Home page:** developer profile right under the navigation bar; "Know Us Better" replaced by the city explore block (ticker, hero, Bike / Auto / Cab cards); "What's in it for you" replaced by the three-step "From here to there" section; new "Less planning. More living." block and a phone-preview call to action; a jobs and careers block.
- **Booking (home and `booking.html`):** the manual km field is gone. Type a place and pick it from the online suggestions (OpenStreetMap Nominatim, India only). The road distance comes from the internet (OSRM routing), and the fare updates from it. If the map service cannot be reached, the distance falls back to a straight-line estimate with a road factor of 1.3 and the page says so.
- **Ride types:** Bike, Auto, Cab and Bike Plus. Rates are shown under the fare.
- **Careers:** submitting an application opens a success pop-up with a reference number, saves it to "My applications", sends a bell notification, and moves it to "Under review" after about 12 seconds with another notification.
- **Developer page:** `developer.html`, linked from the navigation bar and footer.
- **Welcome page:** `landing.html`, with an animated headline, a route that draws itself and a moving rider, counters, tilt cards and a closing call to action.
- **Fixes:** the header menu, notification bell and counters were bound twice on the home page; that is now a single handler. The footer no longer overlaps the contact form on desktop.

Road distances use public online services and require an internet connection. Place names entered for routing may be sent to those services.

## Version 3.2 additions
- **Payment mode (`booking.html`):** choose UPI or Cash on the trip form. The confirm dialog shows the chosen mode.
- **UPI:** the confirm step opens a `upi://pay` link to `koriviyaswanth4@oksbi` with the fare pre-filled, and the trip card keeps a "Pay with UPI" button in case the app did not open.
- **Cash:** no online payment. The trip is saved with "cash on arrival".

## Notes
- Booking, captain assignment, ride progress and notifications are simulated in the browser. There is no server, payment or real driver.
- Saved data (rides, notifications, reviews, submissions) is stored in `localStorage` on the same device only.
- Fonts and icons load from Google Fonts and cdnjs.
- This is an independent ride-booking website project developed by @YaswanthInfotech. It is not affiliated with Rapido.

## Pages
- `index.html`: home page (booking, reviews, captain sign-up, business request, contact).
- `safety.html`: safety tabs, emergency contacts (saved on this device), SOS alert, pre-ride checklist.
- `about.html`: stats, timeline accordion, values.
- `careers.html`: search and department filter, application form with resume check.
- `blog.html`: category filter, search, load more, reading list.
- `press.html`: search and sort, expandable releases, press kit notice, media enquiry form.
- `contact.html`: contact form, office picker, searchable FAQ.
- `login.html`: mobile number, local 6-digit verification code, resend timer, lockout after 3 wrong codes, and sign out. Production OTP requires an SMS provider.
- Every page: the "Download App" pop-up, the notification bell and toasts.

## Files
- `index.html`: all sections.
- `style.css`: original Rapido design plus the animations and components.
- `js/pages.js`: shared script for the extra pages.
- `js/features.js`: booking, register and dashboards.
- `js/app.js`: all behaviour.
- `images/`, `rapido.png`: assets from the original project.
