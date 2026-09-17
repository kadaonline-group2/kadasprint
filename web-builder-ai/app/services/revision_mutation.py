"""Translate the existing partial LLM response into the internal revision contract."""

import json
from pathlib import Path

from jsonschema import Draft7Validator


_schema = json.loads(
    (Path(__file__).resolve().parents[2] / "revision-mutation.schema.json").read_text(encoding="utf-8")
)
_validator = Draft7Validator(_schema)
_copy_sections = {"meta", "hero", "about"}
_allowed_fields = {
    "theme": {"primaryColor", "accentColor", "fontFamily"},
    "meta": {"businessName", "category", "tagline"},
    "hero": {"title", "subtitle", "ctaText", "ctaWhatsappMessage"},
    "about": {"story", "highlights"},
    "contact": {"whatsappNumber", "address", "instagram"},
}


class InvalidMutation(ValueError):
    pass


def to_revision_mutation(partial: object, current_state: dict) -> dict | None:
    """Return None for unsupported/no-op changes; reject malformed supported changes."""
    if not isinstance(partial, dict):
        raise InvalidMutation("Revision output is not an object")
    if not partial:
        return None

    sections = set(partial)
    if sections == {"theme"}:
        intent = "UPDATE_THEME"
    elif sections <= _copy_sections:
        intent = "UPDATE_COPY"
    elif sections == {"services"}:
        intent = "ADD_SERVICE"
    elif sections == {"contact"}:
        intent = "UPDATE_CONTACT"
    else:
        return None

    if intent == "ADD_SERVICE":
        services = partial["services"]
        if isinstance(services, dict) and set(services) == {"append"}:
            appended = services["append"]
            if not isinstance(appended, list) or len(appended) != 1:
                raise InvalidMutation("Exactly one service must be appended")
            new_service = appended[0]
        elif isinstance(services, list):
            previous = current_state["services"]
            if len(services) != len(previous) + 1 or services[:-1] != previous:
                raise InvalidMutation("Existing services must remain unchanged")
            new_service = services[-1]
        else:
            raise InvalidMutation("Services output must append one item")
        mutation = {
            "intent": intent,
            "changedPaths": ["services"],
            "services": {"append": [new_service]},
        }
    else:
        mutation = {"intent": intent, "changedPaths": []}
        for section in sorted(sections):
            values = partial[section]
            if not isinstance(values, dict):
                raise InvalidMutation("Revision section is not an object")
            if not values or set(values) - _allowed_fields[section]:
                return None
            changed = {
                field: value for field, value in values.items()
                if current_state[section].get(field) != value
            }
            if changed:
                mutation[section] = changed
                mutation["changedPaths"].extend(
                    f"{section}.{field}" for field in sorted(changed)
                )
        if not mutation["changedPaths"]:
            return None

    if not _validator.is_valid(mutation):
        raise InvalidMutation("Revision output does not match schema")
    return mutation
