"""Run the real FastAPI routes with deterministic, network-free LLM responses."""

import os
import time
from copy import deepcopy

import uvicorn

from app.main import app
from app.services import llm_service


def mock_ask_llm(user_message: str, system_prompt: str | None = None, cache_key: str | None = None) -> dict:
    if cache_key == "generate:v1":
        if "trigger-timeout" in user_message:
            time.sleep(3.5)
        if "trigger-invalid-output" in user_message:
            return {"unexpected": "field"}
        if "trigger-provider-error" in user_message:
            raise RuntimeError("Mock provider failure")

        state = deepcopy(llm_service.WEBSITE_DEFAULTS)
        state["templateId"] = "template-services"
        state["meta"] = {
            "businessName": "Warung Integrasi",
            "category": "Kuliner",
            "tagline": "Kopi dan camilan",
        }
        state["contact"]["whatsappNumber"] = "081234567890"
        return state

    if cache_key == "revise:v1" and system_prompt:
        instruction = user_message.split("<USER_INSTRUCTION>\n", 1)[1].split("\n</USER_INSTRUCTION>", 1)[0]
        if "trigger-provider-error" in instruction:
            raise RuntimeError("Mock provider failure")
        if "trigger-invalid-mutation" in instruction:
            return {"theme": {"primaryColor": "invalid"}}
        if "Ganti nomor WhatsApp menjadi" in instruction:
            return {"contact": {"whatsappNumber": "0813 2222-3333"}}
        if "Hapus nomor WhatsApp" in instruction:
            return {"contact": {"whatsappNumber": None}}
        if "warna" in instruction.lower():
            return {"theme": {"primaryColor": "#123456", "accentColor": "#654321"}}
        if "tambah layanan" in instruction.lower() or "tambahkan menu" in instruction.lower():
            return {
                "services": {"append": [{
                    "name": "Layanan Baru",
                    "description": "Tambahan dari instruksi pengguna",
                    "priceEstimate": "Rp15.000",
                }]}
            }
        return {}

    raise AssertionError("Unexpected LLM call")


llm_service.ask_llm = mock_ask_llm


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ["PORT"]), log_level="warning", access_log=False)
