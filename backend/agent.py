from backend.rag import retrieve_relevant_content
from backend.tools import (
    check_internet_connection,
    check_system_resources
)
from openai import OpenAI
from dotenv import load_dotenv
import os
import re


load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def extract_section(content: str, section_name: str, next_sections: list):
    lines = content.splitlines()

    start_index = -1

    for i, line in enumerate(lines):
        if line.strip().lower().startswith(section_name.lower()):
            start_index = i + 1
            break

    if start_index == -1:
        return []

    section_lines = []

    for line in lines[start_index:]:
        line_lower = line.strip().lower()

        if any(
            line_lower.startswith(section.lower())
            for section in next_sections
        ):
            break

        if line.strip():
            cleaned_line = line.strip()

            cleaned_line = re.sub(r"^\d+\.\s*", "", cleaned_line)

            section_lines.append(cleaned_line)

    return section_lines


def is_greeting(problem: str):
    greeting_words = {
        "hi",
        "hello",
        "hey",
        "hai",
        "hii",
        "hiii",
        "good morning",
        "good afternoon",
        "good evening",
        "good night"
    }

    text = problem.strip().lower()

    return text in greeting_words



def detect_intent(problem: str):

    text = problem.lower().strip()

    
    if any(word in text for word in [
        "wifi",
        "wi-fi",
        "internet",
        "network",
        "connection",
        "connected but no internet"
    ]):
        return "Network / Internet Issue"

    
    if any(word in text for word in [
        "slow",
        "lag",
        "lagging",
        "freezing",
        "freeze",
        "hang",
        "hanging",
        "performance",
        "not responding"
    ]):
        return "System Performance Issue"

   
    if any(word in text for word in [
        "printer",
        "printing",
        "print",
        "paper jam",
        "printer offline"
    ]):
        return "Printer Issue"

    
    if any(word in text for word in [
        "login",
        "log in",
        "sign in",
        "signin",
        "account",
        "access denied",
        "cannot access"
    ]):
        return "Login / Account Access Issue"

    # Password
    if any(word in text for word in [
        "password",
        "forgot password",
        "reset password",
        "wrong password"
    ]):
        return "Password / Authentication Issue"

    # Email
    if any(word in text for word in [
        "email",
        "e-mail",
        "mail",
        "outlook",
        "send mail",
        "receive mail"
    ]):
        return "Email Issue"

    return "General IT Support Issue"


def generate_diagnosis(problem: str, filename: str):

    problem_lower = problem.lower()
    filename_lower = filename.lower()

    if "wifi" in problem_lower or "wi-fi" in problem_lower:
        return "Likely Issue: WiFi / Internet Connectivity Problem"

    if "internet" in problem_lower:
        return "Likely Issue: Internet Connectivity Problem"

    if "network" in problem_lower:
        return "Likely Issue: Network Connectivity Problem"

    if "slow" in problem_lower or "lag" in problem_lower:
        return "Likely Issue: System Performance Problem"

    if "login" in problem_lower or "account" in problem_lower:
        return "Likely Issue: Login / Account Access Problem"

    if "password" in problem_lower:
        return "Likely Issue: Password / Authentication Problem"

    if "printer" in problem_lower or "printing" in problem_lower:
        return "Likely Issue: Printer / Printing Problem"

    if "email" in problem_lower or "mail" in problem_lower:
        return "Likely Issue: Email Access / Configuration Problem"

    if "wifi" in filename_lower:
        return "Likely Issue: WiFi / Internet Connectivity Problem"

    if "slow" in filename_lower:
        return "Likely Issue: System Performance Problem"

    if "login" in filename_lower:
        return "Likely Issue: Login / Account Access Problem"

    if "printer" in filename_lower:
        return "Likely Issue: Printer / Printing Problem"

    if "email" in filename_lower:
        return "Likely Issue: Email Access / Configuration Problem"

    return "Likely Issue: IT Support Problem"



def generate_ai_response(problem, diagnosis, possible_causes, steps, resolution):

    causes_text = "\n".join(
        f"- {cause}" for cause in possible_causes
    )

    steps_text = "\n".join(
        f"{index + 1}. {step}"
        for index, step in enumerate(steps)
    )

    prompt = f"""
You are ITechAssist AI, an IT helpdesk agent.

User problem:
{problem}

Detected diagnosis:
{diagnosis}

Knowledge base possible causes:
{causes_text}

Knowledge base troubleshooting steps:
{steps_text}

Knowledge base resolution:
{resolution}

Give a concise professional IT support explanation.

Do not invent technical information.
Use the provided knowledge base information.
Explain what the user should do next.
"""

    try:

        response = client.responses.create(
            model="gpt-5.6-luna",
            input=prompt
        )

        return response.output_text.strip()

    except Exception as e:

        return ""




