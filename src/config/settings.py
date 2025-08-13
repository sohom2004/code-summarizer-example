"""
Configuration management for the MCP server.

This demonstrates important patterns in agentic AI applications:
1. Environment-based configuration (dev/prod differences)
2. Secure handling of API keys
3. Validation of configuration values
4. Default fallbacks for robustness
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

from pydantic import BaseModel, Field, validator


class SummaryOptions(BaseModel):
    """
    Configuration for how summaries are generated.
    
    This demonstrates how to structure configuration for AI workflows:
    - Clear parameter names
    - Validation rules
    - Sensible defaults
    """
    detail_level: str = Field(default="medium", regex="^(low|medium|high)$")
    max_length: int = Field(default=500, gt=0, le=2000)


class Config(BaseModel):
    """
    Main configuration class.
    
    Uses Pydantic for:
    - Automatic validation
    - Type conversion
    - Clear error messages
    - Environment variable integration
    """
    api_key: str = Field(default="")
    port: int = Field(default=24312, gt=0, le=65535)
    summary_options: SummaryOptions = Field(default_factory=SummaryOptions)
    
    @validator('api_key')
    def validate_api_key(cls, v):
        """Validate API key format (basic check)."""
        if v and len(v) < 10:
            raise ValueError("API key appears to be too short")
        return v


class ConfigManager:
    """
    Manages configuration persistence and retrieval.
    
    This pattern is common in agentic AI tools:
    - Centralized configuration management
    - Environment variable priority
    - Secure storage practices
    - Easy testing and mocking
    """
    
    def __init__(self):
        self.config_file = Path("config.json")
        self._config: Optional[Config] = None
    
    def _load_from_file(self) -> Dict[str, Any]:
        """Load configuration from JSON file."""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load config file: {e}")
        return {}
    
    def _save_to_file(self, config_dict: Dict[str, Any]):
        """Save configuration to JSON file (excluding sensitive data if env var exists)."""
        try:
            # Don't save API key to file if it's in environment
            save_dict = config_dict.copy()
            if os.getenv('GOOGLE_API_KEY'):
                save_dict['api_key'] = ""
            
            with open(self.config_file, 'w') as f:
                json.dump(save_dict, f, indent=2)
        except IOError as e:
            print(f"Warning: Could not save config file: {e}")
    
    def get_config(self) -> Config:
        """
        Get current configuration with environment variable priority.
        
        This demonstrates the configuration hierarchy:
        1. Environment variables (highest priority)
        2. Configuration file
        3. Defaults (lowest priority)
        """
        if self._config is None:
            # Load from file
            file_config = self._load_from_file()
            
            # Override with environment variables
            api_key = os.getenv('GOOGLE_API_KEY') or file_config.get('api_key', '')
            port = int(os.getenv('PORT', file_config.get('port', 24312)))
            
            # Build config dict
            config_dict = {
                'api_key': api_key,
                'port': port,
                'summary_options': file_config.get('summary_options', {})
            }
            
            self._config = Config(**config_dict)
        
        return self._config
    
    def update_config(self, updates: Dict[str, Any]) -> Config:
        """Update configuration with new values."""
        current = self.get_config()
        current_dict = current.dict()
        
        # Apply updates
        for key, value in updates.items():
            current_dict[key] = value
        
        # Validate and create new config
        self._config = Config(**current_dict)
        
        # Save to file
        self._save_to_file(current_dict)
        
        return self._config
    
    def reset_config(self):
        """Reset configuration to defaults."""
        self._config = Config()
        if self.config_file.exists():
            self.config_file.unlink()


# Global instance (singleton pattern)
_config_manager = ConfigManager()

# Public API functions
def get_config() -> Config:
    """Get current configuration."""
    return _config_manager.get_config()

def update_config(updates: Dict[str, Any]) -> Config:
    """Update configuration."""
    return _config_manager.update_config(updates)

def reset_config():
    """Reset configuration to defaults."""
    _config_manager.reset_config()