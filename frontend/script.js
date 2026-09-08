const API_URL = "https://itechassist-ai.onrender.com/api/help";
const TICKET_API_URL = "https://itechassist-ai.onrender.com/api/tickets";
 
const input = document.getElementById("problemInput"); 
const sendButton = document.getElementById("sendButton"); 
const messages = document.getElementById("messages"); 
const chatHistory = document.getElementById("chatHistory"); 
 
let chatHistories = JSON.parse( 
    localStorage.getItem("itechassist_history") || "[]" 
); 
 
let currentConversation = null; 
 
renderChatHistory(); 
 
 
// ============================================================ 
// SEND USER PROBLEM 
// ============================================================ 
 
async function sendProblem() { 
 
    const problem = input.value.trim(); 
 
    if (!problem) { 
        return; 
    } 
 
    const welcome = document.querySelector(".welcome"); 
 
    if (welcome) { 
        welcome.style.display = "none"; 
    } 
 
    if (!currentConversation) { 
 
        currentConversation = { 
            id: Date.now(), 
            title: problem, 
            messages: [] 
        }; 
    } 
 
    currentConversation.messages.push({ 
        type: "user", 
        content: problem 
    }); 
 
    addUserMessage(problem); 
 
    input.value = ""; 
 
    sendButton.disabled = true; 
 
    const loadingMessage = addLoadingMessage(); 
 
    try { 
 
        const response = await fetch(API_URL, { 
 
            method: "POST", 
 
            headers: { 
                "Content-Type": "application/json", 
                "Accept": "application/json" 
            }, 
 
            body: JSON.stringify({ 
                problem: problem 
            }) 
 
        }); 
 
        if (!response.ok) { 
 
            throw new Error( 
                `Backend request failed: ${response.status}` 
            ); 
        } 
 
        const data = await response.json(); 
 
        loadingMessage.remove(); 
 
        addAIResponse(data); 
 
        currentConversation.messages.push({ 
            type: "ai", 
            data: data 
        }); 
 
        await saveTicket(problem, data); 
 
        saveCurrentConversation(); 
 
        renderChatHistory(); 
 
    } catch (error) { 
 
        if (loadingMessage) { 
            loadingMessage.remove(); 
        } 
 
        addErrorMessage( 
            "Unable to connect to the IT Helpdesk Agent. Please try again." 
        ); 
 
        console.error( 
            "ITechAssist Error:", 
            error 
        ); 
 
    } finally { 
 
        sendButton.disabled = false; 
 
        input.focus(); 
    } 
} 
 
 
// ============================================================ 
// SAVE SUPPORT TICKET 
// ============================================================ 
 
async function saveTicket(problem, data) { 
 
    try { 
 
        const agent = data.agent_response || {}; 
 
        const response = await fetch( 
            TICKET_API_URL, 
            { 
                method: "POST", 
 
                headers: { 
                    "Content-Type": "application/json", 
                    "Accept": "application/json" 
                }, 
 
                body: JSON.stringify({ 
 
                    user_problem: problem, 
 
                    diagnosis: 
                        agent.diagnosis || 
                        "AI Helpdesk Analysis", 
 
                    priority: 
                        getPriority(agent), 
 
                    source: 
                        agent.source || 
                        "OpenAI Agents SDK + RAG" 
 
                }) 
            } 
        ); 
 
        if (!response.ok) { 
 
            throw new Error( 
                "Ticket creation failed" 
            ); 
        } 
 
        const result = 
            await response.json(); 
 
        console.log( 
            "✅ Support ticket result:", 
            result 
        ); 
 
    } catch (error) { 
 
        console.error( 
            "❌ Ticket saving error:", 
            error 
        ); 
    } 
} 
 
 
// ============================================================ 
// PRIORITY 
// ============================================================ 
 
function getPriority(agent) { 
 
    if ( 
        agent.tool_result && 
        agent.tool_result.status === "offline" 
    ) { 
        return "High"; 
    } 
 
    if (agent.escalation === true) { 
        return "High"; 
    } 
 
    return "Medium"; 
} 
 
 
// ============================================================ 
// ADD USER MESSAGE 
// ============================================================ 
 
