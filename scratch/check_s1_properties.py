import re

with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find all background and color rules in <style> tags of index.html
style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)

# Let's see what style properties they use. Let's find background, color, border, etc.
# in Style tag 1 (which has 67KB of CSS)
s1 = style_blocks[1]

# Find matches for background: #..., background-color: #..., color: #...
bg_matches = re.findall(r'background:\s*[^;}\n]+|background-color:\s*[^;}\n]+|color:\s*[^;}\n]+', s1)
print("Some CSS properties in style tag 1:")
for match in bg_matches[:50]:
    print(match.strip())
