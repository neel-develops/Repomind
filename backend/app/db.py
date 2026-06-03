# Graceful Prisma import - works even if prisma is not installed (Vercel deploy)
try:
    from prisma import Prisma as _Prisma

    class _PrismaWrapper(_Prisma):
        """Thin wrapper that adds is_connected() guard."""
        pass

    db = _PrismaWrapper(auto_register=True)
    PRISMA_AVAILABLE = True

except ImportError:
    # Prisma not installed (e.g. Vercel serverless env without full deps)
    PRISMA_AVAILABLE = False

    class _FakeDB:
        """No-op stub so all db.is_connected() guards work without prisma installed."""
        def is_connected(self): return False
        async def connect(self): pass
        async def disconnect(self): pass
        # Stub attributes so attribute access on db.repository etc. won't crash at module level
        def __getattr__(self, name):
            raise RuntimeError(f"Database is offline (prisma not installed). Cannot access db.{name}")

    db = _FakeDB()


async def connect_db():
    if PRISMA_AVAILABLE and not db.is_connected():
        await db.connect()


async def disconnect_db():
    if PRISMA_AVAILABLE and db.is_connected():
        await db.disconnect()
