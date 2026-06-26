from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # HMAC secret shared with the Next.js app (must be a 32-byte hex string).
    ai_service_shared_secret: str = ""

    # Anthropic API key for Claude model calls.
    anthropic_api_key: str = ""

    # Supabase connection for rule storage and evaluation logging.
    supabase_url: str = ""
    supabase_service_role_key: str = ""


settings = Settings()
