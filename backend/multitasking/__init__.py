"""Stub for multitasking package - avoids build failures on some systems.

yfinance imports this but only uses it for parallel downloads which we don't need
since we use asyncio.to_thread() for concurrency instead.
"""
import threading


def set_max_threads(n):
    pass


class Task:
    pass


def task(func):
    return func


def wait_for_tasks():
    pass
