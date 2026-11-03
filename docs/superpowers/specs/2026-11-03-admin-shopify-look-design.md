# Admin: Shopify-style look and layout (phase A)

The owner asked for the admin to work "like Shopify". Phase A changes how the admin looks and is laid out; it keeps every existing feature, permission and URL. Phase B (draft orders, order editing, refunds, abandoned checkouts, reports, content editor, customer tags) is separate.

## Shell

- **Top bar** (all screens, dark `#1a1a1a`): logo and "Admin" on the left; a search field in the middle (opens the command palette, Ctrl/Cmd+K); on the right, view store, notifications and a user menu (name, role, Account, Log out).
- **Sidebar** (desktop, light grey `#ebebeb`, under the top bar): compact 32px items with 16px icons; the active item is white and bold. Orders shows the number of new orders. Settings, Staff and Activity sit at the bottom. The phone keeps the bottom tabs.
- **Content** on a `#f1f1f1` background; white cards with 12px corners and a hairline shadow; 13–14px text; 20px bold page titles.

## Command palette

Ctrl/Cmd+K or the search field opens a dialog. Typing searches orders (number, name, phone), customers (name, phone) and products (name), five of each, plus admin pages the user may open. Arrow keys move, Enter opens. The server action checks the session and each area's permission; results only include what the user may see.

## Pages

- **Page header:** a square back button beside the title, badges inline with the title, actions on the right.
- **Home:** the four figures in one card divided into columns; a "To do" card linking to new orders to confirm, confirmed orders to send, orders out for delivery and low stock; then the existing chart, funnel, bundles, governorates and latest orders.
- **Orders:** one card holding underline tabs with counts, the search/date/export row and the table: Order, Date, Customer, Total, Payment (Payment pending / Paid / Voided / Refunded), Status, Items. Pagination arrows at the bottom of the card. Bulk bar unchanged.
- **Order:** two columns. Left: the items card (status badge, items, the next-step buttons at the bottom), the payment card (subtotal, discount, delivery, total, paid, balance to collect) and the timeline (note box on top, events on a vertical line). Right: customer notes, customer (orders and spend, phone, WhatsApp, blocked warning), delivery address with copy.
- **Products:** a table with thumbnail, name, status, stock and bundles. The product page has two columns: details, photos, bundles and search engine listing on the left; status, stock and web address on the right. A dark "Unsaved changes" bar with Discard and Save appears at the top while the form has unsaved edits.

## Unchanged

Accessible names and test ids the end-to-end tests use stay the same (for example "Search orders", "Add a note", "Save note", "Confirm order", `order-row`, `order-status`, `timeline`, `sidebar`, `bottom-tabs`, `stat-sales`, `latest-orders`). Server actions, queries and permissions are reused as they are, apart from the new search action.
