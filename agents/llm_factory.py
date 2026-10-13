"""
Deterministic mock provider for local testing; external LLM integrations are not implemented.
"""
from typing import Dict, Any, Optional
from .base import PHIGuard


class MockLLM:
    def __init__(self, system_name: str = "Metabolomics Pathway Flux Agent"):
        self.system_name = system_name

    def invoke(self, prompt: str) -> str:
        PHIGuard.assert_no_phi(prompt)
        return f"[{self.system_name} mock]: No model or scientific validation was performed. Query received: {prompt[:60]!r}."


class LLMFactory:
    """Creates configured LLM client instances with zero-PHI protection."""

    @staticmethod
    def create(provider: str = "mock", system_name: str = "Metabolomics Pathway Flux Agent"):
        prov = str(provider).lower()
        if prov in ["mock", "deterministic", "test"]:
            return MockLLM(system_name)
        if prov in ["ollama", "local", "claude", "anthropic", "openai", "gpt4"]:
            raise NotImplementedError(f"Provider {provider!r} is not implemented; use 'mock'.")
        raise ValueError(f"Unknown provider: {provider!r}")
