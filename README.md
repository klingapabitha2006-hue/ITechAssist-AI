# ITechAssist AI

### AI-Powered Intelligent IT Helpdesk Agent

ITechAssist AI is an AI-powered IT helpdesk agent that diagnoses common technical issues and recommends troubleshooting steps using a Knowledge Base, RAG-based retrieval, AI reasoning, and real-time diagnostic tools.

---

## 📌 Problem Statement

Traditional IT helpdesks often require users to wait for technical support even for common issues such as:

- WiFi or internet connectivity problems
- Printer issues
- Slow computer performance
- Login and access problems
- Email-related issues

ITechAssist AI provides an intelligent first-level IT support system that can analyze a user's problem, retrieve relevant technical knowledge, run appropriate diagnostics, and provide actionable troubleshooting guidance.

---

## 🚀 Key Features

- 🤖 **AI IT Helpdesk Agent**
- 🧠 **Intelligent Problem & Intent Detection**
- 📚 **Knowledge Base with RAG Retrieval**
- 🔧 **Real-Time Diagnostic Tools**
- 🌐 **Internet Connectivity Diagnostic**
- 💻 **CPU & Memory Resource Monitoring**
- 💡 **AI-Powered Troubleshooting Recommendations**
- 🎫 **Support Ticket Management**
- 💾 **MySQL Database Integration**
- 💬 **Chat History**
- 🎨 **Professional Helpdesk Dashboard**

---

## 🧠 Agent + RAG + Tools

ITechAssist AI is designed around three core capabilities:

### 🤖 Agent

The OpenAI Agents SDK powers the IT helpdesk agent.

The agent:

- Understands the user's technical problem
- Detects the problem intent
- Decides which tools are relevant
- Uses retrieved knowledge to analyze the issue
- Produces structured troubleshooting guidance
- Escalates issues when sufficient knowledge is unavailable

### 📚 RAG — Retrieval-Augmented Generation

The system retrieves relevant information from the local IT Knowledge Base before generating troubleshooting guidance.

The Knowledge Base currently contains:

- `wifi_issues.txt`
- `printer_issues.txt`
- `slow_computer.txt`
- `login_access.txt`
- `email_issues.txt`

A lightweight TF-IDF retrieval system is used to identify relevant knowledge articles.

### 🔧 Tools

The agent can use diagnostic tools when required.

Available tools include:

- **Internet Connectivity Check**
- **System Resource Diagnostic**

These tools provide real-time system information that helps the agent make better diagnostic decisions.

---

## 🔄 System Workflow

```text
                    User Problem
                         │
                         ▼
                AI Helpdesk Agent
                         │
                         ▼
                  Intent Detection
                         │
                         ▼
              Knowledge Base Search
                         │
                         ▼
                  RAG Retrieval
                         │
                         ▼
                Agent Reasoning
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      Diagnostic Tools        Knowledge Analysis
              │                     │
              └──────────┬──────────┘
                         ▼
               AI Diagnosis & Guidance
                         │
                         ▼
             Troubleshooting Steps
                         │
                ┌────────┴────────┐
                ▼                 ▼
            Resolution        Escalation
                │                 │
                └────────┬────────┘
                         ▼
                   Support Ticket