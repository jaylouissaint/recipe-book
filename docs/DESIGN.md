# Recipe Book — Design (website and iPad app)

Status: agreed 2026-10-27, not built yet. The website and the iPad app share this design. It is modeled on the Deglaze app (demo video: https://cdn.deglaze.app/photos/videos/DeglazeBookDemo.mp4), with three differences: handwriting is part of the design, the **writing page looks like the book page** (the sweet chili chicken photo, `docs/reference/recipe-book-page.jpg`), and **nothing relies on an AI service**.

## Decisions (Louis, 2026-10-27)
- **Light only.** White and cream backgrounds; no dark mode.
- **Accent: Deglaze green** `#1F4D3D` for buttons, the + button, active tabs and links.
- **Home tab = the book shelf**: category tabs, Family Favorites, recently added.
- **Recipe view = the video's layout, in handwriting on cream**: titles and ingredients in the handwriting font.
- **Adding recipes, both on the website and in the app:** Save from the web, Add from photos, Enter your own. The website is no longer read-only.
- **Groceries: one simple list.** Not sorted by aisle or date; it can optionally be grouped by recipe.
- **Less AI:** web import reads the recipe data that recipe sites publish (schema.org), photos are read with on-device text recognition on the iPad, and simple rules sort the text. You always review before saving. The video's "imported with AI" warning becomes a "Check this import" note on recipes that came from a link or photo.

## Look
| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBF8F2` cream | Page background |
| `--surface` | `#FFFFFF` | Cards, sheets, the tab bar |
| `--surface-muted` | `#F1EEE8` | Search pill, inactive segment, notes |
| `--text` | `#1C1B19` | UI text |
| `--text-muted` | `#77736C` | "by …", source line, placeholders |
| `--divider` | `#E8E4DD` | Hairlines between sections |
| `--accent` | `#1F4D3D` | Primary buttons, + button, active tab, links |
| `--ink` | `#7B3F61` plum | Handwritten recipe content (titles, ingredients, steps) |
| Card | radius 20px, shadow `0 1px 2px rgb(0 0 0 / .04), 0 4px 16px rgb(0 0 0 / .06)` | Recipe and grocery cards |
| Photo | radius 16px | Card thumbnails, recipe hero |
| Pill button | full radius, 52px tall | "Add to Groceries" (outline), "Start Cooking" (filled green) |

The book-page tokens (ruled lines `#DDD8DC`, label gray `#8C8C8C`, mauve `#9A8597`, tab colors, raspberry `#A3174B`) stay for the writing page, the handwritten-page view and the Home shelf tabs.

**Fonts** (all free Google Fonts, bundled in the app):
- Page titles ("My Recipes", "Groceries"): **Instrument Serif**, close to the video's high-contrast serif.
- UI text, buttons, labels: **Figtree**.
- Recipe content: **Patrick Hand** in plum (until the custom handwriting font exists).
- Book-page labels on the writing page: Montserrat small caps and Zilla Slab "recipe:", as now.

## Navigation
- **Phone and iPad portrait:** bottom tab bar with Home (book shelf), Library, Groceries and Settings, plus a floating green **+** at the bottom right.
- **iPad landscape and desktop website:** the same four destinations as a slim left sidebar. The + button stays.
- **+** opens the **Add sheet** (white, with hairline dividers and line icons):
  1. 🔗 Save a recipe from the web
  2. 📷 Add from recipe photos
  3. ⊕ Enter your own recipe

## Screens
**Home (book shelf).** Serif title "Recipe Book"; the four category tabs as large colored book tabs (Mains, Sides, Desserts, More Recipes); then rows for Family Favorites and Recently added, as horizontal strips of cards.

**Library ("My Recipes").** Serif title, a search pill ("Search your library") and a filter button (categories and tags). Below them, a list of white rounded cards. Each card has:
- a photo thumbnail on the left: the recipe photo, else the handwritten page, else the original card, else a cream placeholder with the first letter in handwriting
- a source line with a small icon (a link icon with the site name, a camera icon for "From a photo", a pencil icon for "Written by hand", or the cookbook name)
- the title in handwriting
- "by …" when there is an author
- a small pot icon with a count at the right: times cooked

Two columns on iPad, three on desktop.

**Recipe view.**
- **Top bar:** back, share, menu (Edit, View handwritten page / View original card, Delete).
- **Hero:** the photo in a rounded container; it becomes a carousel when there's also an original card or handwritten page.
- **Title:** large, in handwriting.
- **Check this import note:** a muted pill, only on recipes imported from a link or photo until the first edit.
- **By and from:** "by Author" and "from Source" with underlined links.
- **Stats:** a row of Servings, Prep and Cook, which also opens the serving scaler.
- **Tags:** small pills.
- **Ingredients:** a sans heading; group names in muted small caps; items in handwriting on plain cream lines with hairline dividers.
- **Directions:** numbered steps in handwriting, with indented "–" sub-steps.
- **Notes.**
- **Bottom buttons:** sticky "Add to Groceries" (outline) and "Start Cooking" (filled green).
- **Wide screens:** ingredients sit in a left column and directions in a right one.

**Writing page ("Enter your own", also Edit).** The book page from the sweet chili chicken photo:
- a cream ruled page with the "recipe:" title line, the mauve stat box and the circle tag checkboxes
- INGREDIENTS in two columns and DIRECTIONS with ▷ and – lines
- one field per ruled line, in handwriting and plum ink
- spiral and stickers on wide screens

Scribble works on both the website (Safari on iPad) and the app. The app adds **page mode**: write anywhere with the Apple Pencil, keep the drawing as the handwritten page, and get the recognized text to review. A photo button adds the hero photo. The bottom bar has Cancel and Save.

**Save from the web.** Paste a link, and the site or app reads the page's published recipe data: title, photo, author, site, servings, times, ingredients and steps. The result opens in the writing page for review. If the page has no recipe data, the writing page opens with just the link and title filled in.

**Add from photos.**
- **App:** scan with the document scanner or pick photos/PDFs. On-device text recognition and the paste rules fill the writing page, with the original beside it.
- **Website:** upload the photo or PDF. It shows beside the writing page, which has a "Paste text" box for iPad Live Text, plus manual entry.
- **Both:** the original is kept as the original card.

**Start Cooking.** Full screen, one step at a time in large handwriting, with the relevant ingredients shown above the step. Tap or swipe for the next step; a step can be checked off. The screen stays awake.

**Groceries.** Serif title, with "Clear checked" and "Clear all" in green. One list of white rounded rows: the item in handwriting, a checkbox, and the recipe's small thumbnail. An optional "Group by recipe" switch. + adds an item by hand. "Add to Groceries" on a recipe adds its ingredients at the current serving size.

**Settings.** On the website: unlock editing (enter the write key once per device). In the app: the write key, sync status and last refresh.

## Behavior notes
- Everyone can read. **Editing on the website** shows only after the device is unlocked with the write key. It's kept in a secure, httpOnly cookie for one year and can be locked again in Settings. Writes go through the website's server to the `save-recipe` function, so the key never reaches page scripts.
- Recipes imported from a link or photo show "Check this import" until edited and saved once.
- Times cooked goes up by one when "Start Cooking" reaches the last step, or from the menu.
