import re

filepath = "c:/nud/nud/nudot.com.tw/index.html"

try:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
except UnicodeDecodeError:
    pass

original = content

# Fix CSS for huge-text so MILLIONAIRE fits by reducing vw multiplier
content = content.replace("--text-display-lg: clamp(2.5rem, 9.5vw, 8rem);", "--text-display-lg: clamp(2rem, 5vw, 6rem);")
content = content.replace("--text-display-lg: clamp(4rem, 15vw, 11.5rem);", "--text-display-lg: clamp(2rem, 5vw, 6rem);")

# Remove CSS pseudo-element brackets for hero-title
content = content.replace('content: "( ";', 'content: "";')
content = content.replace('content: " )";', 'content: "";')

# Remove leftover brackets if any
content = content.replace("( Content · AI · Performance )", "Content · AI · Performance")

if content != original:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed layout and CSS pseudo-brackets in index.html")
else:
    print("No changes needed in index.html")
