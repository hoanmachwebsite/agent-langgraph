import json
from typing import Any

from langchain_core.messages import AIMessage, ToolCall, ToolMessage
from langchain.agents.middleware.human_in_the_loop import HumanInTheLoopMiddleware
from langgraph.runtime import Runtime
from langgraph.types import interrupt
from langchain.agents.middleware.types import AgentState, ContextT


class HumanInTheLoopMiddlewareFixed(HumanInTheLoopMiddleware):
    """
    Fixed version of HumanInTheLoopMiddleware.

    Fixes LangGraph Studio issue where interrupt() returns a JSON string
    instead of a dict.
    """

    def after_model(
        self,
        state: AgentState,
        runtime: Runtime[ContextT],
    ) -> dict[str, Any] | None:
        messages = state.get("messages")
        if not messages:
            return None

        last_ai_msg = next(
            (m for m in reversed(messages) if isinstance(m, AIMessage)),
            None,
        )
        if not last_ai_msg or not last_ai_msg.tool_calls:
            return None

        action_requests = []
        review_configs = []
        interrupt_indices = []

        for idx, tool_call in enumerate(last_ai_msg.tool_calls):
            config = self.interrupt_on.get(tool_call["name"])
            if config is None:
                continue

            action_request, review_config = self._create_action_and_config(
                tool_call, config, state, runtime
            )
            action_requests.append(action_request)
            review_configs.append(review_config)
            interrupt_indices.append(idx)

        if not action_requests:
            return None

        hitl_request = {
            "action_requests": action_requests,
            "review_configs": review_configs,
        }

        # 🔴 FIX CỐT LÕI Ở ĐÂY
        raw = interrupt(hitl_request)
        if isinstance(raw, str):
            raw = json.loads(raw)

        if not isinstance(raw, dict) or "decisions" not in raw:
            raise TypeError(
                f"Invalid interrupt response: {raw} ({type(raw)})"
            )

        decisions = raw["decisions"]

        if len(decisions) != len(interrupt_indices):
            raise ValueError(
                f"Decision count mismatch: got {len(decisions)}, "
                f"expected {len(interrupt_indices)}"
            )

        revised_tool_calls: list[ToolCall] = []
        artificial_tool_messages: list[ToolMessage] = []

        decision_idx = 0

        for idx, tool_call in enumerate(last_ai_msg.tool_calls):
            if idx in interrupt_indices:
                config = self.interrupt_on[tool_call["name"]]
                decision = decisions[decision_idx]
                decision_idx += 1

                revised_call, tool_msg = self._process_decision(
                    decision, tool_call, config
                )

                if revised_call is not None:
                    revised_tool_calls.append(revised_call)
                if tool_msg is not None:
                    artificial_tool_messages.append(tool_msg)
            else:
                revised_tool_calls.append(tool_call)

        last_ai_msg.tool_calls = revised_tool_calls

        return {
            "messages": [last_ai_msg, *artificial_tool_messages]
        }
