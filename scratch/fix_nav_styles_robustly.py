import os

nav_css_path = 'c:/MDDZ/css/sections/nav.css'
index_html_path = 'c:/MDDZ/index.html'

# Let's define the navbar overrides
navbar_overrides = """
/* ── Theme Custom Overrides for Black Navbar / White Menu Page ── */

/* Closed State: Black Navbar */
#nav_scroll_container {
  background-color: #171411 !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25) !important;
  --ns-menu-bg: #FDFAF6; /* Set menu bg variable to white/ivory theme */
  --ns-menu-text: #171411;
  --ns-menu-accent: #c89a45;
  --ns-menu-line: rgba(200, 154, 69, 0.2);
}

/* Ensure white icons/hamburger on black minimized navbar */
#nav_scroll .ns-icon svg {
  stroke: #ffffff !important;
}
#nav_scroll .ns-hamburger {
  color: #ffffff !important;
}

/* Open State: White fullscreen menu page */
#nav_scroll_container.is-menu-open {
  background-color: var(--color-bg) !important;
}

/* Open State: Change header icons and close button to dark charcoal for contrast on white background */
#nav_scroll_container.is-menu-open #nav_scroll .ns-icon svg {
  stroke: var(--color-text) !important;
}
#nav_scroll_container.is-menu-open .ns-hamburger {
  color: var(--color-text) !important;
}

/* Fullscreen Menu Links styling with 30% Gold Gradient & 10% Emerald Green */
.ns-showcase-row__index {
  color: var(--color-emerald) !important;
  font-weight: 600 !important;
}

/* Menu rows hover/active states: Gold Gradient */
.ns-showcase-row:hover .ns-showcase-row__title-layer.is-accent,
.ns-showcase-row.is-previewed .ns-showcase-row__title-layer.is-accent {
  background: var(--color-gold-gradient) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  color: #c89a45 !important;
}

/* Sub-labels in menu */
.ns-dropdown__eyebrow {
  color: var(--color-emerald) !important;
}
.ns-menu-link-sub {
  color: var(--color-text-secondary) !important;
}
"""

# 1. Update css/sections/nav.css
with open(nav_css_path, 'r', encoding='utf-8', errors='ignore') as f:
    css_content = f.read()

# Append the overrides to the end of the file
if 'Theme Custom Overrides for Black Navbar' not in css_content:
    css_content += '\n' + navbar_overrides
    with open(nav_css_path, 'w', encoding='utf-8') as f:
        f.write(css_content)
    print("Appended overrides to nav.css")

# 2. Update index.html
with open(index_html_path, 'r', encoding='utf-8', errors='ignore') as f:
    html_content = f.read()

# Since index.html has inline style tags, let's find the end of the nav styles block
# and append the overrides there.
# Let's search for the nav block. In nav.css, it ends or has specific classes.
# We can just inject the styles into the head of index.html inside a new style block or at the end of style tag 1.
if 'Theme Custom Overrides for Black Navbar' not in html_content:
    # Inject before </style> of Style tag 1 (which handles nav)
    # Let's find a unique selector in style block 1, like "#nav_scroll_container"
    # We will append the overrides right before the closing </style> tag in index.html
    # Let's find </style> around line 6279 (where Style tag 1 ended)
    style_end_pattern = '</style>'
    # Let's write a python replacement to inject it inside the main style block
    # Let's find where nav styles are and append
    pos = html_content.find('/* ── NAV_SCROLL bar ── */')
    if pos != -1:
        # Find the next </style> after this position
        style_close_pos = html_content.find('</style>', pos)
        if style_close_pos != -1:
            html_content = html_content[:style_close_pos] + '\n' + navbar_overrides + '\n' + html_content[style_close_pos:]
            with open(index_html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print("Injected overrides to index.html style tag")
        else:
            print("Could not find closing style tag after nav styles")
    else:
        print("Could not find nav styles pattern in index.html")
