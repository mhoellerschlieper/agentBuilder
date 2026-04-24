# AI Workflow AgentBuilder

**AI Workflow AgentBuilder** is a modular platform for creating and automating workflows with AI-supported tools. The system enables the combination of different building blocks to define complex processes&mdash;from research and document processing to communication, data processing, and AI analysis. Source: document &ldquo;README Proposal / Screenshot Description,&rdquo; p. 1.

<img width="1908" height="945" alt="grafik" src="https://github.com/user-attachments/assets/4c3bd296-91ba-4f03-a6f4-2fe09e51ee23" />

## Overview

The repository contains the definition and implementation of many tools that serve as building blocks for workflows in the AgentBuilder. The platform is modular in design and connects various tools within a graphical workflow. Source: document &ldquo;README Proposal / Screenshot Description,&rdquo; p. 1.

## Features

- Time-based task scheduling with the **Scheduler**
- Server-side **web search** and **web crawling**
- **PDF creation** and **text extraction from PDF documents**
- **Reading and writing Excel data**
- Execution of **MySQL queries**
- Retrieval of current **weather data**
- Search for current **news**
- AI-supported functions:
  - **Translator** for translations
  - **Data Extractor** for structured data extraction from text
  - **Text Summarize** for summaries
  - **Text Sentinize** for sentiment detection
- **Email communication**:
  - Read emails
  - Forward emails
  - Delete emails
  - List and filter emails
  - Send emails via SMTP
- **Logging**
- **Variable Tool** for creating and managing variables
- **Show Tool** for displaying results

Source: document &ldquo;README Proposal / Screenshot Description,&rdquo; p. 1; document &ldquo;Tool Definitions,&rdquo; p. 1.

## Available Tools (not all tools are available actually)

### Automation

#### Scheduler
Schedules time-based tasks and checks whether a run is due. Supported modes:
- Calculate Next Run
- Check Due

Important fields:
- Start At
- Last Run At
- Now
- Interval Unit
- Interval Value
- Max Occurrences
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

### Research

#### Web Search
Performs a server-side web search.

Important fields:
- Query
- Limit
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Web Crawler
Performs a server-side deep web crawl.

Important fields:
- Query
- Max Depth
- Max Pages
- Timeout
- Same Host Only
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### News Search
Searches for current news on a topic.

Important fields:
- Query
- Limit

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

### Documents

#### PDF Create
Creates a PDF from text or HTML.

Important fields:
- Title
- Content
- Output Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### PDF Extract Text
Reads text from a PDF.

Important fields:
- File URL
- Text Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Excel Read
Reads data from an Excel file.

Important fields:
- File URL
- Sheet Name
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Excel Write
Writes data to an Excel file.

Important fields:
- File URL
- Sheet Name
- Data Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

### Database / Data

#### MySQL Query
Executes a MySQL query.

Important fields:
- Connection Name
- Query
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

### Information

#### Weather Current
Provides the current weather for a location.

Important fields:
- Location
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

### AI

#### Translator
Translates a text into a target language using an LLM.

Important fields:
- Text
- Source Language
- Target Language
- Provider
- Model Name
- API Key
- API Host
- Timeout
- Max Completion Tokens

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Data Extractor
Extracts data from a text into a predefined JSON structure.

Important fields:
- Text
- JSON Template
- Annotation
- Provider
- Model Name
- API Key
- API Host
- Timeout
- Max Completion Tokens

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Text Summarize
Summarizes a text using an LLM.

Important fields:
- Text
- Summary Style
- Provider
- Model Name
- API Key
- API Host
- Timeout
- Max Completion Tokens

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Text Sentinize
Determines the sentiment of a text using an LLM.

Important fields:
- Text
- Provider
- Model Name
- API Key
- API Host
- Timeout
- Max Completion Tokens

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

### Communication

#### Send Mail
Sends an email via server-side SMTP tool logic.

Important fields:
- SMTP Host
- SMTP Port
- SMTP Username
- SMTP Password
- Use TLS
- From Mail
- From Name
- To Mail
- Subject
- Body Text
- Body HTML
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Email Forward
Forwards an email.

Important fields:
- Message ID
- To
- Comment

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Email Read
Reads an email by its ID.

Important fields:
- Message ID
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### List Mails
Lists emails via server-side IMAP tool logic with filters and optional flag actions.

Important fields:
- IMAP Host
- IMAP Port
- Username
- Password
- Use SSL
- Folder
- Limit
- Since
- Seen Filter
- From Filter
- Subject Filter
- After Action
- Result Variable

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Email Delete
Deletes an email.

Important fields:
- Message ID
- Permanent

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

### Monitoring / Operations

#### Log Write
Writes a log entry.

Important fields:
- Level
- Message

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

### Utility

#### Variable Tool
Creates only a variable as output.

Important fields:
- Variable Name
- Variable Type
- Variable Value

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

#### Show Tool
Displays an input.

Important fields:
- Title
- Mode
  - text
  - json
  - html

Source: document &ldquo;Tool Definitions,&rdquo; p. 1.

## Example Workflow

An example workflow shows the following nodes:

- **Start**: Initializes input data
- **Data Extractor**: Extracts structured data from texts based on a JSON template
- **Text Summarize**: Summarizes texts using an LLM
- **Translator**: Translates texts into a target language
- **Text Sentinize**: Determines the sentiment of a text
- **End**: Outputs the final result

The workflow demonstrates how multiple tools can be connected to enable the automated processing and analysis of text data. Source: document &ldquo;README Proposal / Screenshot Description,&rdquo; p. 1.

## Tool Categories

| Category | Subgroup | Example Tools | Description |
|---|---|---|---|
| AI | Language | Translator | Translation of texts using large language models |
| AI | Extraction | Data Extractor | Extracts structured data from unstructured text |
| AI | Text | Text Summarize, Text Sentinize | Text summarization and sentiment analysis |
| Automation | Scheduling | Scheduler | Time-based execution of tasks |
| Communication | Email | Send Mail, Email Read, Email Forward | Management of emails via SMTP and IMAP |
| Data | SQL | MySQL Query | Execution of SQL queries |
| Documents | PDF | PDF Create, PDF Extract Text | Creation and extraction of PDF documents |
| Documents | Spreadsheet | Excel Read, Excel Write | Reading and writing Excel files |
| Information | Weather | Weather Current | Retrieval of current weather information |
| Monitoring | Logging | Log Write | Logging of events and system information |
| Utility | Variable | Variable Tool | Creates and manages variables |
| Utility | Display | Show Tool | Displays data and results |

Source: document &ldquo;README Proposal / Screenshot Description,&rdquo; p. 1.

## Installation &amp; Usage

1. Clone the repository  
2. Install dependencies  
3. Configure tools with API keys, databases, and other settings  
4. Start the system and create workflows in the graphical editor  

Source: document &ldquo;README Proposal / Screenshot Description,&rdquo; p. 1.

## Contributing

Contributions are welcome. In the case of bugs, new tool ideas, or enhancements, a pull request or issue can be created. Source: document &ldquo;README Proposal / Screenshot Description,&rdquo; p. 1.

## License

This project is licensed under the MIT License. Source: document &ldquo;README Proposal / Screenshot Description,&rdquo; p. 1.

## Contact

Marcus Schlieper  
 email: mschlieper@expchat.ai