function addUserMessage(problem) { 
 
    const message = 
        document.createElement("div"); 
 
    message.className = 
        "message user-message"; 
 
    message.innerHTML = ` 
 
        <div class="message-label"> 
            YOU 
        </div> 
 
        <div> 
            ${escapeHTML(problem)} 
        </div> 
 
    `; 
 
    messages.appendChild(message); 
 
    scrollToBottom(); 
} 
 
 
// ============================================================ 
// ADD AI RESPONSE 
// ============================================================ 
 
function addAIResponse(data) { 
 
    const agent = 
        data.agent_response || {}; 
 
    const message = 
        document.createElement("div"); 
 
    message.className = 
        "message ai-message"; 
 
 
    // -------------------------------------------------------- 
    // AI RESPONSE 
    // -------------------------------------------------------- 
 
    const aiResponse = 
        agent.ai_response || 
        "The AI Agent could not generate a response."; 
 
    const formattedResponse = 
        escapeHTML(aiResponse) 
            .replace(/\n\n/g, "<br><br>") 
            .replace(/\n/g, "<br>"); 
 
 
    // -------------------------------------------------------- 
    // DETECTED INTENT 
    // -------------------------------------------------------- 
 
    let intentHTML = ""; 
 
    if (agent.intent) { 
 
        intentHTML = ` 
 
            <div class="intent-tag"> 
 
                🧠 
 
                <strong> 
                    Detected Intent: 
                </strong> 
 
                ${escapeHTML(agent.intent)} 
 
            </div> 
 
        `; 
    } 
 
 
    // -------------------------------------------------------- 
    // POSSIBLE CAUSES 
    // -------------------------------------------------------- 
 
    let causesHTML = ""; 
 
    if ( 
        agent.possible_causes && 
        agent.possible_causes.length > 0 
    ) { 
 
        causesHTML = ` 
 
            <div class="response-section"> 
 
                <div class="response-section-title"> 
                    Possible Causes 
                </div> 
 
                <ul class="response-list"> 
 
                    ${agent.possible_causes 
                        .map( 
                            cause => 
                                `<li>${escapeHTML(cause)}</li>` 
                        ) 
                        .join("") 
                    } 
 
                </ul> 
 
            </div> 
 
        `; 
    } 
 
 
    // -------------------------------------------------------- 
    // RECOMMENDED TROUBLESHOOTING 
    // -------------------------------------------------------- 
 
    let stepsHTML = ""; 
 
    if ( 
        agent.steps && 
        agent.steps.length > 0 
    ) { 
 
        stepsHTML = ` 
 
            <div class="response-section"> 
 
                <div class="response-section-title"> 
                    Recommended Troubleshooting 
                </div> 
 
                <ol class="response-list"> 
 
                    ${agent.steps 
                        .map(step => { 
 
                            // Remove backend numbering 
                            // Example: 
                            // "1. Check connection" 
                            // becomes: 
                            // "Check connection" 
 
                            const cleanStep = 
                                String(step) 
                                    .replace( 
                                        /^\s*\d+[.)]\s*/, 
                                        "" 
                                    ) 
                                    .trim(); 
 
                            return ` 
                                <li> 
                                    ${escapeHTML(cleanStep)} 
                                </li> 
                            `; 
 
                        }) 
                        .join("") 
                    } 
 
                </ol> 
 
            </div> 
 
        `; 
    } 
 
 
    // -------------------------------------------------------- 
    // RESOLUTION 
    // -------------------------------------------------------- 
 
    let resolutionHTML = ""; 
 
    if (agent.resolution) { 
 
        resolutionHTML = ` 
 
            <div class="response-section"> 
 
                <div class="response-section-title"> 
                    Resolution 
                </div> 
 
                <div> 
                    ${escapeHTML(agent.resolution)} 
                </div> 
 
            </div> 
 
        `; 
    } 
 
 
    // -------------------------------------------------------- 
    // TOOL RESULT 
    // -------------------------------------------------------- 
 
    let toolHTML = ""; 
 
    if (agent.tool_result) { 
 
        const tool = 
            agent.tool_result; 
 
        if ( 
            tool.tool === 
            "System Resource Diagnostic" 
        ) { 
 
            const cpuUsage = 
                Number( 
                    tool.cpu_usage_percent ?? 0 
                ); 
 
            const memoryUsage = 
                Number( 
                    tool.memory_usage_percent ?? 0 
                ); 
 
            toolHTML = ` 
 
                <div class="tool-card"> 
 
                    <strong> 
                        🛠️ System Resource Diagnostic 
                    </strong> 
 
                    <div style="margin-top: 10px;"> 
 
                        <p> 
                            💻 CPU Usage: 
 
                            <strong> 
                                ${cpuUsage}% 
                            </strong> 
                        </p> 
 
                        <p> 
                            🧠 Memory Usage: 
 
                            <strong> 
                                ${memoryUsage}% 
                            </strong> 
                        </p> 
 
                    </div> 
 
                    <p> 
 
                        🟢 
 
                        ${escapeHTML( 
                            tool.message || "" 
                        )} 
 
                    </p> 
 
                </div> 
 
            `; 
 
        } else { 
 
            const isOnline = 
                tool.status === "online"; 
 
            toolHTML = ` 
 
                <div class="tool-card"> 
 
                    <strong> 
 
                        🛠️ 
 
                        ${escapeHTML( 
                            tool.tool || 
                            "Diagnostic Tool" 
                        )} 
 
                    </strong> 
 
                    <p> 
 
                        ${ 
                            isOnline 
                                ? "🟢" 
                                : "🔴" 
                        } 
 
                        ${escapeHTML( 
                            tool.message || "" 
                        )} 
 
                    </p> 
 
                </div> 
 
            `; 
        } 
    } 
 
 
    // -------------------------------------------------------- 
    // AI DIAGNOSTIC FINDING 
    // -------------------------------------------------------- 
 
    let toolInterpretationHTML = ""; 
 
    if (agent.tool_interpretation) { 
 
        const finding = 
            agent.tool_interpretation 
                .replace( 
                    "AI Diagnostic Finding: ", 
                    "" 
                ); 
 
        toolInterpretationHTML = ` 
 
            <div class="tool-interpretation"> 
 
                <strong> 
                    🧠 AI Diagnostic Finding 
                </strong> 
 
                <p> 
                    ${escapeHTML(finding)} 
                </p> 
 
            </div> 
 
        `; 
    } 
 
 
    // -------------------------------------------------------- 
    // ESCALATION 
    // -------------------------------------------------------- 
 
    let escalationHTML = ""; 
 
    if ( 
        agent.escalation && 
        agent.escalation_guidance 
    ) { 
 
        escalationHTML = ` 
 
            <div class="escalation"> 
 
                🚨 
 
                <strong> 
                    Escalation Guidance 
                </strong> 
 
                <br><br> 
 
                ${escapeHTML( 
                    agent.escalation_guidance 
                )} 
 
            </div> 
 
        `; 
    } 
 
 
    // -------------------------------------------------------- 
    // SOURCE 
    // -------------------------------------------------------- 
 
    let sourceHTML = ""; 
 
    if (agent.source) { 
 
        sourceHTML = ` 
 
            <div class="source-tag"> 
 
                📚 Source: 
 
                ${escapeHTML( 
                    agent.source 
                )} 
 
            </div> 
 
        `; 
    } 
 
 
    // -------------------------------------------------------- 
    // MAIN AI MESSAGE 
    // -------------------------------------------------------- 
 
    message.innerHTML = ` 
 
        <div class="message-label"> 
            ITECHASSIST AI 
        </div> 
 
        <div class="response-title"> 
 
            🔍 
 
            ${ 
                agent.diagnosis 
                    ? escapeHTML(agent.diagnosis) 
                    : "AI IT Helpdesk Diagnosis" 
            } 
 
        </div> 
 
        ${intentHTML} 
 
        <div class="response-section ai-agent-response"> 
 
            <div class="response-section-title"> 
 
                🤖 AI Agent Analysis 
 
            </div> 
 
            <div class="ai-response-content"> 
 
                ${formattedResponse} 
 
            </div> 
 
        </div> 
 
        ${causesHTML} 
 
        ${stepsHTML} 
 
        ${resolutionHTML} 
 
        ${toolHTML} 
 
        ${toolInterpretationHTML} 
 
        ${escalationHTML} 
 
        ${sourceHTML} 
 
        <div class="agent-framework-badge"> 
 
            <span> 
                🧠 
            </span> 
 
            <div> 
 
                <strong> 
                    OpenAI Agents SDK 
                </strong> 
 
                <small> 
                    Agent + RAG + Tools 
                </small> 
 
            </div> 
 
        </div> 
 
    `; 
 
    messages.appendChild(message); 
 
    scrollToBottom(); 
} 
 
 
// ============================================================ 
// LOADING / AGENT PROCESSING ANIMATION 
// ============================================================ 
 
