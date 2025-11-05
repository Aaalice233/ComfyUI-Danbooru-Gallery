"""
Test database health check and auto-recovery mechanism
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.db_manager import get_db_manager
from sync.tag_sync_manager import get_sync_manager


async def test_health_check():
    """Test database health check"""
    print("=" * 60)
    print("Testing Database Health Check")
    print("=" * 60)

    db = get_db_manager()

    # Test 1: Check health of existing database (if exists)
    print("\n[Test 1] Checking database health...")
    is_healthy, error_msg = await db.check_database_health()

    if is_healthy:
        print("[Test 1] PASS: Database is healthy")
    else:
        print(f"[Test 1] FAIL: Database is corrupted - {error_msg}")

    await db.close()


async def test_sync_manager_initialization():
    """Test sync manager initialization with auto-recovery"""
    print("\n" + "=" * 60)
    print("Testing Sync Manager Initialization")
    print("=" * 60)

    manager = get_sync_manager()

    print("\n[Test 2] Testing sync manager initialization...")
    success = await manager.initialize()

    if success:
        print("[Test 2] PASS: Sync manager initialized successfully")

        # Print status
        status = manager.get_status()
        print(f"\nSync Manager Status:")
        print(f"  Initialized: {status['initialized']}")
        print(f"  Cache Loaded: {status['cache_loaded']}")
        print(f"  Config: {status['config']}")
    else:
        print("[Test 2] FAIL: Sync manager initialization failed")

    await manager.db_manager.close()


async def main():
    """Run all tests"""
    try:
        # Test 1: Database health check
        await test_health_check()

        # Test 2: Sync manager initialization with auto-recovery
        await test_sync_manager_initialization()

        print("\n" + "=" * 60)
        print("All tests completed")
        print("=" * 60)

    except Exception as e:
        print(f"\nError during tests: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
