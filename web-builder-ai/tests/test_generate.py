from unittest.mock import patch

import pytest
from app.services.llm_service import generate_website_state, validate_website_state


class TestGenerateEndpoint:
    """Tests for POST /api/v1/generate"""

    def test_vague_input_returns_valid_state(self, vague_input):
        """EC-01: Vague input should infer reasonable defaults."""
        data, is_fallback = generate_website_state(vague_input)

        assert "templateId" in data
        assert data["templateId"] in ["template-services", "template-fnb", "template-retail"]
        assert data["meta"]["businessName"]
        assert data["hero"]["title"]
        assert len(data["services"]) >= 3

    def test_ambiguous_category_picks_one(self):
        """EC-02: Ambiguous category should pick one templateId."""
        data, _ = generate_website_state("Jual kue dan service AC")

        assert data["templateId"] in ["template-services", "template-fnb", "template-retail"]

    def test_missing_whatsapp_uses_null(self, sample_website_state):
        """EC-03: Missing WhatsApp must never produce a fabricated number."""
        with patch("app.services.llm_service.ask_llm", return_value=sample_website_state):
            data, _ = generate_website_state("Warung Bu Sari, nasi goreng enak")

        assert data["contact"]["whatsappNumber"] is None

    def test_prompt_injection_ignored(self, injection_input):
        """EC-04: Prompt injection should be ignored."""
        data, _ = generate_website_state(injection_input)

        is_valid, errors = validate_website_state(data)
        assert is_valid
        assert "admin" not in data

    def test_gibberish_returns_neutral_defaults(self, gibberish_input):
        """EC-05: Gibberish should return neutral defaults."""
        data, _ = generate_website_state(gibberish_input)

        assert data["hero"]["title"]
        assert data["hero"]["subtitle"]
        assert data["about"]["story"]
