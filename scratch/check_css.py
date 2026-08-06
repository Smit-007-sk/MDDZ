import re

with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find all stylesheet links
links = re.findall(r'<link[^>]*stylesheet[^>]*>', content, re.IGNORECASE)
print("Stylesheet links:", links)

# Find all style tags
styles = re.findall(r'<style[^>]*>', content, re.IGNORECASE)
print("Style tags count:", len(styles))

# Check for variables.css or css/
imports = re.findall(r'@import[^;]*;', content, re.IGNORECASE)
print("Imports:", imports)

# Check for variables.css reference
if 'variables.css' in content:
    print("variables.css is referenced in index.html")
else:
    print("variables.css is NOT referenced in index.html")
