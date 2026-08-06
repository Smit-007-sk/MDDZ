import re

filepath = "c:/nud/nud/nudot.com.tw/index.html"

try:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
except UnicodeDecodeError:
    pass

original = content

# Fix CSS for huge-text so MILLIONAIRE fits
content = content.replace("--text-display-lg: clamp(4rem, 15vw, 11.5rem);", "--text-display-lg: clamp(2.5rem, 9.5vw, 8rem);")

# Remove brackets from specific texts
content = content.replace("( Content · AI · Performance )", "Content · AI · Performance")
content = content.replace("( We don't do marketing. We build demand. )", "We don't do marketing. We build demand.")
content = content.replace("( Performance Ads )", "Performance Ads")
content = content.replace("( SEO & Local SEO )", "SEO & Local SEO")
content = content.replace("( Video Production )", "Video Production")
content = content.replace("( Web & 3D )", "Web & 3D")
content = content.replace("( The MDZ Aesthetic )", "The MDZ Aesthetic")
content = content.replace('data-text="( HOME )"', 'data-text="HOME"')
content = content.replace('data-text="(  )"', 'data-text=""')

# Fix any empty brackets like (  ) in divs
content = re.sub(r'<div>\(\s*\)</div>', '<div></div>', content)
content = content.replace("( ， )", "")
content = content.replace("(  )", "")

if content != original:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed layout and brackets in index.html")
else:
    print("No changes needed in index.html")


filepath_hero = "c:/nud/nud/nudot.com.tw/sections/hero.html"
try:
    with open(filepath_hero, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("( Brand Direction )", "Brand Direction")
    with open(filepath_hero, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed brackets in hero.html")
except Exception:
    pass

