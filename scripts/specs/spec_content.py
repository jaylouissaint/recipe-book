"""Text of the Recipe Book Functional and Technical Specifications (built by build_specs.py).

Block types: ("h1", text) ("h2", text) ("p", text) ("bullets", [text, ...])
("req", id, title, body, acceptance, verification status) ("table", [col widths], rows)
("callout", title, text) ("pagebreak",) ("raw", xml)
"""
from xml.sax.saxutils import escape

VERSION = "1.1"
DATE = "October 27, 2026"
DOC_TIMESTAMP = "2026-10-27T12:00:00Z"
SITE = "https://ramiyas-recipes.vercel.app"

FUNCTIONAL_FOOTER = f"Recipe Book  |  Functional Specification  |  Draft v{VERSION}"
TECHNICAL_FOOTER = "Recipe Book - Technical Specification"

DEPLOYED = (
    f"Deployed 2026-10-27 at {SITE} (commit f5b036c); compared with the reference photo in "
    "headless Chrome; owner verification pending"
)
CHECKED = "Deployed and verified 2026-10-27 by scripts/check-setup.sh against the live site (all checks pass)"


def web(step):
    return f"Planned (website build-order step {step}); to verify"


def app(phase):
    return f"Planned (iPad app Phase {phase}); to verify"


def both(step, phase):
    return f"Planned (website step {step}; iPad app Phase {phase}); to verify"


# ---------------------------------------------------------------- Functional Specification

