"""Stable entrypoint used by the documented LiveKit worker command."""

from agent.voice.livekit_agent import entrypoint, prewarm
from livekit.agents import WorkerOptions, cli


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm, agent_name="deal-closer"))