function addLoadingMessage() { 
 
    const message = 
        document.createElement("div"); 
 
    message.className = 
        "message ai-message agent-processing"; 
 
    message.innerHTML = ` 
 
        <div class="message-label"> 
            ITECHASSIST AI 
        </div> 
 
        <div class="agent-flow"> 
 
            <div class="agent-flow-title"> 
 
                <span class="agent-pulse"></span> 
 
                AI Agent is analyzing your issue 
 
            </div> 
 
            <div class="agent-step active"> 
 
                <span class="step-icon"> 
                    🧠 
                </span> 
 
                <span class="step-text"> 
                    AI Agent analyzing issue 
                </span> 
 
                <span class="step-status"> 
                    Processing 
                </span> 
 
            </div> 
 
            <div class="agent-step"> 
 
                <span class="step-icon"> 
                    📚 
                </span> 
 
                <span class="step-text"> 
                    Searching Knowledge Base 
                </span> 
 
                <span class="step-status"> 
                    Waiting 
                </span> 
 
            </div> 
 
            <div class="agent-step"> 
 
                <span class="step-icon"> 
                    🔍 
                </span> 
 
                <span class="step-text"> 
                    Analyzing possible causes 
                </span> 
 
                <span class="step-status"> 
                    Waiting 
                </span> 
 
            </div> 
 
            <div class="agent-step"> 
 
                <span class="step-icon"> 
                    🛠️ 
                </span> 
 
                <span class="step-text"> 
                    Running diagnostic tools 
                </span> 
 
                <span class="step-status"> 
                    Waiting 
                </span> 
 
            </div> 
 
            <div class="agent-step"> 
 
                <span class="step-icon"> 
                    🤖 
                </span> 
 
                <span class="step-text"> 
                    Generating AI recommendation 
                </span> 
 
                <span class="step-status"> 
                    Waiting 
                </span> 
 
            </div> 
 
            <div class="agent-step"> 
 
                <span class="step-icon"> 
                    ✅ 
                </span> 
 
                <span class="step-text"> 
                    Preparing final response 
                </span> 
 
                <span class="step-status"> 
                    Waiting 
                </span> 
 
            </div> 
 
        </div> 
 
    `; 
 
    messages.appendChild(message); 
 
    scrollToBottom(); 
 
    const steps = 
        message.querySelectorAll( 
            ".agent-step" 
        ); 
 
    let currentStep = 0; 
 
    const interval = 
        setInterval(() => { 
 
            if ( 
                !document.body.contains(message) 
            ) { 
 
                clearInterval(interval); 
 
                return; 
            } 
 
            if (currentStep > 0) { 
 
                steps[currentStep - 1] 
                    .classList.remove("active"); 
 
                steps[currentStep - 1] 
                    .classList.add("completed"); 
 
                const previousStatus = 
                    steps[currentStep - 1] 
                        .querySelector( 
                            ".step-status" 
                        ); 
 
                if (previousStatus) { 
 
                    previousStatus.textContent = 
                        "Completed"; 
                } 
            } 
 
            if ( 
                currentStep < steps.length 
            ) { 
 
                steps[currentStep] 
                    .classList.add("active"); 
 
                const currentStatus = 
                    steps[currentStep] 
                        .querySelector( 
                            ".step-status" 
                        ); 
 
                if (currentStatus) { 
 
                    currentStatus.textContent = 
                        "Processing"; 
                } 
 
                currentStep++; 
 
            } 
 
        }, 450); 
 
    message._processingInterval = 
        interval; 
 
    return message; 
} 
 
 
// ============================================================ 
// ERROR MESSAGE 
// ============================================================ 
 
