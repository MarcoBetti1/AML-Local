# run.py
import sys
import os
# Add the project root directory to the Python path
project_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# Add the src directory to the Python path
src_path = os.path.join(project_root, 'src')
sys.path.insert(0, src_path)

from uxui.app import create_app

if __name__ == '__main__':
    # Create and run the Flask app
    app = create_app()
    app.run(debug=True)