import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import settings

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _table_names(db_path: Path) -> set[str]:
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        return {row[0] for row in rows}
    finally:
        conn.close()


def test_alembic_upgrade_head_creates_all_tables(tmp_path, monkeypatch):
    db_path = tmp_path / "migration_test.db"
    # env.py가 sync_database_url을 읽을 때 settings 싱글턴을 그대로 참조하므로, 실제 개발 DB
    # 파일 대신 임시 SQLite로 돌리려면 여기서 database_url을 바꿔치기해야 한다.
    monkeypatch.setattr(settings, "database_url", f"sqlite+aiosqlite:///{db_path}")

    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    command.upgrade(cfg, "head")

    tables = _table_names(db_path)
    assert {"users", "diaries", "emotion_analyses", "alembic_version"} <= tables


def test_alembic_upgrade_head_is_safe_to_run_twice(tmp_path, monkeypatch):
    db_path = tmp_path / "migration_test.db"
    monkeypatch.setattr(settings, "database_url", f"sqlite+aiosqlite:///{db_path}")

    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    command.upgrade(cfg, "head")
    command.upgrade(cfg, "head")  # 배포 스크립트에서 재실행돼도 에러 없이 no-op이어야 한다.

    tables = _table_names(db_path)
    assert {"users", "diaries", "emotion_analyses", "alembic_version"} <= tables