function addErrorMessage(text) { 
 
    const message = 
        document.createElement("div"); 
 
    message.className = 
        "message ai-message"; 
 
    message.innerHTML = ` 
 
        <div class="message-label"> 
            ITECHASSIST AI 
        </div> 
 
        <div> 
            ⚠️ 
            ${escapeHTML(text)} 
        </div> 
 
    `; 
 
    messages.appendChild(message); 
 
    scrollToBottom(); 
} 
 
 
// ============================================================ 
// SET QUICK PROBLEM 
// ============================================================ 
 
function setProblem(problem) { 
 
    showHelpdesk(); 
 
    input.value = problem; 
 
    input.focus(); 
 
} 
 
 
// ============================================================ 
// START NEW ISSUE 
// ============================================================ 
 
function startNewIssue() { 
 
    showHelpdesk(); 
 
    currentConversation = null; 
 
    messages.innerHTML = ""; 
 
    input.value = ""; 
 
 
    const welcome = 
        document.querySelector( 
            ".welcome" 
        ); 
 
 
    if (welcome) { 
 
        welcome.style.display = ""; 
 
    } 
 
 
    const topbarTitle = 
        document.querySelector( 
            ".topbar strong" 
        ); 
 
 
    if (topbarTitle) { 
 
        topbarTitle.textContent = 
            "New IT Issue"; 
 
    } 
 
    input.focus(); 
 
} 
 
 
// ============================================================ 
// SAVE CURRENT CONVERSATION 
// ============================================================ 
 
