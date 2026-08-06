import re

filepath = "c:/nud/nud/nudot.com.tw/index.html"

try:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
except UnicodeDecodeError:
    pass

# We will replace the .huge-text font-size inside the media queries.
# Specifically lines 7650 to 7760.
content = re.sub(
    r'@media \(min-width: 1730px\) \{[\s\S]*?\.huge-text \{[\s\S]*?font-size: clamp\(9rem, 10vw, 11\.5rem\);',
    r'@media (min-width: 1730px) {\n\n      .huge-text {\n\n        font-size: clamp(4rem, 5vw, 7rem);',
    content
)

content = re.sub(
    r'@media \(min-width: 1560px\) and \(max-width: 1730px\) \{[\s\S]*?\.huge-text \{[\s\S]*?font-size: 10rem;',
    r'@media (min-width: 1560px) and (max-width: 1730px) {\n\n      .huge-text {\n\n        font-size: 6rem;',
    content
)

content = re.sub(
    r'@media \(min-width: 1280px\) and \(max-width: 1560px\) \{[\s\S]*?\.huge-text \{[\s\S]*?font-size: 9rem;',
    r'@media (min-width: 1280px) and (max-width: 1560px) {\n\n      .huge-text {\n\n        font-size: 5rem;',
    content
)

content = re.sub(
    r'@media \(min-width: 1024px\) and \(max-width: 1280px\) \{[\s\S]*?\.huge-text \{[\s\S]*?font-size: 7rem;',
    r'@media (min-width: 1024px) and (max-width: 1280px) {\n\n      .huge-text {\n\n        font-size: 4rem;',
    content
)

content = re.sub(
    r'@media \(min-width: 768px\) and \(max-width: 1024px\) \{[\s\S]*?\.huge-text \{[\s\S]*?font-size: 5rem;',
    r'@media (min-width: 768px) and (max-width: 1024px) {\n\n      .huge-text {\n\n        font-size: 3rem;',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed media query font sizes for huge-text in index.html")
