import os
import uuid
import json
from dotenv import load_dotenv
from langchain.tools import tool
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

# Load environment variables from .env file
load_dotenv()

@tool
def delete_file(path: str) -> str:
    """Delete a file from the filesystem."""
    return f"Deleted {path}"

@tool
def read_file(path: str) -> str:
    """Read a file from the filesystem."""
    return f"Contents of {path}"

@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email."""
    return f"Sent email to {to}"

@tool
def create_artifact(
    title: str,
    content: str = "",
    artifact_type: str = "application/react",
    artifact_id: str = None,
    chart_type: str = None,
    chart_data: str = None
) -> str:
    """
    Create an artifact for split-screen display (chia 2 màn hình).
    
    ALWAYS use this tool when:
    - User asks to "create a file", "tạo file", "write a file", "viết file"
    - User mentions "split screen", "chia 2 màn hình", "chia màn hình"
    - User wants to see code/content in a separate panel
    - User asks to generate code files (Python, JS, TS, HTML, CSS, etc.)
    - User asks to create configuration files (JSON, YAML, TOML, etc.)
    - User asks to create documentation (Markdown, README, etc.)
    - User asks to create charts (heatmap, volcano, etc.)
    - User asks to create any structured content that should be displayed separately
    
    Examples of when to use:
    - "Tạo file Python để xử lý dữ liệu"
    - "Create a React component"
    - "Viết code để chia 2 màn hình"
    - "Generate a config file"
    - "Tạo file markdown"
    - "Tạo heatmap chart" → use chart_type="heatmap" and chart_data
    - "Create Volcano chart" → use chart_type="volcano" and chart_data
    - "Tạo gene table" or "Show gene table" → use chart_type="table" and chart_data
    - "Tạo GO chart" or "Create GO enrichment" → use chart_type="go" and chart_data
    - "Tạo KEGG chart" or "Create KEGG enrichment" → use chart_type="kegg" and chart_data
    - "Tạo cell type chart" → use chart_type="cell_type" and chart_data
    - "Tạo diseases chart" → use chart_type="diseases" and chart_data
    - "Tạo pathways chart" → use chart_type="pathways" and chart_data
    - "Tạo ontologies chart" → use chart_type="ontologies" and chart_data
    - "Tạo transcription chart" → use chart_type="transcription" and chart_data
    - "Tạo l1000 chart" or "Create L1000 chart" → use chart_type="l1000" and chart_data
    - "Tạo similar table" or "Create similar table" → use chart_type="similar_table" and chart_data
    - "Tạo opposite table" or "Create opposite table" → use chart_type="opposite_table" and chart_data
    - "Tạo kea_down chart" or "Create KEA down" → use chart_type="kea_down" and chart_data
    - "Tạo kea_up chart" or "Create KEA up" → use chart_type="kea_up" and chart_data
    - "Tạo ppi_down chart" or "Create PPI down" → use chart_type="ppi_down" and chart_data
    - "Tạo ppi_up chart" or "Create PPI up" → use chart_type="ppi_up" and chart_data
    - "Tạo tfea_down chart" or "Create TFEA down" → use chart_type="tfea_down" and chart_data
    - "Tạo tfea_up chart" or "Create TFEA up" → use chart_type="tfea_up" and chart_data
    - "Tạo x2k_down chart" or "Create X2K down" → use chart_type="x2k_down" and chart_data
    - "Tạo x2k_up chart" or "Create X2K up" → use chart_type="x2k_up" and chart_data
    
    Args:
        title: The title/name of the artifact file (e.g., "app.py", "config.json", "Heatmap Chart")
        content: The full content of the artifact (code, text, etc.). For charts, this can be empty.
        artifact_type: The MIME type (default: application/react)
                      For charts, use "chart/heatmap", "chart/volcano", "chart/table", "chart/go", 
                      "chart/kegg", "chart/cell_type", "chart/diseases", "chart/pathways", 
                      "chart/ontologies", "chart/transcription", "chart/l1000", "chart/similar_table", 
                      "chart/opposite_table", "chart/kea_down", "chart/kea_up", "chart/ppi_down", 
                      "chart/ppi_up", "chart/tfea_down", "chart/tfea_up", "chart/x2k_down", 
                      or "chart/x2k_up"
        artifact_id: Optional unique ID (auto-generated if not provided)
        chart_type: Optional chart type. Supported types: "heatmap", "volcano", "table", "go", 
                   "kegg", "cell_type", "diseases", "pathways", "ontologies", "transcription", 
                   "l1000", "similar_table", "opposite_table", "kea_down", "kea_up", "ppi_down", 
                   "ppi_up", "tfea_down", "tfea_up", "x2k_down", "x2k_up".
                   When provided, artifact will render as chart/table.
        chart_data: Optional JSON string containing chart data. Required when chart_type is provided.
                   Format: JSON string with "data" field containing the chart data structure.
    
    Returns:
        A JSON string containing the artifact information in tool_use format
    """
    if artifact_id is None:
        artifact_id = str(uuid.uuid4())
    
    # If chart_type is provided, prepare chart-specific content
    if chart_type and chart_data:
        # Store chart data in content as JSON
        chart_content = {
            "chart_type": chart_type,
            "data": chart_data  # This should be a JSON string that will be parsed by frontend
        }
        content = json.dumps(chart_content, ensure_ascii=False)
        # Set artifact_type to chart type if not already set
        if artifact_type == "application/vnd.ant.react":
            artifact_type = f"chart/{chart_type}"
    elif chart_type:
        # If chart_type provided but no data, create placeholder
        chart_content = {
            "chart_type": chart_type,
            "data": None
        }
        content = json.dumps(chart_content, ensure_ascii=False)
        if artifact_type == "application/vnd.ant.react":
            artifact_type = f"chart/{chart_type}"
    
    artifact_response = {
        "type": "tool_use",
        "name": "artifacts",
        "input": {
            "command": "create",
            "id": artifact_id,
            "type": artifact_type,
            "title": title,
            "content": content
        }
    }
    
    return json.dumps(artifact_response, ensure_ascii=False)

# Checkpointer: Only use when running directly (not with langgraph dev)
# LangGraph Studio manages checkpointer automatically
# checkpointer = MemorySaver()  # Required for Command(resume=...) to work

# System prompt to guide agent on when to use artifacts
system_prompt = """You are a helpful AI assistant. 