function saveCurrentConversation() { 
 
    if (!currentConversation) { 
 
        return; 
 
    } 
 
 
    chatHistories = 
        chatHistories.filter( 
            chat => 
                chat.id !== 
                currentConversation.id 
        ); 
 
 
    chatHistories.unshift( 
        currentConversation 
    ); 
 
 
    chatHistories = 
        chatHistories.slice( 
            0, 
            20 
        ); 
 
 
    localStorage.setItem( 
        "itechassist_history", 
        JSON.stringify( 
            chatHistories 
        ) 
    ); 
 
} 
 
 
// ============================================================ 
// RENDER CHAT HISTORY 
// ============================================================ 
 
function renderChatHistory() { 
 
    if (!chatHistory) { 
 
        return; 
 
    } 
 
 
    if ( 
        chatHistories.length === 0 
    ) { 
 
        chatHistory.innerHTML = ` 
 
            <div class="history-empty"> 
                No previous conversations 
            </div> 
 
        `; 
 
        return; 
 
    } 
 
 
    chatHistory.innerHTML = ""; 
 
 
    chatHistories.forEach( 
        chat => { 
 
            const historyItem = 
                document.createElement( 
                    "button" 
                ); 
 
 
            historyItem.className = 
                "history-item"; 
 
 
            historyItem.title = 
                chat.title; 
 
 
            historyItem.innerHTML = ` 
 
                <span class="history-icon"> 
                    💬 
                </span> 
 
                <span class="history-title"> 
 
                    ${escapeHTML( 
                        truncateText( 
                            chat.title, 
                            28 
                        ) 
                    )} 
 
                </span> 
 
            `; 
 
 
            historyItem.onclick = () => { 
 
                loadConversation( 
                    chat.id 
                ); 
 
            }; 
 
 
            chatHistory.appendChild( 
                historyItem 
            ); 
 
        } 
    ); 
 
} 
 
 
// ============================================================ 
// LOAD OLD CONVERSATION 
// ============================================================ 
 
