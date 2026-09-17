from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from app.routes.generate import router as generate_router
from app.routes.generate import error_response, request_id_for

app = FastAPI(title="AI Website Builder for UMKM")
app.include_router(generate_router)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, _error: RequestValidationError):
    return error_response(400, "AI_INVALID_REQUEST", "Invalid internal request", request_id_for(request))


@app.exception_handler(Exception)
async def internal_error(request: Request, _error: Exception):
    return error_response(500, "AI_PROVIDER_ERROR", "AI service failed", request_id_for(request))


if __name__ == "__main__":
    import uvicorn
    import os
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT", "3001")))
