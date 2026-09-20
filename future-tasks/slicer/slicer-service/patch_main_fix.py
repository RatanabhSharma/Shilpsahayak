import os

with open('app/main.py', 'r') as f:
    c = f.read()

old_code = """        route_decision = decide_route(insp)
        JOBS[job_id]["route_decision"] = route_decision
        route = route_decision["route"]
        logger.info(
            f"Route decision: {route} / {route_decision['reason_code']}",
            extra=extra
        )"""

new_code = """        route_decision = decide_route(insp)
        JOBS[job_id]["route_decision"] = route_decision
        route = route_decision["route"]
        params["route"] = "multicolor" if route == SlicerRoute.MULTICOLOR else "single_material"
        logger.info(
            f"Route decision: {route} / {route_decision['reason_code']}",
            extra=extra
        )"""

if old_code in c:
    c = c.replace(old_code, new_code)
    print("Patched main.py")
else:
    print("WARNING: Code block not found in main.py")

with open('app/main.py', 'w') as f:
    f.write(c)

