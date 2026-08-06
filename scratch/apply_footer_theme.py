import os

# Files to update
footer_css_path = 'c:/MDDZ/css/sections/footer.css'
index_html_path = 'c:/MDDZ/index.html'

# 1. Update footer.css
with open(footer_css_path, 'r', encoding='utf-8', errors='ignore') as f:
    css_content = f.read()

# Make contact email/phone links use the golden gradient
old_contact = ".footer-contact-info a { display: block; color: var(--color-text); text-decoration: none; font-size: clamp(20px, 3.5vw, 50px); font-weight: 400; margin-bottom: 4px; transition: opacity 0.2s; }"
new_contact = """.footer-contact-info a {
  display: inline-block;
  background: var(--color-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
  font-size: clamp(20px, 3.5vw, 50px);
  font-weight: 600;
  margin-bottom: 4px;
  transition: opacity 0.2s;
}"""
css_content = css_content.replace(old_contact, new_contact)

# Make social links use the emerald green
old_social = ".footer-nav-links a { color: var(--color-text); text-decoration: none; font-size: 16px; text-transform: uppercase; letter-spacing: 1.5px; transition: opacity 0.2s; }"
new_social = """.footer-nav-links a {
  color: var(--color-emerald);
  font-weight: 600;
  text-decoration: none;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  transition: color 0.2s ease, opacity 0.2s ease;
}
.footer-nav-links a:hover {
  background: var(--color-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  opacity: 1;
}"""
css_content = css_content.replace(old_social, new_social)

# Make the copyright (c) symbol use emerald green
css_content = css_content.replace('color: var(--color-text); line-height: 1; }', 'color: var(--color-emerald); line-height: 1; }')

# Make the footer divider line use the golden gradient
css_content = css_content.replace('background: var(--color-gold-line); transform-origin: left center;', 'background: var(--color-gold-gradient); transform-origin: left center;')

with open(footer_css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)
print("Updated footer.css")


# 2. Update index.html
with open(index_html_path, 'r', encoding='utf-8', errors='ignore') as f:
    html_content = f.read()

# Replace the duplicates inline in index.html to match
html_content = html_content.replace(old_contact, new_contact)
html_content = html_content.replace(old_social, new_social)
html_content = html_content.replace('color: var(--color-text); line-height: 1; }', 'color: var(--color-emerald); line-height: 1; }')
html_content = html_content.replace('background: var(--color-gold-line); transform-origin: left center;', 'background: var(--color-gold-gradient); transform-origin: left center;')

# Change the watermark color to light emerald
html_content = html_content.replace('color: rgba(23, 20, 17, 0.08); line-height: 0.75;', 'color: rgba(4, 106, 56, 0.07); line-height: 0.75;')

with open(index_html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)
print("Updated index.html")
