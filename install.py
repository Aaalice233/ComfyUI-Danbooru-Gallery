import launch
import os

# Get the directory of the current script
current_dir = os.path.dirname(os.path.realpath(__file__))
# Construct the path to requirements.txt
requirements_path = os.path.join(current_dir, "requirements.txt")

with open(requirements_path) as f:
    for lib in f:
        lib = lib.strip()
        if lib and not launch.is_installed(lib):
            print(f"Installing {lib}...")
            launch.run_pip(f"install {lib}", f"{lib} for ComfyUI-Danbooru-Gallery")