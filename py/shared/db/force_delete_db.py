"""
强制删除损坏的数据库文件
Force delete corrupted database file
"""
import os
import sys
import time
import gc
from pathlib import Path

def force_delete_database():
    """强制删除数据库文件"""
    db_path = Path(__file__).parent.parent / "data" / "tags_cache.db"

    print(f"[ForceDelete] Target file: {db_path}")

    if not db_path.exists():
        print("[ForceDelete] Database file does not exist, no need to delete")
        return True

    try:
        # 尝试导入 db_manager 并关闭所有连接
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from db.db_manager import get_db_manager

            print("[ForceDelete] Closing database connections...")
            db = get_db_manager()

            # 关闭连接
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(db.close())
            loop.close()

            print("[ForceDelete] Database connections closed")

            # 强制垃圾回收
            gc.collect()
            time.sleep(0.5)

        except Exception as e:
            print(f"[ForceDelete] Error closing connections: {e}")
            print("[ForceDelete] Continue trying to delete...")

        # 尝试删除文件
        print("[ForceDelete] Deleting file...")

        # Windows 下可能需要多次尝试
        max_attempts = 5
        for attempt in range(max_attempts):
            try:
                os.remove(db_path)
                print("[ForceDelete] SUCCESS: Database file deleted")
                return True
            except PermissionError:
                if attempt < max_attempts - 1:
                    print(f"[ForceDelete] File is busy, retrying... ({attempt + 1}/{max_attempts})")
                    time.sleep(1)
                else:
                    print("[ForceDelete] FAILED: Cannot delete file, still in use")
                    print("[ForceDelete] Please close ComfyUI and delete manually")
                    return False
            except Exception as e:
                print(f"[ForceDelete] FAILED: {e}")
                return False

    except Exception as e:
        print(f"[ForceDelete] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = force_delete_database()
    sys.exit(0 if success else 1)
