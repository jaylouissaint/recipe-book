"""Text of the Recipe Book Functional and Technical Specifications (built by build_specs.py).

Block types: ("h1", text) ("h2", text) ("p", text) ("bullets", [text, ...])
("req", id, title, body, acceptance, verification status) ("table", [col widths], rows)
("callout", title, text) ("pagebreak",) ("raw", xml)
"""
from xml.sax.saxutils import escape

VERSION = "2.0"
DATE = "October 29, 2026"
DOC_TIMESTAMP = "2026-10-29T12:00:00Z"
SITE = "https://ramiyas-recipes.vercel.app"

FUNCTIONAL_FOOTER = f"Recipe Book  |  Functional Specification  |  Draft v{VERSION}"
TECHNICAL_FOOTER = "Recipe Book - Technical Specification"

# Verification states used below
LIVE = (f"Deployed at {SITE} (main at 19be9f4, 2026-10-29); checked in WebKit with an iPad profile and in "
        "headless Chrome; owner check on the iPad pending")
LIVE_OWNER = f"Deployed at {SITE} (2026-10-29) and in use by the owner"
CHECKED = "Deployed and verified 2026-10-27 by scripts/check-setup.sh against the live site (all checks pass)"
BUILT = ("Built 2026-10-29, not yet deployed; checked in WebKit with an iPad profile (and headless Chrome); "
         "owner check pending")


# ---------------------------------------------------------------- Functional Specification