function loadConversation(id) { 
 
    showHelpdesk(); 
 
 
    const conversation = 
        chatHistories.find( 
            chat => 
                chat.id === id 
        ); 
 
 
    if (!conversation) { 
 
        return; 
 
    } 
 
 
    currentConversation = 
        JSON.parse( 
            JSON.stringify( 
                conversation 
            ) 
        ); 
 
 
    messages.innerHTML = ""; 
 
 
    const welcome = 
        document.querySelector( 
            ".welcome" 
        ); 
 
 
    if (welcome) { 
 
        welcome.style.display = 
            "none"; 
 
    } 
 
 
    const topbarTitle = 
        document.querySelector( 
            ".topbar strong" 
        ); 
 
 
    if (topbarTitle) { 
 
        topbarTitle.textContent = 
            truncateText( 
                conversation.title, 
                35 
            ); 
 
    } 
 
 
    conversation.messages.forEach( 
        msg => { 
 
            if ( 
                msg.type === "user" 
            ) { 
 
                addUserMessage( 
                    msg.content 
                ); 
 
            } 
 
 
            if ( 
                msg.type === "ai" 
            ) { 
 
                addAIResponse( 
                    msg.data 
                ); 
 
            } 
 
        } 
    ); 
 
 
    input.focus(); 
 
} 
 
 
// ============================================================ 
// SHOW MY TICKETS 
// ============================================================ 
 
async function showMyTickets() { 
 
    const welcome = 
        document.querySelector( 
            ".welcome" 
        ); 
 
 
    if (welcome) { 
 
        welcome.style.display = 
            "none"; 
 
    } 
 
 
    const inputWrapper = 
        document.querySelector( 
            ".input-wrapper" 
        ); 
 
 
    const inputNote = 
        document.querySelector( 
            ".input-note" 
        ); 
 
 
    if (inputWrapper) { 
 
        inputWrapper.style.display = 
            "none"; 
 
    } 
 
 
    if (inputNote) { 
 
        inputNote.style.display = 
            "none"; 
 
    } 
 
 
    const topbarTitle = 
        document.querySelector( 
            ".topbar strong" 
        ); 
 
 
    if (topbarTitle) { 
 
        topbarTitle.textContent = 
            "My Tickets"; 
 
    } 
 
 
    messages.innerHTML = ` 
 
        <div class="tickets-page"> 
 
            <div class="tickets-header"> 
 
                <div> 
 
                    <div class="tickets-title"> 
                        Support Tickets 
                    </div> 
 
                    <div class="tickets-subtitle"> 
                        View your recent IT support requests 
                    </div> 
 
                </div> 
 
 
                <button 
                    class="ticket-back-btn" 
                    onclick="showHelpdesk()" 
                > 
 
                    ← Back to Helpdesk 
 
                </button> 
 
            </div> 
 
 
            <div class="tickets-loading"> 
                Loading tickets... 
            </div> 
 
        </div> 
 
    `; 
 
 
    try { 
 
        const response = 
            await fetch( 
                TICKET_API_URL, 
                { 
                    method: "GET", 
                    headers: { 
                        "Accept": 
                            "application/json" 
                    } 
                } 
            ); 
 
 
        if (!response.ok) { 
 
            throw new Error( 
                "Failed to fetch tickets" 
            ); 
 
        } 
 
 
        const data = 
            await response.json(); 
 
 
        renderTickets( 
            data.tickets || [] 
        ); 
 
 
    } catch (error) { 
 
        console.error( 
            "❌ Ticket loading error:", 
            error 
        ); 
 
 
        const ticketsPage = 
            document.querySelector( 
                ".tickets-page" 
            ); 
 
 
        if (ticketsPage) { 
 
            ticketsPage.innerHTML = ` 
 
                <div class="tickets-error"> 
 
                    <div class="tickets-error-icon"> 
                        ⚠️ 
                    </div> 
 
 
                    <h3> 
                        Unable to load tickets 
                    </h3> 
 
 
                    <p> 
                        Please make sure the FastAPI backend is running. 
                    </p> 
 
 
                    <button 
                        class="ticket-back-btn" 
                        onclick="showHelpdesk()" 
                    > 
 
                        ← Back to Helpdesk 
 
                    </button> 
 
                </div> 
 
            `; 
 
        } 
 
    } 
 
} 
 
 
// ============================================================ 
// RENDER TICKETS 
// ============================================================ 
 