IMPORTANT: When the user asks to create ANY file or content, you MUST use the create_artifact tool. This tool will display the content in a split-screen view (chia 2 màn hình).

ALWAYS use create_artifact tool when user:
1. Asks to "create", "tạo", "write", "viết", "generate", "tạo ra" a file
2. Mentions "file", "chia 2 màn hình", "split screen", "chia màn hình"
3. Wants to see code/content in a separate panel
4. Asks for code files (Python, JavaScript, TypeScript, HTML, CSS, etc.)
5. Asks for configuration files (JSON, YAML, TOML, .env, etc.)
6. Asks for documentation (Markdown, README, etc.)
7. Asks for any structured content

Examples that REQUIRE create_artifact:
- "Tạo file Python để xử lý dữ liệu" → use create_artifact
- "Create a React component" → use create_artifact
- "Viết code để chia 2 màn hình" → use create_artifact
- "Generate a config.json file" → use create_artifact
- "Tạo file markdown cho documentation" → use create_artifact

Do NOT use create_artifact for:
- Simple text responses or explanations
- Questions that don't involve creating files
- General conversations

When using create_artifact, provide:
- title: The filename (e.g., "app.py", "config.json", "README.md")
- content: The complete file content
- artifact_type: Use "application/vnd.ant.react" for code files, or appropriate MIME type

For charts and tables:
- Supported chart types: "heatmap", "volcano", "table", "go", "kegg", "cell_type", "diseases", "pathways", "ontologies", "transcription", "l1000", "similar_table", "opposite_table", "kea_down", "kea_up", "ppi_down", "ppi_up", "tfea_down", "tfea_up", "x2k_down", "x2k_up"
- Use chart_type parameter with appropriate value
- Provide chart_data as JSON string with the data structure
- For tables (table, similar_table, opposite_table), data structure should have "headers" (array of strings) and "data" (array of arrays)
- For enrichment charts (go, kegg, ontologies), data structure should have "dotplot" and "barplot" with metadata
- For l1000 chart, data structure should be an array of DataPoint objects with fields: sig_id, drug, perturbation_id, cell, dose, time, phase, batch, MOA, similarity_score, x, y
- artifact_type will be automatically set to "chart/{chart_type}"
- Example: create_artifact(title="Heatmap Chart", chart_type="heatmap", chart_data='{"headers":[...],"data":[...],"metadata":{...}}')
- Example: create_artifact(title="Gene Table", chart_type="table", chart_data='{"headers":["gene_id","gene_symbol",...],"data":[[...],[...]],"metadata":{...}}')
- Example: create_artifact(title="GO Enrichment", chart_type="go", chart_data='{"dotplot":{...},"barplot":{...},"metadata":{...}}')
- Example: create_artifact(title="KEGG Enrichment", chart_type="kegg", chart_data='{"dotplot":{...},"barplot":{...},"metadata":{...}}')
- Example: create_artifact(title="L1000 Chart", chart_type="l1000", chart_data='[{"sig_id":"...","drug":"...","similarity_score":0.5,"x":1.2,"y":2.3,...},...]')
- Example: create_artifact(title="Similar Table", chart_type="similar_table", chart_data='{"headers":[...],"data":[...],"metadata":{...}}')
- Example: create_artifact(title="Opposite Table", chart_type="opposite_table", chart_data='{"headers":[...],"data":[...],"metadata":{...}}')

