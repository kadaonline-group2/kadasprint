from copy import deepcopy
from json import JSONDecodeError
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.llm_service import generate_website_state_with_attempts


def test_health_and_request_id(monkeypatch):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    with TestClient(app) as client:
        response = client.get("/internal/v1/health", headers={"X-Request-Id": "req_test"})
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {"status": "ok", "service": "ai-website-builder-ai-service"},
        "meta": {"requestId": "req_test"},
    }


def test_internal_token_is_required_when_configured(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "test-token")
    with TestClient(app) as client:
        response = client.get("/internal/v1/health", headers={"X-Request-Id": "req_auth"})
        authorized = client.get("/internal/v1/health", headers={
            "X-Request-Id": "req_auth", "Authorization": "Bearer test-token",
        })
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INTERNAL_UNAUTHORIZED"
    assert response.json()["meta"]["requestId"] == "req_auth"
    assert authorized.status_code == 200


def test_generate_contract_and_validation(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    with patch("app.routes.generate.generate_website_state_with_attempts", return_value=(sample_website_state, False, 2)) as generate:
        with TestClient(app) as client:
            response = client.post("/internal/v1/generate", json={
                "businessDescription": "Warung kopi Surabaya", "schemaVersion": "1.1",
            }, headers={"X-Request-Id": "req_generate"})
            invalid = client.post("/internal/v1/generate", json={
                "businessDescription": "short", "schemaVersion": "1.1",
            }, headers={"X-Request-Id": "req_invalid"})
            wrong_version = client.post("/internal/v1/generate", json={
                "businessDescription": "Warung kopi Surabaya", "schemaVersion": "2.0",
            })
    assert response.status_code == 200
    assert response.json()["data"] == {"websiteState": sample_website_state}
    assert response.json()["meta"]["requestId"] == "req_generate"
    assert response.json()["meta"]["attempts"] == 2
    assert response.json()["meta"]["isFallback"] is False
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "AI_INVALID_REQUEST"
    assert wrong_version.status_code == 400
    generate.assert_called_once_with("Warung kopi Surabaya")


def test_generate_rejects_invalid_state(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    invalid_state = deepcopy(sample_website_state)
    invalid_state["testimonials"] = []
    with patch("app.routes.generate.generate_website_state_with_attempts", return_value=(invalid_state, False, 1)):
        with TestClient(app) as client:
            response = client.post("/internal/v1/generate", json={
                "businessDescription": "Warung kopi Surabaya", "schemaVersion": "1.1",
            })
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "AI_INVALID_OUTPUT"


def test_revise_color_and_add_service(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    body = {"currentState": sample_website_state, "instruction": "Ganti warna", "schemaVersion": "1.1"}
    with TestClient(app) as client:
        with patch("app.routes.generate.revise_website_state", return_value={
            "theme": {"primaryColor": "#123456"},
        }):
            color = client.post("/internal/v1/revise", json=body, headers={"X-Request-Id": "req_color"})
        new_service = {"name": "Baru", "description": "Layanan baru", "priceEstimate": "Rp10.000"}
        with patch("app.routes.generate.revise_website_state", return_value={
            "services": sample_website_state["services"] + [new_service],
        }):
            service = client.post("/internal/v1/revise", json=body)
    assert color.status_code == 200
    assert color.json()["data"]["mutation"] == {
        "intent": "UPDATE_THEME", "changedPaths": ["theme.primaryColor"],
        "theme": {"primaryColor": "#123456"},
    }
    assert color.json()["meta"]["requestId"] == "req_color"
    assert service.status_code == 200
    assert service.json()["data"]["mutation"] == {
        "intent": "ADD_SERVICE", "changedPaths": ["services"],
        "services": {"append": [new_service]},
    }
    assert len(sample_website_state["services"]) == 3


def test_revise_accepts_direct_service_append(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    new_service = {"name": "Pisang Goreng Keju", "description": "Camilan hangat", "priceEstimate": "Rp15.000"}
    with patch("app.routes.generate.revise_website_state", return_value={
        "services": {"append": [new_service]},
    }):
        with TestClient(app) as client:
            response = client.post("/internal/v1/revise", json={
                "currentState": sample_website_state,
                "instruction": "Tambahkan menu Pisang Goreng Keju harga 15 ribu",
                "schemaVersion": "1.1",
            })
    assert response.status_code == 200
    assert response.json()["data"]["mutation"] == {
        "intent": "ADD_SERVICE", "changedPaths": ["services"],
        "services": {"append": [new_service]},
    }


def test_revise_unsupported_invalid_and_provider_failure(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    body = {"currentState": sample_website_state, "instruction": "Hapus testimonial", "schemaVersion": "1.1"}
    with TestClient(app) as client:
        with patch("app.routes.generate.revise_website_state", return_value={}):
            unsupported = client.post("/internal/v1/revise", json=body)
        with patch("app.routes.generate.revise_website_state", side_effect=RuntimeError("private provider detail")):
            failed = client.post("/internal/v1/revise", json=body)
        invalid_state = deepcopy(body)
        invalid_state["currentState"]["contact"]["whatsappNumber"] = "628xxxxxxxxxx"
        invalid = client.post("/internal/v1/revise", json=invalid_state)
    assert unsupported.status_code == 422
    assert unsupported.json()["error"]["code"] == "AI_UNSUPPORTED_REVISION"
    assert failed.status_code == 502
    assert failed.json()["error"]["code"] == "AI_PROVIDER_ERROR"
    assert "private provider detail" not in failed.text
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "AI_INVALID_REQUEST"


def test_revise_retries_invalid_mutation(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    body = {"currentState": sample_website_state, "instruction": "Ubah warna", "schemaVersion": "1.1"}
    with patch("app.routes.generate.revise_website_state", side_effect=[
        {"theme": {"primaryColor": "invalid"}},
        {"theme": {"primaryColor": "#123456"}},
    ]) as revise:
        with TestClient(app) as client:
            response = client.post("/internal/v1/revise", json=body)
    assert response.status_code == 200
    assert response.json()["meta"]["attempts"] == 2
    assert revise.call_count == 2


def test_generate_retries_non_object_output(sample_website_state):
    with patch("app.services.llm_service.ask_llm", side_effect=[[], sample_website_state]) as ask:
        state, is_fallback, attempts = generate_website_state_with_attempts("Warung kopi Surabaya, WA 081234567890")
    assert state == sample_website_state
    assert is_fallback is False
    assert attempts == 2
    assert ask.call_count == 2


def test_generate_retries_malformed_json_without_logging_provider_content(sample_website_state, caplog):
    malformed = JSONDecodeError("private provider response", "{", 1)
    with patch("app.services.llm_service.ask_llm", side_effect=[malformed, sample_website_state]) as ask:
        state, is_fallback, attempts = generate_website_state_with_attempts("Kedai kopi Kopi Senja di Bandung")
    assert state["meta"]["businessName"] == "Kopi Test"
    assert (is_fallback, attempts) == (False, 2)
    assert ask.call_count == 2
    assert "private provider response" not in caplog.text
    assert "invalid JSON" in caplog.text


def test_revise_rejects_replacing_existing_services(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    changed_services = deepcopy(sample_website_state["services"])
    changed_services[0]["name"] = "Overwritten"
    changed_services.append({"name": "Baru", "description": "Baru", "priceEstimate": "Rp10.000"})
    with patch("app.routes.generate.revise_website_state", return_value={"services": changed_services}) as revise:
        with TestClient(app) as client:
            response = client.post("/internal/v1/revise", json={
                "currentState": sample_website_state,
                "instruction": "Tambah layanan baru",
                "schemaVersion": "1.1",
            })
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "AI_INVALID_OUTPUT"
    assert revise.call_count == 2


def test_null_whatsapp_state_can_be_revised_to_a_real_number(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    state = deepcopy(sample_website_state)
    state["contact"]["whatsappNumber"] = None
    with patch("app.routes.generate.revise_website_state", return_value={
        "contact": {"whatsappNumber": "0813 2222-3333"},
    }):
        with TestClient(app) as client:
            response = client.post("/internal/v1/revise", json={
                "currentState": state,
                "instruction": "Ganti nomor WhatsApp menjadi 0813 2222-3333",
                "schemaVersion": "1.1",
            })
    assert response.status_code == 200
    assert response.json()["data"]["mutation"]["contact"]["whatsappNumber"] == "0813 2222-3333"


def test_revise_rejects_fabricated_whatsapp_number(monkeypatch, sample_website_state):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    state = deepcopy(sample_website_state)
    state["contact"]["whatsappNumber"] = None
    with patch("app.routes.generate.revise_website_state", return_value={
        "contact": {"whatsappNumber": "6281234567890"},
    }):
        with TestClient(app) as client:
            response = client.post("/internal/v1/revise", json={
                "currentState": state,
                "instruction": "Ganti nomor WhatsApp",
                "schemaVersion": "1.1",
            })
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "AI_INVALID_OUTPUT"
