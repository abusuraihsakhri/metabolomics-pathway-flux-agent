"""Strict parsing for CSV boolean fields shared by the command-line interfaces."""


def parse_boolean(value: object) -> bool:
    if isinstance(value, bool):
        return value
    normalized = str(value if value is not None else "").strip().lower()
    if normalized in {"true", "1", "yes", "y", "t"}:
        return True
    if normalized in {"false", "0", "no", "n", "f", ""}:
        return False
    raise ValueError(f"Invalid boolean flag: {value!r}; expected true/false, 1/0 or yes/no")
