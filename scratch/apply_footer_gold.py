# Let's overhaul the footer to use a premium 50% gold theme
footer_css_path = 'c:/MDDZ/css/sections/footer.css'
index_html_path = 'c:/MDDZ/index.html'

# 1. Update footer.css
with open(footer_css_path, 'r', encoding='utf-8', errors='ignore') as f:
    css = f.read()

# Make the email link and the phone number span both display block, use gold gradient and solid gold color
css = css.replace(
    '.footer-contact-info a { display: block; color: var(--color-text); text-decoration: none; font-size: clamp(20px, 3.5vw, 50px); font-weight: 400; margin-bottom: 4px; transition: opacity 0.2s; }',
    '.footer-contact-info a { display: block; background: var(--color-gold-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #c89a45; text-decoration: none; font-size: clamp(20px, 3.5vw, 50px); font-weight: 600; margin-bottom: 4px; transition: opacity 0.2s; }'
)

# Overwrite the new rule from apply_footer_theme.py if it is already there
css = css.replace(
    """.footer-contact-info a {
  display: inline-block;
  background: var(--color-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
  font-size: clamp(20px, 3.5vw, 50px);
  font-weight: 600;
  margin-bottom: 4px;
  transition: opacity 0.2s;
}""",
    """.footer-contact-info a,
.footer-contact-info span {
  display: block;
  background: var(--color-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #c89a45;
  text-decoration: none;
  font-size: clamp(20px, 3.5vw, 50px);
  font-weight: 600;
  margin-bottom: 4px;
  transition: opacity 0.2s;
}"""
)

# Also make the separate span rule use gold
css = css.replace(
    '.footer-contact-info span { color: var(--color-text); font-size: clamp(18px, 2.5vw, 30px); }',
    '.footer-contact-info span { color: #c89a45; font-size: clamp(18px, 2.5vw, 30px); }'
)

# Make the copyright (c) symbol gold
css = css.replace(
    '.footer-copyright-bridge span { font-family: \'Zalando Sans SemiExpanded\', \'DM Sans\', sans-serif; font-size: 180px; font-weight: 600; color: var(--color-emerald); line-height: 1; }',
    '.footer-copyright-bridge span { font-family: \'Zalando Sans SemiExpanded\', \'DM Sans\', sans-serif; font-size: 180px; font-weight: 600; color: var(--color-gold); line-height: 1; }'
)
css = css.replace(
    '.footer-copyright-bridge span { font-family: \'Zalando Sans SemiExpanded\', \'DM Sans\', sans-serif; font-size: 180px; font-weight: 600; color: var(--color-text); line-height: 1; }',
    '.footer-copyright-bridge span { font-family: \'Zalando Sans SemiExpanded\', \'DM Sans\', sans-serif; font-size: 180px; font-weight: 600; color: var(--color-gold); line-height: 1; }'
)

# Make the footer brand title use the gold gradient!
css = css.replace(
    'color: var(--color-text);\n  margin-bottom: 40px;',
    'background: var(--color-gold-gradient);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n  color: #c89a45;\n  margin-bottom: 40px;'
)

with open(footer_css_path, 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated footer.css")


# 2. Update index.html
with open(index_html_path, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Apply the same string replacements to index.html
html = html.replace(
    '.footer-contact-info a { display: block; color: var(--color-text); text-decoration: none; font-size: clamp(20px, 3.5vw, 50px); font-weight: 400; margin-bottom: 4px; transition: opacity 0.2s; }',
    '.footer-contact-info a { display: block; background: var(--color-gold-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #c89a45; text-decoration: none; font-size: clamp(20px, 3.5vw, 50px); font-weight: 600; margin-bottom: 4px; transition: opacity 0.2s; }'
)
html = html.replace(
    """.footer-contact-info a {
  display: inline-block;
  background: var(--color-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
  font-size: clamp(20px, 3.5vw, 50px);
  font-weight: 600;
  margin-bottom: 4px;
  transition: opacity 0.2s;
}""",
    """.footer-contact-info a,
.footer-contact-info span {
  display: block;
  background: var(--color-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #c89a45;
  text-decoration: none;
  font-size: clamp(20px, 3.5vw, 50px);
  font-weight: 600;
  margin-bottom: 4px;
  transition: opacity 0.2s;
}"""
)
html = html.replace(
    '.footer-contact-info span { color: var(--color-text); font-size: clamp(18px, 2.5vw, 30px); }',
    '.footer-contact-info span { color: #c89a45; font-size: clamp(18px, 2.5vw, 30px); }'
)
html = html.replace(
    '.footer-copyright-bridge span { font-family: \'Zalando Sans SemiExpanded\', \'DM Sans\', sans-serif; font-size: 180px; font-weight: 600; color: var(--color-emerald); line-height: 1; }',
    '.footer-copyright-bridge span { font-family: \'Zalando Sans SemiExpanded\', \'DM Sans\', sans-serif; font-size: 180px; font-weight: 600; color: var(--color-gold); line-height: 1; }'
)
html = html.replace(
    '.footer-copyright-bridge span { font-family: \'Zalando Sans SemiExpanded\', \'DM Sans\', sans-serif; font-size: 180px; font-weight: 600; color: var(--color-text); line-height: 1; }',
    '.footer-copyright-bridge span { font-family: \'Zalando Sans SemiExpanded\', \'DM Sans\', sans-serif; font-size: 180px; font-weight: 600; color: var(--color-gold); line-height: 1; }'
)
html = html.replace(
    'color: var(--color-text);\n  margin-bottom: 40px;',
    'background: var(--color-gold-gradient);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n  color: #c89a45;\n  margin-bottom: 40px;'
)

# Change the "MDZ" watermark color to gold
html = html.replace('color: rgba(4, 106, 56, 0.07); line-height: 0.75;', 'color: rgba(200, 154, 69, 0.12); line-height: 0.75;')

with open(index_html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html")
