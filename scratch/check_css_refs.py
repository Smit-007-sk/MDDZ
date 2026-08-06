import os
import re

with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Let's search for references to any CSS files in index.html
css_files = []
for root, dirs, files in os.walk('c:/MDDZ/css'):
    for file in files:
        if file.endswith('.css'):
            css_files.append(file)

print("CSS files in folder:", css_files)
for css_file in css_files:
    if css_file in content:
        print(f"{css_file} is referenced in index.html")
    else:
        # Check if the filename without extension is present
        base = os.path.splitext(css_file)[0]
        if base in content:
            print(f"Basename '{base}' (from {css_file}) is referenced in index.html")
