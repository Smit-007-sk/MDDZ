import re

with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find all style tags and print the first 100 characters of each
styles = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)
for idx, style in enumerate(styles):
    print(f"Style tag {idx}: length={len(style)}, snippet: {style[:200].strip()}...")