function renderTickets(tickets) { 
 
    const ticketsPage = 
        document.querySelector( 
            ".tickets-page" 
        ); 
 
 
    if (!ticketsPage) { 
 
        return; 
 
    } 
 
 
    if (tickets.length === 0) { 
 
        ticketsPage.innerHTML = ` 
 
            <div class="tickets-header"> 
 
                <div> 
 
                    <div class="tickets-title"> 
                        Support Tickets 
                    </div> 
 
                    <div class="tickets-subtitle"> 
                        View your recent IT support requests 
                    </div> 
 
                </div> 
 
 
                <button 
                    class="ticket-back-btn" 
                    onclick="showHelpdesk()" 
                > 
 
                    ← Back to Helpdesk 
 
                </button> 
 
            </div> 
 
 
            <div class="empty-tickets"> 
 
                <div class="empty-ticket-icon"> 
                    🎫 
                </div> 
 
 
                <h3> 
                    No tickets yet 
                </h3> 
 
 
                <p> 
                    Your support tickets will appear here. 
                </p> 
 
            </div> 
 
        `; 
 
        return; 
 
    } 
 
 
    const ticketCards = 
        tickets.map( 
            ticket => { 
 
                const priorityClass = 
                    ( 
                        ticket.priority || 
                        "Medium" 
                    ) 
                    .toLowerCase(); 
 
 
                const statusClass = 
                    ( 
                        ticket.status || 
                        "Open" 
                    ) 
                    .toLowerCase(); 
 
 
                const createdDate = 
                    formatTicketDate( 
                        ticket.created_at 
                    ); 
 
 
                return ` 
 
                    <div class="ticket-card"> 
 
                        <div class="ticket-card-top"> 
 
                            <div class="ticket-id"> 
 
                                #${escapeHTML( 
                                    String( 
                                        ticket.id 
                                    ) 
                                )} 
 
                            </div> 
 
 
                            <div class="ticket-badges"> 
 
                                <span 
                                    class="ticket-priority ${priorityClass}" 
                                > 
 
                                    ${escapeHTML( 
                                        ticket.priority || 
                                        "Medium" 
                                    )} 
 
                                </span> 
 
 
                                <span 
                                    class="ticket-status ${statusClass}" 
                                > 
 
                                    ${escapeHTML( 
                                        ticket.status || 
                                        "Open" 
                                    )} 
 
                                </span> 
 
                            </div> 
 
                        </div> 
 
 
                        <div class="ticket-problem"> 
 
                            ${escapeHTML( 
                                ticket.user_problem || 
                                "No problem description" 
                            )} 
 
                        </div> 
 
 
                        <div class="ticket-diagnosis"> 
 
                            <span> 
                                Diagnosis 
                            </span> 
 
 
                            ${escapeHTML( 
                                ticket.diagnosis || 
                                "Not available" 
                            )} 
 
                        </div> 
 
 
                        <div class="ticket-footer"> 
 
                            <span> 
 
                                📚 
 
                                ${escapeHTML( 
                                    ticket.source || 
                                    "Knowledge Base" 
                                )} 
 
                            </span> 
 
 
                            <span> 
 
                                🕒 
 
                                ${escapeHTML( 
                                    createdDate 
                                )} 
 
                            </span> 
 
                        </div> 
 
                    </div> 
 
                `; 
 
            } 
        ) 
        .join(""); 
 
 
    ticketsPage.innerHTML = ` 
 
        <div class="tickets-header"> 
 
            <div> 
 
                <div class="tickets-title"> 
                    Support Tickets 
                </div> 
 
 
                <div class="tickets-subtitle"> 
 
                    ${tickets.length} 
                    ticket${tickets.length === 1 ? "" : "s"} 
                    found 
 
                </div> 
 
            </div> 
 
 
            <button 
                class="ticket-back-btn" 
                onclick="showHelpdesk()" 
            > 
 
                ← Back to Helpdesk 
 
            </button> 
 
        </div> 
 
 
        <div class="tickets-list"> 
 
            ${ticketCards} 
 
        </div> 
 
    `; 
 
} 
 
 
// ============================================================ 
// FORMAT TICKET DATE 
// ============================================================ 
 
