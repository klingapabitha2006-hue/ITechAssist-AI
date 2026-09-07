from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel 
 
from backend.agent import analyze_problem 
from backend.database import get_db_connection 
 
 
app = FastAPI( 
    title="ITechAssist AI", 
    description="AI-Powered Intelligent IT Helpdesk Agent", 
    version="1.0.0" 
) 
 
 
app.add_middleware( 
    CORSMiddleware, 
    allow_origins=[
    "https://itechassist-ai-frontend.onrender.com",
    "http://127.0.0.1:5500"
],
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"], 
) 
 
 
@app.get("/") 
def home(): 
    return { 
        "service": "ITechAssist AI", 
        "status": "running" 
    } 
 
 
@app.get("/api/health") 
def health(): 
    return { 
        "status": "healthy", 
        "agent": "ITechAssist AI" 
    } 
 
 
class HelpRequest(BaseModel): 
    problem: str 
 
 
@app.post("/api/help") 
def get_help(request: HelpRequest): 
 
    analysis = analyze_problem(request.problem) 
 
    return { 
        "problem": request.problem, 
        "status": "analyzed", 
        "agent_response": analysis 
    } 
 
 
class TicketRequest(BaseModel): 
    user_problem: str 
    diagnosis: str = "" 
    priority: str = "Medium" 
    source: str = "" 
 
 
@app.post("/api/tickets") 
def create_ticket(request: TicketRequest): 
 
    connection = None 
    cursor = None 
 
    try: 
        connection = get_db_connection() 
        cursor = connection.cursor() 
 
        query = """ 
            INSERT INTO tickets 
            (user_problem, diagnosis, status, priority, source) 
            VALUES (%s, %s, %s, %s, %s) 
        """ 
 
        values = ( 
            request.user_problem, 
            request.diagnosis, 
            "Open", 
            request.priority, 
            request.source 
        ) 
 
        cursor.execute(query, values) 
        connection.commit() 
 
        ticket_id = cursor.lastrowid 
 
        return { 
            "status": "success", 
            "message": "Support ticket created successfully.", 
            "ticket_id": ticket_id 
        } 
 
    except Exception as e: 
 
        return { 
            "status": "error", 
            "message": "Failed to create support ticket.", 
            "error": str(e) 
        } 
 
    finally: 
 
        if cursor: 
            cursor.close() 
 
        if connection: 
            connection.close()


@app.get("/api/tickets")
def get_tickets():

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                id,
                user_problem,
                diagnosis,
                status,
                priority,
                source,
                created_at
            FROM tickets
            ORDER BY id DESC
        """

        cursor.execute(query)

        tickets = cursor.fetchall()

        return {
            "status": "success",
            "tickets": tickets
        }

    except Exception as e:

        return {
            "status": "error",
            "message": "Failed to fetch support tickets.",
            "error": str(e)
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()