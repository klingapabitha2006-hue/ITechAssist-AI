import socket
import psutil


def check_internet_connection():
    """
    Checks whether the computer can reach the internet.
    """

    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)

        return {
            "tool": "Internet Connectivity Check",
            "status": "online",
            "message": "Internet connection is available."
        }

    except OSError:
        return {
            "tool": "Internet Connectivity Check",
            "status": "offline",
            "message": "Internet connection could not be established."
        }


def check_system_resources():
    """
    Checks current CPU and memory usage.
    """

    cpu_usage = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()

    memory_usage = memory.percent

    return {
        "tool": "System Resource Diagnostic",
        "status": "checked",
        "cpu_usage_percent": cpu_usage,
        "memory_usage_percent": memory_usage,
        "message": (
            f"CPU usage is {cpu_usage}% and "
            f"memory usage is {memory_usage}%."
        )
    }