FUNCTIONAL = [
    ("raw", '<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:t>RECIPE BOOK</w:t></w:r></w:p>'),
    ("raw", '<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Functional Specification</w:t></w:r></w:p>'),
    ("p", "User-facing requirements for the iPad app and website: recipe page layout, ways to add recipes, "
          "and acceptance criteria"),
    ("p", f"Version {VERSION}  |  {DATE}  |  Document status: Living specification (source of truth)"),
    ("table", [2448, 6768], [
        ["Document control", "Value"],
        ["Application", "Recipe Book: a native iPad app (installed with SideStore) and a website "
         f"({SITE}), sharing one database"],
        ["Companion document", "Recipe Book Technical Specification"],
        ["Functional scope", "Home book shelf, Library, Recipe view, Book page (writing page), Add a recipe "
         "(from the web, from photos, enter your own), Search and tag filters, Groceries, Start Cooking, "
         "Serving scaler, iPad app install and refresh, Print, Website Home Screen install and offline"],
        ["Requirement states", "Specified / Implemented (reported) / Deployed / Verification pending / "
         "Planned / Queued"],
    ]),

    ("h1", "1. Purpose and document conventions"),
    ("p", "This document defines the expected user experience and behavior of the Recipe Book: a personal "
          "recipe book styled after the owner's handwritten spiral recipe book. It has two parts that share "
          "one database: a native iPad app, which is the main way to add and cook from recipes, and a "
          "website for family, other devices, and as a fallback. It is intended to guide implementation, "
          "regression testing, and change review. The Technical Specification remains the reference for "
          "Next.js, SwiftUI, Supabase, the data model, and deployment. The reference photo of the book page "
          "is docs/reference/recipe-book-page.jpg; the plans are docs/PLAN.md (website) and "
          "docs/APP_PLAN.md (iPad app)."),
    ("p", "A requirement in this document is an expected outcome, not proof that the deployed application "
          "currently meets it. Items that were discussed or coded but not verified by the owner are explicitly "
          "identified. Planned requirements belong to a later website build step or iPad app phase; Queued "
          "requirements are agreed but not scheduled. The look and screens of both the website and the app "
          "follow docs/DESIGN.md (decided 2026-10-27, modeled on the Deglaze app)."),

    ("h1", "2. Users, access and navigation"),
    ("req", "FR-ACCESS-001", "Anyone can read; only the owner's devices can save",
     "There is no login (deferred and on the docket). Every recipe can be read by anyone with the link. "
     "Saving, deleting, uploading and changing the grocery list require a private write key. The owner "
     "enters it once in the iPad app's Settings (kept in the iPad's secure storage) and once per browser in "
     "the website's Settings (Unlock editing, kept in a secure cookie for a year; Lock editing removes it). "
     "Editing buttons only appear on unlocked devices. Login (FR-AUTH-001) will replace the write key.",
     "A request to save, delete or upload without the write key is refused and changes nothing; the same "
     "request with the write key succeeds; a locked browser shows no editing buttons.",
     CHECKED + " for the save function; website unlock planned (website step R2), app planned (Phase 2)"),
    ("req", "FR-NAV-001", "Category tabs",
     "Colored tabs match the side tabs of the book: Mains (mustard), Sides (orange), Desserts (dusty pink) "
     "and More Recipes (slate blue). On the recipe page they hang off the page's right edge as vertical tabs "
     "on screens 768px and wider, and become a horizontal strip above the page on phones. The cover always "
     "shows the horizontal strip. The current recipe's category tab sticks out further than the others.",
     "Selecting a tab opens /category/<slug> and lists only that category's recipes; an unknown category "
     "address shows the not-found page.",
     DEPLOYED + "; the tabs move to the Home book shelf (FR-HOME-001) in website step R1"),
    ("req", "FR-NAV-002", "Cover and recipe grid",
     "The home page is the book cover: a raspberry header with a thin white inner border and the word "
     "“recipes”, the category strip, and a grid of page-style recipe cards. Each card shows “recipe:” with "
     "the title in handwriting, a teal asterisk for family favorites, servings, total time, and the checked "
     "tags. Selecting a card opens the recipe page.",
     "The sweet chili chicken card reads “Serves 4 · 60 min” and “Family Favorite”, shows the asterisk, and "
     "opens /recipe/sweet-chili-chicken.",
     DEPLOYED + "; replaced by the Library (FR-LIB-001) in website step R1"),
    ("req", "FR-NAV-003", "Recipe web addresses",
     "Each recipe has a readable address made from its title, such as /recipe/sweet-chili-chicken. Editing "
     "the title keeps the same address, so saved links keep working. If two recipes have the same title, the "
     "second gets a short code added to its address.",
     "Renaming a recipe keeps its address; a second “sweet chili chicken” gets an address like "
     "/recipe/sweet-chili-chicken-1a2b3c4d.",
     "Implemented 2026-10-24 in the database (tested in a local Postgres); deployed 2026-10-27"),
    ("req", "FR-DATA-001", "Changes show up everywhere",
     "A recipe saved or deleted on the iPad appears on (or disappears from) the website within about a "
     "minute, without a redeploy. Deleted recipes are hidden from the website and removed from the app the "
     "next time it syncs.",
     "A deleted recipe's page shows not-found within about a minute.",
     "Website side deployed and verified 2026-10-27 (scripts/check-setup.sh saves and deletes a test recipe, "
     "and the live site hides it); to verify with the first save from the app"),

    ("h1", "3. Cross-application recipe rules"),
    ("table", [2592, 6624], [
        ["Metric", "Definition / rule"],
        ["Recipe content", "Anything the cook wrote (title, amounts, ingredients, steps, notes, stat values). "
         "Always shown in the handwriting font in plum ink."],
        ["Printed labels", "Anything printed on the book's blank page (INGREDIENTS, DIRECTIONS, stat box "
         "headers, tag names, “recipe:”). Shown in small gray letter-spaced capitals, or the gray serif for "
         "“recipe:”."],
        ["Ingredient group", "A named set of ingredients such as “marinade” or “coconut lime drizzle”. A group "
         "with no name holds loose items such as “2 c cooked rice”."],
        ["Step and sub-step", "A step is a ▷ line (“cook chicken”); sub-steps are the indented “–” lines under it."],
        ["Favorite", "A recipe with the Family Favorite tag checked. Marked with a teal asterisk."],
        ["Total time", "Prep minutes plus cook minutes. A missing value counts as zero; if both are missing "
         "no time is shown."],
        ["Amount as written", "Amounts are kept exactly as the cook wrote them (“1/3”, “1 1/2”, or nothing "
         "for “pinch of salt”). The common fractions 1/2, 1/3, 2/3, 1/4 and 3/4 are displayed as ½ ⅓ ⅔ ¼ ¾. "
         "A parsed number is used only for scaling and is never shown instead of what was written."],
        ["Ruled line", "Every line of recipe content sits on a ruled line, including the second line of a "
         "step that wraps."],
        ["Original card", "The scan, photo or PDF a recipe was transcribed from. Kept with the recipe and "
         "never changed."],
        ["Handwritten page", "The Apple Pencil drawing a recipe was written on in the app. Kept with the "
         "recipe and viewable next to the typed page."],
        ["Write key", "The private key that allows saving. Only the owner's iPad has it; everyone else can "
         "only read."],
        ["Deleted recipe", "Hidden everywhere but kept in the database marked as deleted, so every device "
         "learns about the delete. Saving it again restores it."],
        ["Imported recipe", "A recipe brought in from a link or a photo. It shows a “Check this import” note "
         "until it has been edited and saved once."],
        ["Times cooked", "Goes up by one when Start Cooking reaches the last step, or from the recipe menu."],
        ["Light only", "White and cream backgrounds everywhere; there is no dark mode."],
    ]),
    ("req", "FR-RULE-001", "No outside AI service",
     "Handwriting becomes text only through features built into the iPad (Scribble, Live Text and Apple's "
     "on-device text recognition) or by typing. Neither the app nor the website sends recipe pages, "
     "drawings, photos, or PDFs to an outside transcription or AI service.",
     "A review of the code and network requests shows no calls to a transcription or AI service.",
     "Specified; to verify at each release"),

    ("h1", "4. Book page (writing page and handwritten view)"),
    ("p", "The book page reproduces the spiral book page from the reference photo. Today it is the website's "
          "reading page (deployed). With the redesign it becomes the writing page (section 7) and the View "
          "handwritten page screen, and reading moves to the recipe view (FR-VIEW-001)."),
    ("req", "FR-PAGE-001", "Title row and stat box",
     "The page opens with the gray serif “recipe:” label, the title in handwriting (wrapping onto a second "
     "line if needed), and a teal asterisk for favorites. A three-cell box shows Servings, Prep time and Cook "
     "time under a mauve header strip, with the values in handwriting (“4”, “45 min”, “15 min”). On wide "
     "screens the box sits at the top right; on phones it sits under the title.",
     "The sweet chili chicken page shows the same title, asterisk and stat values as the reference photo.",
     DEPLOYED),
    ("req", "FR-PAGE-002", "Tag checkboxes",
     "All sixteen tags from the book are shown in the book's order as small circle checkboxes: Quick & "
     "Easy, Slow Cooker, One Pot/Pan, Kid Chef Friendly, Everyday, Make Ahead, Pressure Cooker, Air Fryer, "
     "Family Favorite, Special Occasion, Veg, Vegan, Gluten Free, Dairy Free, Nut Free, Kosher. A checked tag "
     "gets a hand-drawn ✗ and its name turns plum.",
     "Only Family Favorite is checked on the sweet chili chicken page; a screen reader announces it as checked.",
     DEPLOYED),
    ("req", "FR-PAGE-003", "Ingredients in two balanced columns",
     "Ingredients are listed by group. On screens 768px and wider, whole groups fill the left column until it "
     "holds about half of the lines, and the rest go to the right column; a group is never split across "
     "columns. A group's name sits right-aligned on its own line above its items, and a blank line separates "
     "groups in the same column. Both columns are padded with empty ruled lines to the same height, plus one "
     "spare line. On phones the columns stack and the padding lines are dropped.",
     "Sweet chili chicken: marinade (7 items) on the left; coconut lime drizzle (6 items), a blank line, and "
     "“2 c cooked rice” on the right; both columns end on the same ruled line.",
     DEPLOYED),
    ("req", "FR-PAGE-004", "Directions",
     "Directions are listed under DIRECTIONS on continuous ruled paper. Each step starts with ▷; its "
     "sub-steps are indented and start with “–”. Long lines wrap onto the next rule, with the wrapped text "
     "lined up under the text rather than under the dash.",
     "All four sweet chili chicken steps and their eight sub-steps appear in the photo's order, and every "
     "line of text sits on a rule.",
     DEPLOYED),
    ("req", "FR-PAGE-005", "Book decorations",
     "On screens 768px and wider the page shows a spiral binding down the left edge and stickers in empty "
     "space: a rolling pin beside INGREDIENTS, a whisk and spoon beside DIRECTIONS, and a plate setting at "
     "the right. Decorations are hidden on phones, are skipped by screen readers, and are not printed.",
     "Decorations never cover recipe text at any screen width.",
     DEPLOYED),
    ("req", "FR-PAGE-006", "Light only",
     "Backgrounds are white and cream on every screen of the website and app. There is no dark mode: pages "
     "look the same whatever the device's dark mode setting.",
     "With the device in dark mode, every screen still shows white and cream backgrounds and dark text.",
     "Decided 2026-10-27; the website still follows the device's dark mode until website step R1"),
    ("req", "FR-PAGE-007", "View original card and handwritten page",
     "A recipe that came from a scan, photo or PDF has a View original card toggle; one written with the "
     "Apple Pencil has a View handwritten page toggle. Each shows the original beside, or in place of, the "
     "typed page, on both the website and the app.",
     "Toggling shows the original and toggling again returns to the page without reloading.",
     "Planned (iPad app Phases 3–4; website polish); to verify"),

    ("h1", "5. Home, library and recipe view"),
    ("p", "Screens follow docs/DESIGN.md: white and cream, Deglaze green (#1F4D3D) for buttons and the + "
          "button, Instrument Serif page titles, Figtree for the interface, and recipe content in handwriting "
          "(Patrick Hand) in plum ink. Phones and iPads in portrait get a bottom tab bar (Home, Library, "
          "Groceries, Settings); iPads in landscape and desktops get the same as a left sidebar."),
    ("req", "FR-HOME-001", "Home: the book shelf",
     "Home shows the book's categories as large colored tabs (Mains, Sides, Desserts, More Recipes), then "
     "rows of Family Favorites and Recently added recipes.",
     "Selecting the Mains tab lists only main dishes; the sweet chili chicken appears under Family Favorites.",
     both("R1", 2)),
    ("req", "FR-LIB-001", "Library",
     "Library (“My Recipes”) lists every recipe as a white rounded card with a photo thumbnail (the photo, "
     "else the handwritten page, else the original card, else a cream placeholder with the first letter), "
     "a source line with an icon (website name, “From a photo”, “Written by hand”, or the cookbook), the "
     "title in handwriting, “by Author” when known, and the times-cooked count. A search pill and a filter "
     "button (categories and tags) sit above the list. Two columns on iPad, three on desktop.",
     "Searching “lime” leaves only recipes with lime; filtering by Family Favorite leaves only favorites.",
     both("R1 (search in R4)", 2)),
    ("req", "FR-LIB-002", "Add a recipe",
     "A floating green + button opens a sheet with three choices: Save a recipe from the web (FR-WEB-001), "
     "Add from recipe photos (FR-UP-001), and Enter your own recipe (the writing page, section 7). It only "
     "appears on unlocked devices.",
     "Each choice opens its screen; on a locked browser the + button is not shown.",
     both("R2–R3", "3–4")),
    ("req", "FR-VIEW-001", "Recipe view",
     "The recipe view follows the video's layout in handwriting on cream: back, share and menu at the top; "
     "the photo in a rounded container (a carousel when there is also a handwritten page or original card); "
     "the title in large handwriting; “by Author” and “from Source” links; servings, prep and cook; tags; "
     "Ingredients with group names as small headings and items in handwriting; numbered Directions with "
     "“–” sub-steps; Notes. “Add to Groceries” (outlined) and “Start Cooking” (filled green) stay at the "
     "bottom. On wide screens ingredients and directions sit side by side. The menu offers Edit, View "
     "handwritten page or View original card, and Delete.",
     "The sweet chili chicken shows all 14 ingredients in their 3 groups and all 4 steps with their sub-steps, "
     "in handwriting, with both buttons visible while scrolling.",
     both("R1", 2)),
    ("req", "FR-VIEW-002", "Check this import",
     "Recipes imported from a link or a photo show a muted “Check this import” note under the title until "
     "they are edited and saved once.",
     "An imported recipe shows the note; after one edit and save it no longer does.",
     both("R3", 4)),

    ("h1", "6. iPad app"),
    ("req", "FR-APP-001", "Install once, refresh automatically",
     "The app is installed on the owner's iPad with SideStore using a free Apple ID; there is no App Store "
     "listing and no paid developer account. Apps installed this way stop opening after 7 days unless "
     "refreshed, so a daily Shortcuts automation (and a second one when the iPad starts charging) refreshes "
     "it on the iPad. After the one-time setup with the Mac, the iPad never needs to be plugged in.",
     "The app still opens 10 or more days after installation without a cable, and SideStore shows the "
     "expiry date moving forward each day.",
     app(0)),
    ("req", "FR-APP-002", "A full recipe book",
     "The app is the whole recipe book, not only a writing tool: the cover with category tabs, the recipe "
     "grid, recipe pages matching the book (section 4), writing, scanning, search, cook mode and the serving "
     "scaler. It works in portrait and landscape, and in Split View and Slide Over.",
     "Every recipe on the website can be opened in the app and looks the same.",
     app(2)),
    ("req", "FR-APP-003", "Works offline",
     "All recipes are stored on the iPad and sync with the shared database whenever there is a connection. "
     "Recipes written or edited offline are saved on the iPad and sent when the connection returns. If the "
     "app stops opening because a refresh was missed, nothing is lost; the website still shows every recipe.",
     "In airplane mode, every recipe opens and a new recipe can be written; it appears on the website after "
     "the iPad reconnects.",
     app(2)),
    ("req", "FR-APP-004", "Write key and sync status",
     "A Settings screen lets the owner enter the write key once (stored in the iPad's secure storage, never "
     "shown again in full) and shows when the app last synced and when it was last refreshed.",
     "With a wrong write key, saving shows a clear message and keeps the recipe on the iPad for a later retry.",
     app(2)),
    ("req", "FR-APP-005", "Updates without a computer",
     "New app versions are built automatically when the owner publishes a release on GitHub, and SideStore "
     "offers the update on the iPad, to install with one tap.",
     "After a new release, SideStore shows the update and installing it keeps all recipes.",
     app(6)),

    ("h1", "7. Adding a recipe: the writing page (website and iPad app)"),
    ("p", "“Enter your own recipe” and Edit open the writing page: a blank book page like the sweet chili "
          "chicken photo (section 4), with Cancel and Save at the bottom and a button to add the recipe's "
          "photo. On the website and in the app, the cook writes on the ruled lines with Scribble (it works in "
          "Safari on iPad too) or types. The app adds page mode: writing anywhere with the Apple Pencil."),
    ("req", "FR-WRITE-001", "One field per ruled line",
     "Each ruled line is its own text field, at least 48pt tall and the full width of the line, shown in the "
     "handwriting font and plum ink so recognized text looks like it belongs on the page.",
     "Writing with Scribble directly over any line fills that line and no other.",
     both("R2", 3)),
    ("req", "FR-WRITE-002", "Always a next line",
     "When a line gets text, a new empty line appears below it, so there is always somewhere to write next.",
     "After filling the last empty ingredient or direction line, a new empty line is present.",
     both("R2", 3)),
    ("req", "FR-WRITE-003", "Ingredient lines split into amount, unit and item",
     "When the cook finishes an ingredient line, a rule-based parser splits it into amount, unit and item. "
     "It understands whole numbers, fractions, mixed numbers and ½-style characters, and common units: c, "
     "cup, TB, tbsp, tsp, lb, lbs, oz, g, clove, pinch. The line still shows exactly as written.",
     "“1/3 c sweet chili sauce” becomes 1/3 | c | sweet chili sauce; “pinch of salt” keeps the whole line as "
     "the item with no amount.",
     both("R2", 3)),
    ("req", "FR-WRITE-004", "Groups, steps and sub-steps",
     "A “+ add a section” line starts a new named ingredient group. In directions, a new line is a ▷ step; "
     "an indent button, or starting the line with “-”, makes it a sub-step of the step above.",
     "Entering the sweet chili chicken recipe produces the same groups, steps and sub-steps as FR-PAGE-003 "
     "and FR-PAGE-004.",
     both("R2", 3)),
    ("req", "FR-WRITE-005", "Stat box and tags",
     "Servings, prep and cook minutes are number fields that open the number keypad; Scribble also works on "
     "them. Tags are toggled by tapping their checkboxes.",
     "Non-numeric input in a stat field is refused with a visible message.",
     both("R2", 3)),
    ("req", "FR-WRITE-006", "Drafts are never lost",
     "The draft is saved on the device after every change.",
     "Reloading the website or force-quitting the app mid-recipe restores every line entered so far.",
     both("R2", 3)),
    ("req", "FR-WRITE-007", "Scribble tips",
     "A one-time hint card explains how to turn on Scribble (Settings → Apple Pencil → Scribble), scratch "
     "out to delete, circle to select, and tap with a finger to type instead.",
     "The hint card appears on first use only and can be reopened.",
     both("R2", 3)),
    ("req", "FR-WRITE-008", "Write anywhere on the page",
     "In page mode the cook writes freely with the Apple Pencil, like writing in the book. The drawing is "
     "kept as the recipe's handwritten page, and on-device text recognition turns it into text for the cook "
     "to check line by line before saving.",
     "Writing the sweet chili chicken recipe in page mode gives the same groups and steps after review, and "
     "the handwritten page opens from the recipe.",
     app(3)),

    ("h1", "8. Adding a recipe: from the web and from photos"),
    ("req", "FR-WEB-001", "Save a recipe from the web",
     "The cook pastes a link to a recipe page. The site reads the recipe data that recipe websites publish "
     "for search engines (schema.org): title, photo, author, site name, servings, times, ingredients and "
     "steps. No AI is involved. The result opens in the writing page for review; nothing is saved until the "
     "cook saves. If the page publishes no recipe data, the writing page opens with the link and page title "
     "filled in. The app uses the same importer as the website.",
     "A link to a recipe on a major recipe site fills the title, ingredients and steps; a link to a page "
     "without recipe data opens the writing page with only the link and title.",
     both("R3", 4)),
    ("req", "FR-UP-001", "Scan a page or import a file",
     "The cook can scan a page with the iPad's document scanner (which finds the page edges and flattens it), "
     "or import a photo or a PDF, for example a GoodNotes or Notability export, an Apple Notes page, or a "
     "card from the spiral book. The file is kept as the recipe's original card.",
     "After saving, the original card opens from the recipe on the iPad and on the website (FR-PAGE-007). "
     "On the website, upload works from any browser; scanning with the document scanner is app only.",
     both("R3", 4)),
    ("req", "FR-UP-002", "Original beside the writing page",
     "The scan or file shows on one side, with pinch-to-zoom and page arrows, and the write page on the "
     "other, so the cook can check or copy it line by line.",
     "On an iPad in landscape both halves are usable without scrolling sideways.",
     both("R3", 4)),
    ("req", "FR-UP-003", "Text from the scan",
     "In the app, on-device text recognition reads the scan, photo or PDF (or uses a PDF's existing text, as "
     "GoodNotes and Notability exports can have), and the paste rules (section 9) turn it into a recipe for "
     "review. On the website, a Paste text box next to the original takes text copied with iPad Live Text.",
     "Recognized text always opens for review and is never saved directly.",
     both("R3", 4)),

    ("h1", "9. Adding a recipe: paste a recipe"),
    ("req", "FR-PASTE-001", "Turn text into a recipe",
     "Text from a scan, from the handwritten page, or pasted from iPad Live Text (press and hold, Select All, "
     "Copy) is split with simple rules: the first line is the title; lines after “ingredients” are "
     "ingredients and lines after “directions”, “instructions” or “method” are steps; lines starting with an "
     "amount are ingredients; lines starting with ▷, >, a number or a bullet start a step; lines starting "
     "with “-” are sub-steps; short lines with no amount in the ingredient area are group names; anything "
     "unclear goes into Notes.",
     "The text of the reference photo gives the title, 2 ingredient groups (marinade with 7 items, drizzle "
     "with 6), and 4 direction groups with their sub-steps.",
     both("R3", 4)),
    ("req", "FR-PASTE-002", "Review before saving",
     "The parsed result always opens in the write page for review, next to the original if there is one. "
     "Nothing is saved until the cook saves it.",
     "Leaving the review without saving creates no recipe.",
     both("R3", 4)),

    ("h1", "10. Browsing and search"),
    ("req", "FR-SRCH-001", "Search",
     "Search finds recipes by title, ingredient or tag, on the website and in the app (the app searches its "
     "offline copy).",
     "Searching “lime” finds sweet chili chicken; searching a word in no recipe shows “no recipes here yet”.",
     "Planned (website step R4; iPad app Phase 5); the database search index exists since 2026-10-24"),
    ("req", "FR-SRCH-002", "Tag filters",
     "The tag checkbox row doubles as a filter on the cover and category pages: checking tags shows only "
     "recipes that have all checked tags.",
     "Checking Family Favorite and Vegan shows only recipes with both tags.",
     both("R4", 5)),

    ("h1", "11. Groceries, cooking and printing"),
    ("req", "FR-GROC-001", "Groceries",
     "One shared grocery list, not sorted by aisle or date. “Add to Groceries” on a recipe adds its "
     "ingredients at the current serving size, each showing the recipe's small thumbnail; + adds an item by "
     "hand. Items are checked off with a tap; “Clear checked” and “Clear all” empty the list. An optional "
     "Group by recipe switch groups items under their recipe. The list is the same on the website and in the app.",
     "Adding the sweet chili chicken at 8 servings adds 14 items with doubled amounts; checking one off on "
     "the iPad shows it checked on the website.",
     both("R4", 5)),
    ("req", "FR-COOK-001", "Start Cooking",
     "Start Cooking shows one step at a time in large handwriting, with that step's ingredients above it. "
     "Tap or swipe moves to the next step, steps can be checked off, and the screen stays awake. Reaching "
     "the last step adds one to times cooked.",
     "The screen does not dim during Start Cooking; finishing the last step raises the times-cooked count by one.",
     both("R4", 5)),
    ("req", "FR-COOK-002", "Serving scaler",
     "Changing servings scales every ingredient that has a parsed amount; ingredients without an amount are "
     "unchanged. Scaled amounts are shown as kitchen fractions.",
     "Going from 4 to 8 servings shows “⅔ c sweet chili sauce”; “pinch of salt” is unchanged.",
     both("R4", 5)),
    ("req", "FR-PRINT-001", "Printed card",
     "Printing a recipe from the website prints only the page on a white background, without tabs, "
     "navigation, the spiral, or stickers. The app can share a recipe as a PDF.",
     "A printed sweet chili chicken page fits the full recipe and shows no navigation.",
     "Website print rules deployed 2026-10-27, full check planned (website step R5); app PDF planned (Phase 5)"),
    ("req", "FR-PWA-001", "Website on the Home Screen and offline",
     "The website can be added to any phone or tablet's Home Screen with its own icon and opens full screen. "
     "Recently viewed recipes still open without a connection.",
     "In airplane mode, a recipe opened earlier still opens from the website's Home Screen icon.",
     web("R5")),

    ("h1", "12. Error handling, usability and consistency"),
    ("req", "FR-UX-001", "Not found",
     "An unknown or deleted recipe, or an unknown category address, shows the not-found page rather than an "
     "error.",
     "/recipe/does-not-exist and /category/soups show the not-found page.",
     CHECKED),
    ("req", "FR-UX-002", "Phones and tablets",
     "Every website page works from phone width (390px) to a landscape iPad and desktop, with no sideways "
     "scrolling.",
     "No horizontal scroll at 390px, 768px, 1024px and 1280px widths.",
     "Deployed 2026-10-27; checked at 500px and 1100px in headless Chrome; 390px and real iPad check pending"),
    ("req", "FR-UX-003", "Accessibility",
     "Pages use real headings and lists; decorations are hidden from screen readers; checked tags are "
     "announced as checked; text meets contrast guidelines.",
     "A screen reader reads the recipe page in book order: title, stats, tags, ingredients, directions.",
     "Website deployed 2026-10-27; to verify with VoiceOver"),
    ("req", "FR-UX-004", "Feedback when saving",
     "Saving, importing, uploading and scanning show clear success and error messages, and buttons are "
     "disabled while an action is running.",
     "A failed upload shows an error and keeps what the cook has written.",
     both("R2", 3)),

    ("h1", "13. Functional acceptance test matrix"),
    ("table", [1080, 2880, 5256], [
        ["ID", "Test", "Expected result"],
        ["AT-01", "Open the sweet chili chicken page", "Title, asterisk, stats, tags, ingredients and directions match the reference photo"],
        ["AT-02", "Ingredient columns on a wide screen", "Marinade left; drizzle, blank line and cooked rice right; columns equal height"],
        ["AT-03", "Ingredient columns on a phone", "One column, groups in order, no padding lines between groups"],
        ["AT-04", "Fraction display", "1/3 shows as ⅓ and 1/2 as ½; the stored value is unchanged"],
        ["AT-05", "Select the Desserts tab", "Desserts page opens and shows only dessert recipes (none yet)"],
        ["AT-06", "Unknown or deleted recipe address", "Not-found page"],
        ["AT-07", "Device in dark mode", "Still white and cream backgrounds with dark text (light only)"],
        ["AT-08", "Print the recipe page", "Page only, white background, no tabs, spiral or stickers"],
        ["AT-09", "Save without the write key", "Refused; nothing changes"],
        ["AT-10", "Save or delete in the app", "The website shows the change within about a minute"],
        ["AT-11", "App 10 days after install, no cable", "Still opens; SideStore expiry date keeps moving forward"],
        ["AT-12", "App in airplane mode", "Every recipe opens; a new recipe saves and syncs after reconnecting"],
        ["AT-13", "Scribble the recipe on the lines", "Each line fills, a new line appears, draft survives force-quit"],
        ["AT-14", "Write the recipe in page mode", "Recognized text matches after review; handwritten page is kept"],
        ["AT-15", "Ingredient line “1/3 c sweet chili sauce”", "Splits into 1/3 | c | sweet chili sauce"],
        ["AT-16", "Ingredient line “pinch of salt”", "No amount or unit; whole line is the item"],
        ["AT-17", "Scan the reference page", "Title, 2 groups (7 and 6 items), 4 step groups for review; original card kept"],
        ["AT-18", "Scale 4 → 8 servings", "Parsed amounts double; unparsed lines unchanged"],
        ["AT-19", "Cook mode", "Screen stays awake; steps can be checked off"],
        ["AT-20", "New app release on GitHub", "SideStore offers the update; recipes are kept after updating"],
        ["AT-21", "Website from the Home Screen in airplane mode", "A recently viewed recipe still opens"],
        ["AT-22", "Library search and filter", "Only matching recipes remain; cards show photo, source, title, author"],
        ["AT-23", "Save a recipe from a recipe-site link", "Title, photo, ingredients and steps filled for review; “Check this import” shown"],
        ["AT-24", "Add to Groceries at 8 servings", "Ingredients added with doubled amounts; checking off syncs to the other device"],
        ["AT-25", "Locked browser", "No + button or Edit; unlocking with the write key shows them"],
    ]),

    ("h1", "14. Requirements status and change control"),
    ("p", "Recommended tracking fields: requirement ID; area; priority; status (Proposed, Approved, "
          "Implemented, Tested, Deployed, Known Issue, Queued); test reference; release; and last verified "
          "date. Code written by an AI assistant does not by itself establish that a requirement is deployed "
          "or verified."),
    ("p", "Any change to the ingredient line parser, the paste parser, the ingredient column split, amount "
          "display or scaling must include tests covering the sweet chili chicken recipe and the worked "
          "examples in Appendix A. Any change to the write key check, the database access rules or the save "
          "functions must be followed by a passing run of scripts/check-setup.sh against the live site."),
    ("p", "Change log, 2026-10-20 (v1.0): milestone 2 complete in code: book-page design tokens and fonts; "
          "recipe page with spiral, side tabs, stat box, tag checkboxes, stickers, balanced ingredient columns "
          "and directions; cover page with recipe cards; category pages; sweet chili chicken hard-coded to "
          "match the reference photo. Owner decision: the login page is left out for now and queued."),
    ("p", "Change log, 2026-10-24: owner decision to build a native iPad app installed with SideStore and "
          "refreshed automatically, as a full recipe book (docs/APP_PLAN.md). Database schema created "
          "(migration 000, run by the owner) with public read-only access; the save-recipe function deployed "
          "with the write key."),
    ("p", f"Change log, 2026-10-27 (v1.1): website live at {SITE}, reading recipes from the database, with "
          "recipe addresses based on titles (FR-NAV-003) and pages that refresh within a minute (FR-DATA-001). "
          "Next.js upgraded to 15.5.28 and React to 19.1.10 because Vercel blocks versions affected by the "
          "React2Shell vulnerability (CVE-2025-55182). All setup checks pass; the keep-awake job runs twice a "
          "week. Owner decisions the same day: redesign both the website and the app after the Deglaze app "
          "(docs/DESIGN.md): light only, Deglaze green accent, Home book shelf, Library, recipe view in "
          "handwriting on cream, the book page as the writing page; the website adds recipes too (from the web, "
          "from photos, enter your own); one simple grocery list; less reliance on AI (published recipe data and "
          "on-device text recognition only). Specification reorganized accordingly (sections 4–12)."),
    ("p", "Queued (not scheduled): sign-in (FR-AUTH-001: Supabase Auth, replacing the write key); per-person "
          "privacy and family sharing (FR-AUTH-002: an optional shared flag once sign-in exists); custom "
          "handwriting font made from the owner's handwriting (Calligraphr or iFontMaker) replacing Patrick "
          "Hand; instant website refresh after a save; a Share-sheet extension for the app."),

    ("h1", "Appendix A. Worked examples"),
    ("table", [2304, 6912], [
        ["Scenario", "Expected behavior"],
        ["Column split", "Groups of 8, 7 and 1 lines (names included): first group fills the left column to "
         "half of 16 lines, so the other two go right with a blank line between them."],
        ["No amount", "“pinch of salt”: amount and unit empty; shown exactly as written; unchanged by scaling."],
        ["Fraction display", "Stored “1/3” shows as ⅓; stored “1 1/2” shows as 1 ½."],
        ["Mixed number scaling", "“1 1/2 c flour” at double servings shows “3 c flour”."],
        ["Paste: group name", "A short line “marinade” with no amount inside the ingredient area starts a group."],
        ["Paste: sub-step", "“- lightly oil the surface” after “▷ cook chicken” becomes a sub-step of that step."],
        ["Paste: unclear line", "A line that fits no rule (“from Grandma, 1998”) goes into Notes."],
        ["Total time", "Prep 45 and cook 15 show 60 min; prep only 20 shows 20 min; neither shows no time."],
        ["Renamed recipe", "“sweet chili chicken” renamed “Sweet Chili Chicken!” keeps /recipe/sweet-chili-chicken."],
        ["Wrong write key", "Save refused with “Unauthorized”; the app keeps the recipe on the iPad to retry."],
        ["Link without recipe data", "Writing page opens with the link as source and the page title as title; "
         "everything else is entered by hand."],
        ["Groceries at double servings", "“1/3 c sweet chili sauce” is added as “⅔ c sweet chili sauce”."],
        ["Missed refreshes", "iPad off for 8 days: the app won't open until SideStore refreshes it; no recipes "
         "are lost and the website still works."],
    ]),

    ("h1", "Appendix B. Local testing and release workflow"),
    ("p", "1. Edit the relevant files in VS Code or Xcode. Database changes are new migration files with a "
          "rollback script, run by the owner in the Supabase SQL Editor after a backup."),
    ("p", "2. Website: run npm run dev and test on http://localhost:3000, comparing recipe pages with the "
          "reference photo. App: run it on the iPad from Xcode or install a test build through SideStore."),
    ("p", "3. Run npm run lint and npm run build (and the app's Swift tests once they exist); after backend "
          f"changes, run npm run check:setup {SITE}. Passing these does not replace the manual checks above."),
    ("p", "4. The owner commits and pushes to GitHub (jaylouissaint/recipe-book); Vercel builds and deploys "
          "the website from main. For the app, the owner pushes a version tag and SideStore offers the update "
          "(iPad app Phase 6; until then, builds are installed through SideStore by hand)."),
]

