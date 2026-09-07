import asyncio

from agents import Runner

from agent_sdk import helpdesk_agent


async def main():
    result = await Runner.run(
        helpdesk_agent,
        "My computer is running very slowly"
    )

    print("\n===== ITechAssist AI Agent =====\n")
    print(result.final_output)


if __name__ == "__main__":
    asyncio.run(main())