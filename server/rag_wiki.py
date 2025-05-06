import wikipedia
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.llms import Ollama

wikipedia.set_lang("en")

def load_mistral_from_ollama():
    print("[INFO] Loading Mistral model from Ollama...")
    return Ollama(model="mistral")

llm = load_mistral_from_ollama()

prompt_templates = {
    "MCQ": """
You are a quiz generator. Based on the context below, generate {nb_qst} multiple-choice questions
on the topic '{subject}' with {difficulty} difficulty.

Each question must follow this format strictly:
1) [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [A/B/C/D]

Context:
{context}
""",
    "TrueFalse": """
You are a quiz generator. Based on the context below, generate {nb_qst} true or false questions
on the topic '{subject}' with {difficulty} difficulty.

Each question must follow this format:
[Question] (True/False)
Answer: True or False

Context:
{context}
""",
    "OpenEnded": """
You are a quiz generator. Based on the context below, generate {nb_qst} open-ended questions
on the topic '{subject}' with {difficulty} difficulty.

Each question must follow this format:
Q: [Open-ended question]

Context:
{context}
"""
}

def fetch_wikipedia_content(subject: str) -> str:
    print(f"[INFO] Fetching Wikipedia content for: {subject}")
    try:
        search_results = wikipedia.search(subject)
        if not search_results:
            print(f"[ERROR] No search results found for: {subject}")
            return ""
        print(f"[INFO] Wikipedia search results: {search_results}")
        
        
        chosen_title = search_results[0]
        print(f"[INFO] Choosing first result: {chosen_title}")
        page = wikipedia.page(title=chosen_title, auto_suggest=False)
        print(f"[INFO] Wikipedia page found: {page.title}")
        return page.content
    except wikipedia.exceptions.DisambiguationError as e:
        print(f"[WARN] Disambiguation error for '{subject}'. Selecting first option: {e.options[0]}")
        try:
            page = wikipedia.page(e.options[0])
            print(f"[INFO] Wikipedia page found (fallback): {page.title}")
            return page.content
        except Exception as sub_e:
            print(f"[ERROR] Failed to load fallback page: {sub_e}")
    except wikipedia.exceptions.PageError:
        print(f"[ERROR] Page not found for subject: {subject}")
    return ""



def split_content_into_documents(raw_text: str):
    print("[INFO] Splitting Wikipedia content into documents...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    documents = splitter.create_documents([raw_text])
    print(f"[INFO] Split into {len(documents)} document(s).")
    return documents

def build_prompt_template(question_type: str):
    print(f"[INFO] Building prompt template for question type: {question_type}")
    if question_type not in prompt_templates:
        raise ValueError(f"Unknown question_type: {question_type}")
    template = prompt_templates[question_type]
    print(f"[INFO] Prompt template for {question_type}: {template}")
    return PromptTemplate.from_template(template)

def generate_quiz_from_wikipedia(subject: str, difficulty: str = "medium", nb_qst: int = 5,
                                  question_type: str = "MCQ") -> str:
    print(f"[INFO] Starting quiz generation for '{subject}'...")
    print(f"[INFO] Generating quiz on '{subject}' using Mistral via Ollama...")

    wiki_content = fetch_wikipedia_content(subject)
    if not wiki_content:
        return "❌ Could not retrieve Wikipedia content."

    docs = split_content_into_documents(wiki_content)

    max_context_length = 5000
    context = "\n\n".join(doc.page_content for doc in docs)
    if len(context) > max_context_length:
        context = context[:max_context_length]
        print(f"[WARN] Context truncated to {max_context_length} characters.")

    print(f"[INFO] Combined context into {len(context.split())} words.")

    prompt_template = build_prompt_template(question_type)

    prompt_preview = prompt_template.format(subject=subject, difficulty=difficulty, nb_qst=nb_qst, context=context)
    print(f"\n[DEBUG] --- FULL PROMPT ---\n{prompt_preview}\n[DEBUG] --- END PROMPT ---\n")

    print(f"[INFO] Preparing to generate quiz with {nb_qst} questions.")
    chain = LLMChain(llm=llm, prompt=prompt_template)

    try:
        print("[INFO] Running the chain...")
        result = chain.run(subject=subject, difficulty=difficulty, nb_qst=nb_qst, context=context)
        print("[INFO] Quiz generated successfully.")
        return result
    except Exception as e:
        print(f"[ERROR] Quiz generation failed: {e}")
        return f"❌ Quiz generation failed: {e}"


