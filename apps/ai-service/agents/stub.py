"""LangGraph stub agent.

Phase 0 only: proves that LangGraph is correctly installed and a graph
can be compiled. Contains no real logic — real agents ship in later phases.

Usage (verify at startup):
    from agents.stub import compiled_stub
    result = compiled_stub.invoke({"messages": ["hello"]})
"""

from __future__ import annotations

import operator
from typing import Annotated, TypedDict

from langgraph.graph import END, StateGraph


class StubState(TypedDict):
    messages: Annotated[list[str], operator.add]


def stub_node(state: StubState) -> dict[str, list[str]]:
    return {"messages": ["stub: graph compiled and invocable"]}


_workflow: StateGraph = StateGraph(StubState)
_workflow.add_node("stub", stub_node)
_workflow.set_entry_point("stub")
_workflow.add_edge("stub", END)

# compiled_stub is imported by api.py at startup to validate the import chain.
compiled_stub = _workflow.compile()
