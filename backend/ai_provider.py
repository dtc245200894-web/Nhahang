from __future__ import annotations

import json
import os

import httpx
from pydantic import BaseModel, ValidationError


class SuggestedDish(BaseModel):
    menu_id: int
    quantity: int


class MenuRecommendation(BaseModel):
    items: list[SuggestedDish]
    explanation: str


class AIProviderError(Exception):
    pass


def _host() -> str:
    return os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")


def _model() -> str:
    return os.getenv("OLLAMA_MODEL", "gemma4:e2b")


def _chat(messages: list[dict[str, str]], *, response_format: dict | None = None, max_tokens: int = 500) -> str:
    payload: dict = {
        "model": _model(),
        "messages": messages,
        "stream": False,
        "think": False,
        "keep_alive": "10m",
        "options": {"num_predict": max_tokens},
    }
    if response_format is not None:
        payload["format"] = response_format

    try:
        response = httpx.post(
            f"{_host()}/api/chat",
            json=payload,
            timeout=httpx.Timeout(300.0, connect=5.0),
        )
    except httpx.ConnectError as error:
        raise AIProviderError(
            "Không kết nối được Ollama. Hãy mở ứng dụng Ollama và kiểm tra biểu tượng Ollama đang chạy."
        ) from error
    except httpx.TimeoutException as error:
        raise AIProviderError(
            "Ollama xử lý quá lâu. Hãy đợi model tải xong, thử lại hoặc dùng model nhỏ hơn."
        ) from error
    except httpx.TransportError as error:
        raise AIProviderError("Không thể kết nối tới Ollama trên máy này.") from error

    if response.is_error:
        if response.status_code == 404:
            raise AIProviderError(
                f"Chưa tìm thấy model '{_model()}'. Mở PowerShell và chạy: ollama pull {_model()}"
            )
        raise AIProviderError(f"Ollama trả về lỗi HTTP {response.status_code}.")

    try:
        content = response.json()["message"]["content"]
    except (ValueError, KeyError, TypeError) as error:
        raise AIProviderError("Ollama trả về dữ liệu không đúng định dạng.") from error
    if not isinstance(content, str) or not content.strip():
        raise AIProviderError("Ollama không tạo được câu trả lời.")
    return content.strip()


def recommend_dishes(
    people: int,
    budget: int,
    taste: str,
    menu: list[dict],
) -> MenuRecommendation:
    messages = [
        {
            "role": "system",
            "content": (
                "Bạn là trợ lý gợi ý món của nhà hàng Golden Lotus. "
                "Chỉ chọn món có menu_id trong danh sách được cung cấp. "
                "Gợi ý món phù hợp số người, sở thích và ngân sách; "
                "không tự tạo món, giá hoặc nguyên liệu. "
                "Nếu không có phương án phù hợp, trả items rỗng và giải thích ngắn."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "people": people,
                    "budget_vnd": budget,
                    "taste": taste,
                    "available_menu": menu,
                },
                ensure_ascii=False,
            ),
        },
    ]
    try:
        content = _chat(messages, response_format=MenuRecommendation.model_json_schema())
        return MenuRecommendation.model_validate(json.loads(content))
    except (ValidationError, ValueError) as error:
        raise AIProviderError("Ollama trả về dữ liệu gợi ý không đúng định dạng.") from error


def describe_dish(dish: dict, ingredients: list[str]) -> str:
    content = _chat(
        [
            {
                "role": "system",
                "content": (
                    "Viết mô tả món ăn bằng tiếng Việt, tối đa 2 câu, hấp dẫn và chính xác. "
                    "Chỉ sử dụng tên, mô tả và nguyên liệu được cung cấp. "
                    "Không tự thêm thành phần, công dụng sức khỏe hoặc nguồn gốc."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "name": dish["name"],
                        "description": dish["description"],
                        "ingredients": ingredients,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        max_tokens=120,
    )
    return content


def chat(message: str, history: list[dict[str, str]], menu: list[dict]) -> str:
    system_instruction = (
        "Bạn là trợ lý AI thân thiện. Trả lời bằng tiếng Việt, hữu ích và tự nhiên. "
        "Hãy trả lời câu hỏi thuộc mọi chủ đề phổ biến, không chỉ chủ đề nhà hàng; "
        "bao gồm kiến thức, học tập, công việc, sở thích, giao tiếp và lời khuyên đời sống. "
        "Khi người dùng hỏi ý kiến hoặc xin lời khuyên cá nhân, hãy đưa ra gợi ý chung "
        "dựa trên thông tin họ đã kể, không từ chối chỉ vì bạn chưa biết rõ hoàn cảnh; "
        "nếu cần, nêu giả định hoặc hỏi thêm một câu ngắn. "
        "Bạn không có truy cập Internet hay dữ liệu thời gian thực, nên đừng khẳng định "
        "tỷ giá, thời tiết, tin tức hoặc thông tin mới nhất; hãy nói rõ điều đó và hướng "
        "dẫn người dùng kiểm tra nguồn cập nhật. "
        "Nếu trả lời về thực đơn Golden Lotus, chỉ khẳng định tên, giá, nguyên liệu "
        "hoặc trạng thái món dựa trên dữ liệu thực đơn dưới đây. "
        "Bạn không truy cập được trạng thái bàn, đơn hàng, doanh thu hoặc tồn kho; "
        "không giả vờ thực hiện đặt bàn, thanh toán hoặc thay đổi dữ liệu. "
        "Dữ liệu thực đơn Golden Lotus (JSON): "
        f"{json.dumps(menu, ensure_ascii=False)}"
    )
    messages = [{"role": "system", "content": system_instruction}]
    messages.extend(
        {
            "role": "assistant" if entry["role"] == "assistant" else "user",
            "content": entry["content"],
        }
        for entry in history
    )
    messages.append({"role": "user", "content": message})
    return _chat(messages)
