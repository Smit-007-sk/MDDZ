import os
import re

def process_content(content):
    # 1. Update variables in :root
    # We want to replace color variables in :root
    # Find --color-text and --color-bg
    content = re.sub(r'--color-text:\s*[^;]+;', '--color-text: #171411;', content)
    content = re.sub(r'--color-bg:\s*[^;]+;', '--color-bg: #FDFAF6;\n  --color-bg-secondary: #f4efe6;\n  --color-emerald: #046A38;\n  --color-gold: #c89a45;\n  --color-gold-gradient: linear-gradient(135deg, #dfba6b 0%, #c89a45 50%, #9e7225 100%);\n  --color-gold-line: rgba(200, 154, 69, 0.35);\n  --color-text-secondary: #5a544d;', content)

    # 2. Update body styling to add the glowing gold background waves on the sides
    # Check if there is body { background-color: var(--color-bg); ... }
    # Let's replace the body styling
    body_pattern = r'(body\s*\{[^}]*background-color:\s*var\(--color-bg\);[^}]*\})'
    def body_repl(match):
        style = match.group(1)
        # Add background-image for the glowing waves
        if 'background-image' not in style:
            style = style.replace(
                'background-color: var(--color-bg);',
                'background-color: var(--color-bg);\n      background-image: \n        radial-gradient(circle at 0% 50%, rgba(200, 154, 69, 0.08) 0%, transparent 40%),\n        radial-gradient(circle at 100% 50%, rgba(200, 154, 69, 0.08) 0%, transparent 40%);\n      background-attachment: fixed;'
            )
        return style
    content = re.sub(body_pattern, body_repl, content)

    # 3. Replace hardcoded black backgrounds and white texts
    # Replace #000, #030303, #080808, #0a0a0a in background rules
    content = re.sub(r'background:\s*#000(?!000)', 'background: var(--color-bg)', content)
    content = re.sub(r'background-color:\s*#000(?!000)', 'background-color: var(--color-bg)', content)
    content = re.sub(r'background:\s*#030303', 'background: var(--color-bg)', content)
    content = re.sub(r'background-color:\s*#030303', 'background-color: var(--color-bg)', content)
    content = re.sub(r'background:\s*#080808', 'background: var(--color-bg-secondary)', content)
    content = re.sub(r'background-color:\s*#080808', 'background-color: var(--color-bg-secondary)', content)
    content = re.sub(r'background:\s*#0a0a0a', 'background: var(--color-bg)', content)
    content = re.sub(r'background-color:\s*#0a0a0a', 'background-color: var(--color-bg)', content)
    content = re.sub(r'background:\s*#050505', 'background: var(--color-bg)', content)
    content = re.sub(r'background-color:\s*#050505', 'background-color: var(--color-bg)', content)

    # Replace color: #fff and #ffffff
    content = re.sub(r'color:\s*#fff(?!d)', 'color: var(--color-text)', content)
    content = re.sub(r'color:\s*#ffffff', 'color: var(--color-text)', content)
    content = re.sub(r'color:\s*#a0a0a0', 'color: var(--color-text-secondary)', content)
    content = re.sub(r'color:\s*#888', 'color: var(--color-text-secondary)', content)
    content = re.sub(r'color:\s*#aaa', 'color: var(--color-text-secondary)', content)

    # 4. Remove mix-blend-mode: difference from text elements
    content = re.sub(r'mix-blend-mode:\s*difference\s*;?', 'mix-blend-mode: normal;', content)

    # 5. Replace scrollbar track
    content = re.sub(r'body::-webkit-scrollbar-track\s*\{\s*background:\s*#000;\s*\}', 'body::-webkit-scrollbar-track { background: var(--color-bg-secondary); }', content)
    content = re.sub(r'scrollbar-color:\s*rgba\(255,\s*255,\s*255,\s*0.18\)\s*#000;', 'scrollbar-color: var(--color-gold-line) var(--color-bg-secondary);', content)
    content = re.sub(r'body::-webkit-scrollbar-thumb\s*\{\s*background:\s*rgba\(255,\s*255,\s*255,\s*0.18\);', 'body::-webkit-scrollbar-thumb { background: var(--color-gold-line);', content)

    return content

# Read and process index.html
with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

new_html = process_content(html)

# Let's add the custom header layout stylings to index.html style block
# Specifically, we want to style MILLIONAIRE in gold gradient and DIZITAL in emerald green
# Let's find where .huge-text is styled and append our rules
huge_text_rules = """
.top-header .huge-text:nth-of-type(1) {
  background: var(--color-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.top-header .huge-text:nth-of-type(2) {
  color: var(--color-emerald);
}
.top-header .small-tag {
  color: var(--color-emerald);
}
.services-list li {
  color: var(--color-text-secondary);
}
.services-list li:hover {
  color: var(--color-emerald);
}
"""

if '.top-header .huge-text:nth-of-type(1)' not in new_html:
    # Add it right after .huge-text { ... }
    new_html = re.sub(r'(\.huge-text\s*\{[^}]*\})', r'\1\n' + huge_text_rules, new_html)

# Let's write the updated index.html
with open('c:/MDDZ/index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
print("Updated index.html")

# Let's also update the stylesheets in css/ folder to match
css_files = [
    'c:/MDDZ/css/variables.css',
    'c:/MDDZ/css/global.css',
    'c:/MDDZ/css/sections/hero.css',
    'c:/MDDZ/css/sections/scs.css',
    'c:/MDDZ/css/sections/stm.css',
    'c:/MDDZ/css/sections/core-capabilities.css',
    'c:/MDDZ/css/sections/gallery.css',
    'c:/MDDZ/css/sections/footer.css',
    'c:/MDDZ/css/sections/loader.css',
    'c:/MDDZ/css/sections/nav.css'
]

for css_file in css_files:
    if os.path.exists(css_file):
        with open(css_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        new_content = process_content(content)
        if '.top-header .huge-text:nth-of-type(1)' not in new_content and 'hero.css' in css_file:
            new_content = re.sub(r'(\.huge-text\s*\{[^}]*\})', r'\1\n' + huge_text_rules, new_content)
        with open(css_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {css_file}")