FUNCTIONAL = [
    ("raw", '<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:t>RECIPE BOOK</w:t></w:r></w:p>'),
    ("raw", '<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Functional Specification</w:t></w:r></w:p>'),
    ("p", "User-facing requirements for the Recipe Book website, used on the iPad from the Home Screen: "
          "screens, ways to add recipes, the kitchen features, and acceptance criteria"),
    ("p", f"Version {VERSION}  |  {DATE}  |  Document status: Living specification (source of truth)"),
    ("table", [2448, 6768], [
        ["Document control", "Value"],
        ["Application", f"Recipe Book: a website ({SITE}), used mainly in Safari on the owner's iPad from a "
         "Home Screen shortcut, with the Apple Pencil"],
        ["Companion document", "Recipe Book Technical Specification"],
        ["Functional scope", "Home (pick up, this week's meals, groceries at a glance, to finish), Library "
         "(list and book), Recipe view, Writing page (lines and Pencil page mode), Save from the web, Add from "
         "photos, Paste text, Groceries, Start Cooking, Serving scaler, Favorites, Offline, Live updates, "
         "Settings"],
        ["Requirement states", "Specified / Built (not deployed) / Deployed / Verification pending / Planned / "
         "Queued"],
        ["Primary browser", "Safari on iPad (iPadOS 18 and later). Other browsers are supported but secondary."],
    ]),

    ("h1", "1. Purpose and document conventions"),
    ("p", "This document defines the expected user experience and behavior of the Recipe Book: a personal "
          "recipe book styled after the owner's handwritten spiral recipe book. It is a website that everyone "
          "can read and only the owner's unlocked devices can change. On the iPad it is used from a Home Screen "
          "shortcut, with Scribble and the Apple Pencil. A native iPad app was planned, built as a prototype in "
          "the Simulator and dropped on 2026-10-29 (Section 14); its features are covered by the website. The "
          "Technical Specification is the reference for Next.js, Supabase, the data model and deployment. The "
          "reference photo of the book page is docs/reference/recipe-book-page.jpg; the look and screens are in "
          "docs/DESIGN.md; the current state and next steps are in docs/HANDOFF.md."),
    ("p", "A requirement is an expected outcome, not proof that the deployed site meets it. Each requirement "
          "says whether it is deployed, built but not yet deployed, or planned, and whether the owner has "
          "checked it. Automated checks run in WebKit (Safari's engine) with an iPad profile; they cannot "
          "reproduce the Apple Pencil, Scribble or the on-screen keyboard, so those need the owner's check."),

    ("h1", "2. Users, access and navigation"),
    ("req", "FR-BOOKS-001", "Two books: Who's using this",
     "Ramiya's Recipes and Jay's Recipes are two books in one site, each with its own recipes, grocery list "
     "and week. Ramiya's is at the site's own addresses, Jay's under /jay. Settings has “Who's using this: "
     "Ramiya | Jay”, which switches the device to that book and remembers it (the front page opens it). Each "
     "book has its own write key, and a key only changes its own book; Settings has an Unlock line per book. "
     "Each book can have its own Home Screen shortcut, name and icon.",
     "With only Ramiya's key a device can't change anything in Jay's book (refused by the server); with both "
     "keys it can change either; a Jay shortcut opens Jay's book.",
     "Built 2026-10-30 (migration 004 and save-recipe tested in PGlite); not yet deployed"),
    ("req", "FR-ACCESS-001", "Anyone can read; only unlocked devices can change anything",
     "There is no login (queued, FR-AUTH-001). Anyone with the link can read every recipe, the week's meals "
     "and the grocery list. Saving, deleting, uploading, favorites, meals and grocery changes need the write "
     "key, entered once per browser in Settings (Unlock editing); it is kept in a secure cookie for a year, "
     "and Lock editing removes it. Editing buttons only appear on unlocked devices.",
     "Without the write key every change is refused and nothing changes; with it, changes succeed; a locked "
     "browser shows no + button, Edit, stars to tap or + Add on days.",
     CHECKED + " for the save function; website unlock deployed 2026-10-28 and in use"),
    ("req", "FR-NAV-001", "Navigation",
     "Home, Library, Groceries and Settings. On iPad and wider: a floating capsule at the top centre, like "
     "iPadOS's tab bar, with the current tab as a white pill and a sidebar button that moves the menu to a left "
     "sidebar (and back); remembered per browser and applied before the page is drawn. On phones: a bottom tab "
     "bar. The tapped tab lights up at once and every tab opens instantly (cached pages, refreshed on every "
     "change). A "
     "floating green + button (unlocked only) opens Add a recipe.",
     "Each tab opens its page and is highlighted; the book view and recipe pages highlight Library; the menu's "
     "place survives a reload; a tab lights up within 100 ms of a tap.",
     BUILT),
    ("req", "FR-NAV-002", "Recipe web addresses",
     "Each recipe has a readable address made from its title, such as /recipe/sweet-chili-chicken. Editing the "
     "title keeps the address; a second recipe with the same title gets a short code added. Old category "
     "addresses (/category/mains) lead to the Library with that category's filter on.",
     "Renaming keeps the address; /category/mains opens /library?category=mains.",
     "Addresses deployed 2026-10-27; category redirect " + LIVE),
    ("req", "FR-DATA-001", "Changes show up everywhere",
     "A change saved on one device shows on the device that saved it at once, and on every other open device "
     "within about a second (live updates, FR-LIVE-001). Deleted recipes disappear everywhere.",
     "With the recipe open on two devices, a save on one appears on the other without reloading.",
     BUILT + " (live updates need migration 003)"),
    ("req", "FR-HOME-SCREEN-001", "Home Screen shortcut",
     "Added to the iPad Home Screen (Share → Add to Home Screen), the site shows the whisk-and-wooden-spoon icon "
     "and the name “Ramiya’s Recipes”, and opens full screen like an app (FR-PWA-002).",
     "A newly added shortcut shows the icon and the name with its space.",
     LIVE + " (re-add the shortcut to pick up the icon and name)"),

    ("h1", "3. Cross-application recipe rules"),
    ("table", [2592, 6624], [
        ["Metric", "Definition / rule"],
        ["Recipe content", "Anything the cook wrote (title, amounts, ingredients, steps, notes, stat values). "
         "Shown in plum ink in the handwriting font: Ramiya's own handwriting in her book (Patrick Hand for "
         "punctuation and fractions it lacks), Patrick Hand in Jay's."],
        ["Printed labels", "Anything printed on the book's page (INGREDIENTS, DIRECTIONS, stat box headers, tag "
         "names, “recipe:”), in small gray capitals or the gray serif for “recipe:”."],
        ["Ingredient group", "A named set of ingredients such as “marinade”. A group with no name holds loose items."],
        ["Step and sub-step", "A step is a ▷ line; sub-steps are the indented “–” lines under it."],
        ["Tags", "Quick & Easy, Slow Cooker, One Pot/Pan, Air Fryer, Veg (trimmed 2026-10-29). Older recipes may "
         "carry removed tags; they are kept but not shown."],
        ["Favorite", "Set with the star on a Library card. Favorites fill the Library's ★ Favorites filter and "
         "get a star on their card and an asterisk on the book page. Not a tag checkbox any more."],
        ["Amount as written", "Kept exactly as written (“1/3”, “1 1/2”, or nothing for “pinch of salt”); ½ ⅓ ⅔ ¼ "
         "¾ shown for common fractions; the parsed number is only used for scaling."],
        ["Handwritten page", "The Apple Pencil pages a recipe was written on (page mode), kept as one picture."],
        ["Handwritten-only recipe", "A recipe with a handwritten page and no typed ingredients or steps. It "
         "can't be scaled, added to Groceries or cooked with Start Cooking until its lines are typed."],
        ["Original card", "The photo or PDF a recipe came from (Add from photos). Kept unchanged."],
        ["Imported recipe", "Brought in from a link or a photo; shows “Check this import” until edited and saved."],
        ["Times cooked", "Goes up by one when Start Cooking reaches the end, or from Mark as cooked."],
        ["Write key", "The private key that allows changes; kept per browser after Unlock editing."],
        ["Light only", "White and cream backgrounds everywhere; no dark mode."],
    ]),
    ("req", "FR-RULE-001", "No outside AI service",
     "Handwriting becomes text only through features built into the iPad (Scribble on the lines, Live Text "
     "copied from a picture) or by typing. Nothing sends recipe pages, drawings, photos or PDFs to an outside "
     "transcription or AI service; the Pencil page mode keeps the writing as a picture and does not read it.",
     "A review of the code and network requests shows no calls to a transcription or AI service.",
     "Specified; checked in code review 2026-10-29"),

    ("h1", "4. Home"),
    ("p", "Home is the page opened before cooking or shopping (changed 2026-10-29; it was a book shelf). "
          "Browsing is the Library's job (Section 5). Like every page it opens instantly from the site's cache, "
          "which every change refreshes at once."),
    ("req", "FR-HOME-001", "Pick up where you left off",
     "If Start Cooking was left part way in the last day on this device, Home shows “Continue cooking”, the "
     "recipe and “step 2 of 4”; tapping it reopens Start Cooking at that step and serving size. Otherwise it "
     "shows the last recipe opened. Remembered per browser only.",
     "Leave Start Cooking at step 2 at 1.5× servings; Home's link reopens step 2 at 1.5×.",
     LIVE),
    ("req", "FR-HOME-002", "Surprise me",
     "A Surprise me button opens a random recipe, not the last one opened.",
     "Tapping it opens a recipe page.",
     LIVE),
    ("req", "FR-HOME-003", "This week's meals",
     "Today and the next 6 days as a strip of day cards (the device's own calendar days). Each day holds "
     "recipes, each with how many it should serve, or plain notes (“leftovers”). + Add (unlocked) searches "
     "recipes, sets servings with − and +, or writes a note; × removes. The plan is stored online, so every "
     "device shows the same week. Meals more than a month old are cleared out automatically.",
     "Adding a recipe for 6 to today and a note to tomorrow shows both on every device; removing one "
     "removes it everywhere.",
     LIVE_OWNER + " (migration 002 run 2026-10-29)"),
    ("req", "FR-HOME-004", "Add the week to Groceries",
     "One button opens the grocery sheet with every planned recipe's ingredients at its planned servings, one "
     "section per day and recipe, all ticked; untick what's at home, then add. Recipes without typed "
     "ingredients add nothing.",
     "Two planned recipes give a sheet with two sections; adding puts each line on the list linked to its recipe.",
     LIVE_OWNER),
    ("req", "FR-HOME-007", "Haven't made in a while",
     "Favorites and recipes cooked before that haven't been made in the last 3 weeks and aren't planned from "
     "today on, longest ago first, up to 8, as small cards with “last made 5 weeks ago”, “made a while ago” "
     "(cooked before dates were kept) or “not made yet” (a favorite never cooked). The date is kept when Start "
     "Cooking reaches the end or Mark as cooked is tapped.",
     "A recipe cooked 5 weeks ago shows “last made 5 weeks ago”; one cooked last week doesn't show.",
     "Built 2026-10-30 (migration 005 to run); checked in WebKit"),
    ("req", "FR-BOOKS-002", "Copy a recipe to the other book",
     "“Copy to Jay's Recipes” (or Ramiya's) in the recipe menu, shown only when the other book is unlocked on "
     "the device. The copy is a separate recipe in the other book with the same ingredients, steps, notes, "
     "photo and handwritten page, starting with no times cooked and no favorite star.",
     "Copying from Ramiya's book with both keys unlocked gives the recipe in Jay's Library; editing one leaves "
     "the other unchanged; without Jay's key the item isn't shown.",
     "Built 2026-10-30; a real copy not tried yet"),
    ("req", "FR-HOME-005", "Groceries at a glance",
     "How many items are left to buy, and the whole unchecked list in a box that scrolls inside the card, with "
     "Open the list.",
     "With 28 items, the card shows “28 items left to buy” and scrolls to the last item.",
     BUILT),
    ("req", "FR-HOME-006", "To finish",
     "Handwritten-only recipes listed with Type the lines (FR-WRITE-010).",
     "A Pencil-only recipe appears with a link that opens its writing page on the lines.",
     LIVE),

    ("h1", "5. Library, book view and recipe view"),
    ("req", "FR-LIB-001", "Library",
     "Library (“My Recipes”) lists every recipe as a white card: a thumbnail (photo, else the handwritten page, "
     "else the original card's photo, else a cream placeholder with the first letter), a source line with an "
     "icon, the title in handwriting, “by Author”, the times-cooked count, and a favorite star in the top right "
     "corner (tap to add to or take off Favorites, unlocked only; locked devices see the favorites' stars). "
     "Search finds titles, ingredients, steps and tags. Below the search, the four colored category tabs and "
     "★ Favorites are filters; the filter button holds the tags. Two columns on iPad, three on desktop.",
     "Searching “lime” leaves only recipes with lime; ★ Favorites leaves only favorites; tapping a star does "
     "not open the recipe.",
     LIVE),
    ("req", "FR-LIB-002", "List | Book",
     "A List | Book switch on the Library opens the book view: the whole book to flip through like the spiral "
     "book. The cover is the Home Screen icon's wooden spoon and whisk on cream ruled paper; then contents with "
     "page numbers; then recipes by category. Every page is the same size with whole ruled lines (18–30 per "
     "page); a long recipe continues on the next page (“(continued)”). An open two-page spread with the spiral "
     "down the middle in landscape; one page in portrait. Swipe, arrow keys or ‹ › turn pages; side tabs jump "
     "to a section; contents entries jump to a recipe; a recipe with only a handwritten page shows the page.",
     "In landscape the cover sits alone on the right; turning shows pages 1–2; Mains jumps to the first main.",
     LIVE),
    ("req", "FR-VIEW-001", "Recipe view",
     "Back, share and menu at the top; the cover photo shown whole at its own shape (never cropped); the title "
     "in large handwriting; “by” and “from” links; “in Mains” (opens the Library filtered); servings (the "
     "scaler), prep and cook; tags; ingredients by group; numbered directions with “–” sub-steps; notes. "
     "Add to Groceries and Start Cooking stay at the bottom. The menu: Open in the book, View handwritten "
     "page, View the original, and (unlocked) Edit recipe and Mark as cooked. A handwritten-only recipe shows "
     "its handwritten page in place of the ingredients and directions, and Type the lines in place of the "
     "bottom buttons.",
     "The sweet chili chicken shows 14 ingredients in 3 groups and 4 steps; a tall photo is not cut off.",
     LIVE),
    ("req", "FR-VIEW-002", "Check this import",
     "Recipes imported from a link or a photo show a muted note until edited and saved once.",
     "An imported recipe shows the note; after one save it no longer does.",
     "Deployed 2026-10-28"),

    ("h1", "6. Adding a recipe: the writing page"),
    ("p", "Enter your own recipe and Edit open the writing page: the book page as a form, with Cancel and Save "
          "at the bottom. A switch at the top chooses Write on the lines or Write on the page."),
    ("req", "FR-WRITE-001", "One field per ruled line",
     "Each ruled line is its own field in the handwriting font and plum ink, so Scribble fills one line at a "
     "time. There is always an empty next line; Return moves to it (and keeps the iPad keyboard up).",
     "Writing over a line with Scribble fills that line only; Return moves to the next.",
     "Deployed 2026-10-28; keyboard fix " + BUILT.lower()),
    ("req", "FR-WRITE-002", "Page layout",
     "Add a photo at the top right; the “recipe:” title line and the mauve stat box (they share a row when "
     "there's room, else stack); the tag circles; the colored category tabs on the page's right edge; "
     "INGREDIENTS in sections with names; DIRECTIONS with ▷ and – (start a line with “-”, or tap ▷); notes; "
     "and By, From and Description under More details.",
     "Beside a photo or handwritten page the title is still a full line, and nothing scrolls sideways.",
     LIVE),
    ("req", "FR-WRITE-003", "Ingredient lines split into amount, unit and item",
     "A rule-based parser splits each line into amount, unit and item. It understands whole numbers, fractions, "
     "mixed numbers (“1 1/2”, “1 ½”), ½-style characters, ranges, and common units. The line still shows "
     "exactly as written.",
     "“1/3 c sweet chili sauce” becomes 1/3 | c | sweet chili sauce; “pinch of salt” has no amount.",
     "Deployed 2026-10-28; tests against shared/fixtures/ingredient-lines.json"),
    ("req", "FR-WRITE-004", "Stat box, tags and category",
     "Servings, prep and cook are number fields (Scribble works); non-numbers are refused with a message. Tags "
     "toggle by tapping their circles; the category by tapping its tab.",
     "“about 20” in Cook time is refused with “Cook time should be a number”.",
     "Deployed 2026-10-28"),
    ("req", "FR-WRITE-005", "Drafts are never lost",
     "The draft (and any Pencil writing) is kept in the browser after every change and restored with "
     "“Restored your unsaved draft” and Discard it.",
     "Reloading mid-recipe restores every line and the Pencil pages.",
     "Deployed 2026-10-28 (Pencil writing 2026-10-29)"),
    ("req", "FR-WRITE-006", "Write on the page (Apple Pencil)",
     "Ruled pages to write on anywhere with the Apple Pencil: pressure-sensitive plum pen, eraser, Undo, Clear, "
     "and Draw with finger. Fingers scroll; only the Pencil draws. “+ Add a page” adds pages; an empty last page "
     "can be removed. The title, stats, tags, category and photo stay as fields above. On Save the pages become "
     "one picture, the handwritten page; it is not read into text (FR-RULE-001). Editing draws new ink over the "
     "saved page.",
     "Writing two pages and saving gives one handwritten page with both; holding the Pencil still brings up no "
     "text selection or loupe.",
     LIVE + "; Pencil feel to be checked by the owner"),
    ("req", "FR-WRITE-007", "Favorites, groceries and cooking need lines",
     "Groceries, Start Cooking, the scaler and ingredient search use the typed lines. A handwritten-only "
     "recipe says so and offers Type the lines.",
     "A handwritten-only recipe has no Start Cooking button and shows Type the lines.",
     LIVE),
    ("req", "FR-WRITE-010", "Type the lines beside the handwritten page",
     "Type the lines (recipe view or Home's To finish) opens the writing page on the lines with the handwritten "
     "page beside it (above it in portrait), and a Paste text box for text copied from the page with Live Text.",
     "/recipe/<slug>/edit?lines=1 opens the lines, with the handwritten page beside them.",
     LIVE),

    ("h1", "7. Adding a recipe: from the web, from photos, by pasting"),
    ("req", "FR-WEB-001", "Save a recipe from the web",
     "Paste a link; the site reads the recipe data the page publishes for search engines (schema.org): title, "
     "photo, author, site, servings, times, ingredients and steps. No AI. The result opens in the writing page "
     "for review. Pages with no recipe data, or sites that refuse to be read, open with the link and a Paste "
     "text box. Only public web addresses work; the photo is copied in on save.",
     "A BBC Good Food link fills 16 ingredients and 11 steps; an Allrecipes link (refused) offers Paste text.",
     "Deployed 2026-10-28"),
    ("req", "FR-UP-001", "Add from photos",
     "Upload a photo or PDF (up to 20 MB). It shows beside the writing page (above it on narrow screens) with a "
     "Paste text box for iPad Live Text (touch and hold, Select All, Copy). The file is kept as the original card.",
     "After saving, View the original opens the file; the Library thumbnail shows the photo.",
     "Deployed 2026-10-28"),
    ("req", "FR-PASTE-001", "Turn pasted text into a recipe",
     "Rules sort pasted text into the page. Headings (Ingredients, Directions, Notes) start sections; the book "
     "page's stat box and tag lines are read or skipped; ▷, numbers or “Step 1” start a step and “-” a sub-step; "
     "section names are found (“marinade”, “For the sauce:”). Without headings, amounts are ingredients and the "
     "steps start after them: a line without an amount stays an ingredient when another amount follows within "
     "two lines or it reads like one (“salt and pepper to taste”), and a line that starts like a step (“cream "
     "butter & sugar”, “in a bowl…”) starts the steps. Handwriting misreads are tidied: stray capitals "
     "(“sugaR”, “BRead”), “0z”/“20z” for oz, “6q” for 6g, a lone “?” for “&”, and in a recipe measured in grams "
     "a unitless “1709” or “3400” is read as 170 g or 340 g. Lines Live Text ran together are split before a "
     "clear cooking verb, and a word cut across two lines is joined back.",
     "The owner's Live Text copy of the salted maple banana bread card gives 10 ingredients (170 g, 6 g and 2 oz "
     "restored) and 5 steps; misread words, and the one line Live Text dropped, are left for review.",
     BUILT + "; tests against shared/fixtures/pasted-recipes.json (5 cases)"),
    ("req", "FR-PASTE-002", "Review before saving",
     "Filled pages always open for review; nothing is saved until Save. Words the recognition misread are "
     "not guessed at.",
     "Leaving without saving creates no recipe.",
     "Deployed 2026-10-28"),

    ("h1", "8. Groceries and the kitchen"),
    ("req", "FR-GROC-001", "Groceries",
     "One shared list, not sorted by aisle or date. Add to Groceries on a recipe opens a sheet of its "
     "ingredients at the current serving size, all ticked, to untick what's at home. Items show in "
     "handwriting with the recipe's thumbnail; checked items move to the bottom; Add an item, Clear checked, "
     "Clear all; Group by recipe (remembered per browser). Locked browsers see it read-only.",
     "Adding the sweet chili chicken at 6 servings adds its 14 items scaled; a check-off on one device shows on "
     "the other.",
     "Deployed 2026-10-28; in use by the owner"),
    ("req", "FR-COOK-001", "Start Cooking",
     "Full screen: “Gather your ingredients” (a checklist at the current scale), then one step at a time in large "
     "handwriting with the ingredients it uses above it. Next/Back, swipe or arrow keys; sub-steps check off; "
     "the screen stays awake. The last page, “enjoy!”, adds one to times cooked. Where it was left is remembered "
     "for Home (FR-HOME-001).",
     "The screen doesn't dim; reaching the end raises times cooked by one.",
     "Deployed 2026-10-28"),
    ("req", "FR-COOK-002", "Serving scaler",
     "− and + on Servings (or ×½ to ×4 without a serving count) rescale amounts with kitchen fractions "
     "(⅓ c × 1½ = ½ c); unparsed lines stay as written. Add to Groceries and Start Cooking use the scaled amounts.",
     "4 → 6 servings shows ½ c sweet chili sauce and 3 lbs chicken.",
     "Deployed 2026-10-28"),

    ("h1", "9. Offline and live updates"),
    ("req", "FR-OFF-001", "Opened pages work offline",
     "Pages opened on a device (recipes, Home, Library, Groceries, the book) and their pictures are kept by the "
     "browser and still open with no signal. A note says “You’re offline”. A page never opened on that device "
     "shows a friendly offline page.",
     "With no connection, a recipe opened earlier opens with its photo; an unopened one shows the offline page.",
     BUILT + " (tested offline in Chrome; WebKit test tools can't run service workers)"),
    ("req", "FR-OFF-002", "Check off groceries with no signal",
     "Check-offs made offline (or whose save can't get through) are kept on the device, shown as checked, and "
     "sent when the connection is back; a note counts them. Adding and clearing need a connection.",
     "Offline, a check-off survives a reload and is sent after reconnecting.",
     BUILT),
    ("req", "FR-LIVE-001", "Live updates",
     "When a recipe, the grocery list or the week's meals change on any device, every open page refreshes "
     "within about a second, keeping what's typed and the scroll position. Pages also refresh when brought "
     "back to the front or when the connection returns.",
     "A check-off on the iPad shows on the open Mac within a second or two.",
     BUILT + "; needs migration 003 (run by the owner)"),
    ("req", "FR-PWA-002", "Full-screen Home Screen app",
     "The Home Screen shortcut opens full screen, without Safari's address bar and buttons, with its own entry "
     "in the app switcher. The site's own tabs, back buttons and × get around; Cancel on the writing page goes "
     "back, or to the recipe (or the Library) when there's nothing to go back to. Links to other websites open "
     "separately. The full-screen app keeps its own storage apart from Safari: editing is unlocked once inside "
     "it, and its offline copies fill as pages are opened there.",
     "Opened from the shortcut, no address bar shows; every page has a way back; Unlock editing in its "
     "Settings works.",
     BUILT + " (decided by the owner 2026-10-29)"),
    ("req", "FR-PRINT-001", "Printed recipe",
     "Printing a recipe prints the recipe only, on white, without navigation, buttons or decorations.",
     "A printed recipe shows no navigation or bottom buttons.",
     "Print rules deployed 2026-10-27; full check planned (website step R5)"),

    ("h1", "10. Error handling, usability and consistency"),
    ("req", "FR-UX-001", "Not found",
     "An unknown or deleted recipe shows the not-found page rather than an error.",
     "/recipe/does-not-exist shows the not-found page.",
     CHECKED),
    ("req", "FR-UX-002", "Safari on iPad first",
     "Every page works in Safari on iPad in portrait and landscape, and from phone width (390px) to desktop, "
     "with no sideways scrolling.",
     "No horizontal scroll on any page in WebKit with iPad Pro 11\" portrait and landscape profiles.",
     LIVE),
    ("req", "FR-UX-003", "Accessibility",
     "Real headings and lists; decorations hidden from screen readers; checked states and pressed filters "
     "announced; text meets contrast guidelines.",
     "VoiceOver reads a recipe in order: title, stats, tags, ingredients, directions.",
     "Deployed; to verify with VoiceOver"),
    ("req", "FR-UX-004", "Feedback when saving",
     "Saving, importing, uploading, favorites and meals show clear success and error messages; buttons are "
     "disabled while working; failed check-offs and favorites roll back with a message that disappears by itself.",
     "A refused save shows “Editing is locked on this device. Unlock it in Settings.” and keeps the draft.",
     LIVE),

    ("h1", "11. Functional acceptance test matrix"),
    ("table", [1080, 2880, 5256], [
        ["ID", "Test", "Expected result"],
        ["AT-01", "Open the sweet chili chicken", "14 ingredients in 3 groups, 4 steps with sub-steps, in handwriting"],
        ["AT-02", "Tall cover photo", "Shown whole, not cropped"],
        ["AT-03", "Library star (unlocked)", "Toggles Favorites without opening the recipe; ★ Favorites filters"],
        ["AT-04", "Library category tab", "Only that category's recipes; /category/mains leads here"],
        ["AT-05", "List | Book → Book in landscape", "Cover alone on the right; pages turn; tabs jump"],
        ["AT-06", "Write on the lines with Scribble", "Each line fills; Return moves on with the keyboard up"],
        ["AT-07", "Write two Pencil pages and save", "One handwritten page with both; recipe view shows it"],
        ["AT-08", "Type the lines", "Lines beside the handwritten page; Paste text works with Live Text"],
        ["AT-09", "Paste the banana bread card's Live Text", "10 ingredients (170 g, 6 g, 2 oz restored) and 5 steps"],
        ["AT-10", "Save from a recipe-site link", "Title, photo, ingredients and steps for review; Check this import"],
        ["AT-11", "Plan two recipes and add the week to Groceries", "Two sections, scaled; lines linked to recipes"],
        ["AT-12", "Leave Start Cooking at step 2, open Home", "Continue cooking: step 2 of N, at the same scale"],
        ["AT-13", "Airplane mode, open a recipe opened earlier", "It opens with its photo; offline note shows"],
        ["AT-14", "Airplane mode, check off groceries, reconnect", "Check-offs kept, then saved"],
        ["AT-15", "Change on the iPad with the Mac open", "The Mac's page updates within a second or two"],
        ["AT-16", "Save without the write key", "Refused; nothing changes"],
        ["AT-17", "Locked browser", "No +, Edit, star buttons or + Add; unlocking shows them"],
        ["AT-18", "Device in dark mode", "Still white and cream (light only)"],
        ["AT-19", "New Home Screen shortcut", "Whisk-and-spoon icon; name “Ramiya’s Recipes”; opens full screen"],
    ]),

    ("h1", "12. Requirements status and change control"),
    ("p", "Code written by an AI assistant does not by itself establish that a requirement is deployed or "
          "verified. Any change to the parsers, the column split, amount display or scaling must keep the shared "
          "fixtures passing (npm test), including the sweet chili chicken and the banana bread card. Any change "
          "to the write key check, the access rules or the save functions must be followed by a passing "
          "npm run check:setup against the live site."),
    ("p", "Change log, 2026-10-20 (v1.0): book page design v1 (the sweet chili chicken page)."),
    ("p", "Change log, 2026-10-24 to 27 (v1.1): database and save function; site live; redesign decided after "
          "the Deglaze app (docs/DESIGN.md); a native iPad app planned."),
    ("p", "Change log, 2026-10-28: website R1 (new look, Library, recipe view, book view), R2 (unlock, writing "
          "page, photos), R3 (Save from the web, Add from photos, Paste text), R4 (Groceries, Start Cooking, "
          "serving scaler) built and deployed."),
    ("p", "Change log, 2026-10-29 (v2.0): the iPad app (prototype in the Simulator) dropped; the website is the "
          "iPad experience. Pencil page mode with several pages; Home Screen icon and name; List | Book moved to "
          "the Library; cover photos shown whole; tags trimmed to five; Favorites as stars on Library cards; Home "
          "rebuilt (pick up, Surprise me, this week's meals with migration 002, groceries at a glance, to "
          "finish); category and Favorites filters on the Library; Type the lines for handwritten-only recipes; "
          "book cover as the icon. Built, not yet deployed: paste rules for handwritten cards, offline, live "
          "updates (migration 003), the full-screen Home Screen app. Safari on iPad made the primary browser."),
    ("p", "Change log, 2026-10-30: two books (FR-BOOKS-001, migration 004) with a write key each; Home and "
          "Groceries cached again; the menu as a top capsule or a sidebar; “Haven't made in a while” "
          "(FR-HOME-007, migration 005) and copying a recipe to the other book (FR-BOOKS-002) built. Owner "
          "decisions: no sign-in (the two write keys stay, so FR-AUTH-001/002 are dropped), and printing is not "
          "being pursued."),
    ("p", "Change log, 2026-10-30 (later): Ramiya's own handwriting font for recipe content in her book (Patrick "
          "Hand for missing characters and in Jay's book); Home compacted for iPhones; more room under the phone "
          "tab bar."),
    ("p", "Queued (not scheduled): the write keys as passphrases; Next.js 16; optionally a custom book cover."),

    ("h1", "Appendix A. Worked examples"),
    ("table", [2304, 6912], [
        ["Scenario", "Expected behavior"],
        ["No amount", "“pinch of salt”: amount and unit empty; shown as written; unchanged by scaling."],
        ["Fraction display", "“1/3” shows ⅓; “1 1/2” shows 1 ½."],
        ["Scaling", "“1/3 c” × 1.5 = “1/2 c”; “1/3” × ½ = “1/6”; “2-3” × 1.5 = “3-4 1/2”."],
        ["Paste: misread grams", "In a recipe with other gram amounts, “1709 unsalted butter” → 170 g; “3400 "
         "mashed bananas” → 340 g; “6q vanilla paste” → 6 g; “30 almonds” is left alone."],
        ["Paste: run-together line", "“20z maple syzup cream butteR 3 sugaR mash? mix in bananas mix in liguids” → "
         "“2 oz maple syzup”, then steps “cream butter 3 sugar”, “mash & mix in bananas”, “mix in liguids”; "
         "“…over low heat” is not split."],
        ["Paste: misread line", "“Bg baking soda” between two amount lines stays an ingredient (no amount)."],
        ["Paste: step start", "“cream butter & sugar” starts the steps even though it names ingredients."],
        ["Paste: capitals", "“bUtteR” → “butter”; “McCormick” kept."],
        ["Week to Groceries", "A recipe for 4 planned for 6 adds its ingredients × 1.5."],
        ["Continue cooking", "Left at step 2 at ×1.5 more than a day ago: Home shows Last opened instead."],
        ["Offline check-off", "Checked offline, page reloaded offline: still checked; sent when online."],
        ["Handwritten-only", "Pencil pages, no lines: no Start Cooking; Type the lines shown; book page shows the "
         "handwritten page."],
    ]),

    ("h1", "Appendix B. Local testing and release workflow"),
    ("p", "1. Edit the files in VS Code. Database changes are new migration files with a rollback script, tested "
          "in PGlite and run by the owner in the Supabase SQL Editor."),
    ("p", "2. Run npm run dev and test on http://localhost:3000, and on the iPad at the Mac's address on port "
          "3000. Offline and live updates only work in a production build (or the deployed site)."),
    ("p", f"3. Run npm run lint, npm test and a production build in a copy of the project (never next build "
          f"while the dev server runs); check in WebKit with an iPad profile. After backend changes, run "
          f"npm run check:setup {SITE}."),
    ("p", "4. The owner commits and pushes to GitHub (jaylouissaint/recipe-book); Vercel deploys main."),
]

