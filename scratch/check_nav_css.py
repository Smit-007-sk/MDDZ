import re

with open('c:/MDDZ/css/sections/nav.css', 'r', encoding='utf-8', errors='ignore') as f:
    nav_css = f.read()

# Print lines containing background or color
for line in nav_css.split('\n'):
    if 'background' in line or 'color' in line:
        print(line.strip())