function formatTicketDate(dateValue) { 
 
    if (!dateValue) { 
 
        return "Unknown date"; 
 
    } 
 
 
    const date = 
        new Date(dateValue); 
 
 
    if ( 
        isNaN( 
            date.getTime() 
        ) 
    ) { 
 
        return dateValue; 
 
    } 
 
    return date.toLocaleString( 
        "en-IN", 
        { 
            day: "2-digit", 
            month: "short", 
            year: "numeric", 
            hour: "2-digit", 
            minute: "2-digit" 
        } 
    ); 
 
} 
 
 
// ============================================================ 
// SHOW HELPDESK 
// ============================================================ 
 
function showHelpdesk() { 
 
    const inputWrapper = 
        document.querySelector( 
            ".input-wrapper" 
        ); 
 
    const inputNote = 
        document.querySelector( 
            ".input-note" 
        ); 
 
 
    if (inputWrapper) { 
 
        inputWrapper.style.display = 
            ""; 
 
    } 
 
 
    if (inputNote) { 
 
        inputNote.style.display = 
            ""; 
 
    } 
 
 
    const topbarTitle = 
        document.querySelector( 
            ".topbar strong" 
        ); 
 
 
    if (topbarTitle) { 
 
        topbarTitle.textContent = 
            "New IT Issue"; 
 
    } 
 
 
    messages.innerHTML = ""; 
 
 
    const welcome = 
        document.querySelector( 
            ".welcome" 
        ); 
 
 
    if (welcome) { 
 
        welcome.style.display = 
            ""; 
 
    } 
 
 
    input.value = ""; 
 
    input.focus(); 
 
} 
 
 
// ============================================================ 
// TRUNCATE TEXT 
// ============================================================ 
 
function truncateText( 
    text, 
    maxLength 
) { 
 
    if (!text) { 
 
        return ""; 
 
    } 
 
 
    if ( 
        text.length <= maxLength 
    ) { 
 
        return text; 
 
    } 
 
 
    return ( 
        text.substring( 
            0, 
            maxLength 
        ) + "..." 
    ); 
 
} 
 
 
// ============================================================ 
// ENTER KEY 
// ============================================================ 
 
function handleKeyDown(event) { 
 
    if ( 
        event.key === "Enter" && 
        !event.shiftKey 
    ) { 
 
        event.preventDefault(); 
 
        sendProblem(); 
 
    } 
 
} 
 
 
// ============================================================ 
// SCROLL 
// ============================================================ 
 
function scrollToBottom() { 
 
    setTimeout( 
        () => { 
 
            window.scrollTo({ 
 
                top: 
                    document.body 
                        .scrollHeight, 
 
                behavior: 
                    "smooth" 
 
            }); 
 
        }, 
        50 
    ); 
 
} 
 
 
// ============================================================ 
// ESCAPE HTML 
// ============================================================ 
 
function escapeHTML(value) { 
 
    const div = 
        document.createElement( 
            "div" 
        ); 
 
 
    div.textContent = 
        value ?? ""; 
 
 
    return div.innerHTML; 
 
}