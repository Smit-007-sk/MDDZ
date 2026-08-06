import re

# File paths to check and fix
files = [
    'c:/MDDZ/index.html',
    'c:/MDDZ/css/variables.css',
    'c:/MDDZ/css/sections/loader.css',
    'c:/MDDZ/css/sections/page-transitions.css'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original = content
    
    # Replace --pt-bg: #000 with var(--color-bg) or specific color
    content = re.sub(r'--pt-bg:\s*#000;', '--pt-bg: var(--color-bg);', content)
    content = re.sub(r'--pt-bg:\s*#000', '--pt-bg: var(--color-bg)', content)
    
    # Replace box-shadow color in loader from #080808 to var(--color-bg) or #FDFAF6
    content = re.sub(r'box-shadow:\s*0\s*0\s*0\s*150vmax\s*#080808;', 'box-shadow: 0 0 0 150vmax var(--color-bg);', content)
    content = re.sub(r'box-shadow:\s*0\s*0\s*0\s*150vmax\s*#080808', 'box-shadow: 0 0 0 150vmax var(--color-bg)', content)
    
    # Also fix general fallback in transitions.js
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed extra details in {filepath}")

# Let's also check transitions.js for the fallback color
with open('c:/MDDZ/transitions.js', 'r', encoding='utf-8', errors='ignore') as f:
    js_content = f.read()

new_js = js_content.replace("cell.style.background = 'var(--pt-bg, #000)';", "cell.style.background = 'var(--pt-bg, var(--color-bg))';")
if new_js != js_content:
    with open('c:/MDDZ/transitions.js', 'w', encoding='utf-8') as f:
        f.write(new_js)
    print("Fixed transitions.js fallback background color")
