import os
import shutil
import re

source_dir = "c:/nud/nud/nudot.com.tw"
target_dir = os.path.join(source_dir, "combine_web")

# Folders and files to completely ignore
IGNORE_FOLDERS = ["archive", "combine_web", ".git", ".idea", ".vscode"]
IGNORE_EXTENSIONS = [".py", ".pdf", ".md"]
IGNORE_FILES = []

if os.path.exists(target_dir):
    shutil.rmtree(target_dir)
os.makedirs(target_dir)

def should_ignore(item_name, is_dir):
    if is_dir:
        return item_name in IGNORE_FOLDERS
    else:
        if item_name in IGNORE_FILES:
            return True
        for ext in IGNORE_EXTENSIONS:
            if item_name.endswith(ext):
                return True
        return False

# Copy all valid files and directories
for item in os.listdir(source_dir):
    item_path = os.path.join(source_dir, item)
    is_dir = os.path.isdir(item_path)
    
    if not should_ignore(item, is_dir):
        dest_path = os.path.join(target_dir, item)
        if is_dir:
            shutil.copytree(item_path, dest_path)
        else:
            shutil.copy2(item_path, dest_path)

# Fix absolute URLs in index.html inside the new bundle
index_file = os.path.join(target_dir, "index.html")
if os.path.exists(index_file):
    with open(index_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the absolute domain with relative paths (./)
    content = content.replace("https://nudot.com.tw/images/", "./images/")
    content = content.replace("https://nudot.com.tw/js/", "./js/")
    content = content.replace("https://nudot.com.tw/css/", "./css/")
    content = content.replace("https://nudot.com.tw/sections/", "./sections/")
    # Catch any remaining ones
    content = content.replace("https://nudot.com.tw/", "./")
    
    with open(index_file, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Successfully bundled everything into {target_dir}")
print("Absolute URLs were converted to relative paths so the site works offline/locally.")
