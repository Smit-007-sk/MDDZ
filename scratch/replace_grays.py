import os
import re

files = [
    'c:/MDDZ/index.html',
    'c:/MDDZ/css/variables.css',
    'c:/MDDZ/css/global.css',
    'c:/MDDZ/css/sections/hero.css',
    'c:/MDDZ/css/sections/scs.css',
    'c:/MDDZ/css/sections/stm.css',
    'c:/MDDZ/css/sections/core-capabilities.css',
    'c:/MDDZ/css/sections/gallery.css',
    'c:/MDDZ/css/sections/footer.css',
    'c:/MDDZ/css/sections/loader.css',
    'c:/MDDZ/css/sections/nav.css',
    'c:/MDDZ/css/sections/page-transitions.css'
]

# We want to replace grays and leftover dark colors in all CSS files and inline styles.
def replace_grays_in_text(content):
    # 1. Replace hardcoded dark backgrounds in sections/footer
    content = content.replace('background-color: #000000;', 'background-color: var(--color-bg);')
    content = content.replace('background-color: #0d0d0d;', 'background-color: var(--color-bg-secondary);')
    content = content.replace('background-color: #141414;', 'background-color: var(--color-bg-secondary);')
    content = content.replace('border-top: 1px solid #222;', 'border-top: 1px solid var(--color-gold-line);')
    content = content.replace('background: #222;', 'background: var(--color-gold-line);')
    content = content.replace('color: #575757;', 'color: var(--color-text-secondary);')
    content = content.replace('background-color: #d9d9d9;', 'background-color: var(--color-gold-line);')

    # 2. Fade overlays using black gradient -> replace with white/ivory gradient (#FDFAF6)
    # e.g., rgba(0,0,0,0.96) -> rgba(253,250,246,0.96)
    # rgba(0,0,0,0.72) -> rgba(253,250,246,0.72)
    # rgba(0,0,0,0) -> rgba(253,250,246,0)
    # rgba(0,0,0,0.98) -> rgba(253,250,246,0.98)
    # rgba(0,0,0,0.78) -> rgba(253,250,246,0.78)
    content = re.sub(r'rgba\(0,\s*0,\s*0,\s*([0-9.]+)\)', r'rgba(253, 250, 246, \1)', content)

    # 3. White text color rules -> replace with dark text (since bg is now light)
    # e.g., color: rgba(255, 255, 255, 0.9) -> color: rgba(23, 20, 17, 0.9)
    # We do this for color rules
    def repl_rgba_text(match):
        opacity = match.group(1)
        # Convert white text opacity to dark text opacity
        return f'color: rgba(23, 20, 17, {opacity})'
    
    content = re.sub(r'color:\s*rgba\(255,\s*255,\s*255,\s*([0-9.]+)\)', repl_rgba_text, content)

    # 4. White border rules -> replace with gold/emerald borders
    # e.g., border: 1px solid rgba(255, 255, 255, 0.1) -> border: 1px solid var(--color-gold-line)
    # border-bottom: 1px solid rgba(255, 255, 255, 0.3)
    content = re.sub(r'rgba\(255,\s*255,\s*255,\s*(0\.[0-9]+|1)\)', 'var(--color-gold-line)', content)

    # 5. Fix text color in menu links that became 'var(--color-text)fff'
    content = content.replace('var(--color-text)fff', 'var(--color-text)')

    # 6. Navbar menu button style adjustment
    # Let's make menu button background emerald green and text white
    content = content.replace('background: #fff;\n  color: #000;', 'background: var(--color-emerald);\n  color: #fff;')
    content = content.replace('#menu-btn:hover { background: #e0e0e0; }', '#menu-btn:hover { background: var(--color-gold); color: #fff; }')

    return content

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        new_content = replace_grays_in_text(content)
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Cleaned up gray/dark colors in {filepath}")
