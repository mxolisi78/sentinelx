"""
Auto-discovers every BaseRule subclass defined in detection.rules.*
so the engine can run them all without a hardcoded list.
"""

import importlib
import inspect
import pkgutil

from .base import BaseRule


def discover_rules():
    """Import every module in this package and collect BaseRule subclasses."""
    package = importlib.import_module("detection.rules")
    rules = []

    for _, module_name, _ in pkgutil.iter_modules(package.__path__):
        if module_name in ("base", "registry", "__init__"):
            continue
        module = importlib.import_module(f"detection.rules.{module_name}")
        for _, obj in inspect.getmembers(module, inspect.isclass):
            if (
                issubclass(obj, BaseRule)
                and obj is not BaseRule
                and obj.__module__ == module.__name__
            ):
                rules.append(obj())

    return rules