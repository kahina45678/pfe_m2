from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import HuggingFacePipeline
import os
from langchain.llms import Ollama
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain


# # Global variables
# llm = None
# retriever = None

def load_mistral_from_ollama():
    print("[INFO] Loading Mistral model from Ollama...")
    return Ollama(model="mistral")


def init_vectorstore(file):
    loader = PyPDFLoader(file)
    documents = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=200)
    texts = splitter.split_documents(documents)

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2")

    if os.path.exists("index.faiss"):
        vectorstore = FAISS.load_local(
            "index", embeddings, allow_dangerous_deserialization=True)
    else:
        vectorstore = FAISS.from_documents(texts, embeddings)
        vectorstore.save_local("index")

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    return retriever


# Prompt template for Multiple Choice Questions (MCQ)
MCQ_PROMPT_TEMPLATE = """
Use the following context to generate {nb_qst} {difficulty}-level {subject} multiple-choice questions.
Each question must have 4 options (A-D) and one correct answer based *strictly* on the context.

Context:
{context}

Generate the questions strictly in this format:
Question: [Your question here]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct option letter]

Ensure the questions and options are factually correct based on the context.
"""

# Prompt template for Open Questions (Short Answer)
FREETEXT_PROMPT_TEMPLATE = """
Use the following context to generate {nb_qst} {difficulty}-level {subject} Open (short answer) questions.
Provide the expected answer based *strictly* on the context for each question.

Context:
{context}

Generate the questions and answers strictly in this format:
Question: [Your question here]
Answer: [Expected answer]

Ensure the questions and answers are factually correct based on the context.
"""

# Prompt template for True/False Questions
TRUEFALSE_PROMPT_TEMPLATE = """
Use the following context to generate {nb_qst} {difficulty}-level {subject} true/false statements.
For each statement, indicate whether it is True or False based *strictly* on the context.

Context:
{context}

Generate the statements and answers strictly in this format:
Statement: [Your statement here]
Answer: [True or False]

Ensure the statements and answers are factually correct based on the context.
"""

# Dictionary to map question types to templates
PROMPT_TEMPLATES = {
    "MCQ": MCQ_PROMPT_TEMPLATE,
    "Open": FREETEXT_PROMPT_TEMPLATE,
    "True/False": TRUEFALSE_PROMPT_TEMPLATE,
}

# --- Quiz Generation Function ---


def generate_quiz(difficulty: str, subject: str, nb_qst: int, question_type: str = "MCQ", retriever=None, llm=None):
    """
    Generates quiz questions of a specified type, difficulty, and subject
    based on retrieved document context.

    Args:
        difficulty (str): The difficulty level (e.g., "easy", "medium", "hard").
        subject (str): The subject area for the questions.
        nb_qst (int): The number of questions to generate.
        question_type (str): The type of question ("MCQ", "Open", "True/False").
                             Defaults to "MCQ".

    Returns:
        str: The generated quiz questions in the specified format, or an error message.
    """
    print(f"✅ Fonction generate_quiz appelée avec type: {question_type}")

    if llm is None or retriever is None:
        return "❌ Error: LLM or Retriever not initialized. Cannot generate quiz."

    if question_type not in PROMPT_TEMPLATES:
        return f"❌ Error: Invalid question_type '{question_type}'. Choose from {list(PROMPT_TEMPLATES.keys())}"

    # Retrieve relevant documents
    try:
        docs = retriever.get_relevant_documents(f"{subject} {difficulty}")
        context = "\n\n".join([doc.page_content for doc in docs])
        if not context:
            print(
                f"⚠️ Warning: No relevant context found for subject '{subject}' and difficulty '{difficulty}'. LLM will rely on general knowledge.")
            # Decide how to handle no context - either return error or let LLM hallucinate/use general knowledge
            # For strict context-based questions, returning an error might be better
            # return f"❌ Error: No relevant context found for subject '{subject}' and difficulty '{difficulty}'. Cannot generate quiz based on document."
            # If you allow general knowledge:
            # context = "No specific context from the document is available for this query." # Or just use the empty string

        print("🔍 CONTEXTE UTILISÉ POUR LE PROMPT (first 500 chars):")
        print(context[:500], "...")

    except Exception as e:
        return f"❌ Error during document retrieval: {e}"

    # --- THIS BLOCK MUST BE INSIDE THE FUNCTION ---
    # Select the appropriate prompt template string
    selected_template_string = PROMPT_TEMPLATES[question_type]

    # Define input variables for the selected template (all templates use the same vars here)
    input_vars = ["context", "difficulty", "subject", "nb_qst"]

    # Create the PromptTemplate instance for this specific call
    prompt = PromptTemplate(
        template=selected_template_string,
        input_variables=input_vars
    )

    # Create the LLMChain for this request
    chain = LLMChain(
        llm=llm,
        prompt=prompt
    )

    # Run the chain with the collected context and parameters
    try:
        result = chain.run({
            "context": context,
            "difficulty": difficulty,
            "subject": subject,
            "nb_qst": nb_qst
        })
        print("📢 LLM Chain executed successfully.")
        return result  # Return the result here
    except Exception as e:
        return f"❌ Error during LLM chain execution: {e}"
    # --- END OF BLOCK THAT MUST BE INSIDE FUNCTION ---


# # --- Examples of Usage ---

# # Example 1: Generate 3 easy MCQ questions about "gestion"
# # Assuming your document is about management based on the file name
# print("\n--- Generating 3 Easy MCQ about Gestion ---")
# # Make sure LLM and retriever are initialized before calling
# if llm is not None and retriever is not None:
#     quiz_mcq = generate_quiz("easy", "gestion", 3, "MCQ")
#     print("📢 Résultat MCQ:\n", quiz_mcq)
# else:
#     print("Skipping quiz generation due to initialization errors.")


# # Example 2: Generate 2 medium Open questions about "gestion"
# print("\n--- Generating 2 Medium Open about Gestion ---")
# if llm is not None and retriever is not None:
#     quiz_freetext = generate_quiz("medium", "gestion", 2, "Open")
#     print("📢 Résultat Open:\n", quiz_freetext)
# else:
#      print("Skipping quiz generation due to initialization errors.")


# # Example 3: Generate 4 hard True/False questions about "gestion"
# print("\n--- Generating 4 Hard True/False about Gestion ---")
# if llm is not None and retriever is not None:
#     quiz_truefalse = generate_quiz("hard", "gestion", 4, "True/False")
#     print("📢 Résultat True/False:\n", quiz_truefalse)
# else:
#     print("Skipping quiz generation due to initialization errors.")

# # Example 4: Invalid question type
# print("\n--- Attempting to generate with invalid type ---")
# if llm is not None and retriever is not None:
#     invalid_quiz = generate_quiz("easy", "gestion", 1, "Short Answer") # This will trigger the validation error
#     print("📢 Résultat Invalid Type:\n", invalid_quiz)
# else:
#     print("Skipping quiz generation due to initialization errors.")
