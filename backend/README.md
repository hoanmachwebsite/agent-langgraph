# Deep Agents Test Project

Dự án test Deep Agents với human-in-the-loop interrupts.

## Cài đặt

### 1. Cài đặt Poetry (nếu chưa có)

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

Hoặc với pip:

```bash
pip install poetry
```

### 2. Cài đặt dependencies

```bash
poetry install --no-root
poetry env activate
```

### 3. Cấu hình môi trường

File `.env` và điền các API keys:

```bash
# API Keys
OPENAI_API_KEY=

# Model Configuration
# Options: gpt-4, gpt-4-turbo, gpt-3.5-turbo, claude-sonnet-4-5-20250929, etc.
MODEL_NAME=gpt-4

# LangSmith Configuration (for debugging and tracing)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=deep-agents-test

```

Sau đó chỉnh sửa file `.env` với các keys của bạn:

- `OPENAI_API_KEY`: (Optional) API key từ https://platform.openai.com/
- `LANGCHAIN_API_KEY`: API key từ https://smith.langchain.com/ để debug/trace

## Chạy dự án

```bash
poetry run langgraph dev
```

## Giải thích cấu trúc

### Interrupt Configuration

- `delete_file`: Yêu cầu xác nhận với 3 options: approve, edit, reject
- `read_file`: Không yêu cầu xác nhận (chạy tự động)
- `send_email`: Yêu cầu xác nhận nhưng chỉ có approve/reject (không có edit)

### LangSmith Debugging

Với `LANGCHAIN_TRACING_V2=true` trong file `.env`, tất cả các calls sẽ được trace và có thể xem tại https://smith.langchain.com/

## Cấu trúc file

- `main.py`: File chính chứa agent configuration với interrupt settings
- `.env`: File chứa API keys và configuration (không commit)
- `.env.example`: Template cho file .env
- `pyproject.toml`: Poetry configuration với dependencies
- `.gitignore`: Ignore các file không cần commit