# ---------------------------------------------------------------- Technical Specification

TECHNICAL = [
    ("raw", '<w:p><w:pPr><w:spacing w:before="1400"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/>'
            '<w:color w:val="2563EB"/><w:sz w:val="22"/></w:rPr><w:t>RECIPE BOOK</w:t></w:r></w:p>'),
    ("raw", '<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Technical Specification</w:t></w:r></w:p>'),
    ("raw", '<w:p><w:pPr><w:spacing w:after="560"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>' + escape(
        "Architecture of the website, data model, write path, offline and live updates, and implementation "
        "requirements") + "</w:t></w:r></w:p>"),
    ("callout", "Document status",
     f"Living specification based on the implementation and design decisions through {DATE}. It is the source "
     f"of truth (with the Functional Specification) and the engineering reference for development, testing, "
     f"deployment and maintenance."),
    ("table", [2880, 6480], [
        ["Attribute", "Specification"],
        ["Application", "Recipe Book website, used mainly in Safari on iPad from a Home Screen shortcut"],
        ["Frontend", "Next.js 15.5.28 (App Router, TypeScript), React 19.1.10, Tailwind CSS 4. Design: "
         "docs/DESIGN.md"],
        ["Backend / Database", "Supabase (PostgreSQL, Storage, Edge Functions, Realtime), project "
         "trdlqlulpfwsfhqnfqfu"],
        ["Hosting", f"Vercel, {SITE}, deploys from GitHub main"],
        ["Source control", "GitHub, jaylouissaint/recipe-book (public); local development in VS Code on macOS"],
        ["Primary authentication", "None (login queued). Writes need the write key, checked by the save-recipe "
         "Edge Function"],
        ["Primary browser", "Safari on iPad; checks run in WebKit (Playwright) with iPad profiles"],
        ["Document date", DATE],
    ]),
    ("pagebreak",),

    ("h1", "1. Purpose and Scope"),
    ("p", "The Recipe Book is a personal recipe book styled after the owner's handwritten spiral recipe book. "
          "One website reads from one Supabase database; only unlocked browsers can change it. On the iPad it "
          "is used from a Home Screen shortcut with Scribble and the Apple Pencil."),
    ("callout", "Core design principle",
     "The recipe page is the book page. Recipe content looks handwritten, printed parts look printed, and "
     "handwriting becomes text only on the iPad itself (Scribble, Live Text) or by typing. No page, drawing, "
     "photo or PDF is ever sent to an outside transcription or AI service."),
    ("h2", "1.1 Primary objectives"),
    ("bullets", [
        "Reproduce the book page's look (palette, fonts, ruled lines, stat box, tags, side tabs, stickers, spiral).",
        "Store recipes as structured data while always displaying them as written.",
        "Make writing a recipe on the iPad feel like writing in the book: Scribble on ruled lines, or free "
        "Apple Pencil writing kept as a picture.",
        "Bring recipes in from the web (published recipe data) and from photos (Live Text and rules), never AI.",
        "Plan the week, shop and cook from the same pages; keep working in a store with no signal.",
        "Keep everyone else read-only without a login, within free tiers (Supabase, Vercel, GitHub).",
    ]),
    ("h2", "1.2 Out of scope / not yet built"),
    ("p", "Out of scope by decision: native apps (an iPad app was prototyped and dropped 2026-10-29; its code is "
          "in git history at bff8a2e:ios/), AI transcription, dark mode. Queued: sign-in and family sharing, the "
          "owner's handwriting font, Next.js 16."),

    ("h1", "2. System Architecture"),
    ("table", [1872, 7488], [
        ["Layer", "Technology / Responsibility"],
        ["Pages", "Next.js App Router with React Server Components. Home, Library, Groceries, recipe and book "
         "pages are statically generated, so the router loads them ahead and tab switches are instant; they "
         "are regenerated at most every 60 seconds and at once after any change (revalidatePath: recipe saves "
         "refresh every page, grocery changes Groceries and Home, meals Home). The editor is rendered on every "
         "request."],
        ["Reads", "src/lib/supabase.ts: read-only supabase-js client (public key). src/lib/recipes.ts "
         "(listRecipes, getRecipe), groceries.ts (listGroceries), plan.ts (listMeals)."],
        ["Writes", "Server actions in src/app/actions.ts read the httpOnly write-key cookie and call the "
         "save-recipe Edge Function (src/lib/write.ts); the key never reaches page scripts. Uploads go straight "
         "from the browser to Storage with a signed URL from save-recipe."],
        ["Database", "Supabase PostgreSQL: recipe tables, grocery_items, meal_plan; RLS public read only; "
         "write functions callable only by the service role."],
        ["Edge Function", "save-recipe (Deno): checks x-write-key, then save, delete, upload-url, check, cooked, "
         "groceries-add, grocery-check, groceries-clear, plan-add, plan-remove."],
        ["Web import", "importFromWeb server action: safeFetch (http/https on 80/443, DNS checked against "
         "private addresses at every redirect, 12 s timeout, size caps, honest user agent) and schema.org "
         "Recipe JSON-LD (src/lib/schemaRecipe.ts)."],
        ["Offline", "public/sw.js service worker, registered by src/components/Offline.tsx in production "
         "(section 7)."],
        ["Live updates", "src/components/LiveUpdates.tsx: Supabase Realtime postgres_changes on recipes, "
         "grocery_items and meal_plan (migration 003) → router.refresh() (section 7)."],
        ["Storage", "Public buckets photos, originals and handwriting; uploads only by signed URL."],
        ["Upkeep", ".github/workflows/keep-supabase-awake.yml calls keep_alive() twice a week."],
    ]),

    ("h1", "3. Authentication, Authorization, and User Isolation"),
    ("table", [2160, 7200], [
        ["Control", "Requirement"],
        ["Public reads", "RLS “public read” on every table. Nothing private is stored until sign-in exists."],
        ["No direct writes", "INSERT, UPDATE, DELETE and TRUNCATE revoked from anon and authenticated; no write "
         "policies."],
        ["Write functions", "save_recipe, delete_recipe, record_cooked, add_groceries, set_grocery_checked, "
         "clear_groceries, plan_add, plan_remove: EXECUTE revoked from public, anon and authenticated; granted "
         "to service_role only."],
        ["Edge Function", "verify_jwt = false; x-write-key compared with the WRITE_KEY secret in constant time; "
         "anything else gets 401."],
        ["Website unlock", "Settings posts the key; it is checked with save-recipe (a wrong key waits 1 second) "
         "and stored in an httpOnly, SameSite=Strict cookie (Secure in production) for a year, with a readable "
         "rb_unlocked flag that only shows editing buttons. Lock editing deletes both."],
        ["Write key", "64 hex characters; Supabase secret, the owner's password manager and .env.local "
         "(git-ignored, not read by the site). Never NEXT_PUBLIC_. Rotate with npm run setup:supabase."],
        ["Realtime", "Change events are sent only to readers allowed by RLS; all three tables are public "
         "read, so events reveal nothing that isn't already public."],
    ]),
    ("callout", "Security invariant",
     "The write key is the only thing between the public and changes to the recipe book. Keep it out of every "
     "committed or shipped file, and rotate it if it is ever pasted somewhere it shouldn't be."),

    ("h1", "4. Application Modules"),
    ("table", [2448, 6912], [
        ["Module", "Primary responsibilities"],
        ["Shell", "src/app/layout.tsx (fonts, metadata, Home Screen title, Offline, LiveUpdates), AppNav (sidebar "
         "and bottom tabs), AddButton (+ and Add sheet)."],
        ["Home", "src/app/page.tsx; components/home/PickUp.tsx (continue, last opened, Surprise me), "
         "WeekPlan.tsx (days, AddMeal, week to Groceries); groceries at a glance; To finish."],
        ["Library", "src/app/library; LibraryList (search, category and ★ Favorites filters, tag filters), "
         "LibraryCard (FavoriteStar), ViewToggle (List | Book)."],
        ["Book view", "src/app/book; components/book/BookView.tsx (geometry, packing, page turn), BookBlocks.tsx; "
         "src/lib/bookLayout.ts."],
        ["Recipe view", "RecipeView (CoverPhoto, scaler, KitchenButtons, TypeTheLines, RememberRecipe)."],
        ["Writing page", "RecipeEditor (lines, PencilPage, PasteText, WebNote, OriginalPanel, HandwrittenPanel); "
         "/new, /new/web, /new/photo, /recipe/[slug]/edit (?lines=1)."],
        ["Kitchen", "kitchen/GrocerySheet (shared by recipe and week), GroceryList (offline check-off queue), "
         "CookMode (/recipe/[slug]/cook?scale=&step=), Scale."],
        ["Settings", "/settings: Unlock / Lock editing."],
    ]),

    ("h1", "5. Core Data Model"),
    ("table", [2520, 6840], [
        ["Table", "Purpose / key relationship"],
        ["recipes", "id uuid, slug unique, title, servings, prep_min, cook_min, category, tags text[] "
         "(family-favorite marks a favorite), notes, source (typed | scribble | pencil | scan | upload), "
         "original_file_path, handwriting_path, photo_path, author, source_name, source_url, description, "
         "times_cooked, imported, search tsvector, created_at, updated_at, deleted_at (soft delete)."],
        ["ingredient_groups / ingredients", "Groups by position; ingredients keep quantity as written, unit, item."],
        ["step_groups / steps", "▷ steps and their “–” sub-steps by position."],
        ["grocery_items", "id, text, recipe_id → recipes (on delete set null), checked, position, created_at."],
        ["meal_plan", "id, day date, recipe_id → recipes (on delete cascade), note, servings (1–100 or null for "
         "the recipe's own), position, created_at; a row needs a recipe or a note. plan_add also clears days "
         "more than 31 days old."],
    ]),
    ("p", "Migrations: 000_initial_schema (run 2026-10-24), 001_redesign_fields_and_groceries (run 2026-10-28), "
          "002_meal_plan (run 2026-10-29), 003_live_updates (adds recipes, grocery_items and meal_plan to the "
          "supabase_realtime publication; to run). Each has a rollback and was tested in PGlite first."),
    ("h2", "5.1 save_recipe(payload)"),
    ("p", "Takes the whole recipe as camelCase JSON, upserts it and replaces its groups and steps in one "
          "transaction (a failed save changes nothing), rebuilds search, clears deleted_at. Slugs are kept on "
          "update; clashes get the first 8 characters of the id. Favorites, cover photos and Mark as cooked go "
          "through the same path (favorites by saving the recipe with the tag toggled)."),

    ("h1", "6. Parsing and layout rules"),
    ("table", [3024, 6336], [
        ["Module", "Rule"],
        ["src/lib/parse.ts", "parseIngredientLine: amount (whole, fraction, mixed, ½-style, range, decimal), a "
         "known unit only if case matches (T/TB/Tbsp tablespoons, t/tsp teaspoons), the rest is the item."],
        ["src/lib/pasteText.ts", "parseRecipeText: headings, stat box and tag lines (all printed book labels, "
         "BOOK_TAG_LABELS), section names, step marks, wrapped lines; tidyHandwriting (stray capitals, “0z”, "
         "lone “?”, “6q”, “20z”); splitRunTogether (long comma-free lines split before a cooking verb); joining a "
         "word cut across lines; without headings, the tolerant ingredient block (amount within two lines, ingredient-like "
         "lines, STEP_START ends it); fixMisreadGrams."],
        ["src/lib/scale.ts", "readAmount / writeAmount / scaleQuantity with kitchen fractions to 1/8 (and 1/6)."],
        ["src/lib/cook.ts", "ingredientsForStep: named sections first, then keyword matches, deduped."],
        ["src/lib/bookLayout.ts", "Blocks measured in lines and packed onto fixed pages; continued pages; "
         "contents; handwriting block for handwritten-only recipes."],
        ["Tests", "node:test (npm test, 32 tests) with shared/fixtures/ingredient-lines.json and "
         "pasted-recipes.json (book page, a recipe site, no headings, the banana bread card as Apple's text "
         "recognition and as the owner's Live Text read it)."],
    ]),

    ("h1", "7. Offline and live updates"),
    ("h2", "7.1 Service worker (public/sw.js)"),
    ("bullets", [
        "Pages (navigations): network first with a 5 s limit, saved to pages-v1; offline, the saved copy (by "
        "address, then by path ignoring ?query), else a built-in offline page.",
        "The site's files (/_next/static, icons, fonts): saved once in files-v1 (names change with each deploy).",
        "Pictures (Supabase Storage public objects): refetched in CORS mode so copies aren't opaque; shown from "
        "pictures-v1 and refreshed in the background; at most 300 kept.",
        "Not handled: writes, and the router's own data requests (RSC); when those fail offline, Next.js loads "
        "the page instead, which the service worker serves from the saved copy.",
        "Registered in production only. Bump VERSION in sw.js to drop old saved copies.",
        "Safari keeps a website's saved data while the site is used at least every few weeks; data for a "
        "Home Screen web app is kept separately (section 8).",
    ]),
    ("h2", "7.2 Grocery check-offs offline"),
    ("p", "GroceryList keeps check-offs that can't be saved in localStorage (rb-grocery-pending, id → checked), "
          "shows them over the server's list, and sends them when the connection returns; a refused one shows "
          "its message and is dropped."),
    ("h2", "7.3 Live updates"),
    ("p", "LiveUpdates subscribes one Realtime channel to all changes on recipes, grocery_items and meal_plan "
          "and calls router.refresh() (debounced 400 ms); it also refreshes on visibilitychange to visible and "
          "on the online event. Server writes call revalidatePath, so the refreshed data is current. Without "
          "migration 003 the channel connects but receives nothing; refresh on coming back still works."),

    ("h1", "8. Home Screen app"),
    ("p", "src/app/manifest.ts sets display: standalone (id, start_url and scope /), and layout.tsx sets "
          "appleWebApp (title “Ramiya’s Recipes”, capable, status bar default, which keeps the page below the "
          "status bar); the icon is src/app/apple-icon.png. The shortcut opens as a full-screen app: no address "
          "bar or Safari back/forward/share buttons (the site's tabs, back buttons, share menu and Start "
          "Cooking's × remain; the writing page's Cancel falls back to the recipe or the Library when history "
          "is empty), its own app switcher entry, and its own storage apart from Safari (its own Unlock editing "
          "cookie and offline copies, which iPadOS keeps for Home Screen apps). Links to other websites open "
          "outside it. An existing shortcut must be removed and added again to open full screen."),

    ("h1", "9. Code Organization"),
    ("table", [3024, 6336], [
        ["Path", "Responsibility"],
        ["src/app/", "Pages: /, /library, /book, /recipe/[slug] (and /cook, /edit), /new (/web, /photo), "
         "/groceries, /settings, /category/[slug] (redirect); actions.ts; manifest.ts; icon.svg, apple-icon.png."],
        ["src/components/", "Shell, Library, book/, home/, kitchen/, RecipeView, RecipeEditor, PencilPage, "
         "FavoriteStar, Offline, LiveUpdates, Stickers (incl. SpoonAndWhisk)."],
        ["src/lib/", "types, book (TAGS, FAVORITE, BOOK_TAG_LABELS, CATEGORIES), recipes, groceries, plan, "
         "remember, parse, pasteText, schemaRecipe, safeFetch, scale, cook, bookLayout, write, storage."],
        ["public/", "sw.js (offline), icon-192.png and icon-512.png (manifest)."],
        ["shared/fixtures/", "Parser test cases."],
        ["supabase/migrations/", "000–003 with _rollback.sql files."],
        ["supabase/functions/save-recipe/", "The write path."],
        ["scripts/", "setup-supabase.sh, check-setup.sh, specs/ (these documents)."],
        ["docs/", "DESIGN.md, PLAN.md, HANDOFF.md, reference photo."],
    ]),

    ("h1", "10. Non-Functional Requirements"),
    ("table", [2088, 7272], [
        ["Area", "Requirement"],
        ["Privacy", "No outside AI or transcription service; files go only to the project's Supabase Storage."],
        ["Security", "Public access is read-only at three levels (RLS, revoked privileges, function grants); "
         "the write key stays in an httpOnly cookie and the Supabase secret store."],
        ["Browser", "Safari on iPad first; guard newer APIs (getCoalescedEvents, Wake Lock); focus changes "
         "happen during the key press so the iPad keyboard stays up; no Safari text selection on the Pencil page."],
        ["Offline", "Opened pages and pictures work without a connection; grocery check-offs queue."],
        ["Freshness", "Other open devices update within about a second of a change (with migration 003)."],
        ["Availability", "Keep-awake workflow prevents the free Supabase project pausing."],
        ["Responsiveness", "No horizontal scroll from 390px up, in iPad portrait and landscape."],
        ["Theming", "Light only."],
        ["Cost", "Free tiers only."],
    ]),

    ("h1", "11. Acceptance Test Matrix"),
    ("table", [3168, 6192], [
        ["Scenario", "Expected result"],
        ["npm run lint, npm test, production build", "No errors; 32 tests pass. Passed 2026-10-29."],
        ["Migrations 000–003 in PGlite", "Rules, permissions, cleanup and rollbacks. Passed 2026-10-29."],
        ["check-setup", "Public key reads; writes and uploads refused; save-recipe 401 without the key. Passed "
         "2026-10-27."],
        ["WebKit, iPad Pro 11\" portrait and landscape", "Every page loads without errors or sideways scroll; book "
         "turns; Enter moves lines; Pencil pages draw; Home sections; Library filters; Type the lines; live "
         "updates connect. Passed 2026-10-29."],
        ["Offline (Chrome, server stopped)", "Opened recipe and pictures load; unopened page shows the offline "
         "page; check-off survives reload and waits. Passed 2026-10-29."],
        ["Owner on the iPad", "Pencil feel, Scribble, offline in a store, live updates between devices. Pending."],
    ]),

    ("h1", "12. Build Order"),
    ("bullets", [
        "Step 1 – Skeleton (Supabase, RLS, save-recipe, Vercel). Done 2026-10-27.",
        "R1–R4 – New look, writing page, imports, groceries and cooking. Done 2026-10-28.",
        "2026-10-29 – Pencil page mode, Home rebuilt with the week plan, Library filters, favorites, icon. Deployed.",
        "R5 – Offline, live updates and the full-screen Home Screen app (built 2026-10-29); print check.",
    ]),

    ("h1", "13. Planned / Recommended Enhancements"),
    ("bullets", [
        "Queued – Sign-in (Supabase Auth, owner-only RLS) replacing the write key; family sharing.",
        "Queued – The owner's handwriting font (iFontMaker or Calligraphr), with Patrick Hand as fallback.",
        "Queued – Write key as a passphrase (no code change).",
        "Queued – Next.js 16 upgrade.",
        "Recommended – Save every recipe for offline in one go (today only opened pages are kept).",
    ]),

    ("h1", "Appendix A. Key Business Rules"),
    ("table", [2376, 6984], [
        ["Rule", "Definition"],
        ["Content vs labels", "What the cook wrote uses the handwriting font and ink; printed parts use labels."],
        ["Amounts as written", "Stored as written; shown with fraction characters; parsed only for scaling."],
        ["Favorite", "The family-favorite tag, set with the Library star."],
        ["Handwritten-only", "No typed lines: no scaler, Groceries or Start Cooking until lines are typed."],
        ["Whole-recipe saves", "A save replaces the recipe and all its parts in one transaction."],
        ["Soft delete", "Deleting sets deleted_at; hidden everywhere; saving again restores."],
        ["No AI service", "Handwriting becomes text only on the iPad or by typing."],
        ["Write key", "Required for every change; kept per unlocked browser."],
    ]),

    ("h1", "Appendix B. Repository / Deployment Workflow"),
    ("bullets", [
        "Update code in /Users/louis/Desktop/Misc/recipe_book; database changes as numbered migrations with "
        "rollbacks, tested in PGlite, run by the owner in the Supabase SQL Editor.",
        "Test: npm run dev on localhost:3000; npm run lint; npm test; a production build in a copy of the "
        "project (never next build while the dev server runs); WebKit with iPad profiles.",
        f"After database or function changes: npm run deploy:functions and npm run check:setup {SITE}.",
        "Deploy: the owner commits and pushes to main; Vercel deploys. AI agents change local files only.",
        "Environment: Vercel and .env.local hold the public Supabase URL and key; Supabase secrets hold WRITE_KEY.",
        "Specifications: edit scripts/specs/spec_content.py, then python3 scripts/specs/build_specs.py.",
    ]),
]
