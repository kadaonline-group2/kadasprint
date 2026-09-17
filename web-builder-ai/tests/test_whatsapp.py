from copy import deepcopy
from unittest.mock import patch

import pytest

from app.services.llm_service import (
    WEBSITE_DEFAULTS,
    extract_whatsapp_number,
    generate_website_state_with_attempts,
    validate_website_state,
)


@pytest.mark.parametrize(
    ("description", "expected"),
    [
        ("Warung kopi, WA 0812 3456-7890", "6281234567890"),
        ("Warung kopi, WA +62 (812) 3456-7890", "6281234567890"),
        ("Warung kopi, WA 6281234567890", "6281234567890"),
        ("Warung kopi tanpa nomor WhatsApp", None),
        ("Warung kopi, WA 081234567890123456", None),
    ],
)
def test_extract_whatsapp_number(description, expected):
    assert extract_whatsapp_number(description) == expected


def test_missing_number_overrides_fabricated_llm_number(sample_website_state):
    output = deepcopy(sample_website_state)
    with patch("app.services.llm_service.ask_llm", return_value=output) as ask:
        state, is_fallback, attempts = generate_website_state_with_attempts("Warung kopi tanpa nomor")
    assert state["contact"]["whatsappNumber"] is None
    assert validate_website_state(state)[0]
    assert (is_fallback, attempts) == (False, 1)
    ask.assert_called_once()


def test_empty_cta_message_is_replaced_without_inventing_a_number(sample_website_state):
    output = deepcopy(sample_website_state)
    output["hero"]["ctaWhatsappMessage"] = None
    with patch("app.services.llm_service.ask_llm", return_value=output) as ask:
        state, is_fallback, attempts = generate_website_state_with_attempts("Kedai kopi Kopi Senja tanpa nomor")
    assert (is_fallback, attempts) == (False, 1)
    assert state["contact"]["whatsappNumber"] is None
    assert state["hero"]["ctaWhatsappMessage"] == "Halo, saya tertarik dengan produk atau layanan Anda."
    assert validate_website_state(state)[0]
    ask.assert_called_once()


def test_user_number_overrides_llm_number(sample_website_state):
    output = deepcopy(sample_website_state)
    output["contact"]["whatsappNumber"] = None
    with patch("app.services.llm_service.ask_llm", return_value=output):
        state, is_fallback, _ = generate_website_state_with_attempts("Warung kopi, WA +62 812-3456-7890")
    assert state["contact"]["whatsappNumber"] == "6281234567890"
    assert is_fallback is False


def test_invalid_optional_fields_are_omitted_without_retry(sample_website_state):
    output = deepcopy(sample_website_state)
    output["about"]["highlights"] = None
    output["services"][0]["iconKeyword"] = 42
    output["contact"]["instagram"] = {"handle": "unknown"}
    with patch("app.services.llm_service.ask_llm", return_value=output) as ask:
        state, is_fallback, attempts = generate_website_state_with_attempts("Warung kopi tanpa nomor")
    assert (is_fallback, attempts) == (False, 1)
    assert validate_website_state(state)[0]
    assert state["contact"]["whatsappNumber"] is None
    assert "instagram" not in state["contact"]
    assert "highlights" not in state["about"]
    assert "iconKeyword" not in state["services"][0]
    ask.assert_called_once()


def test_invalid_required_field_still_uses_fallback(sample_website_state):
    output = deepcopy(sample_website_state)
    output["meta"]["businessName"] = None
    output["contact"]["instagram"] = None
    with patch("app.services.llm_service.ask_llm", return_value=output) as ask:
        state, is_fallback, attempts = generate_website_state_with_attempts("Warung kopi tanpa nomor")
    assert (is_fallback, attempts) == (True, 2)
    assert validate_website_state(state)[0]
    assert ask.call_count == 2


@pytest.mark.parametrize("description,expected", [
    ("Warung kopi tanpa nomor", None),
    ("Warung kopi, WA 081234567890", "6281234567890"),
])
def test_fallback_never_uses_a_fabricated_number(description, expected):
    with patch("app.services.llm_service.ask_llm", side_effect=RuntimeError("provider failed")):
        state, is_fallback, _ = generate_website_state_with_attempts(description)
    assert is_fallback is True
    assert state["contact"]["whatsappNumber"] == expected
    assert validate_website_state(state)[0]
    assert WEBSITE_DEFAULTS["contact"]["whatsappNumber"] is None
