import os
import shutil
import re

source_dir = "c:/MDDZ"
target_dir = os.path.join(source_dir, "millionaire-dizital-structured")

if os.path.exists(target_dir):
    shutil.rmtree(target_dir)
os.makedirs(target_dir)

# 1. Copy asset directories
folders_to_copy = ["css", "js", "images", "sections"]
for folder in folders_to_copy:
    src_folder_path = os.path.join(source_dir, folder)
    if os.path.exists(src_folder_path):
        dest_folder_path = os.path.join(target_dir, folder)
        shutil.copytree(src_folder_path, dest_folder_path)

# Copy configuration and package files
files_to_copy = ["package.json", "package-lock.json", "noise.js", "transitions.js"]
for file in files_to_copy:
    src_file_path = os.path.join(source_dir, file)
    if os.path.exists(src_file_path):
        shutil.copy2(src_file_path, os.path.join(target_dir, file))

# 2. Read the index.html
with open(os.path.join(source_dir, "index.html"), "r", encoding="utf-8") as f:
    html = f.read()

# 3. Extract and replace the massive inline style
# Usually looks like <style>...</style> in the head
style_pattern = re.compile(r'<style\b[^>]*>(.*?)</style>', re.DOTALL)
styles = style_pattern.findall(html)

if styles:
    # Combine styles if there are multiple, or just take the main one
    combined_css = "\n\n".join(styles)
    # Write to target css/inline-styles.css
    css_target_dir = os.path.join(target_dir, "css")
    os.makedirs(css_target_dir, exist_ok=True)
    with open(os.path.join(css_target_dir, "inline-styles.css"), "w", encoding="utf-8") as f:
        f.write(combined_css)
    
    # Replace in html with stylesheet link
    # We replace the first style tag with the link and remove the rest
    html = style_pattern.sub("", html)
    # Insert link in head before </head>
    html = html.replace("</head>", '  <link rel="stylesheet" href="css/inline-styles.css">\n</head>', 1)

# 4. Extract long inline scripts into external files
# We can find all inline scripts and if their character length is > 500, we move them to external js files.
script_pattern = re.compile(r'<script\b([^>]*)>(.*?)</script>', re.DOTALL)
scripts = list(script_pattern.finditer(html))

# We will replace them in-place with script links, but we need to do it carefully.
# Let's rebuild the HTML by replacing the matched segments.
new_html = []
last_pos = 0
script_index = 1

js_target_dir = os.path.join(target_dir, "js")
os.makedirs(js_target_dir, exist_ok=True)

for match in scripts:
    attrs = match.group(1)
    content = match.group(2)
    start, end = match.span()
    
    # Append the HTML before the script tag
    new_html.append(html[last_pos:start])
    
    # Check if this is an inline script (no src attribute) and it's long (> 200 chars)
    if "src=" not in attrs and len(content.strip()) > 200:
        filename = f"inline-script-{script_index}.js"
        file_path = os.path.join(js_target_dir, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        new_html.append(f'<script src="js/{filename}"></script>')
        script_index += 1
    else:
        # Keep the script tag as-is
        new_html.append(match.group(0))
        
    last_pos = end

new_html.append(html[last_pos:])
final_html = "".join(new_html)

# Replace local domain references to relative paths for offline/local hosting
final_html = final_html.replace("https://nudot.com.tw/images/", "./images/")
final_html = final_html.replace("https://nudot.com.tw/js/", "./js/")
final_html = final_html.replace("https://nudot.com.tw/css/", "./css/")
final_html = final_html.replace("https://nudot.com.tw/sections/", "./sections/")
final_html = final_html.replace("https://nudot.com.tw/", "./")

# Write index.html to target
with open(os.path.join(target_dir, "index.html"), "w", encoding="utf-8") as f:
    f.write(final_html)

print("Structuring completed successfully!")
print(f"Structured project is available at: {target_dir}")
