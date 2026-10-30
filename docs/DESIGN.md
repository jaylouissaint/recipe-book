# Recipe Book — Design (website)

Status: agreed 2026-10-27 and built on the website (R1–R4). A native iPad app was dropped on 2026-10-29; on the iPad the website is used from the Home Screen. It is modeled on the Deglaze app (demo video: https://cdn.deglaze.app/photos/videos/DeglazeBookDemo.mp4), with three differences: handwriting is part of the design, the **writing page looks like the book page** (the sweet chili chicken photo, `docs/reference/recipe-book-page.jpg`), and **nothing relies on an AI service**.

## Decisions (Louis, 2026-10-27)
- **Light only.** White and cream backgrounds; no dark mode.
- **Accent: Deglaze green** `#1F4D3D` for buttons, the + button, active tabs and links.
- **Home tab = the book shelf**: category tabs, Family Favorites, recently added.
- **Recipe view = the video's layout, in handwriting on cream**: titles and ingredients in the handwriting font.
- **Adding recipes on the website:** Save from the web, Add from photos, Enter your own. The website is no longer read-only.
- **Groceries: one simple list.** Not sorted by aisle or date; it can optionally be grouped by recipe.
- **Less AI:** web import reads the recipe data that recipe sites publish (schema.org), text from photos comes from the iPad's Live Text (copied and pasted), and simple rules sort the text. You always review before saving. The video's "imported with AI" warning becomes a "Check this import" note on recipes that came from a link or photo.

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

**Fonts** (all free Google Fonts):
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

**Book view (`/book`, the Shelf | Book toggle on Home).** The whole recipe book to flip through like the spiral book:
- **Pages:** every page is the same size (about 0.78 wide to 1 tall), sized to fit the screen, with whole ruled lines. Fewer, bigger lines on small screens (18–30 lines per page) keep the writing readable.
- **Long recipes:** a recipe that doesn't fit continues on the next page, which starts "recipe: … (continued)". No page is ever longer than the screen.
- **Layout:** an open two-page spread with the spiral down the middle on landscape screens (iPad landscape, desktop); one page with the spiral on its left edge on phones and portrait.
- **What's in it:** the cover (plain raspberry with "Ramiya's Recipes" for now; a custom cover comes later), then contents with page numbers, then recipes grouped by category in tab order.
- **Getting around:** turn pages by swiping, with the arrow keys, or with the ‹ › buttons, with a page-turn animation (none with Reduce Motion). The colored category tabs on the outer edge jump to that section; contents entries jump to their recipe.
- **Links:** each recipe's first page has "open recipe →". The recipe view's menu has "Open in the book" (`/book#slug`).

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

Scribble works on the iPad in Safari: write with the Apple Pencil on any line and it becomes text. **Page mode** ("Write on the lines" | "Write on the page"): the fields at the top stay (title, stats, tags, category, photo), and the ingredients, directions and notes become one ruled page to write on with the Apple Pencil (pen, eraser, undo, clear, "Draw with finger"; fingers scroll). The writing is kept as the handwritten page and isn't read into text; a recipe with only a handwritten page shows that page in the recipe view and the book, and it's the thumbnail when there's no photo. A photo button adds the hero photo. The bottom bar has Cancel and Save.

**Save from the web.** Paste a link, and the site reads the page's published recipe data: title, photo, author, site, servings, times, ingredients and steps. The result opens in the writing page for review. If the page has no recipe data, the writing page opens with just the link and title filled in, plus the Paste text box. Some sites refuse to be read by other sites; then the writing page opens with the link and the Paste text box, to copy the recipe in from the page. Only public web addresses work, and the photo is copied in when the recipe is saved.

**Add from photos.**
- Upload the photo or PDF. It shows beside the writing page (above it on narrow screens), with a "Paste text" box for iPad Live Text, plus manual entry. "Paste a recipe's text" is also on Enter your own.
- The original is kept as the original card.

**Start Cooking.** Full screen. It opens on "Gather your ingredients" (a checklist at the current serving size), then shows one step at a time in large handwriting, with the ingredients that step uses above it: a step that names a section ("make coconut lime drizzle") gets that whole section, and other ingredients show when one of their main words is in the step. Next and Back buttons, swipe, or the arrow keys; sub-steps can be checked off. The screen stays awake. The last page, "enjoy!", adds one to times cooked.

**Groceries.** Serif title, with "Clear checked" and "Clear all" in green. One list of white rounded rows: the item in handwriting, a checkbox, and the recipe's small thumbnail; checked items move to the bottom. An optional "Group by recipe" switch (remembered per browser). The "Add an item" field adds one item by hand. "Add to Groceries" on a recipe opens a sheet of its ingredients at the current serving size, all ticked, to untick what you already have. Locked browsers see the list read-only.

**Serving scaler.** − and + on the Servings box (or ×½ to ×4 for recipes without a serving count) rescale the ingredients with kitchen fractions (⅓ c × 1½ = ½ c), and Add to Groceries and Start Cooking use the scaled amounts.

**Settings.** Unlock editing (enter the write key once per device).

## Behavior notes
- Everyone can read. **Editing on the website** shows only after the device is unlocked with the write key. It's kept in a secure, httpOnly cookie for one year and can be locked again in Settings. Writes go through the website's server to the `save-recipe` function, so the key never reaches page scripts.
- Recipes imported from a link or photo show "Check this import" until edited and saved once.
- Times cooked goes up by one when "Start Cooking" reaches the last step, or from the menu.
