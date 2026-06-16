from datetime import datetime, timezone


print(datetime.now(timezone.utc).replace(day=10))