def interpret_tool_result(tool_result):

    if not tool_result:
        return ""

    tool_name = tool_result.get("tool", "")

    
    if tool_name == "Internet Connectivity Check":

        status = tool_result.get("status")

        if status == "online":
            return (
                "AI Diagnostic Finding: Internet connectivity is currently "
                "available. The issue may be related to WiFi configuration, "
                "DNS, network adapter settings, or a specific website."
            )

        if status == "offline":
            return (
                "AI Diagnostic Finding: Internet connectivity could not be "
                "established. Check the router, WiFi connection, and network "
                "configuration."
            )

    
    if tool_name == "System Resource Diagnostic":

        cpu_usage = tool_result.get("cpu_usage_percent", 0)
        memory_usage = tool_result.get("memory_usage_percent", 0)

        findings = []
        recommendations = []

        if memory_usage >= 80:
            findings.append(
                f"Memory usage is high at {memory_usage}%."
            )
            recommendations.append(
                "Close unused applications and check Task Manager for "
                "memory-intensive processes."
            )

        if cpu_usage >= 80:
            findings.append(
                f"CPU usage is high at {cpu_usage}%."
            )
            recommendations.append(
                "Check Task Manager for applications or processes "
                "consuming high CPU resources."
            )

        if not findings:
            findings.append(
                f"Current CPU usage is {cpu_usage}% and memory usage is "
                f"{memory_usage}%."
            )
            recommendations.append(
                "Continue with the recommended troubleshooting steps "
                "and monitor system performance."
            )

        return (
            "AI Diagnostic Finding: "
            + " ".join(findings)
            + " "
            + "Agent Recommendation: "
            + " ".join(recommendations)
        )

    return ""


def analyze_problem(problem: str):

    
    intent = detect_intent(problem)

    
    if is_greeting(problem):

        return {
            "type": "greeting",
            "intent": "Greeting",
            "diagnosis": "Hello! 👋 I'm ITechAssist AI.",
            "possible_causes": [],
            "steps": [],
            "resolution": (
                "Tell me about your IT problem and I'll diagnose it, "
                "search the knowledge base, and guide you through the "
                "troubleshooting steps."
            ),
            "tool_result": None,
            "tool_interpretation": "",
            "ai_response": "",
            "escalation": False,
            "escalation_guidance": "",
            "source": None,
            "knowledge_score": 0
        }

    
    rag_results = retrieve_relevant_content(problem)

    if not rag_results:

        return {
            "type": "help",
            "intent": intent,
            "diagnosis": "No matching troubleshooting information found.",
            "possible_causes": [],
            "steps": [],
            "resolution": "Please contact the IT support team.",
            "tool_result": None,
            "tool_interpretation": "",
            "ai_response": "",
            "escalation": True,
            "escalation_guidance": (
                "This issue could not be matched with the available "
                "knowledge base. Please contact the IT support team."
            ),
            "source": None,
            "knowledge_score": 0
        }

    
    best_result = rag_results[0]

    content = best_result["content"]
    filename = best_result["filename"]
    confidence_score = best_result["score"]

    
    if confidence_score < 0.05:

        return {
            "type": "low_confidence",
            "intent": intent,
            "diagnosis": "I couldn't confidently identify the IT issue.",
            "possible_causes": [],
            "steps": [],
            "resolution": (
                "Please provide a little more information about the problem, "
                "such as what you were trying to do, what happened, and any "
                "error message you saw."
            ),
            "tool_result": None,
            "tool_interpretation": "",
            "ai_response": "",
            "escalation": False,
            "escalation_guidance": (
                "If the problem continues after providing more details, "
                "the issue can be escalated to the IT support team."
            ),
            "source": None,
            "knowledge_score": confidence_score
        }

    
    diagnosis = generate_diagnosis(
        problem,
        filename
    )

    
    possible_causes = extract_section(
        content,
        "Possible Causes:",
        [
            "Troubleshooting Steps:",
            "Resolution:",
            "Escalation:"
        ]
    )

    steps = extract_section(
        content,
        "Troubleshooting Steps:",
        [
            "Resolution:",
            "Escalation:"
        ]
    )

    resolution_lines = extract_section(
        content,
        "Resolution:",
        [
            "Escalation:"
        ]
    )

    escalation_lines = extract_section(
        content,
        "Escalation:",
        []
    )

    resolution = " ".join(resolution_lines)

    escalation_guidance = " ".join(escalation_lines)

    
    tool_result = None

    problem_lower = problem.lower()

    
    if any(word in problem_lower for word in [
        "wifi",
        "wi-fi",
        "internet",
        "network"
    ]):

        tool_result = check_internet_connection()

  
    elif any(word in problem_lower for word in [
        "slow",
        "lag",
        "freezing",
        "performance"
    ]):

        tool_result = check_system_resources()

    
    tool_interpretation = interpret_tool_result(tool_result)

    
    ai_response = generate_ai_response(
        problem,
        diagnosis,
        possible_causes,
        steps,
        resolution
    )

    
    return {
        "type": "help",
        "intent": intent,
        "diagnosis": diagnosis,
        "possible_causes": possible_causes,
        "steps": steps,
        "resolution": resolution,
        "tool_result": tool_result,
        "tool_interpretation": tool_interpretation,
        "ai_response": ai_response,

        # Escalation is now False for known issues.
        # The user should first try the recommended troubleshooting steps.
        "escalation": False,

        "escalation_guidance": escalation_guidance,
        "source": filename,
        "knowledge_score": confidence_score
    }