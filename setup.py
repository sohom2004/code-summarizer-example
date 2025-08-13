"""
Setup script for the Code Summarizer package.

This demonstrates Python packaging best practices for agentic AI tools.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="code-summarizer",
    version="1.0.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="A Python tool for summarizing code files using Gemini Flash 2.0 with MCP server support",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/code-summarizer-python",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Documentation",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "code-summarizer=main:main",
        ],
    },
    keywords="ai, llm, code-analysis, mcp, agentic-ai, gemini, code-summarization",
    project_urls={
        "Bug Reports": "https://github.com/yourusername/code-summarizer-python/issues",
        "Source": "https://github.com/yourusername/code-summarizer-python",
        "Documentation": "https://github.com/yourusername/code-summarizer-python#readme",
    },
)