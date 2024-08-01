from flask import Flask

def create_app():
    app = Flask(__name__, template_folder='templates')
    
    from .views import main
    app.register_blueprint(main)
    
    from .api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    return app