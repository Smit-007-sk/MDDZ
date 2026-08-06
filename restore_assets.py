import os
import subprocess

print("Restoring original image and js folders from git...")
try:
    subprocess.run(["git", "restore", "images/"], check=True)
    subprocess.run(["git", "restore", "js/"], check=True)
    subprocess.run(["git", "restore", "css/"], check=True)
    print("Successfully restored images, js, and css folders!")
except Exception as e:
    print(f"Error restoring from git: {e}")
