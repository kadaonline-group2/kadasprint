import hmac
import json
import os
import re
import time
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from openai import APITimeoutError, RateLimitError

from app.models import GenerateRequest, ReviseRequest
from app.services.llm_service import (
    generate_website_state_with_attempts,
    extract_whatsapp_number,
    normalize_whatsapp,
    revise_website_state,
    validate_website_state,
)
from app.services.revision_mutation import InvalidMutation, to_revision_mutation

router = APIRouter(prefix="/internal/v1")


def whatsapp_mutation_matches_instruction(mutation: dict, instruction: str) -> bool:
    contact = mutation.get("contact")
    if not isinstance(contact, dict) or "whatsappNumber" not in contact:
        return True
    number = contact["whatsappNumber"]
    if number is None:
        wants_removal = re.search(r'\b(hapus|hilangkan|kosongkan|remove|delete)\b', instruction, re.I)
        names_contact = re.search(r'\b(whatsapp|wa|nomor)\b', instruction, re.I)
        return bool(wants_removal and names_contact)
    provided_number = extract_whatsapp_number(instruction)
    return provided_number is not None and normalize_whatsapp(number) == provided_number


def request_id_for(request: Request) -> str:
    return request.headers.get("X-Request-Id", "").strip() or f"req_{uuid.uuid4().hex[:12]}"


def error_response(status: int, code: str, message: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "success": False,
            "error": {"code": code, "message": message},
            "meta": {"requestId": request_id},
        },
    )


def unauthorized(request: Request, request_id: str) -> JSONResponse | None:
    token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if token and not hmac.compare_digest(request.headers.get("Authorization", ""), f"Bearer {token}"):
        return error_response(401, "INTERNAL_UNAUTHORIZED", "Unauthorized", request_id)
    return None


def success_response(data: dict, request_id: str, attempts: int, is_fallback: bool, started: float) -> dict:
    return {
        "success": True,
        "data": data,
        "meta": {
            "requestId": request_id,
            "attempts": attempts,
            "isFallback": is_fallback,
            "latencyMs": max(0, int((time.monotonic() - started) * 1000)),
        },
    }


@router.get("/health")
def health(request: Request):
    request_id = request_id_for(request)
    if auth_error := unauthorized(request, request_id):
        return auth_error
    return {
        "success": True,
        "data": {"status": "ok", "service": "ai-website-builder-ai-service"},
        "meta": {"requestId": request_id},
    }


@router.post("/generate")
def generate(req: GenerateRequest, request: Request):
    request_id = request_id_for(request)
    if auth_error := unauthorized(request, request_id):
        return auth_error
    if not 10 <= len(req.businessDescription.strip()) <= 4000:
        return error_response(400, "AI_INVALID_REQUEST", "Invalid business description", request_id)

    started = time.monotonic()
    state, is_fallback, attempts = generate_website_state_with_attempts(req.businessDescription.strip())
    if not validate_website_state(state)[0]:
        return error_response(500, "AI_INVALID_OUTPUT", "Invalid website state", request_id)
    return success_response({"websiteState": state}, request_id, attempts, is_fallback, started)


@router.post("/revise")
def revise(req: ReviseRequest, request: Request):
    request_id = request_id_for(request)
    if auth_error := unauthorized(request, request_id):
        return auth_error
    if not req.instruction.strip() or not validate_website_state(req.currentState)[0]:
        return error_response(400, "AI_INVALID_REQUEST", "Invalid revision request", request_id)

    started = time.monotonic()
    for attempt in (1, 2):
        try:
            partial = revise_website_state(json.dumps(req.currentState), req.instruction.strip())
        except RateLimitError:
            return error_response(429, "AI_RATE_LIMITED", "AI service rate limit reached", request_id)
        except APITimeoutError:
            return error_response(504, "AI_TIMEOUT", "AI service timed out", request_id)
        except Exception:
            return error_response(502, "AI_PROVIDER_ERROR", "AI service failed", request_id)

        try:
            mutation = to_revision_mutation(partial, req.currentState)
        except InvalidMutation:
            continue
        if mutation is None:
            return error_response(422, "AI_UNSUPPORTED_REVISION", "Revision is not supported", request_id)
        if not whatsapp_mutation_matches_instruction(mutation, req.instruction):
            continue
        return success_response({"mutation": mutation}, request_id, attempt, False, started)

    return error_response(500, "AI_INVALID_OUTPUT", "Invalid revision output", request_id)
