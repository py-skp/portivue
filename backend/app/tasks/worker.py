import asyncio
from app.tasks.scheduler import build_scheduler

async def main():
    sched = build_scheduler()
    sched.start()
    print("Scheduler started…")
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        sched.shutdown()

if __name__ == "__main__":
    asyncio.run(main())