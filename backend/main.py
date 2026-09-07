from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

from backend.agent_sdk import helpdesk_agent
from agents import Runner


app = FastAPI(
    title="ITechAssist AI",
    description="AI-Powered Intelligent IT Helpdesk Agent",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# TEMPORARY TICKET STORAGE
# ============================================================
# Render free deployment cannot directly access the local
# XAMPP MySQL database on your laptop.
#
# Therefore, tickets created through the live website are
# stored here while the Render service is running.
#
# AI Agent / RAG / Tools are NOT affected.
# ============================================================

tickets_store = []
next_ticket_id = 1


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "service": "ITechAssist AI",
        "status": "running",
        "agent": "OpenAI Agents SDK",
        "features": [
            "AI Agent",
            "RAG Knowledge Base",
            "IT Diagnostic Tools"
        ]
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "agent": "ITechAssist AI",
        "framework": "OpenAI Agents SDK"
    }


# ============================================================
# HELP REQUEST
# ============================================================

class HelpRequest(BaseModel):
    problem: str


# ============================================================
# AGENT RESPONSE PARSER
# ============================================================

def parse_agent_response(text):

    sections = {
        "diagnosis": "",
        "intent": "",
        "ai_response": "",
        "possible_causes": [],
        "steps": [],
        "resolution": "",
        "tool_interpretation": "",
        "escalation": False,
        "escalation_guidance": "",
        "source": ""
    }

    current_section = None

    lines = text.splitlines()

    for line in lines:

        clean = line.strip()

        if not clean:
            continue

        upper = clean.upper()

        # ----------------------------------------------------
        # Section detection
        # ----------------------------------------------------

        if upper == "LIKELY ISSUE:":
            current_section = "diagnosis"
            continue

        if upper == "DETECTED INTENT:":
            current_section = "intent"
            continue

        if upper == "AI AGENT ANALYSIS:":
            current_section = "ai_response"
            continue

        if upper == "POSSIBLE CAUSES:":
            current_section = "possible_causes"
            continue

        if upper == "RECOMMENDED TROUBLESHOOTING:":
            current_section = "steps"
            continue

        if upper == "RESOLUTION:":
            current_section = "resolution"
            continue

        if upper == "DIAGNOSTIC FINDING:":
            current_section = "tool_interpretation"
            continue

        if upper == "ESCALATION:":
            current_section = "escalation"
            continue

        if upper == "ESCALATION GUIDANCE:":
            current_section = "escalation_guidance"
            continue

        if upper == "SOURCE:":
            current_section = "source"
            continue

        # ----------------------------------------------------
        # Possible causes
        # ----------------------------------------------------

        if current_section == "possible_causes":

            if clean.startswith("-"):
                sections["possible_causes"].append(
                    clean[1:].strip()
                )
            else:
                sections["possible_causes"].append(clean)

            continue

        # ----------------------------------------------------
        # Troubleshooting steps
        # ----------------------------------------------------

        if current_section == "steps":

            step = clean

            if (
                len(step) >= 2
                and step[0].isdigit()
                and step[1] == "."
            ):
                step = step.split(".", 1)[1].strip()

            elif step.startswith("-"):
                step = step[1:].strip()

            sections["steps"].append(step)

            continue

        # ----------------------------------------------------
        # Escalation
        # ----------------------------------------------------

        if current_section == "escalation":

            if "YES" in upper:
                sections["escalation"] = True

            elif "NO" in upper:
                sections["escalation"] = False

            continue

        # ----------------------------------------------------
        # Text sections
        # ----------------------------------------------------

        if current_section == "diagnosis":
            sections["diagnosis"] += clean + " "
            continue

        if current_section == "intent":
            sections["intent"] += clean + " "
            continue

        if current_section == "ai_response":
            sections["ai_response"] += clean + " "
            continue

        if current_section == "resolution":
            sections["resolution"] += clean + " "
            continue

        if current_section == "tool_interpretation":
            sections["tool_interpretation"] += clean + " "
            continue

        if current_section == "escalation_guidance":
            sections["escalation_guidance"] += clean + " "
            continue

        if current_section == "source":
            sections["source"] += clean + " "
            continue

    # --------------------------------------------------------
    # Clean text fields
    # --------------------------------------------------------

    for key in [
        "diagnosis",
        "intent",
        "ai_response",
        "resolution",
        "tool_interpretation",
        "escalation_guidance",
        "source"
    ]:

        sections[key] = sections[key].strip()

    return sections


# ============================================================
# AI HELP ENDPOINT
# ============================================================

@app.post("/api/help")
async def get_help(request: HelpRequest):

    result = await Runner.run(
        helpdesk_agent,
        request.problem
    )

    agent_text = result.final_output

    parsed = parse_agent_response(agent_text)

    return {
        "problem": request.problem,
        "status": "analyzed",

        "agent_response": {

            "diagnosis": parsed["diagnosis"],

            "intent": parsed["intent"],

            "ai_response": (
                parsed["ai_response"]
                or agent_text
            ),

            "possible_causes":
                parsed["possible_causes"],

            "steps":
                parsed["steps"],

            "resolution":
                parsed["resolution"],

            "tool_interpretation":
                parsed["tool_interpretation"],

            "escalation":
                parsed["escalation"],

            "escalation_guidance":
                parsed["escalation_guidance"],

            "source":
                parsed["source"]
        }
    }


# ============================================================
# TICKET REQUEST MODEL
# ============================================================

class TicketRequest(BaseModel):

    user_problem: str

    diagnosis: str = ""

    priority: str = "Medium"

    source: str = ""


# ============================================================
# CREATE SUPPORT TICKET
# ============================================================

@app.post("/api/tickets")
def create_ticket(request: TicketRequest):

    global next_ticket_id

    ticket = {
        "id": next_ticket_id,
        "user_problem": request.user_problem,
        "diagnosis": request.diagnosis,
        "status": "Open",
        "priority": request.priority,
        "source": request.source,
        "created_at": datetime.utcnow().isoformat()
    }

    tickets_store.append(ticket)

    current_id = next_ticket_id

    next_ticket_id += 1

    return {
        "status": "success",
        "message": "Support ticket created successfully.",
        "ticket_id": current_id
    }


# ============================================================
# GET SUPPORT TICKETS
# ============================================================

@app.get("/api/tickets")
def get_tickets():

    return {
        "status": "success",
        "tickets": list(reversed(tickets_store))
    }