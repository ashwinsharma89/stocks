#!/usr/bin/env python3
"""Run the ChartsMaze backend server."""
import os
import subprocess
import sys

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
os.chdir(backend_dir)

subprocess.run(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
    cwd=backend_dir,
)