# ---------------------------------------------------------------- Technical Specification

TECHNICAL = [
    ("raw", '<w:p><w:pPr><w:spacing w:before="1400"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/>'
            '<w:color w:val="2563EB"/><w:sz w:val="22"/></w:rPr><w:t>RECIPE BOOK</w:t></w:r></w:p>'),
    ("raw", '<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Technical Specification</w:t></w:r></w:p>'),
    ("raw", '<w:p><w:pPr><w:spacing w:after="560"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>' + escape(
        "Architecture of the iPad app and website, data model, write path, sideloading and release, and "
        "implementation requirements") + "</w:t></w:r></w:p>"),
    ("callout", "Document status",
     f"Living specification based on the application implementation and design decisions established through "
     f"{DATE}. It is the source of truth (with the Functional Specification) and the engineering reference for "
     f"continued development, testing, deployment, and maintenance."),
    ("table", [2880, 6480], [
        ["Attribute", "Specification"],
        ["Application", "Recipe Book: native iPad app (planned) and website, sharing one database"],
        ["Frontend", "Website: Next.js 15.5.28 (App Router, TypeScript), React 19.1.10, Tailwind CSS 4. "
         "iPad app (planned): SwiftUI, SwiftData, PencilKit, VisionKit, PDFKit; iPadOS 17+. Design: "
         "docs/DESIGN.md"],
        ["Backend / Database", "Supabase (PostgreSQL, Storage, Edge Functions), project trdlqlulpfwsfhqnfqfu"],
        ["Hosting", f"Website: Vercel, {SITE}. App: sideloaded with SideStore on a free Apple ID"],
        ["Source control", "GitHub, jaylouissaint/recipe-book (public); local development in VS Code on macOS"],
        ["Primary authentication", "None (login queued). Writes require the write key, checked by the "
         "save-recipe Edge Function"],
        ["Document date", DATE],
    ]),
    ("pagebreak",),

    ("h1", "1. Purpose and Scope"),
    ("p", "The Recipe Book is a personal recipe book styled after the owner's handwritten spiral recipe book. "
          "A native iPad app is the main way to write, scan, import and cook from recipes; a website shows the "
          "same recipes to family and on other devices. Both read from one Supabase database, and only the "
          "owner's iPad can change it."),
    ("callout", "Core design principle",
     "The recipe page is the book page. Recipe content looks handwritten, printed parts look printed, and "
     "handwriting becomes text on the iPad itself. No page, drawing, photo or PDF is ever sent to an outside "
     "transcription or AI service."),
    ("h2", "1.1 Primary objectives"),
    ("bullets", [
        "Reproduce the look of the book page (palette, fonts, ruled lines, stat box, tag row, side tabs, "
        "stickers, spiral) on the website and in the app.",
        "Store recipes as structured data (ingredient groups, amounts, steps and sub-steps) while always "
        "displaying them exactly as written.",
        "Make writing a recipe on the iPad feel like writing in the book: Scribble on ruled lines, or free "
        "writing with the Apple Pencil, recognized on the device.",
        "Bring in existing pages by scan, photo, PDF or Live Text with rule-based parsing, keeping the original.",
        "Give both the website and the app the same clean, light design (docs/DESIGN.md), with the book page "
        "as the writing page.",
        "Bring in recipes from the web using published recipe data rather than AI.",
        "Keep the app usable offline and refreshed automatically without a paid developer account.",
        "Keep everyone else read-only without a login, and stay within free tiers (Supabase, Vercel, GitHub).",
    ]),
    ("h2", "1.2 Out of scope / not yet fully specified"),
    ("p", "Out of scope by decision: the App Store and the $99/yr Apple developer account, and any AI "
          "transcription service. Queued and not implemented: sign-in and per-person privacy (deferred by the "
          "owner on 2026-10-20), family sharing, a custom handwriting font and an app Share extension. See "
          "section 13. Treat these as planned extensions, not current behavior. Dark mode was removed by "
          "decision on 2026-10-27 (light only)."),

    ("h1", "2. System Architecture"),
    ("table", [1872, 7488], [
        ["Layer", "Technology / Responsibility"],
        ["Website", "Next.js App Router with React Server Components. Cover, category and recipe pages are "
         "statically generated and regenerated at most every 60 seconds (revalidate = 60). Tailwind CSS 4 with "
         "palette tokens in globals.css; next/font (Patrick Hand, Montserrat, Zilla Slab)."],
        ["Website data", "src/lib/supabase.ts creates a read-only supabase-js client from NEXT_PUBLIC_SUPABASE_URL "
         "and NEXT_PUBLIC_SUPABASE_ANON_KEY. src/lib/recipes.ts: listRecipes(category?) and getRecipe(slug), one "
         "embedded query per call, mapped to the Recipe type."],
        ["iPad app (planned)", "SwiftUI; SwiftData as the offline store; reads with the public key, writes "
         "through save-recipe with the write key from the Keychain."],
        ["Database", "Supabase PostgreSQL: five recipe tables, RLS public read-only, write functions callable "
         "only by the service role (migration 000)."],
        ["Write path", "Edge Function save-recipe (Deno): checks x-write-key, then calls save_recipe() / "
         "delete_recipe() or creates signed upload URLs, as the service role."],
        ["Website writes (planned R2)", "/settings Unlock editing posts the write key to a Next.js route that "
         "checks it with save-recipe and stores it in an httpOnly, Secure, SameSite=Strict cookie (1 year). "
         "Server actions read the cookie and call save-recipe; the key never reaches page scripts."],
        ["Web import (planned R3)", "/api/import fetches the page on the server (http/https only; private and "
         "local addresses refused; size and time limits), reads schema.org Recipe JSON-LD (including @graph "
         "and HowToSection), and maps it to the Recipe shape for review. Used by the website and the app."],
        ["File storage", "Supabase Storage buckets originals (scans, photos, PDFs) and handwriting (PencilKit "
         "drawings and rendered pages): public read, uploads only by signed URL."],
        ["Hosting", f"Vercel Hobby, deploys from GitHub main: {SITE}."],
        ["App distribution (planned)", "Unsigned .ipa built by GitHub Actions on a version tag, published as a "
         "GitHub Release with a SideStore source file; SideStore signs and installs it."],
        ["Upkeep", ".github/workflows/keep-supabase-awake.yml calls keep_alive() on Mondays and Thursdays so "
         "the free project does not pause."],
    ]),
    ("h2", "2.1 Logical data flow"),
    ("bullets", [
        "A visitor opens the website's cover (/), a category (/category/[slug]) or a recipe (/recipe/[slug]). "
        "The server renders it from listRecipes/getRecipe (deleted_at is null) and caches it for up to 60 seconds.",
        "The app downloads recipes whose updated_at is newer than its last sync, including soft-deleted ones, "
        "and keeps them in SwiftData.",
        "On save, the app POSTs the whole recipe to save-recipe with x-write-key. save_recipe() upserts the "
        "recipe and replaces its groups, ingredients and steps in one transaction, bumping updated_at.",
        "Files are uploaded straight to Storage with a signed URL from save-recipe (action upload-url); the "
        "returned path is saved on the recipe.",
        "Within about a minute the website regenerates the affected pages; other devices see the change on "
        "their next sync.",
    ]),

    ("h1", "3. Authentication, Authorization, and User Isolation"),
    ("p", "There is no sign-in: the owner chose on 2026-10-20 to leave the login page out and queue it. Reading "
          "is public. Writing requires the write key, which only the owner's iPad holds."),
    ("table", [2160, 7200], [
        ["Control", "Requirement"],
        ["Public reads", "RLS policy “public read” (select, anon and authenticated) on all five tables. Do not "
         "store anything private in recipes until sign-in exists."],
        ["No direct writes", "No insert/update/delete policies, and INSERT, UPDATE, DELETE and TRUNCATE are "
         "revoked from anon and authenticated, so a mistaken policy still cannot open writes."],
        ["Write functions", "save_recipe(jsonb) and delete_recipe(uuid): EXECUTE revoked from public, anon and "
         "authenticated; granted only to service_role."],
        ["Edge Function", "save-recipe is deployed with verify_jwt = false (supabase/config.toml) and compares "
         "x-write-key with the WRITE_KEY secret in constant time; anything else gets 401."],
        ["Write key", "64 hex characters (openssl rand -hex 32). Stored as a Supabase secret and in the iPad "
         "Keychain; never in the repo, the app binary, Vercel, or chat. Rotate with npm run setup:supabase "
         "(takes effect immediately, no redeploy)."],
        ["Service role key", "Exists only inside the Edge Function environment (provided by Supabase). The "
         "website and app never have it."],
        ["Website unlock", "Planned (R2): the write key in an httpOnly cookie per browser; editing UI shown only "
         "when unlocked; Lock editing deletes the cookie. Unlock attempts are rate limited."],
        ["Storage", "Buckets are public for reading; there are no upload policies, so uploads need a signed "
         "URL from save-recipe. Size and type limits: originals 20 MB (JPEG, PNG, HEIC/HEIF, PDF); "
         "handwriting 10 MB (PNG, drawing data)."],
        ["Future sign-in", "Queued: Supabase Auth, owner_id defaulting to auth.uid(), owner-only RLS, child "
         "tables checked through their recipe, an optional shared flag; replaces the write key."],
    ]),
    ("callout", "Security invariant",
     "The write key is the only thing between the public and changes to the recipe book. Keep it out of every "
     "file that is committed or shipped, and rotate it if it is ever pasted somewhere it shouldn't be."),

    ("h1", "4. Application Modules"),
    ("table", [2088, 7272], [
        ["Module", "Primary responsibilities"],
        ["Today (deployed)", "Cover (/), categories (/category/[slug]) and the book-page recipe view "
         "(/recipe/[slug]). Replaced in R1; the book page becomes the writing page."],
        ["Shell (R1)", "Left sidebar on wide screens, bottom tab bar on phones; + button and Add sheet."],
        ["Home (R1)", "Book shelf: category tabs, Family Favorites, Recently added."],
        ["Library (R1)", "/library: recipe cards, search pill (R4), filter."],
        ["Recipe view (R1)", "/recipe/[slug]: photo, handwriting title, by/from, stats, ingredients, directions, "
         "notes, Add to Groceries, Start Cooking."],
        ["Writing page (R2)", "/new and /recipe/[slug]/edit: the book page as a form, one field per line, drafts."],
        ["Import (R3)", "/new/web (link) and /new/photo (upload, original beside, Paste text)."],
        ["Groceries and cooking (R4)", "/groceries list; /recipe/[slug]/cook step by step with Wake Lock; scaler."],
        ["Settings (R2)", "/settings: Unlock / Lock editing."],
        ["App library", "Cover, categories, recipe grid and recipe page, offline. App Phase 2."],
        ["App settings and sync", "Write key, sync status, last refresh. App Phase 2."],
        ["App write page", "Scribble lines and PencilKit page mode, parser, groups, steps, drafts. App Phase 3."],
        ["App scan and import", "Document scanner, Photos and Files import, text recognition, originals. App Phase 4."],
        ["App kitchen", "Cook mode, serving scaler, search, tag filters, share as PDF. App Phase 5."],
        ["Release pipeline", "GitHub Actions build, GitHub Release, SideStore source. App Phase 6."],
    ]),

    ("h1", "5. Core Data Model"),
    ("p", "Defined in supabase/migrations/000_initial_schema.sql. The TypeScript types in src/lib/types.ts "
          "(Recipe, IngredientGroup, Ingredient, StepGroup) are the shape the website uses; the app's SwiftData "
          "models will mirror them. Order within a recipe is kept with position columns, unique per parent."),
    ("table", [2520, 6840], [
        ["Table", "Purpose / key relationship"],
        ["recipes", "id uuid (the app may create it offline), slug unique, title, servings, prep_min, cook_min, "
         "category (mains | sides | desserts | more), tags text[], notes, source (typed | scribble | pencil | "
         "scan | upload), original_file_path, handwriting_path, search tsvector, created_at, updated_at "
         "(trigger), deleted_at (soft delete)."],
        ["ingredient_groups", "id, recipe_id → recipes (cascade), name ('' for loose items), position."],
        ["ingredients", "id, group_id → ingredient_groups (cascade), quantity text as written, unit, item, position."],
        ["step_groups", "id, recipe_id → recipes (cascade), title (the ▷ line), position."],
        ["steps", "id, group_id → step_groups (cascade), text (a “–” line), position."],
    ]),
    ("p", "Planned migration 001 (website step R2) adds to recipes: author, source_name, source_url, "
          "photo_path, description, times_cooked (integer, default 0) and imported (boolean, cleared on the "
          "first manual save); adds grocery_items (id, text, recipe_id → recipes on delete set null, checked, "
          "position, created_at) with public read; extends save_recipe for the new fields; adds write-only "
          "functions for groceries and times cooked; and creates a public photos bucket (10 MB, JPEG/PNG/HEIC/WebP)."),
    ("h2", "5.1 save_recipe(payload)"),
    ("p", "Takes the Recipe shape as JSON (id?, slug?, title, servings, prepMin, cookMin, category, tags, notes, "
          "source, originalFilePath, handwritingPath, ingredientGroups[{name, items[{quantity, unit, item}]}], "
          "stepGroups[{title, steps[]}]). It upserts the recipe, deletes and re-inserts its groups (cascading to "
          "items and steps), rebuilds search, and clears deleted_at, all in one transaction, so a failed save "
          "changes nothing. Slug: the given slug, else slugify(title); kept on update unless one is passed; a "
          "clash with another recipe appends the first 8 characters of the id. Search weights: title A, "
          "ingredients B, tags, steps and notes C (English)."),
    ("h2", "5.2 Sync fields"),
    ("p", "Clients sync by updated_at (indexed). Deletes are soft (delete_recipe sets deleted_at) so every "
          "device sees them; the website filters deleted_at is null. With a single writer, the newest save wins."),

    ("h1", "6. Website Page Composition (book page v1)"),
    ("p", "These components make up today's book-page recipe view. In the redesign they become the writing "
          "page and the View handwritten page screen; the new screens get their own components."),
    ("table", [3024, 6336], [
        ["Component", "Responsibility"],
        ["src/components/RecipePage.tsx", "Composes the book page; formats amounts (½ ⅓ ⅔ ¼ ¾); splits "
         "ingredient groups into two columns."],
        ["src/components/StatBox.tsx", "Servings / Prep time / Cook time cells with the mauve header strip."],
        ["src/components/TagRow.tsx", "All TAGS as circle checkboxes; SVG hand-drawn ✗ when checked; sr-only "
         "“(checked)” text."],
        ["src/components/SideTabs.tsx", "Category tabs; layout 'edge' (vertical on md+, strip on phones) or "
         "'strip' (always horizontal)."],
        ["src/components/Spiral.tsx", "SVG binding rings down the left edge (md+ only, aria-hidden, not printed)."],
        ["src/components/Stickers.tsx", "SVG RollingPin, WhiskAndSpoon, PlateSetting (aria-hidden)."],
        ["src/components/Cover.tsx", "Cover header, category strip, recipe grid; shared by / and category pages."],
        ["src/components/RecipeCard.tsx", "Page-style card linking to /recipe/<slug>, with servings, total time "
         "and checked tags."],
    ]),
    ("h2", "6.1 Ingredient column split"),
    ("p", "Each group becomes lines: its name (if any) followed by its items. Groups are taken in order; a group "
          "goes to the left column while the left column holds fewer than half of all lines, otherwise to the "
          "right. A blank line separates groups within a column. Both columns are then padded with 'pad' lines "
          "to the taller column's height plus one; the right column's last line is a real blank so one spare "
          "rule remains when the columns stack. Pad lines are hidden below 768px. The app uses the same rule."),
    ("h2", "6.2 Ruled paper"),
    ("p", "The line pitch is 2.25rem. .ruled draws one rule under a single-line item (ingredients). "
          ".paper-lines paints rules with a repeating linear gradient for text that wraps (directions, cards), "
          "with background-origin: content-box so rules line up with the text under padding. Tailwind text-* "
          "utilities also set line-height, so text inside .paper-lines that is a block or flex item needs "
          "leading-9 to stay on the rules."),
    ("h2", "6.3 Design tokens (light only)"),
    ("table", [2880, 6480], [
        ["Token", "Value and use"],
        ["--bg", "#FBF8F2 cream — page background"],
        ["--surface", "#FFFFFF — cards, sheets, tab bar"],
        ["--surface-muted", "#F1EEE8 — search pill, inactive segment, notes"],
        ["--text / --text-muted", "#1C1B19 / #77736C — interface text"],
        ["--divider", "#E8E4DD — hairlines"],
        ["--accent", "#1F4D3D Deglaze green — primary buttons, + button, active tab, links"],
        ["--ink", "#7B3F61 plum — handwritten recipe content"],
        ["Book page", "--rule #DDD8DC, --label #8C8C8C, --mauve #9A8597, --cover #A3174B, --teal #1E5E5E, tab "
         "colors #DDAA3A #EE9A78 #E6B8AE #9FB4BF — writing page, handwritten view, Home shelf tabs"],
        ["Shapes", "Cards radius 20px with a soft shadow; photos radius 16px; pill buttons 52px tall"],
        ["Fonts", "Instrument Serif (page titles), Figtree (interface), Patrick Hand (recipe content); "
         "Montserrat and Zilla Slab on the book page; the app bundles the same (all OFL licensed)"],
    ]),
    ("p", "The redesign removes the dark-mode token overrides from globals.css (website step R1); the app "
          "defines colors without dark variants."),

    ("h1", "7. iPad App (planned)"),
    ("h2", "7.1 Project and data"),
    ("bullets", [
        "Xcode project in ios/ in the same repository; iPadOS 17 minimum (SwiftData).",
        "SwiftData models mirror the five tables; the app is the source of truth for drafts and works fully offline.",
        "Sync on launch, on pull-to-refresh and after saving: download rows with updated_at after the last "
        "sync; push local saves through save-recipe; retry failed pushes later.",
        "Settings: write key in the Keychain, last sync, last refresh, current version.",
    ]),
    ("h2", "7.2 Writing"),
    ("bullets", [
        "Line mode: each ruled line is a SwiftUI TextField (Scribble works on any text field); an empty line is "
        "always appended; drafts are saved after every change.",
        "Page mode: a PencilKit canvas over ruled paper. The PKDrawing and a rendered PNG are uploaded to the "
        "handwriting bucket; Vision text recognition (accurate level, on device) turns it into text for review.",
    ]),
    ("h2", "7.3 Parsers"),
    ("p", "parseIngredientLine(text) → quantity / unit / item and parseRecipeText(text) → recipe draft, "
          "following the Functional Specification rules (FR-WRITE-003, FR-PASTE-001). Test cases live in "
          "shared/fixtures/*.json so the Swift tests (and any website tests) check the same examples, including "
          "the reference-photo recipe. toNumber(quantity) is used only by the scaler."),
    ("h2", "7.4 Scanning, importing and the kitchen"),
    ("bullets", [
        "Document scanner (VNDocumentCameraViewController), PhotosPicker and Files import; PDFs shown with PDFKit, "
        "using a PDF's text layer when present.",
        "Originals uploaded to the originals bucket by signed URL; path saved as original_file_path.",
        "Cook mode keeps the screen on (UIApplication.isIdleTimerDisabled) while open; the scaler multiplies "
        "parsed amounts and formats them as kitchen fractions.",
    ]),

    ("h1", "8. Sideloading, Refresh and Release (SideStore)"),
    ("table", [2592, 6768], [
        ["Item", "Rule / setup"],
        ["Signing", "SideStore signs the app on the iPad with a separate, signing-only free Apple ID. "
         "Certificates last 7 days."],
        ["Refresh", "Shortcuts personal automations, set to Run Immediately: daily at 3:00 AM and When "
         "charging. Actions: connect the local VPN SideStore needs, SideStore Refresh All, disconnect."],
        ["One-time setup", "Developer Mode on (Settings → Privacy & Security); SideStore and its pairing file "
         "created with the Mac following the current guide at sidestore.io; the local VPN app the guide names."],
        ["Free account limits", "3 sideloaded apps at once (SideStore uses one) and 10 new app IDs per 7 days; "
         "no iCloud/CloudKit, push notifications, Sign in with Apple or App Groups. App extensions use extra "
         "app IDs, so v1 has none."],
        ["Build", "scripts/build-ipa.sh: xcodebuild Release for iphoneos with CODE_SIGNING_ALLOWED=NO, then the "
         ".app zipped inside Payload/ as an unsigned .ipa for SideStore to sign."],
        ["Release", ".github/workflows/ios-release.yml on a tag like app-v1.2.0: macOS runner builds the .ipa, "
         "attaches it to a GitHub Release, updates sidestore/source.json; SideStore offers the update."],
        ["Failure modes", "A missed week of refreshes stops the app opening until refreshed (data kept); a "
         "major iPadOS update can invalidate the pairing file (redo with the Mac, about 10 minutes)."],
    ]),

    ("h1", "9. Code Organization"),
    ("table", [3024, 6336], [
        ["Path", "Responsibility"],
        ["src/app/layout.tsx, globals.css", "Fonts, metadata, theme color; tokens, .label-caps, .ruled, "
         ".paper-lines, tab-vertical utility, print rules."],
        ["src/app/page.tsx", "Cover with all recipes (revalidate 60)."],
        ["src/app/recipe/[slug]/page.tsx", "Recipe page; generateStaticParams, generateMetadata, revalidate 60."],
        ["src/app/category/[slug]/page.tsx", "Category cover; generateStaticParams over CATEGORIES, revalidate 60."],
        ["src/components/*.tsx", "Website page building blocks (section 6)."],
        ["src/lib/types.ts, book.ts", "Recipe types; TAGS (in the book's order) and CATEGORIES with tab colors."],
        ["src/lib/supabase.ts, recipes.ts", "Read-only Supabase client; recipe queries and row mapping."],
        ["supabase/migrations/", "Numbered migrations with matching _rollback.sql files."],
        ["supabase/functions/save-recipe/", "The write path (section 3)."],
        ["supabase/config.toml", "CLI settings: verify_jwt = false for save-recipe."],
        ["scripts/setup-supabase.sh", "Link the project, set the write key, deploy save-recipe (npm run setup:supabase)."],
        ["scripts/check-setup.sh", "End-to-end checks of access rules, save-recipe and the live site (npm run check:setup)."],
        ["scripts/specs/", "Generates these specifications from the financial planner's .docx styles."],
        [".github/workflows/", "keep-supabase-awake.yml; ios-release.yml (planned)."],
        ["ios/ (planned)", "The iPad app's Xcode project."],
        [".env.example", "The two public website variables; copy to .env.local (git-ignored)."],
        ["docs/", "DESIGN.md (look and screens), PLAN.md (website), APP_PLAN.md (iPad app), HANDOFF.md, reference photo."],
    ]),

    ("h1", "10. Non-Functional Requirements"),
    ("table", [2088, 7272], [
        ["Area", "Requirement"],
        ["Privacy", "No outside AI or transcription service; files go only to the project's own Supabase Storage."],
        ["Security", "Public access is read-only at three levels (RLS, revoked privileges, function grants); "
         "the write key never leaves the Supabase secret store and the iPad Keychain."],
        ["Dependencies", "Keep Next.js and React on patched releases; Vercel refuses to deploy versions with "
         "known critical vulnerabilities. Two build-time postcss advisories bundled in Next 15 are accepted "
         "until the Next 16 upgrade."],
        ["Performance", "Website pages are statically generated (first load JS about 106 kB) and regenerated at "
         "most every minute; the app reads from its offline store."],
        ["Availability", "Free Supabase projects pause after about a week idle: the keep-awake workflow prevents "
         "it. GitHub disables scheduled workflows after 60 days without repository activity; re-enable in Actions."],
        ["Theming", "Light only: white and cream backgrounds regardless of the device's dark mode setting."],
        ["Responsiveness", "No horizontal scroll from 390px up; book decorations only at 768px and wider; the app "
         "supports portrait, landscape, Split View and Slide Over."],
        ["Accessibility", "Semantic headings and lists; decorative graphics hidden from screen readers; checked "
         "state in text; contrast checked."],
        ["Cost", "Free tiers only (Supabase, Vercel Hobby, GitHub, free Apple ID)."],
    ]),

    ("h1", "11. Acceptance Test Matrix"),
    ("table", [3168, 6192], [
        ["Scenario", "Expected result"],
        ["npm run lint / npm run build", "No errors; /, /category/[slug] (4 pages) and /recipe/sweet-chili-chicken "
         "prerender with 1-minute revalidation. Passed 2026-10-27 on Next 15.5.28."],
        ["Migration 000 in a local Postgres", "Seed has 3 groups (7, 6, 1 items) and 4 step groups; update keeps "
         "the slug; bad input rejected with nothing saved; anon refused every write; rollback and re-run clean. "
         "Passed 2026-10-24 (PGlite)."],
        ["check-setup: database", "Public key reads recipes and calls keep_alive(); insert, save_recipe and "
         "uploads refused. Passed 2026-10-27."],
        ["check-setup: save-recipe", "401 without the key; with it, save, signed upload URL and delete all "
         "succeed. Passed 2026-10-27."],
        ["check-setup: website", "Cover lists the recipe; recipe page loads from the database; deleted test "
         f"recipe returns 404. Passed 2026-10-27 against {SITE}."],
        ["Keep-awake workflow", "Manual run succeeds. Passed 2026-10-27."],
        ["parseIngredientLine / parseRecipeText", "Shared fixtures pass in Swift tests, including the "
         "reference-photo recipe. Planned (App Phases 3–4)."],
        ["App sync", "Offline edits reach the database after reconnecting; deletes reach other devices. Planned."],
        ["SideStore refresh", "App still opens after 10+ days with no cable. Planned (App Phase 0)."],
        ["Release pipeline", "A version tag produces a Release and SideStore offers the update. Planned (App Phase 6)."],
    ]),

    ("h1", "12. Build Order"),
    ("bullets", [
        "Website step 1 – Skeleton (Supabase, RLS, save-recipe, Vercel; no login). Done 2026-10-27.",
        "Website step 2 – Book page design v1 (the sweet chili chicken page). Done 2026-10-20.",
        "Website R1 – New look and navigation: light-only tokens, fonts, shell, Home shelf, Library, Recipe view.",
        "Website R2 – Migration 001, unlock and server-side saving, the writing page, photo upload.",
        "Website R3 – Save from the web and Add from photos, with parser tests.",
        "Website R4 – Groceries, Start Cooking, serving scaler, search and tag filters.",
        "Website R5 – Home Screen install, offline cache, print.",
        "App Phase 0 – Prove SideStore install and automatic refresh with a minimal app.",
        "App Phase 1 – Shared backend. Done 2026-10-27 (same as website step 1).",
        "App Phase 2 – Reading the book, offline, with sync and settings.",
        "App Phase 3 – Writing (Scribble lines and Apple Pencil page mode).",
        "App Phase 4 – Scanning, importing and the paste parser.",
        "App Phase 5 – Cook mode, scaler, search, tag filters, share as PDF.",
        "App Phase 6 – Automatic releases through GitHub and SideStore.",
    ]),

    ("h1", "13. Planned / Recommended Enhancements"),
    ("bullets", [
        "Queued – Sign-in: Supabase Auth, owner_id on recipes, owner-only RLS, a login page; replaces the write key.",
        "Queued – Family sharing: shared flag with read access for family members once sign-in exists.",
        "Queued – Custom handwriting font from Calligraphr or iFontMaker, as woff2 in public/fonts (font-display: "
        "swap, Patrick Hand fallback) and bundled in the app.",
        "Queued – Instant website refresh: save-recipe calls a Next.js revalidation route after each save.",
        "Queued – Next.js 16 upgrade (clears the bundled postcss advisories).",
        "Queued – App Share extension (needs extra app IDs on a free account).",
        "Recommended – Add a TypeScript test runner with R3 and the Swift test target with Phase 3, both "
        "running the shared parser fixtures.",
    ]),

    ("h1", "Appendix A. Key Business Rules"),
    ("table", [2376, 6984], [
        ["Rule", "Definition"],
        ["Content vs labels", "What the cook wrote uses the handwriting font and ink; printed parts use labels."],
        ["Amounts as written", "Stored as text exactly as written; displayed with fraction characters; parsed "
         "only for scaling."],
        ["No amount", "Lines like “pinch of salt” have empty quantity and unit and never scale."],
        ["Column split", "Whole groups only; left until half the lines; equal heights plus one spare line."],
        ["Favorite", "Family Favorite tag checked → teal asterisk."],
        ["Total time", "prep_min + cook_min, missing values as zero; hidden when both missing."],
        ["Stable addresses", "A recipe's slug is kept when its title changes; clashes get an id suffix."],
        ["Soft delete", "Deleting sets deleted_at; hidden everywhere; saving again restores."],
        ["Whole-recipe saves", "A save replaces the recipe and all its parts in one transaction."],
        ["Original card", "Uploaded file or handwritten page kept unchanged and linked from the recipe."],
        ["No AI service", "Handwriting becomes text only on the iPad or by typing."],
        ["Write key", "Required for every change; only the owner's iPad and unlocked browsers have it."],
        ["Imports", "Published recipe data or on-device text recognition only, always reviewed before saving."],
    ]),

    ("h1", "Appendix B. Repository / Deployment Workflow"),
    ("bullets", [
        "Step 1 - Update code: Edit the relevant .tsx, .ts and .css files (website), Swift files (app, in ios/), "
        "or add a migration. Confirm the intended files are in /Users/louis/Desktop/Misc/recipe_book.",
        "Step 2 - Test locally: Run npm run dev and open http://localhost:3000; compare recipe pages with "
        "docs/reference/recipe-book-page.jpg. Run the app on the iPad from Xcode or through SideStore.",
        "Step 3 - Verify: Run npm run lint and npm run build (and Swift tests once they exist). After database or "
        f"function changes, run npm run check:setup {SITE}.",
        "Step 4 - Deploy: The owner reviews, commits and pushes to GitHub main; AI agents change local files only "
        "and never commit or push. Vercel builds and deploys the website automatically. App releases follow a "
        "version tag (Phase 6).",
        "Environment: Vercel and .env.local hold NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY "
        "(read-only); Supabase secrets hold WRITE_KEY; GitHub Actions secrets hold SUPABASE_URL and "
        "SUPABASE_ANON_KEY for the keep-awake workflow. Never commit secrets.",
        "Supabase setup: brew install supabase/tap/supabase; supabase login; npm run setup:supabase (links the "
        "project, sets WRITE_KEY, deploys save-recipe). Supabase's GitHub integration is deliberately not "
        "connected, so pushes never change the database.",
        "Vercel: Standard deployment protection keeps preview deployments private; production is public (read-only).",
        "Database migrations live in supabase/migrations and are run by hand in the Supabase SQL Editor after a "
        "backup; each has a rollback script.",
        "Migration history: 000_initial_schema (tables, RLS, save_recipe/delete_recipe, keep_alive, storage "
        "buckets, sweet chili chicken seed; tested in PGlite including rollback; run by the owner 2026-10-24).",
        "Specifications: edit scripts/specs/spec_content.py, then run python3 scripts/specs/build_specs.py.",
    ]),
]