Keywords for different chart types:
- Gene table: "tạo gene table", "hiển thị gene table", "show gene table", "bảng gene", "table gene", "gene table", "create gene table", "display gene table"
- GO chart: "tạo GO chart", "GO enrichment", "create GO chart", "GO analysis", "gene ontology"
- KEGG chart: "tạo KEGG chart", "KEGG enrichment", "create KEGG chart", "KEGG pathway"
- Cell type: "tạo cell type chart", "cell type", "cell type analysis"
- Diseases: "tạo diseases chart", "diseases", "disease analysis"
- Pathways: "tạo pathways chart", "pathways", "pathway analysis"
- Ontologies: "tạo ontologies chart", "ontologies", "ontology analysis"
- Transcription: "tạo transcription chart", "transcription", "transcription factors"
- L1000 chart: "tạo l1000 chart", "l1000", "L1000 chart", "create l1000 chart", "L1000 analysis"
- Similar table: "tạo similar table", "similar table", "create similar table", "bảng similar", "table similar"
- Opposite table: "tạo opposite table", "opposite table", "create opposite table", "bảng opposite", "table opposite"
- KEA down: "tạo kea_down chart", "kea_down", "KEA down", "create kea_down chart", "KEA downregulation", "kea downregulation"
- KEA up: "tạo kea_up chart", "kea_up", "KEA up", "create kea_up chart", "KEA upregulation", "kea upregulation"
- PPI down: "tạo ppi_down chart", "ppi_down", "PPI down", "create ppi_down chart", "PPI downregulation", "ppi downregulation"
- PPI up: "tạo ppi_up chart", "ppi_up", "PPI up", "create ppi_up chart", "PPI upregulation", "ppi upregulation"
- TFEA down: "tạo tfea_down chart", "tfea_down", "TFEA down", "create tfea_down chart", "TFEA downregulation", "tfea downregulation"
- TFEA up: "tạo tfea_up chart", "tfea_up", "TFEA up", "create tfea_up chart", "TFEA upregulation", "tfea upregulation"
- X2K down: "tạo x2k_down chart", "x2k_down", "X2K down", "create x2k_down chart", "X2K downregulation", "x2k downregulation"
- X2K up: "tạo x2k_up chart", "x2k_up", "X2K up", "create x2k_up chart", "X2K upregulation", "x2k upregulation"
- When user mentions these keywords, use the appropriate chart_type with chart_data"""

agent = create_deep_agent(
    model=os.getenv("MODEL_NAME", "gpt-4"),  # Default to GPT-4, can change in .env
    tools=[delete_file, read_file, create_artifact],
    system_prompt=system_prompt,
    #checkpointer=checkpointer,  # Required when running directly
    interrupt_on = {
        # Sensitive operations: allow all options
        "delete_file": {"allowed_decisions": ["approve", "edit", "reject"]},

        # Moderate risk: approval or rejection only
        "write_file": {"allowed_decisions": ["approve", "reject"]},

        # Must approve (no rejection allowed)
        "critical_operation": {"allowed_decisions": ["approve"]},
    },
    subagents=[{
        "name": "file-manager",
        "description": "Manages file operations",
        "system_prompt": "You are a file management assistant.",
        "tools": [delete_file, read_file],
        "interrupt_on": {
            # Override: require approval for reads in this subagent
            "delete_file": True,
            "read_file": True,  # Different from main agent!
        }
    }]
)

# if __name__ == "__main__":
#     # Create config with thread_id for state persistence
#     config = {"configurable": {"thread_id": str(uuid.uuid4())}}

#     # Invoke the agent
#     result = agent.invoke({
#         "messages": [{"role": "user", "content": "Delete the file temp.txt"}]
#     }, config=config)

#     # Check if execution was interrupted
#     if result.get("__interrupt__"):
#         # Extract interrupt information
#         interrupts = result["__interrupt__"][0].value
#         action_requests = interrupts["action_requests"]
#         review_configs = interrupts["review_configs"]

#         # Create a lookup map from tool name to review config
#         config_map = {cfg["action_name"]: cfg for cfg in review_configs}

#         # Display the pending actions to the user
#         for action in action_requests:
#             review_config = config_map[action["name"]]
#             print(f"Tool: {action['name']}")
#             print(f"Arguments: {action['args']}")
#             print(f"Allowed decisions: {review_config['allowed_decisions']}")

#         # Get user decisions (one per action_request, in order)
#         decisions = [
#             {"type": "approve"}  # User approved the deletion
#         ]

#         # Resume execution with decisions
#         result = agent.invoke(
#             Command(resume={"decisions": decisions}),
#             config=config  # Must use the same config!
#         )

#     # Process final result
#     print(result["messages"][-1].content)