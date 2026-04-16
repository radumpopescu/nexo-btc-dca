from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .models import SettingsUpdate
from .storage import Database


def default_db_path() -> Path:
    return Path(__file__).resolve().parents[2] / 'data' / 'nexo-dca.sqlite3'


def create_app(db: Database | None = None, now_provider=None) -> FastAPI:
    app = FastAPI(title='Nexo BTC DCA Mock App')
    app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

    frontend_dist = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
    current_time = now_provider or (lambda: datetime.now(timezone.utc).replace(microsecond=0))
    database = db or Database(default_db_path(), now_provider=current_time)
    database.now_provider = current_time
    database.initialize()

    @app.get('/api/state')
    def get_state(date_from: date | None = None, date_to: date | None = None):
        return database.build_state_payload(current_time(), date_from=date_from, date_to=date_to)

    @app.put('/api/settings')
    def update_settings(update: SettingsUpdate):
        database.update_settings(update)
        return database.build_state_payload(current_time())

    @app.post('/api/mock/run')
    def run_mock_buy():
        executed, order, message = database.run_due_mock_buy(current_time())
        return {
            'executed': executed,
            'message': message,
            'order': order.model_dump(mode='json') if order else None,
            'state': database.build_state_payload(current_time()),
        }

    if frontend_dist.exists():
        app.mount('/assets', StaticFiles(directory=frontend_dist / 'assets'), name='assets')

    @app.get('/')
    def serve_frontend():
        index_file = frontend_dist / 'index.html'
        if index_file.exists():
            return FileResponse(index_file)
        return {'message': 'Frontend build missing. Run the frontend build first.'}

    return app


app = create_app()
